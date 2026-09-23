// ═══════════════════════════════════════════════════════════════════════════
// PENDERIE — UI v2 · refonte visuelle (design system + écrans)
// Généré par build.js à partir de ui-v2/*.js — coller dist/penderie-ui-v2.js dans Scripter.
//
// Avant de lancer : Fichier → « Enregistrer dans l'historique des versions » (retour arrière complet possible).
// Ne change ni les parcours, ni les destinations, ni les règles métier : chaque frame garde son ID,
// son nom et sa place ; seul son contenu visuel est reconstruit. Les interactions de prototype
// présentes dans une frame sont relevées avant la refonte puis rebranchées sur les nouveaux
// éléments portant le même libellé (rapport en fin d'exécution).
// ═══════════════════════════════════════════════════════════════════════════

const DRY_RUN = false;         // true = analyse + rapport, aucune modification
const ONLY = null;             // ex. ["accueil", "inventaire"] pour ne refaire que certains parcours
const SKIP_SCREENS = false;    // true = seulement le design system (page Components)

// ───────── Charte (valeurs de la page « Charte Graphique », liées aux variables existantes) ─────────
const HEX = {
  primary: "D31D66", ink: "1A1E24", muted: "475569", bg: "F8FAFC", white: "FFFFFF",
  success: "117D6F", cloth: "831297", clothSoft: "E5C5EB", pinkSoft: "FFB3E0", error: "DC2626",
};
// Échelle unique d'espacements et de rayons — partagée par tous les écrans
const SP = { xxs: 4, xs: 6, s: 8, m: 12, l: 16, xl: 20, xxl: 24, x3: 32, x4: 40 };
const R = { xs: 8, s: 12, m: 16, l: 20, xl: 28, pill: 999 };
const W = 393, H = 852, GUTTER = 20, CONTENT_W = W - GUTTER * 2;
const TOPBAR_H = 64, TABBAR_H = 84;

// Hiérarchie typographique (Typolio = marque, Luciole = interface)
const TYPE = {
  brand:      { family: "Typolio", style: "Regular", size: 30, lh: 36 },
  display:    { family: "Luciole", style: "Bold", size: 28, lh: 34 },
  title:      { family: "Luciole", style: "Bold", size: 22, lh: 28 },
  headline:   { family: "Luciole", style: "Bold", size: 17, lh: 22 },
  body:       { family: "Luciole", style: "Regular", size: 16, lh: 22 },
  bodyStrong: { family: "Luciole", style: "Bold", size: 16, lh: 22 },
  small:      { family: "Luciole", style: "Regular", size: 14, lh: 19 },
  smallStrong:{ family: "Luciole", style: "Bold", size: 14, lh: 19 },
  caption:    { family: "Luciole", style: "Regular", size: 12, lh: 16 },
  label:      { family: "Luciole", style: "Bold", size: 12, lh: 16 },
  price:      { family: "Luciole", style: "Bold", size: 20, lh: 24 },
};

const report = { ds: [], screens: [], restored: 0, lost: [], warn: [] };
const warn = s => report.warn.push(s);

// ───────── Variables couleur existantes : chaque peinture y est liée si la valeur existe ─────────
if (figma.loadAllPagesAsync) await figma.loadAllPagesAsync();
const toHex = c => [c.r, c.g, c.b].map(v => Math.round(v * 255).toString(16).padStart(2, "0")).join("").toUpperCase();
const VARS = {};
try {
  for (const v of await figma.variables.getLocalVariablesAsync("COLOR")) {
    const val = Object.values(v.valuesByMode)[0];
    if (val && typeof val === "object" && "r" in val && !VARS[toHex(val)]) VARS[toHex(val)] = v;
  }
} catch (e) { warn("Variables couleur illisibles : couleurs appliquées en valeurs brutes."); }

function paint(key, opacity = 1) {
  const h = HEX[key] || key;
  const n = i => parseInt(h.slice(i, i + 2), 16) / 255;
  let p = { type: "SOLID", color: { r: n(0), g: n(2), b: n(4) }, opacity };
  const v = VARS[h.toUpperCase()];
  if (v) p = figma.variables.setBoundVariableForPaint(p, "color", v);
  return p;
}
const fill = (key, o) => [paint(key, o)];
const SHADOW_SOFT = [{ type: "DROP_SHADOW", color: { r: 0.1, g: 0.12, b: 0.14, a: 0.06 }, offset: { x: 0, y: 4 }, radius: 16, spread: 0, visible: true, blendMode: "NORMAL" }];
const SHADOW_FLOAT = [{ type: "DROP_SHADOW", color: { r: 0.1, g: 0.12, b: 0.14, a: 0.12 }, offset: { x: 0, y: 8 }, radius: 24, spread: 0, visible: true, blendMode: "NORMAL" }];

