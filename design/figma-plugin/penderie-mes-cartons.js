/* =============================================================================
 *  PENDERIE — "Mes Cartons" — UI nettoyée + boutons + chemins vers les fiches
 *
 *  Même méthode que "Ajouter un logement" / les fiches : on clone le vrai
 *  écran "Mes Cartons" (#14:1767) — Nav, FAB, stats du haut déjà stylés —
 *  et on ne reconstruit QUE la section cartons, qui était en position
 *  absolue avec des textes "Voir Tout" en double et des rectangles orphelins.
 *  La nouvelle section est un vrai conteneur auto-layout (col / row), les
 *  icônes sont des vecteurs SVG uniques (comme houseIcon / iconBox).
 *
 *  Ajoute : boutons "Créer un carton" / "Voir tout" (clonés des vrais
 *  boutons du DS), cartes carton propres, et un lien de prototype (clic)
 *  de chaque carte vers "Fiche carton" (créée par penderie-fiches.js —
 *  lance ce script-là avant celui-ci si ce n'est pas déjà fait).
 *
 *  Ne touche PAS à "Mes Cartons" (#14:1767) : construit un écran
 *  INDÉPENDANT "Mes Cartons · Version Claude" à côté. Rejouable.
 * ========================================================================== */

(async () => {
  "use strict";
  const log = (...a) => { try { console.log("[Penderie]", ...a); } catch (e) {} };
  if (figma.loadAllPagesAsync) { try { await figma.loadAllPagesAsync(); } catch (e) {} }
  const byId = (id) => figma.getNodeByIdAsync(id);

  const SRC_ID = "14:1767";       // Mes Cartons — cloné, jamais modifié
  const NAME = "Mes Cartons · Version Claude";

  /* ---------- polices ----------------------------------------------------- */
  const okFont = {};
  for (const f of [{ family: "Luciole", style: "Regular" }, { family: "Luciole", style: "Bold" }, { family: "Typolio", style: "Regular" }]) {
    try { await figma.loadFontAsync(f); okFont[f.family + "/" + f.style] = true; } catch (e) {}
  }
  let FB = null;
  try { await figma.loadFontAsync({ family: "Inter", style: "Regular" }); FB = { family: "Inter", style: "Regular" }; } catch (e) {}
  const F = (fam, st) => okFont[fam + "/" + st] ? { family: fam, style: st } : (FB || { family: fam, style: st });
  const BODY = () => F("Luciole", "Regular");
  const BOLD = () => F("Luciole", "Bold");
  const TITLE = () => F("Typolio", "Regular");

  /* ---------- couleurs : styles du DS si possible, sinon valeurs charte --- */
  async function paintFrom(nodeId, kind) {
    const n = await byId(nodeId);
    if (!n) return null;
    const p = (n[kind] && n[kind] !== figma.mixed) ? JSON.parse(JSON.stringify(n[kind])) : [];
    return p.length ? [p[0]] : null;
  }
  const hex = (h) => { h = h.replace("#", ""); return { r: parseInt(h.slice(0, 2), 16) / 255, g: parseInt(h.slice(2, 4), 16) / 255, b: parseInt(h.slice(4, 6), 16) / 255 }; };
  const PRIMARY = (await paintFrom("3:36", "fills")) || [{ type: "SOLID", color: hex("#D31D66") }];
  const BLACK = (await paintFrom("14:1657", "fills")) || [{ type: "SOLID", color: hex("#1A1E24") }];
  const GREY = (await paintFrom("3:232", "fills")) || [{ type: "SOLID", color: hex("#475569") }];
  const WHITE = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
  const WHITE_70 = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 }, opacity: 0.75 }];

  let PRIMARY_STYLE_ID = null;
  try {
    const ps = figma.getLocalPaintStylesAsync ? await figma.getLocalPaintStylesAsync() : (figma.getLocalPaintStyles ? figma.getLocalPaintStyles() : []);
    const p = ps.find((s) => s.name === "primary" || s.name.split("/").pop() === "primary");
    if (p) PRIMARY_STYLE_ID = p.id;
  } catch (e) {}
  async function accentFill(node) {
    if (PRIMARY_STYLE_ID && node.setFillStyleIdAsync) { try { await node.setFillStyleIdAsync(PRIMARY_STYLE_ID); return; } catch (e) {} }
    try { node.fills = PRIMARY; } catch (e) {}
  }
  async function accentStroke(node) {
    if (PRIMARY_STYLE_ID && node.setStrokeStyleIdAsync) { try { await node.setStrokeStyleIdAsync(PRIMARY_STYLE_ID); return; } catch (e) {} }
    try { node.strokes = PRIMARY; } catch (e) {}
  }

  function txt(s, size, paintArr, opts) {
    opts = opts || {};
    const t = figma.createText();
    t.fontName = opts.bold ? BOLD() : (opts.title ? TITLE() : BODY());
    t.fontSize = size;
    t.textAutoResize = "WIDTH_AND_HEIGHT";
    t.fills = paintArr;
    t.characters = s;
    t.lineHeight = { value: Math.round(size * 1.3), unit: "PIXELS" };
    if (opts.align) t.textAlignHorizontal = opts.align;
    return t;
  }
  function row(name, gap, w) {
    const f = figma.createFrame();
    f.name = name; f.fills = []; f.clipsContent = false;
    f.layoutMode = "HORIZONTAL"; f.itemSpacing = gap; f.counterAxisAlignItems = "CENTER";
    f.primaryAxisSizingMode = "AUTO"; f.counterAxisSizingMode = "AUTO";
    if (w) { f.primaryAxisSizingMode = "FIXED"; f.resize(w, f.height); }
    return f;
  }
  function col(name, gap, w) {
    const f = figma.createFrame();
    f.name = name; f.fills = []; f.clipsContent = false;
    f.layoutMode = "VERTICAL"; f.itemSpacing = gap;
    f.primaryAxisSizingMode = "AUTO"; f.counterAxisSizingMode = "FIXED";
    f.resize(w || 355, f.height);
    return f;
  }
  function recolor(node, paintArr) {
    const w = (n) => {
      try { if ("fills" in n && n.fills !== figma.mixed && n.fills.length) n.fills = paintArr; if ("strokes" in n && n.strokes && n.strokes.length) n.strokes = paintArr; } catch (e) {}
      if ("children" in n) n.children.forEach(w);
    };
    w(node);
  }

  /* ---------- icône carton : un seul chemin SVG (comme houseIcon) -------- */
  function iconBox(size, paintArr) {
    const d = "M2,6 L30,6 L30,26 L2,26 Z M6,10 L26,10 L26,22 L6,22 Z M12,6 L16,1 L20,6 Z";
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="27" viewBox="0 0 32 27"><path d="' + d + '" fill-rule="evenodd" fill="#000"/></svg>';
    const g = figma.createNodeFromSvg(svg);
    const s = Math.min(size / g.width, size / g.height);
    if (isFinite(s) && s > 0) g.rescale(s);
    recolor(g, paintArr);
    if (g.type === "VECTOR") return g;
    const vec = g.findOne && g.findOne((n) => n.type === "VECTOR");
    if (vec) { figma.currentPage.appendChild(vec); g.remove(); return vec; }
    return g;
  }

  /* ---------- relier un nœud à un écran (clic -> navigation) ------------- */
  async function linkTo(node, destId) {
    if (!destId || !node || !node.setReactionsAsync) return false;
    try {
      await node.setReactionsAsync([{
        trigger: { type: "ON_CLICK" },
        actions: [{ type: "NODE", destinationId: destId, navigation: "NAVIGATE", transition: null, preserveScrollPosition: false }]
      }]);
      return true;
    } catch (e) { log("lien prototype non posé (" + (node.name || "?") + "):", e && e.message); return false; }
  }

  /* ===================================================================== *
   *  clone de l'écran réel (stats du haut conservées telles quelles)
   * ===================================================================== */
  const src = await byId(SRC_ID);
  if (!src) { figma.notify("❌ Mes Cartons (" + SRC_ID + ") introuvable"); return; }
  const page = src.parent;

  const old = page.children.find((n) => n.name === NAME);
  if (old) old.remove();
  const s = src.clone();
  s.name = NAME;

  let maxX = -Infinity;
  for (const c of page.children) { if ("x" in c && "width" in c) maxX = Math.max(maxX, c.x + c.width); }
  s.x = maxX + 100; s.y = src.y;

  // supprime uniquement la section "cartons" bricolée (rectangles orphelins,
  // "Voir Tout" en double, "Gérer mes cartons") — les stats du haut, Nav et
  // FAB restent identiques à l'écran réel.
  const REMOVE_EXACT = ["Rectangle 58", "Frame 37", "Rectangle 61", "Rectangle 62", "Rectangle 67", "Rectangle 72",
    "Carton 1", "Carton 2", "Carton 3", "Voir Tout", "Gérer mes cartons"];
  s.children.slice().forEach((n) => {
    const isBigPanel = n.name === "Panel" && n.width > 300 && n.height > 300;
    if (REMOVE_EXACT.includes(n.name) || isBigPanel) { try { n.remove(); } catch (e) {} }
  });

  /* ===================================================================== *
   *  section "Mes cartons" reconstruite (conteneur auto-layout)
   * ===================================================================== */
  const wrap = col("Section cartons", 18, 355);
  s.appendChild(wrap);
  wrap.x = 19; wrap.y = 264; // reprend la position de l'ancien panel

  const head = row("Entête section", 0, 355);
  const t1 = txt("Mes cartons", 22, BLACK, { title: true });
  head.appendChild(t1); t1.layoutSizingHorizontal = "FILL";
  wrap.appendChild(head);

  // boutons "Créer un carton" / "Voir tout" — clonés des vrais boutons du DS
  const recap = await byId("55:4422");
  const btnRow = recap && recap.findChild((n) => n.children && n.children.some((c) => c.name === "Bouton"));
  const buttons = row("Boutons cartons", 15, 355);
  wrap.appendChild(buttons);
  if (btnRow && btnRow.children[1] && btnRow.children[0]) {
    const creer = btnRow.children[1].clone(); // variante "Plein"
    creer.resize(190, 51);
    const tCreer = creer.findOne((n) => n.type === "TEXT");
    if (tCreer) { try { await figma.loadFontAsync(tCreer.fontName); } catch (e) {} tCreer.characters = "Créer un carton"; tCreer.fills = WHITE; }
    await accentFill(creer);
    buttons.appendChild(creer);

    const voir = btnRow.children[0].clone(); // variante "Contour"
    voir.resize(150, 51);
    const tVoir = voir.findOne((n) => n.type === "TEXT");
    if (tVoir) { try { await figma.loadFontAsync(tVoir.fontName); } catch (e) {} tVoir.characters = "Voir tout"; await accentFill(tVoir); }
    await accentStroke(voir);
    buttons.appendChild(voir);
  }

  // grille de cartons — carte propre en auto-layout (icône + nom + sous-titre)
  const grid = figma.createFrame();
  grid.name = "Grille cartons"; grid.fills = []; grid.clipsContent = false;
  grid.layoutMode = "HORIZONTAL"; grid.layoutWrap = "WRAP"; grid.itemSpacing = 11; grid.counterAxisSpacing = 11;
  grid.primaryAxisSizingMode = "FIXED"; grid.counterAxisSizingMode = "AUTO"; grid.resize(355, grid.height);
  wrap.appendChild(grid); grid.layoutSizingHorizontal = "FILL";

  let ficheCartonId = null;
  const fiche = page.children.find((n) => n.name === "Fiche carton");
  if (fiche) ficheCartonId = fiche.id;

  const cartons = [
    { nom: "Carton 1", sousTitre: "6 objets" },
    { nom: "Carton 2", sousTitre: "5 objets" },
    { nom: "Carton 3", sousTitre: "8 objets" }
  ];
  let linked = 0;
  for (const it of cartons) {
    const card = figma.createFrame();
    card.name = it.nom; card.layoutMode = "VERTICAL";
    card.primaryAxisAlignItems = "CENTER"; card.counterAxisAlignItems = "CENTER"; card.itemSpacing = 8;
    card.paddingTop = card.paddingBottom = 18;
    card.cornerRadius = 16; card.fills = PRIMARY;
    card.primaryAxisSizingMode = "FIXED"; card.counterAxisSizingMode = "FIXED"; card.resize(167, 140);
    card.appendChild(iconBox(32, WHITE));
    const n1 = txt(it.nom, 15, WHITE, { bold: true, align: "CENTER" }); card.appendChild(n1);
    const n2 = txt(it.sousTitre, 12, WHITE_70, { align: "CENTER" }); card.appendChild(n2);
    grid.appendChild(card);
    if (await linkTo(card, ficheCartonId)) linked++;
  }

  page.selection = [s];
  figma.viewport.scrollAndZoomIntoView([s]);
  figma.notify(fiche
    ? "✅ Mes Cartons · Version Claude créé (" + linked + "/3 cartes reliées à Fiche carton)"
    : "✅ Mes Cartons · Version Claude créé — lance penderie-fiches.js pour activer les liens vers Fiche carton");
  log("OK");
})();
