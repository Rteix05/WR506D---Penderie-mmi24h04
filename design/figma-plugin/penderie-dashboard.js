/* =============================================================================
 *  PENDERIE — Dashboard Mobile — VERSION DE COMPARAISON
 *
 *  Ne touche PAS à "Dashboard Mobile" (#14:1277, tes modifs perso restent
 *  intactes). Construit un écran INDÉPENDANT "Dashboard Mobile · Version
 *  Claude" à côté, pour comparer les deux et garder ce que tu préfères.
 *
 *  Contenu : en-tête (logo Penderie), carte "% localisés" (barre de
 *  progression), carte "Ma penderie", CTA Prêter/Vendre, classement amis,
 *  derniers ajouts (instances du composant Vetements), Nav + FAB Add activity
 *  (composants de la page Components). Style = celui du parcours
 *  "Ajouter un vêtement" (styles primary / fond clair / subtitle / secondary).
 *
 *  Rejouable (recrée uniquement la frame "· Version Claude").
 * ========================================================================== */

(async () => {
  "use strict";
  const log = (...a) => { try { console.log("[Penderie]", ...a); } catch (e) {} };
  if (figma.loadAllPagesAsync) { try { await figma.loadAllPagesAsync(); } catch (e) {} }

  const ORIGINAL_ID = "14:1277"; // lecture seule, pour se positionner à côté
  const NAME = "Dashboard Mobile · Version Claude";
  const byId = (id) => figma.getNodeByIdAsync(id);
  const page = figma.currentPage;

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

  /* ---------- couleurs : styles du DS, sinon valeurs de la charte -------- *
   *  (indépendant de tout nœud du fichier -> pas affecté par tes modifs)   */
  let stylesList = [];
  try { stylesList = figma.getLocalPaintStylesAsync ? await figma.getLocalPaintStylesAsync() : (figma.getLocalPaintStyles ? figma.getLocalPaintStyles() : []); } catch (e) { log("styles:", e && e.message); }
  const styleByName = {};
  stylesList.forEach((s) => { styleByName[s.name] = s.id; styleByName[s.name.split("/").pop()] = s.id; });
  const hex = (h) => { h = h.replace("#", ""); return { r: parseInt(h.slice(0, 2), 16) / 255, g: parseInt(h.slice(2, 4), 16) / 255, b: parseInt(h.slice(4, 6), 16) / 255 }; };
  const PRIMARY = [{ type: "SOLID", color: hex("#D31D66") }];
  const SECONDARY = [{ type: "SOLID", color: hex("#1A1E24") }];
  const GREY = [{ type: "SOLID", color: hex("#475569") }];
  const FOND = [{ type: "SOLID", color: hex("#F8FAFC") }];
  const WHITE = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
  const TINT = [Object.assign({}, PRIMARY[0], { opacity: 0.12 })];
  const SHADOW = [{ type: "DROP_SHADOW", color: { r: 0, g: 0, b: 0, a: 0.12 }, offset: { x: 0, y: 3 }, radius: 9, spread: -1, visible: true, blendMode: "NORMAL" }];

  async function bindFill(node, styleName, fallback) {
    const id = styleByName[styleName];
    if (id && node.setFillStyleIdAsync) { try { await node.setFillStyleIdAsync(id); return; } catch (e) {} }
    try { node.fills = fallback; } catch (e) {}
  }

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
    f.primaryAxisSizingMode = "AUTO"; f.counterAxisSizingMode = w ? "FIXED" : "AUTO";
    if (w) f.resize(w, f.height);
    return f;
  }
  function card(w, h, radius) {
    const f = figma.createFrame();
    f.resize(w, h); f.cornerRadius = radius == null ? 16 : radius;
    f.fills = WHITE; try { f.effects = SHADOW; } catch (e) {}
    return f;
  }
  function recolor(node, paint) {
    const w = (n) => {
      try { if ("fills" in n && n.fills !== figma.mixed && n.fills.length) n.fills = paint; if ("strokes" in n && n.strokes && n.strokes.length) n.strokes = paint; } catch (e) {}
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
  const SVG_CHEV = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="10" viewBox="0 0 16 10"><path d="M2 2 L8 8 L14 2" fill="none" stroke="#000" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  // icônes maison — formes natives uniquement (les SVG multi-formes sortent en carré dans Scripter)
  function loanIcon(size, paint) {
    const f = figma.createFrame(); f.name = "Icône prêt"; f.fills = []; f.clipsContent = false; f.resize(size, size);
    const sw = Math.max(2, Math.round(size * 0.09));
    const r = Math.round(size * 0.26);
    const b1 = figma.createRectangle();
    b1.resize(r * 2, Math.round(r * 1.5)); b1.cornerRadius = Math.round(r * 0.3);
    b1.x = 0; b1.y = Math.round(size * 0.42); b1.fills = []; b1.strokes = paint; b1.strokeWeight = sw;
    f.appendChild(b1);
    const b2 = figma.createRectangle();
    b2.resize(r * 2, Math.round(r * 1.5)); b2.cornerRadius = Math.round(r * 0.3);
    b2.x = size - r * 2; b2.y = Math.round(size * 0.04); b2.fills = []; b2.strokes = paint; b2.strokeWeight = sw;
    f.appendChild(b2);
    return f;
  }
  function tagIcon(size, paint) {
    const f = figma.createFrame(); f.name = "Icône vente"; f.fills = []; f.clipsContent = false; f.resize(size, size);
    const sw = Math.max(2, Math.round(size * 0.09));
    const bs = Math.round(size * 0.56);
    const body = figma.createRectangle();
    body.resize(bs, bs); body.cornerRadius = Math.round(bs * 0.2);
    body.x = Math.round((size - bs) / 2); body.y = Math.round((size - bs) / 2);
    body.rotation = 45;
    body.fills = []; body.strokes = paint; body.strokeWeight = sw;
    f.appendChild(body);
    const hd = Math.round(size * 0.13);
    const hole = figma.createEllipse();
    hole.resize(hd, hd); hole.x = Math.round(size * 0.28); hole.y = Math.round(size * 0.28);
    hole.fills = []; hole.strokes = paint; hole.strokeWeight = Math.max(1.5, Math.round(sw * 0.7));
    f.appendChild(hole);
    return f;
  }

  /* ===================================================================== *
   *  socle : nouvelle frame indépendante, positionnée à côté de l'originale
   * ===================================================================== */
  const old = page.children.find((n) => n.name === NAME);
  if (old) old.remove();
  const original = await byId(ORIGINAL_ID); // lecture seule : juste pour la position

  const dash = figma.createFrame();
  dash.name = NAME;
  dash.resize(393, 200); // hauteur recalculée à la fin
  await bindFill(dash, "fond clair", FOND);
  dash.clipsContent = false;
  if (original) { dash.x = original.x + original.width + 60; dash.y = original.y; }
  else { dash.x = 0; dash.y = 0; }
  page.appendChild(dash);

  /* ---------- 1. en-tête : logo + nom ------------------------------------ */
  const header = figma.createFrame();
  header.name = "Entête"; header.layoutMode = "HORIZONTAL"; header.counterAxisAlignItems = "CENTER"; header.itemSpacing = 10;
  header.paddingLeft = header.paddingRight = 20; header.paddingTop = 22; header.paddingBottom = 18;
  header.primaryAxisSizingMode = "FIXED"; header.counterAxisSizingMode = "AUTO"; header.resize(393, header.height);
  header.fills = TINT;
  header.cornerRadius = 0;
  header.topLeftRadius = header.topRightRadius = 0; header.bottomLeftRadius = header.bottomRightRadius = 24;
  dash.appendChild(header);
  header.x = 0; header.y = 0;
  try {
    const logoComp = await byId("18:611"); // "Logo 2"
    if (logoComp && typeof logoComp.createInstance === "function") {
      const logo = logoComp.createInstance();
      const s = Math.min(34 / logo.width, 34 / logo.height);
      if (isFinite(s) && s > 0) logo.rescale(s);
      header.appendChild(logo);
    }
  } catch (e) { log("logo:", e && e.message); }
  header.appendChild(txt("Penderie", 24, SECONDARY, { title: true }));

  /* ---------- corps : colonne de contenu --------------------------------- */
  const body = col("Contenu", 16, 355);
  dash.appendChild(body); body.x = 19; body.y = 96;

  /* ---------- 2. carte "% localisés" ------------------------------------- */
  const statCard = card(355, 110, 18);
  statCard.layoutMode = "VERTICAL"; statCard.paddingLeft = statCard.paddingRight = 20; statCard.paddingTop = statCard.paddingBottom = 18; statCard.itemSpacing = 10;
  statCard.primaryAxisSizingMode = "AUTO"; statCard.counterAxisSizingMode = "FIXED";
  body.appendChild(statCard); statCard.layoutSizingHorizontal = "FILL";
  const statTop = figma.createFrame(); statTop.name = "Ligne"; statTop.layoutMode = "HORIZONTAL"; statTop.primaryAxisAlignItems = "SPACE_BETWEEN"; statTop.counterAxisAlignItems = "CENTER"; statTop.fills = [];
  statTop.primaryAxisSizingMode = "FIXED"; statTop.counterAxisSizingMode = "AUTO"; statTop.resize(315, 10);
  statCard.appendChild(statTop); statTop.layoutSizingHorizontal = "FILL";
  const sLabel = txt("Vêtements localisés", 14, GREY); statTop.appendChild(sLabel); sLabel.layoutSizingHorizontal = "HUG";
  const sVal = txt("82 %", 22, PRIMARY, { bold: true, align: "RIGHT" }); statTop.appendChild(sVal); sVal.layoutSizingHorizontal = "HUG";
  const barWrap = figma.createFrame(); barWrap.name = "Barre"; barWrap.fills = []; barWrap.clipsContent = false; barWrap.resize(315, 8);
  statCard.appendChild(barWrap); barWrap.layoutSizingHorizontal = "FILL";
  const track = figma.createRectangle(); track.resize(315, 8); track.cornerRadius = 4; track.fills = TINT;
  barWrap.appendChild(track);
  const fillBar = figma.createRectangle(); fillBar.resize(Math.round(315 * 0.82), 8); fillBar.cornerRadius = 4; fillBar.fills = PRIMARY;
  barWrap.appendChild(fillBar);

  /* ---------- 3. carte "Ma penderie" -------------------------------------- */
  const pCard = card(355, 80, 16);
  pCard.layoutMode = "VERTICAL"; pCard.paddingLeft = pCard.paddingRight = 20; pCard.paddingTop = pCard.paddingBottom = 16; pCard.itemSpacing = 4;
  pCard.primaryAxisSizingMode = "AUTO"; pCard.counterAxisSizingMode = "FIXED";
  pCard.fills = TINT; try { pCard.effects = []; } catch (e) {}
  body.appendChild(pCard); pCard.layoutSizingHorizontal = "FILL";
  const t1 = txt("Ma penderie", 20, PRIMARY, { title: true }); pCard.appendChild(t1); t1.layoutSizingHorizontal = "HUG";
  const t2 = txt("128 articles · 4 prêtés", 16, PRIMARY); pCard.appendChild(t2); t2.layoutSizingHorizontal = "HUG";

  /* ---------- 4. CTA Prêter / Vendre -------------------------------------- */
  function ctaCard(name, sub, iconFn) {
    const c = figma.createFrame();
    c.name = name; c.layoutMode = "VERTICAL"; c.primaryAxisAlignItems = "CENTER"; c.counterAxisAlignItems = "CENTER";
    c.itemSpacing = 6; c.paddingTop = c.paddingBottom = 16; c.paddingLeft = c.paddingRight = 10;
    c.cornerRadius = 16; c.fills = TINT; c.strokes = PRIMARY; c.strokeWeight = 1.5;
    c.primaryAxisSizingMode = "AUTO"; c.counterAxisSizingMode = "FIXED"; c.resize(170, 70);
    c.appendChild(iconFn(30, PRIMARY));
    const a = txt(name, 14, PRIMARY, { bold: true, align: "CENTER" }); c.appendChild(a); a.layoutSizingHorizontal = "FILL";
    const b = txt(sub, 11, GREY, { align: "CENTER" }); c.appendChild(b); b.layoutSizingHorizontal = "FILL";
    return c;
  }
  const ctaRow = figma.createFrame();
  ctaRow.name = "CTA"; ctaRow.fills = []; ctaRow.clipsContent = false;
  ctaRow.layoutMode = "HORIZONTAL"; ctaRow.itemSpacing = 11;
  ctaRow.primaryAxisSizingMode = "FIXED"; ctaRow.counterAxisSizingMode = "AUTO"; ctaRow.resize(355, 10);
  body.appendChild(ctaRow); ctaRow.layoutSizingHorizontal = "FILL";
  const c1 = ctaCard("Prêter un objet", "Rends service, gagne des points", loanIcon);
  const c2 = ctaCard("Mettre en vente", "Fixe ton prix en 1 min", tagIcon);
  ctaRow.appendChild(c1); c1.layoutSizingHorizontal = "FILL";
  ctaRow.appendChild(c2); c2.layoutSizingHorizontal = "FILL";

  /* ---------- 5. classement amis ------------------------------------------ */
  const lb = figma.createFrame();
  lb.name = "Classement"; lb.layoutMode = "HORIZONTAL"; lb.primaryAxisAlignItems = "CENTER"; lb.counterAxisAlignItems = "CENTER"; lb.itemSpacing = 8;
  lb.paddingTop = lb.paddingBottom = 10; lb.cornerRadius = 20;
  lb.fills = WHITE; try { lb.effects = SHADOW; } catch (e) {}
  lb.primaryAxisSizingMode = "FIXED"; lb.counterAxisSizingMode = "AUTO"; lb.resize(355, 10);
  body.appendChild(lb); lb.layoutSizingHorizontal = "FILL";
  lb.appendChild(txt("Classement amis (en direct)", 13, SECONDARY));
  lb.appendChild(svgNode(SVG_CHEV, 12, SECONDARY));

  /* ---------- 6. derniers ajouts ------------------------------------------ */
  const listTitle = txt("Derniers ajouts", 20, SECONDARY, { title: true });
  body.appendChild(listTitle); listTitle.layoutSizingHorizontal = "HUG";

  async function itemRow(vetId, frLabel, name, loc, when) {
    const row = figma.createFrame();
    row.name = "Article ajouté";
    row.layoutMode = "HORIZONTAL"; row.primaryAxisAlignItems = "SPACE_BETWEEN"; row.counterAxisAlignItems = "CENTER";
    row.paddingLeft = 10; row.paddingRight = 14; row.paddingTop = row.paddingBottom = 6;
    row.itemSpacing = 12; row.cornerRadius = 15;
    row.fills = WHITE; try { row.effects = SHADOW; } catch (e) {}
    row.primaryAxisSizingMode = "FIXED"; row.counterAxisSizingMode = "AUTO"; row.resize(355, row.height);

    const left = figma.createFrame();
    left.name = "Gauche"; left.fills = []; left.layoutMode = "HORIZONTAL"; left.counterAxisAlignItems = "CENTER"; left.itemSpacing = 12;
    left.primaryAxisSizingMode = "AUTO"; left.counterAxisSizingMode = "AUTO";
    row.appendChild(left);

    const comp = await byId(vetId); // composant "Vetements" — page Components
    if (comp && typeof comp.createInstance === "function") {
      const inst = comp.createInstance();
      const lbl = inst.findOne && inst.findOne((n) => n.type === "TEXT");
      if (lbl) { try { await figma.loadFontAsync(lbl.fontName); } catch (e) {} lbl.characters = frLabel; }
      left.appendChild(inst);
    }

    const infos = col("Infos", 2);
    const a = txt(name, 16, SECONDARY, { bold: true }); infos.appendChild(a); a.layoutSizingHorizontal = "HUG";
    const b = txt(loc, 12, GREY); infos.appendChild(b); b.layoutSizingHorizontal = "HUG";
    left.appendChild(infos);

    row.appendChild(txt(when, 14, GREY, { align: "RIGHT" }));
    return row;
  }
  body.appendChild(await itemRow("39:50", "T-shirt", "T-shirt Nike", "Chambre · Armoire", "Aujourd'hui"));
  body.appendChild(await itemRow("39:55", "Veste", "Veste en jean", "Entrée", "Hier"));
  body.appendChild(await itemRow("39:82", "Pantalon", "Pantalon noir", "Chambre · Armoire", "Il y a 3 j"));

  /* ---------- 7. nav + FAB (composants de la page Components) ------------ */
  try {
    const navComp = await byId("39:21");   // Nav
    const fabComp = await byId("45:725");  // Add activity
    const navY = body.y + body.height + 26;
    if (navComp && typeof navComp.createInstance === "function") {
      const nav = navComp.createInstance();
      nav.name = "Nav Penderie";
      dash.appendChild(nav); nav.x = 0; nav.y = navY;
      if (fabComp && typeof fabComp.createInstance === "function") {
        const fab = fabComp.createInstance();
        fab.name = "FAB Ajouter";
        dash.appendChild(fab);
        fab.x = dash.width - fab.width - 20;
        fab.y = navY - fab.height + 22;
      }
      dash.resize(dash.width, navY + nav.height + 4);
    } else {
      dash.resize(dash.width, navY + 20);
      log("Nav (39:21) ou Add activity (45:725) introuvable sur la page Components");
    }
  } catch (e) { log("nav+fab:", e && e.message); dash.resize(dash.width, body.y + body.height + 24); }

  figma.currentPage.selection = original ? [original, dash] : [dash];
  figma.viewport.scrollAndZoomIntoView(original ? [original, dash] : [dash]);
  figma.notify("✅ « " + NAME + " » créé à côté de l'original pour comparaison");
})();
