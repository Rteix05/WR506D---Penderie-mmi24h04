/* =============================================================================
 *  PENDERIE — Menu radial "Ajouter" (clic sur le bouton +)
 *
 *  Ne touche PAS à "Dashboard Mobile" (#14:1277). Clone cet écran à côté sous
 *  le nom "Dashboard Mobile · Menu ajout" : voile sombre sur tout le contenu,
 *  bouton + qui reste au premier plan, et 4 bulles qui s'ouvrent en arc
 *  au-dessus de lui — Vêtement / Objet / Logement / Scanner (icônes en
 *  formes natives, pas de SVG multi-formes).
 *
 *  Rejouable (retire l'ancien "Dashboard Mobile · Menu ajout" avant de le
 *  recréer).
 * ========================================================================== */

(async () => {
  "use strict";
  const log = (...a) => { try { console.log("[Penderie]", ...a); } catch (e) {} };
  if (figma.loadAllPagesAsync) { try { await figma.loadAllPagesAsync(); } catch (e) {} }

  const byId = (id) => figma.getNodeByIdAsync(id);
  const DASH_ID = "14:1277";
  const NAME = "Dashboard Mobile · Menu ajout";

  /* ---------- polices ----------------------------------------------------- */
  const okFont = {};
  for (const f of [{ family: "Luciole", style: "Regular" }]) {
    try { await figma.loadFontAsync(f); okFont[f.family + "/" + f.style] = true; } catch (e) {}
  }
  let FB = null;
  try { await figma.loadFontAsync({ family: "Inter", style: "Regular" }); FB = { family: "Inter", style: "Regular" }; } catch (e) {}
  const F = (fam, st) => okFont[fam + "/" + st] ? { family: fam, style: st } : (FB || { family: fam, style: st });
  const BODY = () => F("Luciole", "Regular");

  /* ---------- couleurs ------------------------------------------------- */
  const hex = (h) => { h = h.replace("#", ""); return { r: parseInt(h.slice(0, 2), 16) / 255, g: parseInt(h.slice(2, 4), 16) / 255, b: parseInt(h.slice(4, 6), 16) / 255 }; };
  const PRIMARY = hex("#D31D66");
  const PRIMARY_LIGHT = [{ type: "SOLID", color: hex("#FFB3E0") }];
  const PRIMARY_STROKE = [{ type: "SOLID", color: PRIMARY }];
  const PRIMARY_FILL = [{ type: "SOLID", color: PRIMARY }];
  const WHITE = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
  const BUBBLE_SHADOW = [{ type: "DROP_SHADOW", color: { r: 0, g: 0, b: 0, a: 0.25 }, offset: { x: 0, y: 2 }, radius: 6, spread: 0, visible: true, blendMode: "NORMAL" }];

  function absOrigin(node) {
    const t = node.absoluteTransform;
    return { x: t[0][2], y: t[1][2] };
  }

  /* ---------- icônes (formes natives uniquement) ------------------------ */
  function iconHanger(box) {
    const hook = figma.createEllipse();
    hook.resize(8, 8); hook.x = 24; hook.y = 12;
    hook.fills = []; hook.strokes = PRIMARY_STROKE; hook.strokeWeight = 2;
    box.appendChild(hook);

    const body = figma.createPolygon();
    body.pointCount = 3; body.resize(26, 14); body.x = 15; body.y = 20;
    body.fills = []; body.strokes = PRIMARY_STROKE; body.strokeWeight = 2;
    box.appendChild(body);
  }

  function iconBox(box) {
    const square = figma.createRectangle();
    square.resize(24, 20); square.x = 16; square.y = 18;
    square.fills = []; square.strokes = PRIMARY_STROKE; square.strokeWeight = 2;
    box.appendChild(square);

    const seam = figma.createRectangle();
    seam.resize(24, 2); seam.x = 16; seam.y = 25; seam.fills = PRIMARY_FILL;
    box.appendChild(seam);

    const tape = figma.createRectangle();
    tape.resize(2, 8); tape.x = 27; tape.y = 14; tape.fills = PRIMARY_FILL;
    box.appendChild(tape);
  }

  function iconHouse(box) {
    const roof = figma.createPolygon();
    roof.pointCount = 3; roof.resize(26, 12); roof.x = 15; roof.y = 15;
    roof.fills = PRIMARY_FILL;
    box.appendChild(roof);

    const body = figma.createRectangle();
    body.resize(18, 14); body.x = 19; body.y = 26;
    body.fills = []; body.strokes = PRIMARY_STROKE; body.strokeWeight = 2;
    box.appendChild(body);

    const door = figma.createRectangle();
    door.resize(6, 9); door.x = 25; door.y = 31; door.fills = PRIMARY_FILL;
    box.appendChild(door);
  }

  function iconScan(box) {
    const corners = [
      [16, 16, 16, 16], // haut-gauche
      [34, 16, 38, 16], // haut-droite
      [16, 38, 16, 32], // bas-gauche
      [34, 38, 38, 32]  // bas-droite
    ];
    for (const [hx, hy, vx, vy] of corners) {
      const h = figma.createRectangle();
      h.resize(6, 2); h.x = hx; h.y = hy; h.fills = PRIMARY_FILL;
      box.appendChild(h);
      const v = figma.createRectangle();
      v.resize(2, 6); v.x = vx; v.y = vy; v.fills = PRIMARY_FILL;
      box.appendChild(v);
    }
  }

  /* ===================================================================== *
   *  construction
   * ===================================================================== */
  try {
    for (const pg of figma.root.children) {
      (pg.children || []).filter((n) => n.name === NAME).forEach((n) => { try { n.remove(); } catch (e) {} });
    }

    const dash = await byId(DASH_ID);
    if (!dash) { figma.notify("❌ Dashboard Mobile (14:1277) introuvable"); return; }
    const page = dash.parent;

    let maxX = -Infinity;
    for (const c of page.children) { if ("x" in c && "width" in c) maxX = Math.max(maxX, c.x + c.width); }

    const menu = dash.clone();
    menu.name = NAME;
    menu.x = maxX + 100;
    menu.y = dash.y;

    // bouton + rose visible = dernière instance "Add activity" du clone
    const fabs = menu.findAll((n) => n.type === "INSTANCE" && n.name === "Add activity");
    const fab = fabs[fabs.length - 1];
    if (!fab) { figma.notify("❌ Bouton \"Add activity\" introuvable dans le clone"); return; }

    // voile sombre sur tout le contenu, bouton + repassé au-dessus
    const dim = figma.createRectangle();
    dim.name = "Voile";
    dim.resize(menu.width, menu.height); dim.x = 0; dim.y = 0;
    dim.fills = [{ type: "SOLID", color: { r: 0, g: 0, b: 0 }, opacity: 0.45 }];
    menu.appendChild(dim);
    menu.appendChild(fab);

    const fabOrigin = absOrigin(fab);
    const menuOrigin = absOrigin(menu);
    const fabCenter = {
      x: fabOrigin.x - menuOrigin.x + fab.width / 2,
      y: fabOrigin.y - menuOrigin.y + fab.height / 2
    };

    function makeBubble(label, iconFn, angleDeg, radius) {
      const circle = figma.createFrame();
      circle.name = "Icône";
      circle.resize(56, 56); circle.cornerRadius = 28;
      circle.fills = PRIMARY_LIGHT; circle.strokes = PRIMARY_STROKE; circle.strokeWeight = 2;
      circle.clipsContent = false;
      try { circle.effects = BUBBLE_SHADOW; } catch (e) {}
      iconFn(circle);

      const text = figma.createText();
      text.fontName = BODY(); text.fontSize = 12;
      text.textAutoResize = "WIDTH_AND_HEIGHT";
      text.fills = WHITE;
      text.characters = label;

      const bubble = figma.createFrame();
      bubble.name = "Bulle " + label;
      bubble.layoutMode = "VERTICAL";
      bubble.primaryAxisSizingMode = "AUTO"; bubble.counterAxisSizingMode = "AUTO";
      bubble.counterAxisAlignItems = "CENTER"; bubble.itemSpacing = 6;
      bubble.fills = [];
      bubble.appendChild(circle);
      bubble.appendChild(text);
      menu.appendChild(bubble);

      const rad = (angleDeg * Math.PI) / 180;
      const cx = fabCenter.x + radius * Math.cos(rad);
      const cy = fabCenter.y - radius * Math.sin(rad);
      bubble.x = cx - bubble.width / 2;
      bubble.y = cy - 28;
      return bubble;
    }

    const R = 150;
    makeBubble("Vêtement", iconHanger, 150, R);
    makeBubble("Objet", iconBox, 110, R);
    makeBubble("Logement", iconHouse, 70, R);
    makeBubble("Scanner", iconScan, 30, R);

    figma.currentPage.selection = [menu];
    figma.viewport.scrollAndZoomIntoView([menu]);
    figma.notify("✅ Menu radial « Ajouter » créé");
    log("OK", menu.id);
  } catch (e) {
    log("erreur:", e && e.message);
    figma.notify("❌ Menu ajout : " + (e && e.message));
  }
})();
