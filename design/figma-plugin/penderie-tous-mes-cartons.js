/* =============================================================================
 *  PENDERIE — "Tous mes cartons" (page intermédiaire Mes Cartons -> Fiche)
 *
 *  Même méthode conteneur/vecteur que les autres scripts : en-tête clonée
 *  de la Récap vêtement (#55:4422 — juste le bandeau + icône retour), liste
 *  en vrai conteneur auto-layout, icône carton en vecteur SVG unique.
 *
 *  Chaque ligne de la liste est reliée (clic -> navigation) à "Fiche
 *  carton" (créée par penderie-fiches.js). Le bouton "Voir tout" de
 *  "Mes Cartons · Version Claude" (créé par penderie-mes-cartons.js) est
 *  relié à cette nouvelle page, complétant le chemin :
 *  Mes Cartons -> Voir tout -> Tous mes cartons -> (clic carton) -> Fiche carton.
 *
 *  Ordre de lancement : penderie-fiches.js, puis penderie-mes-cartons.js,
 *  puis celui-ci.
 *
 *  Ne touche à aucun écran existant. Rejouable.
 * ========================================================================== */

(async () => {
  "use strict";
  const log = (...a) => { try { console.log("[Penderie]", ...a); } catch (e) {} };
  if (figma.loadAllPagesAsync) { try { await figma.loadAllPagesAsync(); } catch (e) {} }
  const byId = (id) => figma.getNodeByIdAsync(id);

  const REF_ID = "55:4422"; // conteneur cloné pour l'en-tête (bandeau + icône retour)
  const NAME = "Tous mes cartons";

  /* ---------- polices ----------------------------------------------------- */
  const okFont = {};
  for (const f of [{ family: "Luciole", style: "Regular" }, { family: "Luciole", style: "Bold" }]) {
    try { await figma.loadFontAsync(f); okFont[f.family + "/" + f.style] = true; } catch (e) {}
  }
  let FB = null;
  try { await figma.loadFontAsync({ family: "Inter", style: "Regular" }); FB = { family: "Inter", style: "Regular" }; } catch (e) {}
  const F = (fam, st) => okFont[fam + "/" + st] ? { family: fam, style: st } : (FB || { family: fam, style: st });
  const BODY = () => F("Luciole", "Regular");
  const BOLD = () => F("Luciole", "Bold");

  /* ---------- couleurs ----------------------------------------------------- */
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
  const FOND = [{ type: "SOLID", color: hex("#F8FAFC") }];

  function txt(s, size, paintArr, opts) {
    opts = opts || {};
    const t = figma.createText();
    t.fontName = opts.bold ? BOLD() : BODY();
    t.fontSize = size;
    t.textAutoResize = "WIDTH_AND_HEIGHT";
    t.fills = paintArr;
    t.characters = s;
    t.lineHeight = { value: Math.round(size * 1.3), unit: "PIXELS" };
    return t;
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
   *  en-tête clonée (bandeau + icône retour) — pas de rangée de boutons ici
   * ===================================================================== */
  const recap = await byId(REF_ID);
  if (!recap) { figma.notify("❌ Récap vêtement (" + REF_ID + ") introuvable"); return; }
  const page = recap.parent;

  const old = page.children.find((n) => n.name === NAME);
  if (old) old.remove();

  const s = recap.clone();
  s.name = NAME;
  s.clipsContent = true;

  const header = s.children.find((n) => n.type === "RECTANGLE" && n.height <= 100);
  const close = s.findChild((n) => n.type === "INSTANCE" && /close/i.test(n.name));
  const keep = {};
  [header, close].forEach((n) => { if (n) keep[n.id] = 1; });
  s.children.slice().forEach((n) => { if (!keep[n.id]) { try { n.remove(); } catch (e) {} } });

  let maxX = -Infinity;
  for (const c of page.children) { if ("x" in c && "width" in c) maxX = Math.max(maxX, c.x + c.width); }
  s.x = maxX + 100; s.y = recap.y;
  page.appendChild(s);

  if (close) { close.x = 14; close.y = 13; }
  const title = txt("Tous mes cartons", 24, BLACK);
  s.appendChild(title); title.x = 60; title.y = 16;

  /* ===================================================================== *
   *  liste des cartons
   * ===================================================================== */
  const list = col("Liste cartons", 12, 355);
  s.appendChild(list); list.x = 19; list.y = 80;

  const fiche = page.children.find((n) => n.name === "Fiche carton");
  const ficheCartonId = fiche ? fiche.id : null;

  const cartons = [
    { nom: "Carton 1", sousTitre: "6 objets · Garage" },
    { nom: "Carton 2", sousTitre: "5 objets · Cave" },
    { nom: "Carton 3", sousTitre: "8 objets · Garage" },
    { nom: "Carton 4", sousTitre: "3 objets · Chambre" },
    { nom: "Carton 5", sousTitre: "10 objets · Grenier" },
    { nom: "Carton 6", sousTitre: "4 objets · Bureau" },
    { nom: "Carton 7", sousTitre: "7 objets · Cave" },
    { nom: "Carton 8", sousTitre: "2 objets · Chambre" }
  ];

  let linked = 0;
  for (const it of cartons) {
    const item = figma.createFrame();
    item.name = it.nom; item.layoutMode = "HORIZONTAL"; item.counterAxisAlignItems = "CENTER"; item.itemSpacing = 14;
    item.paddingLeft = item.paddingRight = 14; item.paddingTop = item.paddingBottom = 12;
    item.cornerRadius = 15; item.fills = FOND;
    item.primaryAxisSizingMode = "FIXED"; item.counterAxisSizingMode = "AUTO"; item.resize(355, item.height);

    const badge = figma.createFrame();
    badge.name = "Icône"; badge.layoutMode = "HORIZONTAL"; badge.primaryAxisAlignItems = "CENTER"; badge.counterAxisAlignItems = "CENTER";
    badge.resize(56, 56); badge.cornerRadius = 12; badge.fills = PRIMARY;
    badge.primaryAxisSizingMode = "FIXED"; badge.counterAxisSizingMode = "FIXED";
    badge.appendChild(iconBox(26, WHITE));
    item.appendChild(badge);

    const textCol = col("Texte", 2, 200);
    const n1 = txt(it.nom, 16, BLACK, { bold: true }); textCol.appendChild(n1); n1.layoutSizingHorizontal = "FILL";
    const n2 = txt(it.sousTitre, 13, GREY); textCol.appendChild(n2); n2.layoutSizingHorizontal = "FILL";
    item.appendChild(textCol); textCol.layoutSizingHorizontal = "FILL";

    const chevron = txt("›", 20, GREY, { bold: true });
    item.appendChild(chevron);

    list.appendChild(item);
    if (await linkTo(item, ficheCartonId)) linked++;
  }

  s.resize(s.width, list.y + list.height + 30);

  /* ===================================================================== *
   *  relie le bouton "Voir tout" de Mes Cartons · Version Claude ici
   * ===================================================================== */
  const mesCartons = page.children.find((n) => n.name === "Mes Cartons · Version Claude");
  let voirToutLinked = false;
  if (mesCartons) {
    const voirToutText = mesCartons.findOne((n) => n.type === "TEXT" && n.characters === "Voir tout");
    const voirToutBtn = voirToutText && voirToutText.parent;
    if (voirToutBtn) voirToutLinked = await linkTo(voirToutBtn, s.id);
  }

  page.selection = [s];
  figma.viewport.scrollAndZoomIntoView([s]);
  figma.notify("✅ « Tous mes cartons » créé (" + linked + "/" + cartons.length + " lignes reliées)"
    + (voirToutLinked ? " — bouton « Voir tout » relié" : " — bouton « Voir tout » non relié (relance après Mes Cartons)"));
  log("OK");
})();
