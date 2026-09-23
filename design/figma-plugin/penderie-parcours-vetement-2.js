/* =============================================================================
 *  PENDERIE — Parcours « Ajouter un vêtement »  —  PARTIES 2, 3, 4 / 4
 *
 *  À lancer APRÈS penderie-parcours-vetement.js (écran 1) et depuis la page
 *  "Maquette".  Crée / met à jour :
 *    • Écran 2  « Ton vêtement »     (clone de l'écran 1 -> formulaire)
 *    • Écran 3  « Localisation »     (clone de l'écran 1 -> rangement)
 *    • Écran 4  « Vérifie ton vêtement »  (clone de l'écran 1 -> récap)
 *
 *  Les 4 écrans sont alignés en ligne à droite de l'écran 1.
 *  Accent = style "primary" (#D31D66).  Rejouable (les écrans 2/3/4 sont recréés).
 * ========================================================================== */

(async () => {
  "use strict";
  const log = (...a) => { try { console.log("[Penderie]", ...a); } catch (e) {} };
  if (figma.loadAllPagesAsync) { try { await figma.loadAllPagesAsync(); } catch (e) {} }

  const S1_ID = "14:1594";     // écran 1 (déjà transformé)
  const S2_NAME = "Ajouter un vêtement · 2 Infos";
  const S3_NAME = "Ajouter un vêtement · 3 Localisation";
  const S4_NAME = "Ajouter un vêtement · 4 Récap";

  /* ---------- polices ------------------------------------------------- */
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

  const SVG_CAM = '<svg xmlns="http://www.w3.org/2000/svg" width="42" height="34" viewBox="0 0 42 34"><rect x="2" y="8" width="38" height="24" rx="4" fill="none" stroke="#000" stroke-width="3"/><circle cx="21" cy="20" r="7" fill="none" stroke="#000" stroke-width="3"/><path d="M13 8 L16 3 L26 3 L29 8" fill="none" stroke="#000" stroke-width="3" stroke-linejoin="round"/></svg>';
  const SVG_CHEV = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="10" viewBox="0 0 16 10"><path d="M2 2 L8 8 L14 2" fill="none" stroke="#000" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function recolor(node, paint) {
    const w = (n) => {
      try {
        if ("fills" in n && n.fills !== figma.mixed && n.fills.length) n.fills = paint;
        if ("strokes" in n && n.strokes && n.strokes.length) n.strokes = paint;
      } catch (e) {}
      if ("children" in n) n.children.forEach(w);
    };
    w(node);
  }
  function svgNode(svg, target, paint) {
    const g = figma.createNodeFromSvg(svg);
    const s = Math.min(target / g.width, target / g.height);
    if (isFinite(s) && s > 0) g.rescale(s);
    if (paint) recolor(g, paint);
    return g;
  }
  // icône appareil photo construite en formes natives (createNodeFromSvg de Scripter
  // ne gère pas les SVG multi-formes -> l'icône sortait en carré plein)
  function cameraIcon(size, paint) {
    const f = figma.createFrame();
    f.name = "Icône photo"; f.fills = []; f.clipsContent = false;
    f.resize(size, Math.round(size * 0.82));
    const sw = Math.max(2, Math.round(size * 0.07));
    const body = figma.createRectangle();
    body.resize(size, Math.round(size * 0.62));
    body.x = 0; body.y = Math.round(size * 0.2);
    body.cornerRadius = Math.round(size * 0.14);
    body.fills = []; body.strokes = paint; body.strokeWeight = sw;
    f.appendChild(body);
    const bump = figma.createRectangle();
    bump.resize(Math.round(size * 0.32), Math.round(size * 0.18));
    bump.x = Math.round(size * 0.34); bump.y = Math.round(size * 0.06);
    bump.cornerRadius = Math.round(size * 0.05);
    bump.fills = []; bump.strokes = paint; bump.strokeWeight = sw;
    f.appendChild(bump);
    const ld = Math.round(size * 0.34);
    const lens = figma.createEllipse();
    lens.resize(ld, ld);
    lens.x = Math.round((size - ld) / 2); lens.y = Math.round(size * 0.32);
    lens.fills = []; lens.strokes = paint; lens.strokeWeight = sw;
    f.appendChild(lens);
    return f;
  }
  function txt(s, size, paint, opts) {
    opts = opts || {};
    const t = figma.createText();
    t.fontName = opts.bold ? BOLD() : (opts.title ? TITLE() : BODY());
    t.fontSize = size;
    t.characters = s;
    t.textAutoResize = "WIDTH_AND_HEIGHT"; // sinon boîte 0 -> tout s'entasse
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

  // champ de formulaire (blanc, contour primary, ombre) — chevron optionnel
  function field(value, isPlaceholder, withChevron) {
    const f = figma.createFrame();
    f.name = "Champ";
    f.layoutMode = "HORIZONTAL"; f.primaryAxisAlignItems = "SPACE_BETWEEN"; f.counterAxisAlignItems = "CENTER";
    f.paddingLeft = f.paddingRight = 16; f.paddingTop = f.paddingBottom = 14;
    f.itemSpacing = 8; f.cornerRadius = 10;
    f.fills = WHITE; f.strokes = PRIMARY; f.strokeWeight = 1;
    try { f.effects = SHADOW; } catch (e) {}
    f.primaryAxisSizingMode = "FIXED"; f.counterAxisSizingMode = "AUTO";
    f.resize(355, f.height); // hauteur laissée à l'auto-layout
    const t = txt(value, 16, isPlaceholder ? GREY : BLACK);
    f.appendChild(t); t.layoutSizingHorizontal = "FILL";
    if (withChevron) { const c = svgNode(SVG_CHEV, 14, BLACK); f.appendChild(c); }
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
  function chip(label, selected) {
    const f = figma.createFrame();
    f.name = "Puce " + label;
    f.layoutMode = "HORIZONTAL"; f.primaryAxisAlignItems = "CENTER"; f.counterAxisAlignItems = "CENTER";
    f.paddingLeft = f.paddingRight = 16; f.paddingTop = 8; f.paddingBottom = 9;
    f.cornerRadius = 45;
    f.primaryAxisSizingMode = "AUTO"; f.counterAxisSizingMode = "AUTO";
    f.fills = selected ? PRIMARY : TINT;
    const t = txt(label, 14, selected ? WHITE : PRIMARY);
    f.appendChild(t);
    return f;
  }
  function chipRow(options, selIdx) {
    const f = figma.createFrame();
    f.name = "Puces"; f.fills = []; f.clipsContent = false;
    f.layoutMode = "HORIZONTAL"; f.layoutWrap = "WRAP"; f.itemSpacing = 8; f.counterAxisSpacing = 8;
    f.primaryAxisSizingMode = "FIXED"; f.counterAxisSizingMode = "AUTO";
    f.resize(355, f.height); // hauteur laissée à l'auto-layout (variable selon le nombre de lignes)
    options.forEach((o, i) => f.appendChild(chip(o, i === selIdx)));
    return f;
  }

  // indicateur d'étapes 4 pas
  async function steps(current) {
    const wrap = figma.createFrame();
    wrap.name = "Étapes"; wrap.fills = []; wrap.clipsContent = false;
    wrap.layoutMode = "HORIZONTAL"; wrap.counterAxisAlignItems = "CENTER"; wrap.itemSpacing = 6;
    wrap.primaryAxisSizingMode = "AUTO"; wrap.counterAxisSizingMode = "AUTO";
    for (let i = 1; i <= 4; i++) {
      const d = figma.createEllipse();
      const sz = i === current ? 22 : 16; d.resize(sz, sz);
      if (i <= current) { await accentFill(d); d.strokes = []; }
      else { d.fills = []; await accentStroke(d); d.strokeWeight = 3; }
      wrap.appendChild(d);
      if (i < 4) { const b = figma.createRectangle(); b.resize(16, 4); b.cornerRadius = 2; await accentFill(b); b.opacity = i < current ? 1 : 0.35; wrap.appendChild(b); }
    }
    const l = txt("  Étape " + current + " / 4", 16, BLACK);
    wrap.appendChild(l);
    return wrap;
  }

  /* ---------- socle : cloner l'écran 1 en gardant en-tête + titre + boutons */
  const s1 = await byId(S1_ID);
  if (!s1) { figma.notify("❌ écran 1 (" + S1_ID + ") introuvable — lance d'abord la partie 1"); return; }
  const PITCH = s1.width + 60;

  async function cloneShell(name, xOffset) {
    const old = page.children.find((n) => n.name === name);
    if (old) old.remove();
    const s = s1.clone();
    s.name = name;
    s.x = s1.x + xOffset; s.y = s1.y;
    s.clipsContent = true;
    if (s.layoutMode && s.layoutMode !== "NONE") s.layoutMode = "NONE";

    const close = s.findChild((n) => n.type === "INSTANCE" || n.name === "Close_round");
    const title = s.findChild((n) => n.type === "TEXT" && /Ajouter un v/i.test(n.characters));
    const btnRow = s.findChild((n) => n.type === "FRAME" && n.children && n.children.some((c) => c.name === "Bouton"));
    const header = s.children.find((n) => n.type === "RECTANGLE" && n.height <= 100);
    const keep = {};
    [header, close, title, btnRow].forEach((n) => { if (n) keep[n.id] = 1; });
    s.children.slice().forEach((c) => { if (!keep[c.id]) { try { c.remove(); } catch (e) {} } });
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
   *  ÉCRAN 2 — « Ton vêtement »
   * ===================================================================== */
  try {
    const { s, btnRow } = await cloneShell(S2_NAME, PITCH);

    const st = await steps(2); s.appendChild(st); st.x = 19; st.y = 80;

    const c = col("Contenu", 18, 355);
    s.appendChild(c); c.x = 19; c.y = 150;

    const h2 = txt("Ton vêtement", 32, BLACK); c.appendChild(h2); h2.layoutSizingHorizontal = "HUG";
    const sub = txt("Ajoute une photo puis les infos principales.", 16, GREY); c.appendChild(sub); sub.layoutSizingHorizontal = "FILL";

    // zone photo / scan
    const photo = figma.createFrame();
    photo.name = "Photo"; photo.layoutMode = "VERTICAL"; photo.primaryAxisAlignItems = "CENTER"; photo.counterAxisAlignItems = "CENTER";
    photo.itemSpacing = 8; photo.paddingTop = photo.paddingBottom = 26; photo.cornerRadius = 16;
    photo.fills = TINT; photo.strokes = PRIMARY; photo.strokeWeight = 2; photo.dashPattern = [8, 6];
    photo.primaryAxisSizingMode = "FIXED"; photo.counterAxisSizingMode = "FIXED"; photo.resize(355, 150);
    c.appendChild(photo); photo.layoutSizingHorizontal = "FILL";
    photo.appendChild(cameraIcon(44, PRIMARY));
    photo.appendChild(txt("Prendre ou importer une photo", 16, BLACK, { align: "CENTER" }));
    const scan = txt("Scanner le vêtement", 14, PRIMARY, { align: "CENTER", bold: true });
    photo.appendChild(scan);

    c.appendChild(labeled("Nom", field("Sweat Nike Tech", true, false)));
    c.appendChild(labeled("Marque", field("Nike", true, false)));
    c.appendChild(labeled("Taille", chipRow(["XS", "S", "M", "L", "XL", "XXL", "Autre"], 2)));
    c.appendChild(labeled("Couleur", field("Noir", true, false)));
    c.appendChild(labeled("Style", chipRow(["Casual", "Sport", "Élégant", "Streetwear", "Chic", "Autre"], 3)));
    c.appendChild(labeled("État", chipRow(["Neuf", "Très bon état", "Bon état", "Usé"], 1)));

    await setBtns(btnRow, "Retour", "Continuer");
    if (btnRow) { btnRow.x = 19; btnRow.y = c.y + c.height + 28; }
    resizeShell(s);
    log("Écran 2 OK");
  } catch (e) { log("écran 2:", e && e.message); figma.notify("⚠ écran 2 : " + (e && e.message)); }

  /* ===================================================================== *
   *  ÉCRAN 3 — « Localisation »
   * ===================================================================== */
  try {
    const { s, btnRow } = await cloneShell(S3_NAME, PITCH * 2);

    const st = await steps(3); s.appendChild(st); st.x = 19; st.y = 80;

    const c = col("Contenu", 16, 355);
    s.appendChild(c); c.x = 19; c.y = 150;

    const h2 = txt("Où se trouve ce vêtement ?", 28, BLACK); c.appendChild(h2); h2.layoutSizingHorizontal = "FILL";
    const sub = txt("Indique où il est rangé pour le retrouver facilement.", 16, GREY); c.appendChild(sub); sub.layoutSizingHorizontal = "FILL";

    const spacer = figma.createFrame(); spacer.resize(355, 4); spacer.fills = []; c.appendChild(spacer); spacer.layoutSizingHorizontal = "FILL";

    c.appendChild(labeled("Lieu", field("Maison", false, true)));
    c.appendChild(labeled("Pièce", field("Chambre", false, true)));
    c.appendChild(labeled("Rangement", field("Armoire", false, true)));
    c.appendChild(labeled("Emplacement", field("Étagère 2", false, true)));

    // fil d'ariane
    const bc = figma.createFrame();
    bc.name = "Chemin"; bc.layoutMode = "HORIZONTAL"; bc.counterAxisAlignItems = "CENTER";
    bc.paddingLeft = bc.paddingRight = 14; bc.paddingTop = bc.paddingBottom = 10; bc.cornerRadius = 10;
    bc.fills = TINT; bc.primaryAxisSizingMode = "AUTO"; bc.counterAxisSizingMode = "AUTO";
    bc.appendChild(txt("Maison › Chambre › Armoire › Étagère 2", 12, PRIMARY, { bold: true }));
    c.appendChild(bc); bc.layoutSizingHorizontal = "FILL";
    bc.children[0].layoutSizingHorizontal = "FILL";

    await setBtns(btnRow, "Retour", "Continuer");
    if (btnRow) { btnRow.x = 19; btnRow.y = c.y + c.height + 32; }
    resizeShell(s);
    log("Écran 3 OK");
  } catch (e) { log("écran 3:", e && e.message); figma.notify("⚠ écran 3 : " + (e && e.message)); }

  /* ===================================================================== *
   *  ÉCRAN 4 — « Vérifie ton vêtement »  (même socle que les écrans 2/3)
   *  ⚠ NE PAS RELANCER cette partie : l'écran 4 en cours dans Figma a été
   *     ajusté à la main et diffère de ce bloc.
   * ===================================================================== */
  const RUN_ECRAN_4 = false;
  if (RUN_ECRAN_4) try {
    const { s, btnRow } = await cloneShell(S4_NAME, PITCH * 3);

    const st = await steps(4); s.appendChild(st); st.x = 19; st.y = 80;

    const c = col("Récap", 14, 355);
    s.appendChild(c); c.x = 19; c.y = 150;

    const h2 = txt("Vérifie ton vêtement", 28, BLACK); c.appendChild(h2); h2.layoutSizingHorizontal = "FILL";

    // vignette photo + nom
    const head = figma.createFrame();
    head.name = "Entête"; head.layoutMode = "HORIZONTAL"; head.counterAxisAlignItems = "CENTER"; head.itemSpacing = 14;
    head.fills = []; head.primaryAxisSizingMode = "FIXED"; head.counterAxisSizingMode = "AUTO"; head.resize(355, head.height);
    c.appendChild(head); head.layoutSizingHorizontal = "FILL";
    const thumb = figma.createFrame(); thumb.name = "Photo"; thumb.resize(96, 96); thumb.cornerRadius = 14; thumb.fills = TINT;
    thumb.layoutMode = "HORIZONTAL"; thumb.primaryAxisAlignItems = "CENTER"; thumb.counterAxisAlignItems = "CENTER";
    thumb.appendChild(cameraIcon(38, PRIMARY));
    head.appendChild(thumb);
    const nameCol = col("Nom", 2, 200); head.appendChild(nameCol); nameCol.layoutSizingHorizontal = "FILL";
    const nm = txt("Sweat Nike Tech", 22, BLACK, { bold: true }); nameCol.appendChild(nm); nm.layoutSizingHorizontal = "FILL";
    const br = txt("Nike", 16, GREY); nameCol.appendChild(br); br.layoutSizingHorizontal = "FILL";

    const line = (k, v) => {
      const r = figma.createFrame(); r.name = k; r.layoutMode = "HORIZONTAL"; r.itemSpacing = 6; r.fills = [];
      r.primaryAxisSizingMode = "FIXED"; r.counterAxisSizingMode = "AUTO"; r.resize(355, r.height);
      const a = txt(k + " : ", 16, GREY); const b2 = txt(v, 16, BLACK, { bold: true });
      r.appendChild(a); r.appendChild(b2);
      c.appendChild(r); r.layoutSizingHorizontal = "FILL";
    };
    line("Taille", "M");
    line("Couleur", "Noir");
    line("Style", "Streetwear");
    line("État", "Très bon état");

    const div = figma.createRectangle(); div.resize(355, 1); div.fills = PRIMARY; div.opacity = 0.25;
    c.appendChild(div); div.layoutSizingHorizontal = "FILL";

    const loc = txt("Localisation", 14, GREY); c.appendChild(loc); loc.layoutSizingHorizontal = "HUG";
    const locv = txt("Maison › Chambre › Armoire › Étagère 2", 14, BLACK, { bold: true }); c.appendChild(locv); locv.layoutSizingHorizontal = "FILL";

    const statut = figma.createFrame();
    statut.name = "Statut"; statut.layoutMode = "HORIZONTAL"; statut.counterAxisAlignItems = "CENTER";
    statut.paddingLeft = statut.paddingRight = 14; statut.paddingTop = statut.paddingBottom = 8; statut.cornerRadius = 45;
    statut.fills = TINT; statut.primaryAxisSizingMode = "AUTO"; statut.counterAxisSizingMode = "AUTO";
    statut.appendChild(txt("Dans ma penderie", 14, PRIMARY, { bold: true }));
    c.appendChild(statut);

    await setBtns(btnRow, "Modifier", "Ajouter");
    if (btnRow) { btnRow.x = 19; btnRow.y = c.y + c.height + 28; }
    resizeShell(s);
    log("Écran 4 OK");
  } catch (e) { log("écran 4:", e && e.message); figma.notify("⚠ écran 4 : " + (e && e.message)); }

  /* ---------- fin ---------------------------------------------------- */
  const all = [s1];
  for (const nm of [S2_NAME, S3_NAME, S4_NAME]) { const n = page.children.find((x) => x.name === nm); if (n) all.push(n); }
  page.selection = all;
  figma.viewport.scrollAndZoomIntoView(all);
  figma.notify("✅ Parcours « Ajouter un vêtement » — écrans 2, 3 régénérés (écran 4 non touché)");
})();
