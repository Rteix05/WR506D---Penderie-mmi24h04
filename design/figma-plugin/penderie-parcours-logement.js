/* =============================================================================
 *  PENDERIE — Parcours « Ajouter un logement »
 *  Même méthode que "Ajouter un vêtement" (penderie-parcours-vetement-2.js) :
 *  on clone la frame réelle de l'écran 1 du parcours vêtement (en-tête,
 *  icône fermeture, titre, ligne de boutons déjà stylés) pour garantir un
 *  rendu identique — pas de reconstruction manuelle de zéro.
 *
 *  Volontairement plus court qu'un vêtement — un logement se configure
 *  une fois, il ne faut pas de friction :
 *    1. Type de logement   (grille de choix)
 *    2. Ton logement       (photo + Nom + Adresse — 2 champs, pas plus)
 *    3. Vérifie ton logement (récap + "Ajouter ce logement")
 *
 *  Pas d'étape "pièces" séparée : les pièces se créent à la volée quand on
 *  range un objet, pas besoin de les faire déclarer à l'avance.
 *
 *  Placé sous le parcours "Ajouter un vêtement". Rejouable.
 * ========================================================================== */

(async () => {
  "use strict";
  const log = (...a) => { try { console.log("[Penderie]", ...a); } catch (e) {} };
  if (figma.loadAllPagesAsync) { try { await figma.loadAllPagesAsync(); } catch (e) {} }

  const REF_ID = "14:1594"; // "Ajouter un vêtement · 1 Type" — socle cloné
  const S1_NAME = "Ajouter un logement · 1 Type";
  const S2_NAME = "Ajouter un logement · 2 Infos";
  const S3_NAME = "Ajouter un logement · 3 Pièces";
  const S4_NAME = "Ajouter un logement · 4 Récap";

  /* ---------- polices --------------------------------------------------- */
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

  /* ---------- helpers ------------------------------------------------- */
  const byId = (id) => figma.getNodeByIdAsync(id);
  const page = figma.currentPage;

  async function paintFrom(nodeId, kind) {
    const n = await byId(nodeId);
    if (!n) return null;
    const p = (n[kind] && n[kind] !== figma.mixed) ? JSON.parse(JSON.stringify(n[kind])) : [];
    return p.length ? [p[0]] : null;
  }
  const PRIMARY = (await paintFrom("3:36", "fills")) || [{ type: "SOLID", color: { r: 0.827, g: 0.114, b: 0.4 } }];
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
  const TINT = [Object.assign({}, JSON.parse(JSON.stringify(PRIMARY[0])), { opacity: 0.12 })];
  const BLACK = (await paintFrom("14:1657", "fills")) || [{ type: "SOLID", color: { r: 0.102, g: 0.118, b: 0.141 } }];
  const GREY = (await paintFrom("3:232", "fills")) || [{ type: "SOLID", color: { r: 0.278, g: 0.333, b: 0.412 } }];
  const WHITE = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
  const SHADOW = [{ type: "DROP_SHADOW", color: { r: 0, g: 0, b: 0, a: 0.12 }, offset: { x: 0, y: 2 }, radius: 8, spread: 0, visible: true, blendMode: "NORMAL" }];

  function txt(s, size, paint, opts) {
    opts = opts || {};
    const t = figma.createText();
    t.fontName = opts.bold ? BOLD() : (opts.title ? TITLE() : BODY());
    t.fontSize = size;
    t.characters = s;
    t.textAutoResize = "WIDTH_AND_HEIGHT";
    t.fills = paint;
    t.lineHeight = { value: Math.round(size * 1.3), unit: "PIXELS" };
    if (opts.align) t.textAlignHorizontal = opts.align;
    return t;
  }
  function col(name, gap, w) {
    const f = figma.createFrame();
    f.name = name; f.fills = []; f.clipsContent = false;
    f.layoutMode = "VERTICAL"; f.itemSpacing = gap;
    f.primaryAxisSizingMode = "AUTO"; f.counterAxisSizingMode = "FIXED";
    f.resize(w || 355, f.height); // hauteur laissée à l'auto-layout, on ne fige que la largeur
    return f;
  }
  function recolor(node, paint) {
    const w = (n) => {
      try { if ("fills" in n && n.fills !== figma.mixed && n.fills.length) n.fills = paint; if ("strokes" in n && n.strokes && n.strokes.length) n.strokes = paint; } catch (e) {}
      if ("children" in n) n.children.forEach(w);
    };
    w(node);
  }

  // icône maison — un seul chemin fermé (fiable dans Scripter)
  function houseIcon(size, paint) {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="36" viewBox="0 0 40 36"><path d="M20 1 L39 16 L34 16 L34 35 L6 35 L6 16 L1 16 Z" fill="#000"/></svg>';
    const g = figma.createNodeFromSvg(svg);
    const s = Math.min(size / g.width, size / g.height);
    if (isFinite(s) && s > 0) g.rescale(s);
    recolor(g, paint);
    if (g.type === "VECTOR") return g;
    // extrait le vecteur du groupe/frame généré par l'import SVG (ce conteneur pouvait masquer l'icône)
    const vec = g.findOne && g.findOne((n) => n.type === "VECTOR");
    if (vec) { page.appendChild(vec); g.remove(); return vec; }
    return g;
  }
  function cameraIcon(size, paint) {
    const f = figma.createFrame(); f.name = "Icône photo"; f.fills = []; f.clipsContent = false; f.resize(size, Math.round(size * 0.82));
    const sw = Math.max(2, Math.round(size * 0.07));
    const body = figma.createRectangle();
    body.resize(size, Math.round(size * 0.62)); body.x = 0; body.y = Math.round(size * 0.2);
    body.cornerRadius = Math.round(size * 0.14); body.fills = []; body.strokes = paint; body.strokeWeight = sw;
    f.appendChild(body);
    const bump = figma.createRectangle();
    bump.resize(Math.round(size * 0.32), Math.round(size * 0.18)); bump.x = Math.round(size * 0.34); bump.y = Math.round(size * 0.06);
    bump.cornerRadius = Math.round(size * 0.05); bump.fills = []; bump.strokes = paint; bump.strokeWeight = sw;
    f.appendChild(bump);
    const ld = Math.round(size * 0.34);
    const lens = figma.createEllipse();
    lens.resize(ld, ld); lens.x = Math.round((size - ld) / 2); lens.y = Math.round(size * 0.32);
    lens.fills = []; lens.strokes = paint; lens.strokeWeight = sw;
    f.appendChild(lens);
    return f;
  }

  // champ de formulaire (blanc, contour primary, ombre)
  function field(value, isPlaceholder) {
    const f = figma.createFrame();
    f.name = "Champ"; f.layoutMode = "HORIZONTAL"; f.counterAxisAlignItems = "CENTER";
    f.paddingLeft = f.paddingRight = 16; f.paddingTop = f.paddingBottom = 14; f.cornerRadius = 10;
    f.fills = WHITE; f.strokes = PRIMARY; f.strokeWeight = 1;
    try { f.effects = SHADOW; } catch (e) {}
    f.primaryAxisSizingMode = "FIXED"; f.counterAxisSizingMode = "AUTO"; f.resize(355, f.height);
    const t = txt(value, 16, isPlaceholder ? GREY : BLACK);
    f.appendChild(t); t.layoutSizingHorizontal = "FILL";
    return f;
  }
  function labeled(label, node) {
    const c = col("Ligne", 6, 355);
    const l = txt(label, 14, BLACK);
    c.appendChild(l); l.layoutSizingHorizontal = "HUG";
    c.appendChild(node);
    if ("layoutSizingHorizontal" in node) { try { node.layoutSizingHorizontal = "FILL"; } catch (e) {} }
    return c;
  }

  // compteur de pièces (-/valeur/+) — nouvelle brique, ne change rien à l'existant
  function stepper(value) {
    const row = figma.createFrame();
    row.name = "Compteur"; row.layoutMode = "HORIZONTAL"; row.counterAxisAlignItems = "CENTER"; row.itemSpacing = 18;
    row.fills = []; row.primaryAxisSizingMode = "AUTO"; row.counterAxisSizingMode = "AUTO";

    function roundBtn(label) {
      const b = figma.createFrame();
      b.name = "Bouton " + label; b.layoutMode = "HORIZONTAL"; b.primaryAxisAlignItems = "CENTER"; b.counterAxisAlignItems = "CENTER";
      b.resize(44, 44); b.cornerRadius = 22; b.fills = TINT;
      b.primaryAxisSizingMode = "FIXED"; b.counterAxisSizingMode = "FIXED";
      b.appendChild(txt(label, 22, PRIMARY, { bold: true, align: "CENTER" }));
      return b;
    }
    row.appendChild(roundBtn("–"));

    const bubble = figma.createFrame();
    bubble.name = "Valeur"; bubble.layoutMode = "HORIZONTAL"; bubble.primaryAxisAlignItems = "CENTER"; bubble.counterAxisAlignItems = "CENTER";
    bubble.resize(64, 54); bubble.cornerRadius = 27; bubble.fills = WHITE;
    try { bubble.effects = SHADOW; } catch (e) {}
    bubble.primaryAxisSizingMode = "FIXED"; bubble.counterAxisSizingMode = "FIXED";
    bubble.appendChild(txt(String(value), 24, BLACK, { bold: true, align: "CENTER" }));
    row.appendChild(bubble);

    row.appendChild(roundBtn("+"));
    return row;
  }

  // indicateur d'étapes (total paramétrable — ici 4, avec l'étape "Pièces")
  async function steps(current, total) {
    const wrap = figma.createFrame();
    wrap.name = "Étapes"; wrap.fills = []; wrap.clipsContent = false;
    wrap.layoutMode = "HORIZONTAL"; wrap.counterAxisAlignItems = "CENTER"; wrap.itemSpacing = 8;
    wrap.primaryAxisSizingMode = "AUTO"; wrap.counterAxisSizingMode = "AUTO";
    for (let i = 1; i <= total; i++) {
      const d = figma.createEllipse();
      const sz = i === current ? 24 : 16; d.resize(sz, sz);
      if (i <= current) { await accentFill(d); d.strokes = []; }
      else { d.fills = []; await accentStroke(d); d.strokeWeight = 3; }
      wrap.appendChild(d);
      if (i < total) { const b = figma.createRectangle(); b.resize(18, 4); b.cornerRadius = 2; await accentFill(b); b.opacity = i < current ? 1 : 0.35; wrap.appendChild(b); }
    }
    const l = txt("  Étape " + current + " / " + total, 16, BLACK);
    wrap.appendChild(l);
    return wrap;
  }

  /* ---------- socle : cloner l'écran 1 du parcours vêtement --------------- */
  const s1 = await byId(REF_ID);
  if (!s1) { figma.notify("❌ écran vêtement 1 (" + REF_ID + ") introuvable — lance d'abord penderie-parcours-vetement.js"); return; }
  const PITCH = s1.width + 60;
  const BASE_Y = s1.y + s1.height + 120;

  async function cloneShell(name, xOffset) {
    const old = page.children.find((n) => n.name === name);
    if (old) old.remove();
    const s = s1.clone();
    s.name = name;
    s.x = s1.x + xOffset; s.y = BASE_Y;
    s.clipsContent = true;
    if (s.layoutMode && s.layoutMode !== "NONE") s.layoutMode = "NONE";

    const close = s.findChild((n) => n.type === "INSTANCE" || n.name === "Close_round");
    const title = s.findChild((n) => n.type === "TEXT" && /Ajouter un v/i.test(n.characters));
    const btnRow = s.findChild((n) => n.type === "FRAME" && n.children && n.children.some((c) => c.name === "Bouton"));
    const header = s.children.find((n) => n.type === "RECTANGLE" && n.height <= 100);
    const keep = {};
    [header, close, title, btnRow].forEach((n) => { if (n) keep[n.id] = 1; });
    s.children.slice().forEach((c) => { if (!keep[c.id]) { try { c.remove(); } catch (e) {} } });
    if (title) { try { await figma.loadFontAsync(title.fontName); title.characters = "Ajouter un logement"; } catch (e) {} }
    page.appendChild(s); // force l'écran au premier plan (au-dessus de toute frame existante qui chevaucherait la même zone)
    return { s, close, title, btnRow };
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

  function resizeShell(s) {
    s.resize(s1.width, s1.height);
  }

  /* ===================================================================== *
   *  ÉCRAN 1 — « Type de logement »
   * ===================================================================== */
  try {
    const { s, btnRow } = await cloneShell(S1_NAME, 0);

    const st = await steps(1, 4); s.appendChild(st); st.x = 19; st.y = 80;

    const c = col("Contenu", 18, 355);
    s.appendChild(c); c.x = 19; c.y = 150;

    const h2 = txt("Type de logement", 32, BLACK); c.appendChild(h2); h2.layoutSizingHorizontal = "HUG";
    const q = txt("Quel type de logement veux-tu ajouter ?", 16, GREY); c.appendChild(q); q.layoutSizingHorizontal = "FILL";

    const grid = figma.createFrame();
    grid.name = "Choix"; grid.fills = []; grid.clipsContent = false;
    grid.layoutMode = "HORIZONTAL"; grid.layoutWrap = "WRAP"; grid.itemSpacing = 11; grid.counterAxisSpacing = 11;
    grid.primaryAxisSizingMode = "FIXED"; grid.counterAxisSizingMode = "AUTO";
    grid.resize(355, grid.height); // hauteur laissée à l'auto-layout (variable selon le nombre de lignes)
    c.appendChild(grid); grid.layoutSizingHorizontal = "FILL";
    ["Maison", "Appartement", "Studio", "Chambre", "Bureau", "Garde-meuble", "Autre"].forEach((name) => {
      const cell = figma.createFrame();
      cell.name = name; cell.layoutMode = "VERTICAL"; cell.primaryAxisAlignItems = "CENTER"; cell.counterAxisAlignItems = "CENTER";
      cell.itemSpacing = 6; cell.paddingTop = cell.paddingBottom = 12; cell.paddingLeft = cell.paddingRight = 8;
      cell.cornerRadius = 12; cell.fills = TINT;
      cell.primaryAxisSizingMode = "FIXED"; cell.counterAxisSizingMode = "FIXED"; cell.resize(111, 78);
      cell.appendChild(houseIcon(32, PRIMARY));
      const t = txt(name, 14, BLACK, { align: "CENTER" }); cell.appendChild(t); t.layoutSizingHorizontal = "FILL";
      grid.appendChild(cell);
    });

    await setBtns(btnRow, "Annuler", "Continuer");
    if (btnRow) { btnRow.x = 19; btnRow.y = c.y + c.height + 28; }
    resizeShell(s);
    log("Écran 1 (logement) OK");
  } catch (e) { log("écran 1:", e && e.message); figma.notify("⚠ écran 1 : " + (e && e.message)); }

  /* ===================================================================== *
   *  ÉCRAN 2 — « Ton logement »  (2 champs seulement : simplicité voulue)
   * ===================================================================== */
  try {
    const { s, btnRow } = await cloneShell(S2_NAME, PITCH);

    const st = await steps(2, 4); s.appendChild(st); st.x = 19; st.y = 80;

    const c = col("Contenu", 18, 355);
    s.appendChild(c); c.x = 19; c.y = 150;
    const h2 = txt("Ton logement", 32, BLACK); c.appendChild(h2); h2.layoutSizingHorizontal = "HUG";
    const sub = txt("Juste de quoi le reconnaître — tu pourras compléter plus tard.", 16, GREY); c.appendChild(sub); sub.layoutSizingHorizontal = "FILL";

    const photo = figma.createFrame();
    photo.name = "Photo"; photo.layoutMode = "VERTICAL"; photo.primaryAxisAlignItems = "CENTER"; photo.counterAxisAlignItems = "CENTER";
    photo.itemSpacing = 8; photo.paddingTop = photo.paddingBottom = 22; photo.cornerRadius = 16;
    photo.fills = TINT; photo.strokes = PRIMARY; photo.strokeWeight = 2; photo.dashPattern = [8, 6];
    photo.primaryAxisSizingMode = "FIXED"; photo.counterAxisSizingMode = "FIXED"; photo.resize(355, 120);
    c.appendChild(photo); photo.layoutSizingHorizontal = "FILL";
    photo.appendChild(cameraIcon(38, PRIMARY));
    photo.appendChild(txt("Ajouter une photo (optionnel)", 15, BLACK, { align: "CENTER" }));

    c.appendChild(labeled("Nom", field("Appartement Paris", true)));
    c.appendChild(labeled("Adresse", field("12 rue des Lilas, Paris", true)));

    await setBtns(btnRow, "Retour", "Continuer");
    if (btnRow) { btnRow.x = 19; btnRow.y = c.y + c.height + 28; }
    resizeShell(s);
    log("Écran 2 (logement) OK");
  } catch (e) { log("écran 2:", e && e.message); figma.notify("⚠ écran 2 : " + (e && e.message)); }

  /* ===================================================================== *
   *  ÉCRAN 3 — « Combien de pièces ? »
   * ===================================================================== */
  try {
    const { s, btnRow } = await cloneShell(S3_NAME, PITCH * 2);

    const st = await steps(3, 4); s.appendChild(st); st.x = 19; st.y = 80;

    const c = col("Contenu", 18, 355);
    s.appendChild(c); c.x = 19; c.y = 150;
    const h2 = txt("Combien de pièces ?", 32, BLACK); c.appendChild(h2); h2.layoutSizingHorizontal = "HUG";
    const sub = txt("Indique le nombre de pièces de ce logement.", 16, GREY); c.appendChild(sub); sub.layoutSizingHorizontal = "FILL";

    c.appendChild(stepper(3));
    c.appendChild(labeled("Surface — optionnel", field("45 m²", true)));

    await setBtns(btnRow, "Retour", "Continuer");
    if (btnRow) { btnRow.x = 19; btnRow.y = c.y + c.height + 28; }
    resizeShell(s);
    log("Écran 3 (pièces) OK");
  } catch (e) { log("écran 3:", e && e.message); figma.notify("⚠ écran 3 : " + (e && e.message)); }

  /* ===================================================================== *
   *  ÉCRAN 4 — « Vérifie ton logement »
   * ===================================================================== */
  try {
    const { s, btnRow } = await cloneShell(S4_NAME, PITCH * 3);

    const st = await steps(4, 4); s.appendChild(st); st.x = 19; st.y = 80;

    const c = col("Récap", 14, 355);
    s.appendChild(c); c.x = 19; c.y = 150;
    const h2 = txt("Vérifie ton logement", 28, BLACK); c.appendChild(h2); h2.layoutSizingHorizontal = "FILL";

    const head = figma.createFrame();
    head.name = "Entête"; head.layoutMode = "HORIZONTAL"; head.counterAxisAlignItems = "CENTER"; head.itemSpacing = 14; head.fills = [];
    head.primaryAxisSizingMode = "FIXED"; head.counterAxisSizingMode = "AUTO"; head.resize(355, head.height);
    c.appendChild(head); head.layoutSizingHorizontal = "FILL";
    const thumb = figma.createFrame(); thumb.name = "Photo"; thumb.resize(84, 84); thumb.cornerRadius = 14; thumb.fills = TINT;
    thumb.layoutMode = "HORIZONTAL"; thumb.primaryAxisAlignItems = "CENTER"; thumb.counterAxisAlignItems = "CENTER";
    thumb.appendChild(houseIcon(34, PRIMARY));
    head.appendChild(thumb);
    const nameCol = col("Nom", 2, 200); head.appendChild(nameCol); nameCol.layoutSizingHorizontal = "FILL";
    const nm = txt("Appartement Paris", 22, BLACK, { bold: true }); nameCol.appendChild(nm); nm.layoutSizingHorizontal = "FILL";
    const ty = txt("Appartement", 16, GREY); nameCol.appendChild(ty); ty.layoutSizingHorizontal = "FILL";

    const line = (k, v) => {
      const r = figma.createFrame(); r.name = k; r.layoutMode = "HORIZONTAL"; r.itemSpacing = 6; r.fills = [];
      r.primaryAxisSizingMode = "FIXED"; r.counterAxisSizingMode = "AUTO"; r.resize(355, r.height);
      const a = txt(k + " : ", 16, GREY); const b2 = txt(v, 16, BLACK, { bold: true });
      r.appendChild(a); r.appendChild(b2);
      c.appendChild(r); r.layoutSizingHorizontal = "FILL";
    };
    line("Adresse", "12 rue des Lilas, Paris");
    line("Pièces", "3");
    line("Surface", "45 m²");

    const info = txt("Le nom de chaque pièce (chambre, salon…) se précise plus tard, quand tu ranges un objet.", 13, GREY);
    c.appendChild(info); info.layoutSizingHorizontal = "FILL";

    await setBtns(btnRow, "Modifier", "Ajouter ce logement");
    if (btnRow) { btnRow.x = 19; btnRow.y = c.y + c.height + 28; }
    resizeShell(s);
    log("Écran 4 (logement) OK");
  } catch (e) { log("écran 4:", e && e.message); figma.notify("⚠ écran 4 : " + (e && e.message)); }

  /* ---------- fin ---------------------------------------------------- */
  const all = [];
  for (const nm of [S1_NAME, S2_NAME, S3_NAME, S4_NAME]) { const n = page.children.find((x) => x.name === nm); if (n) all.push(n); }
  page.selection = all;
  figma.viewport.scrollAndZoomIntoView(all);
  figma.notify("✅ Parcours « Ajouter un logement » créé (4 écrans)");
})();
