/* =============================================================================
 *  PENDERIE — Composant "Message pop" (toast de confirmation / d'erreur)
 *
 *  Crée un vrai COMPONENT_SET (variantes, comme Bouton / Vetements) sur la
 *  page "Components" : État = Succès / Erreur.
 *
 *  Couleurs : réutilise le DS existant —
 *    - Succès -> variables Main / Main-light (déjà utilisées par Travel)
 *    - Erreur -> AUCUNE couleur "danger" n'existe dans le fichier ; j'ajoute
 *      UN style local "error" (#DC2626, rouge standard) + sa teinte 12 %,
 *      seule couleur nouvelle de tout le projet, car aucune des 5 couleurs
 *      existantes (rose/teal/brun/bleu-gris/violet) ne lit comme "danger".
 *
 *  Rejouable (retire l'ancien "Message pop" s'il existe avant de le recréer).
 * ========================================================================== */

(async () => {
  "use strict";
  const log = (...a) => { try { console.log("[Penderie]", ...a); } catch (e) {} };
  if (figma.loadAllPagesAsync) { try { await figma.loadAllPagesAsync(); } catch (e) {} }

  const byId = (id) => figma.getNodeByIdAsync(id);

  /* ---------- polices ------------------------------------------------- */
  const okFont = {};
  for (const f of [{ family: "Luciole", style: "Regular" }, { family: "Luciole", style: "Bold" }]) {
    try { await figma.loadFontAsync(f); okFont[f.family + "/" + f.style] = true; } catch (e) {}
  }
  let FB = null;
  try { await figma.loadFontAsync({ family: "Inter", style: "Regular" }); FB = { family: "Inter", style: "Regular" }; } catch (e) {}
  const F = (fam, st) => okFont[fam + "/" + st] ? { family: fam, style: st } : (FB || { family: fam, style: st });
  const BODY = () => F("Luciole", "Regular");
  const BOLD = () => F("Luciole", "Bold");

  /* ---------- couleurs -------------------------------------------------- */
  async function paintFrom(nodeId, kind) {
    const n = await byId(nodeId);
    if (!n) return null;
    const p = (n[kind] && n[kind] !== figma.mixed) ? JSON.parse(JSON.stringify(n[kind])) : [];
    return p.length ? [p[0]] : null;
  }
  const hex = (h) => { h = h.replace("#", ""); return { r: parseInt(h.slice(0, 2), 16) / 255, g: parseInt(h.slice(2, 4), 16) / 255, b: parseInt(h.slice(4, 6), 16) / 255 }; };

  // Succès : variables existantes Main / Main-light (nœuds de l'écran Travel, non touché)
  const MAIN = (await paintFrom("14:1478", "fills")) || [{ type: "SOLID", color: hex("#117D6F") }];
  const MAIN_LIGHT = (await paintFrom("14:1488", "fills")) || [{ type: "SOLID", color: hex("#EAF6F6") }];

  // Erreur : nouveau style local "error" (seule couleur ajoutée du projet)
  let ERROR = [{ type: "SOLID", color: hex("#DC2626") }];
  try {
    const existing = (figma.getLocalPaintStylesAsync ? await figma.getLocalPaintStylesAsync() : figma.getLocalPaintStyles())
      .find((s) => s.name === "error");
    if (!existing) {
      const st = figma.createPaintStyle();
      st.name = "error";
      st.paints = ERROR;
      log("style 'error' créé");
    } else {
      ERROR = JSON.parse(JSON.stringify(existing.paints));
      log("style 'error' déjà présent, réutilisé");
    }
  } catch (e) { log("style error:", e && e.message); }
  const ERROR_LIGHT = [Object.assign({}, JSON.parse(JSON.stringify(ERROR[0])), { opacity: 0.12 })];

  const WHITE = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
  const BLACK = [{ type: "SOLID", color: hex("#1A1E24") }];
  const GREY = [{ type: "SOLID", color: hex("#475569") }];
  const SHADOW = [{ type: "DROP_SHADOW", color: { r: 0, g: 0, b: 0, a: 0.16 }, offset: { x: 0, y: 4 }, radius: 14, spread: -2, visible: true, blendMode: "NORMAL" }];

  function txt(s, size, paint, bold) {
    const t = figma.createText();
    t.fontName = bold ? BOLD() : BODY();
    t.fontSize = size;
    t.characters = s;
    t.textAutoResize = "WIDTH_AND_HEIGHT";
    t.fills = paint;
    t.lineHeight = { value: Math.round(size * 1.3), unit: "PIXELS" };
    return t;
  }
  function recolor(node, paint) {
    const w = (n) => {
      try { if ("fills" in n && n.fills !== figma.mixed && n.fills.length) n.fills = paint; if ("strokes" in n && n.strokes && n.strokes.length) n.strokes = paint; } catch (e) {}
      if ("children" in n) n.children.forEach(w);
    };
    w(node);
  }
  // coche — un seul chemin (fiable dans Scripter)
  function checkIcon(size, paint) {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="16" viewBox="0 0 20 16"><path d="M1 8 L7 14 L19 1" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    const g = figma.createNodeFromSvg(svg);
    const s = Math.min(size / g.width, size / g.height);
    if (isFinite(s) && s > 0) g.rescale(s);
    recolor(g, paint);
    return g;
  }
  // croix de fermeture — 2 rectangles pivotés (formes natives, pas de SVG)
  function closeIcon(size, paint) {
    const f = figma.createFrame(); f.name = "Fermer"; f.fills = []; f.clipsContent = false; f.resize(size, size);
    const w = Math.max(2, Math.round(size * 0.14));
    for (const rot of [45, -45]) {
      const bar = figma.createRectangle();
      bar.resize(size, w); bar.cornerRadius = w / 2;
      bar.x = 0; bar.y = (size - w) / 2;
      bar.rotation = rot;
      bar.fills = paint;
      f.appendChild(bar);
    }
    return f;
  }

  function buildVariant(label, accent, accentLight, iconNode, title, subtitle) {
    const comp = figma.createComponent();
    comp.name = "État=" + label;
    comp.layoutMode = "HORIZONTAL"; comp.primaryAxisAlignItems = "SPACE_BETWEEN"; comp.counterAxisAlignItems = "CENTER";
    comp.paddingLeft = comp.paddingRight = 16; comp.paddingTop = comp.paddingBottom = 14;
    comp.itemSpacing = 12; comp.cornerRadius = 14;
    comp.fills = accentLight; comp.strokes = accent; comp.strokeWeight = 1;
    try { comp.effects = SHADOW; } catch (e) {}
    comp.primaryAxisSizingMode = "FIXED"; comp.counterAxisSizingMode = "AUTO"; comp.resize(355, 10);

    const left = figma.createFrame();
    left.name = "Contenu"; left.fills = []; left.layoutMode = "HORIZONTAL"; left.counterAxisAlignItems = "CENTER"; left.itemSpacing = 12;
    left.primaryAxisSizingMode = "AUTO"; left.counterAxisSizingMode = "AUTO";
    comp.appendChild(left);

    const badge = figma.createFrame();
    badge.name = "Icône"; badge.resize(32, 32); badge.cornerRadius = 16; badge.fills = accent;
    badge.layoutMode = "HORIZONTAL"; badge.primaryAxisAlignItems = "CENTER"; badge.counterAxisAlignItems = "CENTER";
    badge.appendChild(iconNode);
    left.appendChild(badge);

    const textCol = figma.createFrame();
    textCol.name = "Texte"; textCol.fills = []; textCol.layoutMode = "VERTICAL"; textCol.itemSpacing = 2;
    textCol.primaryAxisSizingMode = "AUTO"; textCol.counterAxisSizingMode = "AUTO";
    const t1 = txt(title, 15, accent, true); textCol.appendChild(t1);
    const t2 = txt(subtitle, 12, BLACK, false); textCol.appendChild(t2);
    left.appendChild(textCol);

    comp.appendChild(closeIcon(12, GREY));
    return comp;
  }

  /* ===================================================================== *
   *  construction
   * ===================================================================== */
  try {
    // retire un éventuel ancien "Message pop" (variantes + set) avant de recréer
    for (const pg of figma.root.children) {
      (pg.children || []).filter((n) => n.name === "Message pop" || n.name === "État=Succès" || n.name === "État=Erreur")
        .forEach((n) => { try { n.remove(); } catch (e) {} });
    }

    const succ = buildVariant("Succès", MAIN, MAIN_LIGHT, checkIcon(18, WHITE), "Vêtement ajouté !", "Il est maintenant dans ta penderie.");
    const err = buildVariant("Erreur", ERROR, ERROR_LIGHT, txt("!", 16, WHITE, true), "Une erreur est survenue", "Réessaie dans quelques instants.");

    succ.x = 2400; succ.y = 0;
    err.x = 2400; err.y = 100;

    const set = figma.combineAsVariants([succ, err], figma.currentPage);
    set.name = "Message pop";
    set.layoutMode = "VERTICAL"; set.itemSpacing = 24;
    set.primaryAxisSizingMode = "AUTO"; set.counterAxisSizingMode = "AUTO";
    try { set.fills = []; set.strokes = [{ type: "SOLID", color: { r: 0.541, g: 0.220, b: 0.961 } }]; set.dashPattern = [10, 5]; set.strokeWeight = 1; set.cornerRadius = 5; set.paddingTop = set.paddingBottom = set.paddingLeft = set.paddingRight = 20; } catch (e) {}
    set.x = 2400; set.y = 0;

    figma.currentPage.selection = [set];
    figma.viewport.scrollAndZoomIntoView([set]);
    figma.notify("✅ Composant « Message pop » créé (État = Succès / Erreur)");
    log("OK");
  } catch (e) {
    log("erreur:", e && e.message);
    figma.notify("❌ Message pop : " + (e && e.message));
  }
})();
