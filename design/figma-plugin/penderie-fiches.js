/* =============================================================================
 *  PENDERIE — Fiches détail (Vêtement / Objet / Carton)
 *
 *  Même méthode que "Ajouter un logement" (penderie-parcours-logement.js) :
 *  on clone le vrai conteneur de la Récap vêtement (#55:4422) — en-tête,
 *  icône fermeture, rangée de boutons déjà stylée — au lieu de reconstruire
 *  à la main. Le corps (entête objet, lignes d'infos, localisation, statut)
 *  est empilé dans un vrai conteneur auto-layout (col), pas en position
 *  absolue calculée à la main. Les icônes objet/vêtement/carton sont un seul
 *  vecteur SVG extrait de son wrapper (comme houseIcon), pas un tas de
 *  formes dans une frame.
 *
 *  Ouvertes en cliquant sur un article (Derniers ajouts, Mes Cartons).
 *  Ne touche à aucun écran existant. Rejouable.
 * ========================================================================== */

(async () => {
  "use strict";
  const log = (...a) => { try { console.log("[Penderie]", ...a); } catch (e) {} };
  if (figma.loadAllPagesAsync) { try { await figma.loadAllPagesAsync(); } catch (e) {} }
  const byId = (id) => figma.getNodeByIdAsync(id);

  const REF_ID = "55:4422"; // "Ajouter un vêtement · 4 Récap" — conteneur cloné
  const NAMES = ["Fiche vêtement", "Fiche objet", "Fiche carton"];

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
  const MAIN = (await paintFrom("14:1478", "fills")) || [{ type: "SOLID", color: hex("#117D6F") }];
  const MAIN_LIGHT = (await paintFrom("14:1488", "fills")) || [{ type: "SOLID", color: hex("#EAF6F6") }];
  const ERROR = [{ type: "SOLID", color: hex("#DC2626") }];
  const TINT = [Object.assign({}, JSON.parse(JSON.stringify(PRIMARY[0])), { opacity: 0.12 })];
  const SHADOW = [{ type: "DROP_SHADOW", color: { r: 0, g: 0, b: 0, a: 0.12 }, offset: { x: 0, y: 2 }, radius: 8, spread: 0, visible: true, blendMode: "NORMAL" }];

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

  /* ---------- icônes : un seul chemin SVG, vecteur extrait de son wrapper - */
  function svgIcon(d, vbW, vbH, size, paintArr, evenodd) {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + vbW + '" height="' + vbH + '" viewBox="0 0 ' + vbW + ' ' + vbH + '"><path d="' + d + '" fill-rule="' + (evenodd ? "evenodd" : "nonzero") + '" fill="#000"/></svg>';
    const g = figma.createNodeFromSvg(svg);
    const s = Math.min(size / g.width, size / g.height);
    if (isFinite(s) && s > 0) g.rescale(s);
    recolor(g, paintArr);
    if (g.type === "VECTOR") return g;
    const vec = g.findOne && g.findOne((n) => n.type === "VECTOR");
    if (vec) { figma.currentPage.appendChild(vec); g.remove(); return vec; }
    return g;
  }
  const ICON_TSHIRT = "M11,2 L16,6 L21,2 L28,8 L23,13 L21,10.5 L21,30 L11,30 L11,10.5 L9,13 L4,8 Z";
  const ICON_BOX = "M2,6 L30,6 L30,26 L2,26 Z M6,10 L26,10 L26,22 L6,22 Z M12,6 L16,1 L20,6 Z";
  const iconTshirt = (size, paintArr) => svgIcon(ICON_TSHIRT, 32, 32, size, paintArr);
  const iconBox = (size, paintArr) => svgIcon(ICON_BOX, 32, 27, size, paintArr, true);

  /* ---------- carte "Photo" (reprend le style Visuel de la Récap) -------- */
  function photoCard(kind) {
    const card = figma.createFrame();
    card.name = "Photo"; card.layoutMode = "HORIZONTAL";
    card.primaryAxisAlignItems = "CENTER"; card.counterAxisAlignItems = "CENTER";
    card.primaryAxisSizingMode = "FIXED"; card.counterAxisSizingMode = "FIXED";
    card.resize(74, 96); card.cornerRadius = 12; card.clipsContent = false;
    if (kind === "carton") {
      card.fills = PRIMARY;
      card.appendChild(iconBox(38, WHITE));
    } else {
      card.fills = TINT;
      card.strokes = PRIMARY; card.strokeWeight = 1;
      card.appendChild(kind === "objet" ? iconBox(34, PRIMARY) : iconTshirt(34, PRIMARY));
    }
    return card;
  }

  function entete(kind, nom, sousTitre) {
    const head = figma.createFrame();
    head.name = "Entête"; head.fills = []; head.clipsContent = false;
    head.layoutMode = "HORIZONTAL"; head.itemSpacing = 18; head.counterAxisAlignItems = "CENTER";
    head.primaryAxisSizingMode = "FIXED"; head.counterAxisSizingMode = "AUTO"; head.resize(355, head.height);
    head.appendChild(photoCard(kind));
    const nomCol = col("Nom", 2, 200);
    head.appendChild(nomCol); nomCol.layoutSizingHorizontal = "FILL";
    const t1 = txt(nom, 22, BLACK, { title: true }); nomCol.appendChild(t1); t1.layoutSizingHorizontal = "FILL";
    const t2 = txt(sousTitre, 16, GREY); nomCol.appendChild(t2); t2.layoutSizingHorizontal = "FILL";
    return head;
  }

  function line(k, v) {
    const r = figma.createFrame();
    r.name = k; r.fills = []; r.layoutMode = "HORIZONTAL"; r.itemSpacing = 6;
    r.primaryAxisSizingMode = "FIXED"; r.counterAxisSizingMode = "AUTO"; r.resize(355, r.height);
    r.appendChild(txt(k + " : ", 16, GREY));
    r.appendChild(txt(v, 16, BLACK, { bold: true }));
    return r;
  }

  function statutPill(label, textColor, bgFill) {
    const pill = figma.createFrame();
    pill.name = "Statut"; pill.layoutMode = "HORIZONTAL";
    pill.primaryAxisSizingMode = "AUTO"; pill.counterAxisSizingMode = "AUTO";
    pill.paddingLeft = pill.paddingRight = 14; pill.paddingTop = pill.paddingBottom = 8;
    pill.cornerRadius = 45; pill.fills = bgFill;
    pill.appendChild(txt(label, 14, textColor, { bold: true }));
    return pill;
  }

  /* ===================================================================== *
   *  conteneur : clone de la Récap vêtement (en-tête + rangée de boutons)
   * ===================================================================== */
  const recap = await byId(REF_ID);
  if (!recap) { figma.notify("❌ Récap vêtement (" + REF_ID + ") introuvable"); return; }
  const page = recap.parent;

  async function cloneShell(name, xOffset) {
    const old = page.children.find((n) => n.name === name);
    if (old) old.remove();
    const s = recap.clone();
    s.name = name;
    s.x = recap.x + xOffset; s.y = recap.y;
    s.clipsContent = true;

    const header = s.children.find((n) => n.type === "RECTANGLE" && n.height <= 100);
    const close = s.findChild((n) => n.type === "INSTANCE" && /close/i.test(n.name));
    const title = s.findChild((n) => n.type === "TEXT" && /Ajouter un v/i.test(n.characters));
    const btnRow = s.findChild((n) => n.type === "FRAME" && n.children && n.children.some((c) => c.name === "Bouton"));
    const keep = {};
    [header, close, title, btnRow].forEach((n) => { if (n) keep[n.id] = 1; });
    s.children.slice().forEach((c) => { if (!keep[c.id]) { try { c.remove(); } catch (e) {} } });

    page.appendChild(s); // premier plan
    return { s, header, close, title, btnRow };
  }

  async function setBtns(btnRow, backLabel, nextLabel) {
    if (!btnRow) return;
    const b = btnRow.children;
    if (b[0]) {
      await accentStroke(b[0]);
      const t = b[0].findOne((n) => n.type === "TEXT");
      if (t) { try { await figma.loadFontAsync(t.fontName); } catch (e) {} t.characters = backLabel; await accentFill(t); }
    }
    if (b[1]) {
      await accentFill(b[1]);
      const t = b[1].findOne((n) => n.type === "TEXT");
      if (t) { try { await figma.loadFontAsync(t.fontName); } catch (e) {} t.characters = nextLabel; t.fills = WHITE; }
    }
  }

  /* ===================================================================== *
   *  une fiche
   * ===================================================================== */
  async function buildFiche(cfg, xOffset) {
    const { s, close, title, btnRow } = await cloneShell(cfg.name, xOffset);

    if (close) { close.x = 14; close.y = 13; }
    if (title) { try { await figma.loadFontAsync(title.fontName); } catch (e) {} title.characters = cfg.eyebrow; title.x = 60; title.y = 16; }

    const c = col("Contenu", 20, 355);
    s.appendChild(c); c.x = 19; c.y = 80;

    c.appendChild(entete(cfg.kind, cfg.nom, cfg.sousTitre));
    cfg.rows.forEach(([k, v]) => c.appendChild(line(k, v)));

    if (cfg.localisation) {
      const sep = figma.createRectangle(); sep.resize(355, 1); sep.fills = PRIMARY;
      c.appendChild(sep); sep.layoutSizingHorizontal = "FILL";
      const locBlock = col("Localisation bloc", 6, 355);
      c.appendChild(locBlock);
      const ll = txt("Localisation", 14, GREY); locBlock.appendChild(ll); ll.layoutSizingHorizontal = "FILL";
      const lv = txt(cfg.localisation, 16, BLACK, { bold: true }); locBlock.appendChild(lv); lv.layoutSizingHorizontal = "FILL";
    }

    if (cfg.statut) c.appendChild(statutPill(cfg.statut.label, cfg.statut.textColor, cfg.statut.bgFill));
    if (cfg.extra) c.appendChild(cfg.extra);

    await setBtns(btnRow, cfg.actions[0], cfg.actions[1]);
    if (btnRow) { btnRow.x = 19; btnRow.y = c.y + c.height + 20; }

    const supprimer = txt(cfg.actions[2], 14, ERROR, { bold: true, align: "CENTER" });
    s.appendChild(supprimer);
    supprimer.x = (s.width - supprimer.width) / 2;
    supprimer.y = (btnRow ? btnRow.y + btnRow.height : c.y + c.height) + 16;

    s.resize(s.width, supprimer.y + supprimer.height + 32);
    return s;
  }

  /* ===================================================================== *
   *  construction
   * ===================================================================== */
  try {
    NAMES.forEach((nm) => { const old = page.children.find((n) => n.name === nm); if (old) old.remove(); });
    const PITCH = recap.width + 60;

    const ficheVetement = await buildFiche({
      name: "Fiche vêtement", eyebrow: "Fiche vêtement", kind: "vetement",
      nom: "T-shirt Nike", sousTitre: "Nike",
      rows: [["Taille", "M"], ["Couleur", "Noir"], ["Style", "Streetwear"], ["État", "Très bon état"]],
      localisation: "Maison › Chambre › Armoire › Étagère 2",
      statut: { label: "Dans ma penderie", textColor: PRIMARY, bgFill: TINT },
      actions: ["Prêter", "Modifier", "Supprimer ce vêtement"]
    }, 0);

    const ficheObjet = await buildFiche({
      name: "Fiche objet", eyebrow: "Fiche objet", kind: "objet",
      nom: "Appareil photo", sousTitre: "Électronique",
      rows: [["Catégorie", "Électronique"], ["Description", "Canon EOS 2000D + sacoche"]],
      localisation: "Maison › Bureau › Étagère haute",
      statut: { label: "Disponible", textColor: MAIN, bgFill: MAIN_LIGHT },
      actions: ["Prêter", "Modifier", "Supprimer cet objet"]
    }, PITCH);

    // mini liste "contenu" du carton = 2 articles déjà présents ailleurs (clonés, non modifiés)
    const dashMobile = await byId("14:1277");
    let contenu = null;
    if (dashMobile) {
      const items = dashMobile.findAll((n) => n.name === "Article ajouté");
      contenu = col("Contenu du carton", 10, 355);
      const t = txt("Contenu (8 objets)", 14, GREY); contenu.appendChild(t); t.layoutSizingHorizontal = "FILL";
      items.slice(0, 2).forEach((it) => {
        const clone = it.clone();
        clone.layoutPositioning = "AUTO";
        contenu.appendChild(clone);
      });
      const voirTout = txt("Voir tout", 14, PRIMARY, { bold: true });
      contenu.appendChild(voirTout);
    }

    const ficheCarton = await buildFiche({
      name: "Fiche carton", eyebrow: "Fiche carton", kind: "carton",
      nom: "Carton 1", sousTitre: "8 objets",
      rows: [],
      localisation: "Garage › Étagère 3",
      statut: null,
      extra: contenu,
      actions: ["Modifier", "Ajouter un objet", "Supprimer ce carton"]
    }, PITCH * 2);

    const created = [ficheVetement, ficheObjet, ficheCarton];
    page.selection = created;
    figma.viewport.scrollAndZoomIntoView(created);
    figma.notify("✅ 3 fiches créées : vêtement / objet / carton");
    log("OK");
  } catch (e) {
    log("erreur:", e && e.message);
    figma.notify("❌ Fiches : " + (e && e.message));
  }
})();