// ───────── Polices + styles de texte « Penderie/… » (réutilisés s'ils existent déjà) ─────────
const FONT_OK = {};
for (const t of Object.values(TYPE)) {
  const k = `${t.family}|${t.style}`;
  if (k in FONT_OK) continue;
  try { await figma.loadFontAsync({ family: t.family, style: t.style }); FONT_OK[k] = true; }
  catch (e) { FONT_OK[k] = false; }
}
function fontOf(t) {
  if (FONT_OK[`${t.family}|${t.style}`]) return { family: t.family, style: t.style };
  if (FONT_OK["Luciole|Bold"] && t.style === "Bold") return { family: "Luciole", style: "Bold" };
  if (FONT_OK["Luciole|Regular"]) return { family: "Luciole", style: "Regular" };
  throw new Error("Police Luciole introuvable : installe-la puis relance.");
}
const TEXT_STYLES = {};
{
  const existing = await figma.getLocalTextStylesAsync();
  const NAMES = { brand: "Marque", display: "Display", title: "Titre", headline: "Sous-titre", body: "Texte",
    bodyStrong: "Texte fort", small: "Petit", smallStrong: "Petit fort", caption: "Légende", label: "Étiquette", price: "Prix" };
  for (const [k, t] of Object.entries(TYPE)) {
    const name = `Penderie/${NAMES[k]}`;
    let s = existing.find(x => x.name === name);
    if (!s && !DRY_RUN) {
      s = figma.createTextStyle(); s.name = name;
      s.fontName = fontOf(t); s.fontSize = t.size; s.lineHeight = { value: t.lh, unit: "PIXELS" };
      report.ds.push(`Style de texte créé : ${name}`);
    }
    if (s) TEXT_STYLES[k] = s;
  }
}

// ───────── Fabrique de nœuds ─────────
function frame(name, o = {}) {
  const f = figma.createFrame();
  f.name = name; f.fills = o.fill || []; f.clipsContent = !!o.clip;
  if (o.dir) {
    f.layoutMode = o.dir === "h" ? "HORIZONTAL" : "VERTICAL";
    f.itemSpacing = o.gap ?? 0;
    const p = o.p ?? 0, [pt, pr, pb, pl] = Array.isArray(p) ? p : [p, p, p, p];
    f.paddingTop = pt; f.paddingRight = pr; f.paddingBottom = pb; f.paddingLeft = pl;
    f.primaryAxisSizingMode = "AUTO"; f.counterAxisSizingMode = "AUTO";
    if (o.align) f.counterAxisAlignItems = o.align;          // MIN | CENTER | MAX
    if (o.justify) f.primaryAxisAlignItems = o.justify;      // MIN | CENTER | MAX | SPACE_BETWEEN
    if (o.wrap) { f.layoutWrap = "WRAP"; f.counterAxisSpacing = o.gap ?? 0; }
  }
  if (o.r != null) f.cornerRadius = o.r;
  if (o.stroke) { f.strokes = o.stroke; f.strokeWeight = o.sw || 1; f.strokeAlign = "INSIDE"; }
  if (o.shadow) f.effects = o.shadow;
  if (o.w || o.h) f.resize(o.w || f.width || 10, o.h || f.height || 10);
  if (o.w && o.dir) { if (f.layoutMode === "HORIZONTAL") f.primaryAxisSizingMode = "FIXED"; else f.counterAxisSizingMode = "FIXED"; }
  if (o.h && o.dir) { if (f.layoutMode === "VERTICAL") f.primaryAxisSizingMode = "FIXED"; else f.counterAxisSizingMode = "FIXED"; }
  if (o.opacity != null) f.opacity = o.opacity;
  return f;
}
// Ajoute un enfant dans un parent auto-layout avec son comportement de taille
function add(parent, child, o = {}) {
  if (!child) return child;
  parent.appendChild(child);
  if (parent.layoutMode && parent.layoutMode !== "NONE") {
    if (o.fillW) child.layoutSizingHorizontal = "FILL";
    if (o.fillH) child.layoutSizingVertical = "FILL";
    if (o.abs) child.layoutPositioning = "ABSOLUTE";
  }
  if (o.x != null) child.x = o.x;
  if (o.y != null) child.y = o.y;
  return child;
}
function text(chars, kind = "body", color = "ink", o = {}) {
  const t = figma.createText(), st = TYPE[kind];
  t.fontName = fontOf(st); t.fontSize = st.size; t.lineHeight = { value: st.lh, unit: "PIXELS" };
  t.characters = String(chars);
  t.fills = fill(color, o.opacity ?? 1);
  if (TEXT_STYLES[kind] && t.setTextStyleIdAsync) t.setTextStyleIdAsync(TEXT_STYLES[kind].id).catch(() => {});
  if (o.align) t.textAlignHorizontal = o.align;               // LEFT | CENTER | RIGHT
  if (o.upper) t.textCase = "UPPER";
  if (o.w) { t.resize(o.w, t.height); t.textAutoResize = "HEIGHT"; } else t.textAutoResize = "WIDTH_AND_HEIGHT";
  if (o.name) t.name = o.name;
  return t;
}
function rect(name, w, h, fills, r = 0) { const x = figma.createRectangle(); x.name = name; x.resize(w, h); x.fills = fills; x.cornerRadius = r; return x; }
function ellipse(name, d, fills) { const e = figma.createEllipse(); e.name = name; e.resize(d, d); e.fills = fills; return e; }
// Zone cliquable : marquée pour que les liens du prototype puissent y être rebranchés
function hotspot(node, key, aliases = []) {
  node.setPluginData("hs", norm(key));
  if (aliases.length) node.setPluginData("hsAlias", JSON.stringify(aliases.map(norm)));
  return node;
}
const norm = s => String(s).replace(/\s+/g, " ").trim().toLowerCase();

// Sections Figma (pas des Frames) pour ranger la page Components
function getSection(page, name) {
  let s = page.children.find(n => n.type === "SECTION" && n.name === name);
  if (!s) { s = figma.createSection(); s.name = name; page.appendChild(s); }
  return s;
}
