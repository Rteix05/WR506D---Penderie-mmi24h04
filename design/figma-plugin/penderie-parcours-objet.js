/* =============================================================================
 *  PENDERIE — Parcours « Ajouter un objet » + page de choix « Vêtement / Objet »
 *
 *  Même méthode que "Ajouter un logement" (penderie-parcours-logement.js) :
 *  on clone le vrai conteneur de "Ajouter un vêtement · 1 Type" (#14:1594) —
 *  bandeau, icône fermeture, rangée de boutons déjà stylée — pour chaque
 *  écran. Icônes en un seul vecteur SVG extrait de son wrapper.
 *
 *  Pour la cohérence entre les 2 parcours : une nouvelle page « Ajouter ·
 *  Choix » demande d'abord Vêtement ou Objet, puis chacun mène à SON
 *  formulaire (le parcours vêtement existant, ou ce nouveau parcours objet,
 *  plus court — un objet a moins de champs qu'un vêtement) :
 *
 *    Ajouter · Choix  ─┬─▶ Ajouter un vêtement · 1 Type  (existant)
 *                       └─▶ Ajouter un objet · 1 Infos → 2 Localisation → 3 Récap
 *
 *  Chemins posés (clic -> navigation) :
 *   - bulles « Vêtement » / « Objet » du menu radial (Dashboard Mobile ·
 *     Menu ajout) -> Ajouter · Choix
 *   - carte Vêtement -> Ajouter un vêtement · 1 Type ; carte Objet -> Ajouter
 *     un objet · 1 Infos
 *   - bouton « Ajouter cet objet » de la Récap -> confirmation success (si
 *     déjà créée)
 *
 *  Ordre de lancement conseillé : après penderie-menu-ajout.js (pour que les
 *  bulles existent déjà). Ne touche à aucun écran existant. Rejouable.
 * ========================================================================== */

