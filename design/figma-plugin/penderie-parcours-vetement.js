/* =============================================================================
 *  PENDERIE — Parcours « Ajouter un vêtement »
 *  Transforme les écrans FOOD existants (page "Maquette") en un parcours
 *  d'ajout de vêtement en 4 étapes.  À exécuter dans le plugin Scripter.
 *
 *  --- PARTIE 1/4 : Écran 1 « Type de vêtement » ---
 *  (les écrans 2, 3, 4 arrivent dans les parties suivantes du script)
 *
 *  ÉTAPE 0 : ajoute 3 variantes (Robe / Baskets / Cintre) au composant LOCAL
 *  "Vetements" (39:124, page Components) en clonant "Type=Short".
 *  Grille écran 1 = 15 instances des variantes de "Vetements".
 *  Accent = style "primary" (#D31D66).
 *
 *  Base transformée : frame  "Ajout activité / Food"  #14:1594
 *  NON touchés : le hub "Ajout activité", Travel, Consumption, Cloth, leurs recaps.
 *
 *  Rejouable : relancer le script ré-applique proprement l'écran 1.
 * ========================================================================== */

(async () => {
  "use strict";

  const log = (...a) => { try { console.log("[Penderie]", ...a); } catch (e) {} };
  const S1_ID = "14:1594"; // Ajout activité / Food

  /* ---------- pages ------------------------------------------------------- */
  if (figma.loadAllPagesAsync) { try { await figma.loadAllPagesAsync(); } catch (e) { log("loadAllPagesAsync:", e.message); } }

  /* ---------- polices --------------------------------------------------- */
  const FONTS = [
    { family: "Luciole", style: "Regular" },
    { family: "Luciole", style: "Bold" },
    { family: "Typolio", style: "Regular" },
  ];
  const okFont = {};
  for (const f of FONTS) {
    try { await figma.loadFontAsync(f); okFont[f.family + "/" + f.style] = true; }
    catch (e) { log("police absente:", f.family, f.style); }
  }
  // secours si Luciole/Typolio indisponibles
  const FALLBACK = { family: "Inter", style: "Regular" };
  let fallbackOk = false;
  try { await figma.loadFontAsync(FALLBACK); fallbackOk = true; } catch (e) {}
  const font = (family, style) =>
    okFont[family + "/" + style] ? { family, style } :
    (fallbackOk ? FALLBACK : { family, style });
  const F_BODY = () => font("Luciole", "Regular");
  const F_BOLD = () => font("Luciole", "Bold");

  /* ---------- helpers noeuds ------------------------------------------- */
  const byId = (id) => figma.getNodeByIdAsync(id);
  const clonePaints = (arr) => (arr && arr !== figma.mixed) ? JSON.parse(JSON.stringify(arr)) : [];

  async function paintFrom(nodeId, kind /* "fills"|"strokes" */) {
    const n = await byId(nodeId);
    if (!n) { log("paintFrom: noeud introuvable", nodeId); return null; }
    const p = clonePaints(n[kind]);
    return p.length ? [p[0]] : null;
  }
  async function styleIdFrom(nodeId) {
    const n = await byId(nodeId);
    if (!n) return null;
    const s = n.textStyleId;
    return (typeof s === "string" && s) ? s : null;
  }
  async function setStyle(textNode, styleId) {
    if (!styleId) return;
    try { await textNode.setTextStyleIdAsync(styleId); } catch (e) { log("setStyle:", e.message); }
  }
  function removeByName(parent, name) {
    parent.children.filter((c) => c.name === name).forEach((c) => c.remove());
  }
  async function removeById(id, expectedParentId) {
    const n = await byId(id);
    if (n && (!expectedParentId || (n.parent && n.parent.id === expectedParentId))) {
      try { n.remove(); } catch (e) {}
    }
  }
  async function setText(nodeId, value) {
    const n = await byId(nodeId);
    if (!n || n.type !== "TEXT") return;
    try {
      if (n.fontName !== figma.mixed) await figma.loadFontAsync(n.fontName);
      n.characters = value;
    } catch (e) { log("setText", nodeId, e.message); }
  }

  /* ===================================================================== *
   *  ÉCRAN 1 — « Type de vêtement »
   * ===================================================================== */
  const s1 = await byId(S1_ID);
  if (!s1) { figma.notify("❌ Frame " + S1_ID + " introuvable (écran Food)"); return; }

  // référentiel couleurs / styles pris sur des noeuds existants du DS
  // accent = style/variable "primary" (#D31D66) — couleur de marque Penderie.
  const PRIMARY = (await paintFrom("3:36", "fills")) || [{ type: "SOLID", color: { r: 0.827, g: 0.114, b: 0.4 } }];
  let PRIMARY_STYLE_ID = null;
  try {
    const ps = figma.getLocalPaintStylesAsync
      ? await figma.getLocalPaintStylesAsync()
      : (figma.getLocalPaintStyles ? figma.getLocalPaintStyles() : []);
    const p = ps.find((s) => s.name === "primary" || s.name.split("/").pop() === "primary");
    if (p) PRIMARY_STYLE_ID = p.id;
    log("style primary:", PRIMARY_STYLE_ID);
  } catch (e) { log("paint styles:", e && e.message); }
  async function accentFill(node) {
    if (PRIMARY_STYLE_ID && node.setFillStyleIdAsync) {
      try { await node.setFillStyleIdAsync(PRIMARY_STYLE_ID); return; } catch (e) {}
    }
    try { node.fills = PRIMARY; } catch (e) {}
  }
  async function accentStroke(node) {
    if (PRIMARY_STYLE_ID && node.setStrokeStyleIdAsync) {
      try { await node.setStrokeStyleIdAsync(PRIMARY_STYLE_ID); return; } catch (e) {}
    }
    try { node.strokes = PRIMARY; } catch (e) {}
  }
  // pas de variable "primary-light" dans le DS -> teinte 12 % de la MÊME couleur primary
  const CLOTH = PRIMARY;
  const CLOTH_LIGHT = [Object.assign({}, JSON.parse(JSON.stringify(PRIMARY[0])), { opacity: 0.12 })];
  const BLACK = (await paintFrom("14:1657", "fills")) || [{ type: "SOLID", color: { r: 0, g: 0, b: 0 } }];
  const WHITE = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];

  const ST_H2 = await styleIdFrom("14:1598");        // Corps/32/regular
  const ST_QUESTION = await styleIdFrom("14:1599");  // Corps/24/regular (3:5)
  const ST_SECTION = await styleIdFrom("14:1618");   // Corps/16/regular

  /* ---------- icônes dessinées pour les 3 variantes à ajouter --------- */
  const SVG = {
    // robe : épaules -> taille -> jupe évasée
    robe: '<svg xmlns="http://www.w3.org/2000/svg" width="38" height="46" viewBox="0 0 38 46"><path fill="#000000" d="M12 1 L19 6 L26 1 L31 12 L27 15 L36 45 L2 45 L11 15 L7 12 Z"/></svg>',
    // baskets : chaussure de profil + semelle
    baskets: '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="28" viewBox="0 0 48 28"><path fill="#000000" d="M2 15 C2 11 5 9 10 9 L16 10 L24 2 L27 10 C36 11 46 13 46 20 L46 22 L4 22 C2 22 2 19 2 15 Z"/><path fill="#000000" d="M2 22 L46 22 L46 26 C46 27 45 27 44 27 L4 27 C3 27 2 27 2 26 Z"/></svg>',
    // cintre
    cintre: '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="30" viewBox="0 0 48 30"><path fill="none" stroke="#000000" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" d="M24 4 C21 4 19 6 19 9 C19 11 20 12 22 13 L5 24 C3 25 4 27 6 27 L42 27 C44 27 45 25 43 24 L26 13 C28 12 29 11 29 9"/></svg>',
  };

  function recolor(node, paint) {
    const walk = (n) => {
      try {
        if ("fills" in n && n.fills !== figma.mixed && n.fills.length) n.fills = paint;
        if ("strokes" in n && n.strokes && n.strokes.length) n.strokes = paint;
      } catch (e) {}
      if ("children" in n) n.children.forEach(walk);
    };
    walk(node);
  }

  // nettoie d'éventuels clones ratés d'exécutions précédentes
  // (composants orphelins au niveau page, hors du set Vetements)
  try {
    const junk = ["Cloth item=Robe", "Cloth item=Chaussures", "Cloth item=Autre",
                  "Type=Robe", "Type=Baskets", "Type=Cintre"];
    for (const pg of figma.root.children) {
      (pg.children || [])
        .filter((n) => junk.indexOf(n.name) !== -1 &&
          (n.type === "COMPONENT" || n.type === "COMPONENT_SET" || n.type === "FRAME"))
        .forEach((n) => { try { n.remove(); } catch (e) {} });
    }
  } catch (e) { log("nettoyage clones:", e && e.message); }

  /* ---------- ÉTAPE 0 — ajout de variantes au composant local "Vetements"
   *  (set 39:124, page Components).  On clone "Type=Short" et on remplace
   *  l'icône. Idempotent : réutilise la variante si elle existe déjà.
   * ------------------------------------------------------------------- */
  async function ensureVetementVariant(label, svgKey) {
    const set = await byId("39:124"); // Vetements (local)
    if (!set) { log("set Vetements 39:124 introuvable"); return null; }
    const existing = set.children.find((c) => c.name === "Type=" + label);
    if (existing) { log("variante déjà là:", label); return existing; }

    const base = (await byId("39:74")) || set.children[0]; // Type=Short
    if (!base || typeof base.clone !== "function") { log("base clone impossible"); return null; }
    const v = base.clone();
    v.name = "Type=" + label;

    const txt = v.findOne && v.findOne((n) => n.type === "TEXT");
    if (txt) {
      try {
        if (txt.fontName !== figma.mixed) await figma.loadFontAsync(txt.fontName);
        txt.characters = label;
      } catch (e) { log("txt variante", label, e && e.message); }
    }
    const visuel = (v.findOne && v.findOne((n) => n.name === "Visuel"))
      || (v.findChild && v.findChild((n) => n.type === "FRAME"));
    if (visuel) {
      try {
        visuel.children.slice().forEach((c) => c.remove());
        const g = figma.createNodeFromSvg(SVG[svgKey]);
        g.name = "Frame";
        const s = Math.min(40 / g.width, 40 / g.height);
        if (isFinite(s) && s > 0) g.rescale(s);
        recolor(g, PRIMARY); // icône en #D31D66 comme les autres
        visuel.appendChild(g);
      } catch (e) { log("icone variante", label, e && e.message); }
    }
    if (v.parent !== set) { try { set.appendChild(v); } catch (e) { log("appendChild variante:", e && e.message); } }
    log("variante créée:", label);
    return v;
  }

  const VET = {};
  try {
    VET.robe = await ensureVetementVariant("Robe", "robe");
    VET.baskets = await ensureVetementVariant("Baskets", "baskets");
    VET.cintre = await ensureVetementVariant("Cintre", "cintre");
  } catch (e) { log("ensureVetementVariant:", e && e.message); figma.notify("⚠ variantes: " + (e && e.message)); }

  s1.name = "Ajouter un vêtement · 1 Type";

  // 1. bandeau d'en-tête -> Cloth-light
  const header = await byId("14:1595");
  if (header) header.fills = CLOTH_LIGHT;

  // 2. textes
  await setText("14:1597", "Ajouter un vêtement");
  await setText("14:1598", "Type de vêtement");
  await setText("14:1599", "Quel type veux-tu ajouter ?");

  // 3. purge des éléments carbone
  await removeById("14:1600", S1_ID); // libellé "Meal"
  await removeById("14:1610", S1_ID); // Frame 26 : 3 vignettes photo "type of consumption"
  for (const id of ["14:1601", "14:1602", "14:1603", "14:1604", "14:1605", "14:1606"]) {
    await removeById(id, S1_ID); // ancien indicateur d'étapes (3 pas)
  }
  removeByName(s1, "Étapes"); // idempotence

  // 4. nouvel indicateur d'étapes : 4 pas + libellé
  const steps = await buildSteps(1, CLOTH, BLACK);
  s1.appendChild(steps);
  steps.x = 19; steps.y = 80;

  // 5. grille des types de vêtement (réutilise la frame 14:1617)
  const grid = await byId("14:1617");
  try {
  if (grid) {
    grid.children.slice().forEach((c) => c.remove());
    grid.layoutMode = "VERTICAL";
    grid.primaryAxisSizingMode = "AUTO";
    grid.counterAxisSizingMode = "FIXED";
    grid.primaryAxisAlignItems = "MIN";
    grid.counterAxisAlignItems = "MIN";
    grid.itemSpacing = 16;
    grid.resize(355, grid.height);
    grid.x = 19; grid.y = 272;
    grid.fills = [];

    // variantes du composant local "Vetements" (set 39:124, page Components)
    const VAR_ID = {
      tshirt: "39:50", jacket: "39:55", coat: "39:67", short: "39:74",
      pants: "39:82", sweatpants: "39:87", women: "39:96", men: "39:103",
      cap: "39:109", scarf: "39:115",
    };
    const VAR = {};
    for (const k in VAR_ID) {
      const n = await byId(VAR_ID[k]);
      VAR[k] = (n && typeof n.createInstance === "function") ? n : null;
    }
    VAR.robe = VET.robe && typeof VET.robe.createInstance === "function" ? VET.robe : null;
    VAR.baskets = VET.baskets && typeof VET.baskets.createInstance === "function" ? VET.baskets : null;
    VAR.cintre = VET.cintre && typeof VET.cintre.createInstance === "function" ? VET.cintre : null;

    // 15 types demandés -> variante "Vetements"
    const SECTIONS = [
      ["Hauts", [["T-shirt", "tshirt"], ["Chemise", "tshirt"], ["Pull", "tshirt"], ["Sweat", "sweatpants"]]],
      ["Vestes & manteaux", [["Veste", "jacket"], ["Manteau", "coat"], ["Costume", "jacket"]]],
      ["Bas", [["Pantalon", "pants"], ["Jean", "pants"], ["Short", "short"]]],
      ["Robes & jupes", [["Robe", "robe"], ["Jupe", "short"]]],
      ["Autres", [["Chaussures", "baskets"], ["Accessoires", "cap"], ["Autre", "cintre"]]],
    ];

    for (const [title, items] of SECTIONS) {
      const lbl = figma.createText();
      lbl.fontName = F_BODY();
      lbl.characters = title;
      lbl.fontSize = 16;
      lbl.fills = BLACK;
      grid.appendChild(lbl);
      await setStyle(lbl, ST_SECTION);
      lbl.layoutSizingHorizontal = "HUG";

      const row = figma.createFrame();
      row.name = title + " (choix)";
      row.layoutMode = "HORIZONTAL";
      row.layoutWrap = "WRAP";
      row.itemSpacing = 12;
      row.counterAxisSpacing = 12;
      row.fills = [];
      row.clipsContent = false;
      grid.appendChild(row);
      row.layoutSizingHorizontal = "FILL";
      row.counterAxisSizingMode = "AUTO";

      for (const [name, iconKey] of items) {
        const comp = VAR[iconKey];
        if (!comp) { log("variante absente:", name, iconKey); continue; }
        const inst = comp.createInstance();
        inst.name = name;
        const tNode = (inst.findOne && inst.findOne((n) => n.type === "TEXT"))
          || inst.children.find((n) => n.type === "TEXT");
        if (tNode) {
          try {
            if (tNode.fontName !== figma.mixed) await figma.loadFontAsync(tNode.fontName);
            tNode.characters = name;
          } catch (e) { log("label instance", name, e && e.message); }
        }
        row.appendChild(inst);
      }
    }
  }
  } catch (e) { log("grille types:", e && e.message); figma.notify("⚠ grille types: " + (e && e.message)); }

  // 6. boutons bas de page
  const btnRow = await byId("14:1607");
  if (btnRow) {
    const btnBack = await byId("14:1608");   // Style=Contour
    const btnNext = await byId("14:1609");   // Style=Plein
    if (btnBack) {
      await accentStroke(btnBack);
      const tb = btnBack.findOne((n) => n.type === "TEXT");
      if (tb) { await figma.loadFontAsync(tb.fontName); tb.characters = "Annuler"; await accentFill(tb); }
    }
    if (btnNext) {
      await accentFill(btnNext);
      const tn = btnNext.findOne((n) => n.type === "TEXT");
      if (tn) { await figma.loadFontAsync(tn.fontName); tn.characters = "Continuer"; tn.fills = WHITE; }
    }
    // repositionne sous la grille
    const gridNode = await byId("14:1617");
    const bottom = gridNode ? gridNode.y + gridNode.height : 1000;
    btnRow.x = 19;
    btnRow.y = bottom + 32;
    s1.resize(393, btnRow.y + btnRow.height + 24);
  }

  const nbVar = ["robe", "baskets", "cintre"].filter((k) => VET[k]).length;
  figma.currentPage.selection = [s1];
  figma.viewport.scrollAndZoomIntoView([s1]);
  figma.notify("✅ Écran 1 transformé · " + nbVar + "/3 variantes Vetements OK");
  log("Écran 1 OK");

  /* ---------- fabrique d'indicateur d'étapes -------------------------- */
  async function buildSteps(current, colorPaint, textPaint) {
    const wrap = figma.createFrame();
    wrap.name = "Étapes";
    wrap.layoutMode = "HORIZONTAL";
    wrap.counterAxisAlignItems = "CENTER";
    wrap.itemSpacing = 8;
    wrap.primaryAxisSizingMode = "AUTO";
    wrap.counterAxisSizingMode = "AUTO";
    wrap.fills = [];
    wrap.clipsContent = false;
    for (let i = 1; i <= 4; i++) {
      const dot = figma.createEllipse();
      const size = i === current ? 24 : 16;
      dot.resize(size, size);
      if (i <= current) { await accentFill(dot); dot.strokes = []; }
      else { dot.fills = []; await accentStroke(dot); dot.strokeWeight = 3; }
      wrap.appendChild(dot);
      if (i < 4) {
        const bar = figma.createRectangle();
        bar.resize(18, 4);
        bar.cornerRadius = 2;
        await accentFill(bar);
        bar.opacity = i < current ? 1 : 0.35;
        wrap.appendChild(bar);
      }
    }
    const lbl = figma.createText();
    lbl.fontName = okFont["Luciole/Regular"] ? { family: "Luciole", style: "Regular" } : (fallbackOk ? FALLBACK : { family: "Luciole", style: "Regular" });
    lbl.characters = "  Étape " + current + " / 4";
    lbl.fontSize = 16;
    lbl.fills = textPaint;
    wrap.appendChild(lbl);
    return wrap;
  }
})();