(async () => {
  "use strict";
  const log = (...a) => { try { console.log("[Penderie]", ...a); } catch (e) {} };
  if (figma.loadAllPagesAsync) { try { await figma.loadAllPagesAsync(); } catch (e) {} }
  const byId = (id) => figma.getNodeByIdAsync(id);

  const REF_ID = "14:1594"; // "Ajouter un vêtement · 1 Type" — socle cloné
  const CHOIX_NAME = "Ajouter · Choix";
  const S1_NAME = "Ajouter un objet · 1 Infos";
  const S2_NAME = "Ajouter un objet · 2 Localisation";
  const S3_NAME = "Ajouter un objet · 3 Récap";

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

  /* ---------- couleurs ----------------------------------------------------- */
  async function paintFrom(nodeId, kind) {
    const n = await byId(nodeId);
    if (!n) return null;
    const p = (n[kind] && n[kind] !== figma.mixed) ? JSON.parse(JSON.stringify(n[kind])) : [];
    return p.length ? [p[0]] : null;
  }
  const hex = (h) => { h = h.replace("#", ""); return { r: parseInt(h.slice(0, 2), 16) / 255, g: parseInt(h.slice(2, 4), 16) / 255, b: parseInt(h.slice(4, 6), 16) / 255 }; };
  const PRIMARY = (await paintFrom("3:36", "fills")) || [{ type: "SOLID", color: hex("#D31D66") }];
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
  const BLACK = (await paintFrom("14:1657", "fills")) || [{ type: "SOLID", color: hex("#1A1E24") }];
  const GREY = (await paintFrom("3:232", "fills")) || [{ type: "SOLID", color: hex("#475569") }];
  const WHITE = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
  const MAIN = (await paintFrom("14:1478", "fills")) || [{ type: "SOLID", color: hex("#117D6F") }];
  const MAIN_LIGHT = (await paintFrom("14:1488", "fills")) || [{ type: "SOLID", color: hex("#EAF6F6") }];
  const SHADOW = [{ type: "DROP_SHADOW", color: { r: 0, g: 0, b: 0, a: 0.12 }, offset: { x: 0, y: 2 }, radius: 8, spread: 0, visible: true, blendMode: "NORMAL" }];

  function txt(s, size, paintArr, opts) {
    opts = opts || {};
    const t = figma.createText();
    t.fontName = opts.bold ? BOLD() : (opts.title ? TITLE() : BODY());
    t.fontSize = size;
    t.characters = s;
    t.textAutoResize = "WIDTH_AND_HEIGHT";
    t.fills = paintArr;
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
  function row(name, gap, w) {
    const f = figma.createFrame();
    f.name = name; f.fills = []; f.clipsContent = false;
    f.layoutMode = "HORIZONTAL"; f.itemSpacing = gap; f.counterAxisAlignItems = "CENTER";
    f.primaryAxisSizingMode = w ? "FIXED" : "AUTO"; f.counterAxisSizingMode = "AUTO";
    if (w) f.resize(w, f.height);
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

  function cameraIcon(size, paintArr) {
    const f = figma.createFrame(); f.name = "Icône photo"; f.fills = []; f.clipsContent = false; f.resize(size, Math.round(size * 0.82));
    const sw = Math.max(2, Math.round(size * 0.07));
    const body = figma.createRectangle();
    body.resize(size, Math.round(size * 0.62)); body.x = 0; body.y = Math.round(size * 0.2);
    body.cornerRadius = Math.round(size * 0.14); body.fills = []; body.strokes = paintArr; body.strokeWeight = sw;
    f.appendChild(body);
    const bump = figma.createRectangle();
    bump.resize(Math.round(size * 0.32), Math.round(size * 0.18)); bump.x = Math.round(size * 0.34); bump.y = Math.round(size * 0.06);
    bump.cornerRadius = Math.round(size * 0.05); bump.fills = []; bump.strokes = paintArr; bump.strokeWeight = sw;
    f.appendChild(bump);
    const ld = Math.round(size * 0.34);
    const lens = figma.createEllipse();
    lens.resize(ld, ld); lens.x = Math.round((size - ld) / 2); lens.y = Math.round(size * 0.32);
    lens.fills = []; lens.strokes = paintArr; lens.strokeWeight = sw;
    f.appendChild(lens);
    return f;
  }

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

  /* ---------- indicateur d'étapes ----------------------------------------- */
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
  if (!s1) { figma.notify("❌ écran vêtement 1 (" + REF_ID + ") introuvable"); return; }
  const page = s1.parent;
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
    page.appendChild(s);
    return { s, close, title, btnRow };
  }

  async function setTitle(title, label) {
    if (!title) return;
    try { await figma.loadFontAsync(title.fontName); } catch (e) {}
    title.characters = label;
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
  function resizeShell(s) { s.resize(s1.width, s1.height); }

  /* ===================================================================== *
   *  ÉCRAN OBJET 1 — « Ton objet »
   * ===================================================================== */
  let s1obj;
  try {
    const { s, btnRow } = await cloneShell(S1_NAME, PITCH);
    s1obj = s;
    const st = await steps(1, 3); s.appendChild(st); st.x = 19; st.y = 80;

    const c = col("Contenu", 18, 355); s.appendChild(c); c.x = 19; c.y = 150;
    const h2 = txt("Ton objet", 32, BLACK); c.appendChild(h2); h2.layoutSizingHorizontal = "HUG";
    const sub = txt("Un nom suffit pour commencer, tu pourras compléter plus tard.", 16, GREY); c.appendChild(sub); sub.layoutSizingHorizontal = "FILL";

    const photo = figma.createFrame();
    photo.name = "Photo"; photo.layoutMode = "VERTICAL"; photo.primaryAxisAlignItems = "CENTER"; photo.counterAxisAlignItems = "CENTER";
    photo.itemSpacing = 8; photo.paddingTop = photo.paddingBottom = 22; photo.cornerRadius = 16;
    photo.fills = TINT; photo.strokes = PRIMARY; photo.strokeWeight = 2; photo.dashPattern = [8, 6];
    photo.primaryAxisSizingMode = "FIXED"; photo.counterAxisSizingMode = "FIXED"; photo.resize(355, 120);
    c.appendChild(photo); photo.layoutSizingHorizontal = "FILL";
    photo.appendChild(cameraIcon(38, PRIMARY));
    photo.appendChild(txt("Ajouter une photo (optionnel)", 15, BLACK, { align: "CENTER" }));

    c.appendChild(labeled("Nom", field("Appareil photo Canon", true)));
    c.appendChild(labeled("Catégorie", field("Électronique", true)));
    c.appendChild(labeled("Description — optionnel", field("Canon EOS 2000D + sacoche", true)));

    await setBtns(btnRow, "Annuler", "Continuer");
    if (btnRow) { btnRow.x = 19; btnRow.y = c.y + c.height + 28; }
    resizeShell(s);
    log("Écran 1 (objet) OK");
  } catch (e) { log("écran 1 objet:", e && e.message); figma.notify("⚠ écran 1 objet : " + (e && e.message)); }

  /* ===================================================================== *
   *  ÉCRAN OBJET 2 — « Où le ranges-tu ? »
   * ===================================================================== */
  try {
    const { s, btnRow } = await cloneShell(S2_NAME, PITCH * 2);
    const st = await steps(2, 3); s.appendChild(st); st.x = 19; st.y = 80;

    const c = col("Contenu", 18, 355); s.appendChild(c); c.x = 19; c.y = 150;
    const h2 = txt("Où le ranges-tu ?", 32, BLACK); c.appendChild(h2); h2.layoutSizingHorizontal = "HUG";
    const sub = txt("Choisis l'emplacement de l'objet.", 16, GREY); c.appendChild(sub); sub.layoutSizingHorizontal = "FILL";

    c.appendChild(labeled("Logement", field("Maison", true)));
    c.appendChild(labeled("Pièce", field("Bureau", true)));
    c.appendChild(labeled("Meuble / rangement", field("Étagère haute", true)));

    await setBtns(btnRow, "Retour", "Continuer");
    if (btnRow) { btnRow.x = 19; btnRow.y = c.y + c.height + 28; }
    resizeShell(s);
    log("Écran 2 (objet) OK");
  } catch (e) { log("écran 2 objet:", e && e.message); figma.notify("⚠ écran 2 objet : " + (e && e.message)); }

  /* ===================================================================== *
   *  ÉCRAN OBJET 3 — « Vérifie ton objet »
   * ===================================================================== */
  let ajouterCetObjetBtn = null;
  try {
    const { s, btnRow } = await cloneShell(S3_NAME, PITCH * 3);
    const st = await steps(3, 3); s.appendChild(st); st.x = 19; st.y = 80;

    const c = col("Récap", 14, 355); s.appendChild(c); c.x = 19; c.y = 150;
    const h2 = txt("Vérifie ton objet", 28, BLACK); c.appendChild(h2); h2.layoutSizingHorizontal = "FILL";

    const head = row("Entête", 18, 355); head.counterAxisAlignItems = "CENTER";
    c.appendChild(head); head.layoutSizingHorizontal = "FILL";
    const thumb = figma.createFrame(); thumb.name = "Photo"; thumb.resize(84, 84); thumb.cornerRadius = 14; thumb.fills = TINT;
    thumb.strokes = PRIMARY; thumb.strokeWeight = 1;
    thumb.layoutMode = "HORIZONTAL"; thumb.primaryAxisAlignItems = "CENTER"; thumb.counterAxisAlignItems = "CENTER";
    thumb.appendChild(iconBox(34, PRIMARY));
    head.appendChild(thumb);
    const nameCol = col("Nom", 2, 200); head.appendChild(nameCol); nameCol.layoutSizingHorizontal = "FILL";
    const nm = txt("Appareil photo Canon", 22, BLACK, { bold: true }); nameCol.appendChild(nm); nm.layoutSizingHorizontal = "FILL";
    const ty = txt("Électronique", 16, GREY); nameCol.appendChild(ty); ty.layoutSizingHorizontal = "FILL";

    c.appendChild(line("Description", "Canon EOS 2000D + sacoche"));

    const sep = figma.createRectangle(); sep.resize(355, 1); sep.fills = PRIMARY;
    c.appendChild(sep); sep.layoutSizingHorizontal = "FILL";

    const locBlock = col("Localisation bloc", 6, 355); c.appendChild(locBlock);
    const ll = txt("Localisation", 14, GREY); locBlock.appendChild(ll); ll.layoutSizingHorizontal = "FILL";
    const lv = txt("Maison › Bureau › Étagère haute", 16, BLACK, { bold: true }); locBlock.appendChild(lv); lv.layoutSizingHorizontal = "FILL";

    c.appendChild(statutPill("Disponible", MAIN, MAIN_LIGHT));

    await setBtns(btnRow, "Modifier", "Ajouter cet objet");
    if (btnRow) { btnRow.x = 19; btnRow.y = c.y + c.height + 28; ajouterCetObjetBtn = btnRow.children[1]; }
    resizeShell(s);
    log("Écran 3 (objet) OK");
  } catch (e) { log("écran 3 objet:", e && e.message); figma.notify("⚠ écran 3 objet : " + (e && e.message)); }

  /* ===================================================================== *
   *  PAGE DE CHOIX — « Vêtement ou objet ? » (cohérence entre les 2 parcours)
   * ===================================================================== */
  try {
    const { s, title, btnRow } = await cloneShell(CHOIX_NAME, 0);
    await setTitle(title, "Ajouter");
    if (btnRow) btnRow.remove(); // pas de rangée de boutons ici : les 2 cartes sont l'action

    const c = col("Contenu", 22, 355); s.appendChild(c); c.x = 19; c.y = 100;
    const h2 = txt("Qu'est-ce que tu ajoutes ?", 30, BLACK); c.appendChild(h2); h2.layoutSizingHorizontal = "FILL";
    const sub = txt("Choisis le type pour avoir le bon formulaire.", 16, GREY); c.appendChild(sub); sub.layoutSizingHorizontal = "FILL";

    const cards = row("Cartes", 20, 355);
    c.appendChild(cards);

    function choiceCard(label, caption, iconNode) {
      const card = figma.createFrame();
      card.name = "Carte " + label; card.layoutMode = "VERTICAL";
      card.primaryAxisAlignItems = "CENTER"; card.counterAxisAlignItems = "CENTER"; card.itemSpacing = 10;
      card.paddingTop = card.paddingBottom = 26; card.paddingLeft = card.paddingRight = 12;
      card.cornerRadius = 18; card.fills = TINT; card.strokes = PRIMARY; card.strokeWeight = 1.5;
      card.primaryAxisSizingMode = "FIXED"; card.counterAxisSizingMode = "FIXED"; card.resize(167, 190);
      card.appendChild(iconNode);
      const t1 = txt(label, 20, BLACK, { bold: true, align: "CENTER" }); card.appendChild(t1);
      const t2 = txt(caption, 13, GREY, { align: "CENTER" }); card.appendChild(t2); t2.layoutSizingHorizontal = "FILL";
      return card;
    }

    const cardVetement = choiceCard("Vêtement", "Habits, chaussures, accessoires", iconTshirt(48, PRIMARY));
    const cardObjet = choiceCard("Objet", "Meubles, électronique, autre", iconBox(48, PRIMARY));
    cards.appendChild(cardVetement);
    cards.appendChild(cardObjet);

    await linkTo(cardVetement, s1.id);
    if (s1obj) await linkTo(cardObjet, s1obj.id);

    s.resize(s.width, c.y + c.height + 40);

    // relie les bulles "Vêtement" / "Objet" du menu radial à cette page de choix
    const menu = page.children.find((n) => n.name === "Dashboard Mobile · Menu ajout");
    let menuLinked = 0;
    if (menu) {
      const bV = menu.findChild((n) => n.name === "Bulle Vêtement");
      const bO = menu.findChild((n) => n.name === "Bulle Objet");
      if (bV && await linkTo(bV, s.id)) menuLinked++;
      if (bO && await linkTo(bO, s.id)) menuLinked++;
    }

    // relie "Ajouter cet objet" au toast de confirmation, s'il existe déjà
    const confirmation = page.children.find((n) => n.name === "confirmation success");
    if (confirmation && ajouterCetObjetBtn) await linkTo(ajouterCetObjetBtn, confirmation.id);

    page.selection = [s];
    figma.viewport.scrollAndZoomIntoView([s]);
    figma.notify("✅ Page de choix + parcours « Ajouter un objet » créés (" + menuLinked + "/2 bulles du menu reliées)");
    log("OK");
  } catch (e) { log("choix:", e && e.message); figma.notify("⚠ page de choix : " + (e && e.message)); }
})();
