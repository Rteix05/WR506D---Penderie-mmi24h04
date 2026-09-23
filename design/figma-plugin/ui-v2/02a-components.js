// ───────── Design system : composants à variantes (page Components) ─────────
// Un set existant du même nom est réutilisé tel quel (relance sans doublon).
const SETS = {};
const CAT = {}; // nom du set → catégorie (Section)

// variants : [{ props: {Type:"Primary", …}, build(comp) → { texts:{Label:node}, bools:{Chevron:node} } }]
function makeSet(name, category, variants, textDefaults = {}, boolDefaults = {}, cols = 4) {
  CAT[name] = category;
  const existing = findSet(name);
  if (existing) { SETS[name] = existing; return existing; }
  if (DRY_RUN) { report.ds.push(`[plan] ${name} (${variants.length} variantes)`); return null; }
  const comps = [], binds = [];
  for (const v of variants) {
    const c = figma.createComponent();
    c.name = Object.entries(v.props).map(([k, x]) => `${k}=${x}`).join(", ");
    const b = v.build(c) || {};
    comps.push(c); binds.push(b);
  }
  const set = figma.combineAsVariants(comps, getSection(cmpPage, `UI v2 · ${category}`));
  set.name = name;
  for (const [prop, def] of Object.entries(textDefaults)) {
    const key = set.addComponentProperty(prop, "TEXT", def);
    binds.forEach(b => { const n = b.texts && b.texts[prop]; if (n) n.componentPropertyReferences = { ...n.componentPropertyReferences, characters: key }; });
  }
  for (const [prop, def] of Object.entries(boolDefaults)) {
    const key = set.addComponentProperty(prop, "BOOLEAN", def);
    binds.forEach(b => { const n = b.bools && b.bools[prop]; if (n) n.componentPropertyReferences = { ...n.componentPropertyReferences, visible: key }; });
  }
  Object.assign(set, { layoutMode: "HORIZONTAL", layoutWrap: "WRAP", itemSpacing: 24, counterAxisSpacing: 24,
    paddingTop: 32, paddingBottom: 32, paddingLeft: 32, paddingRight: 32, primaryAxisSizingMode: "FIXED", counterAxisSizingMode: "AUTO" });
  const colW = Math.max(...comps.map(c => c.width));
  set.resize(Math.min(cols, comps.length) * (colW + 24) - 24 + 64, set.height);
  set.fills = fill("white"); set.cornerRadius = 24;
  SETS[name] = set;
  report.ds.push(`${name} : ${comps.length} variantes`);
  return set;
}

// Instance d'un set : variantes + textes + booléens par nom de propriété
function inst(setName, props = {}, texts = {}, bools = {}) {
  const set = SETS[setName];
  if (!set) return frame(`${setName} (manquant)`, { w: 40, h: 40 });
  const i = (set.defaultVariant || set.children[0]).createInstance();
  const defs = set.componentPropertyDefinitions, keyOf = n => Object.keys(defs).find(k => k.split("#")[0] === n);
  const p = {};
  for (const [k, v] of Object.entries(props)) if (defs[k] && defs[k].variantOptions && defs[k].variantOptions.includes(v)) p[k] = v;
  for (const [k, v] of Object.entries(texts)) { const key = keyOf(k); if (key) p[key] = String(v); }
  for (const [k, v] of Object.entries(bools)) { const key = keyOf(k); if (key) p[key] = !!v; }
  try { i.setProperties(p); } catch (e) { warn(`${setName} : ${e.message}`); }
  return i;
}

// Contenu auto-layout d'un composant
function asLayout(c, o) {
  c.layoutMode = o.dir === "v" ? "VERTICAL" : "HORIZONTAL";
  c.itemSpacing = o.gap ?? 0;
  const p = o.p ?? 0, [pt, pr, pb, pl] = Array.isArray(p) ? p : [p, p, p, p];
  Object.assign(c, { paddingTop: pt, paddingRight: pr, paddingBottom: pb, paddingLeft: pl });
  c.primaryAxisSizingMode = o.fixedMain ? "FIXED" : "AUTO";
  c.counterAxisSizingMode = o.fixedCross ? "FIXED" : "AUTO";
  c.primaryAxisAlignItems = o.justify || "MIN";
  c.counterAxisAlignItems = o.align || "CENTER";
  if (o.w || o.h) c.resize(o.w || c.width, o.h || c.height);
  c.fills = o.fill || [];
  if (o.r != null) c.cornerRadius = o.r;
  if (o.stroke) { c.strokes = o.stroke; c.strokeWeight = o.sw || 1; c.strokeAlign = "INSIDE"; }
  if (o.shadow) c.effects = o.shadow;
}

// Tons des statuts — mêmes couleurs partout (badges, cartes, lignes, timelines)
const TONE = {
  "Disponible": ["success", 0.12, "success"], "Prêté": ["primary", 0.12, "primary"], "Emprunté": ["cloth", 0.14, "cloth"],
  "En retard": ["error", 0.12, "error"], "Retourné": ["muted", 0.12, "muted"], "En vente": ["ink", 1, "white"],
  "Vendu": ["muted", 0.12, "muted"], "Perdu": ["error", 0.12, "error"], "Info": ["ink", 0.06, "ink"], "Nouveau": ["primary", 1, "white"],
};

// ── Boutons ──
{
  const V = [];
  for (const type of ["Primary", "Secondary", "Tertiary", "Danger"])
    for (const size of ["L", "S"])
      for (const state of ["Default", "Disabled"]) V.push({ props: { Type: type, Size: size, State: state }, build(c) {
        const L = size === "L";
        const bg = { Primary: fill("primary"), Secondary: fill("primary", 0.1), Tertiary: [], Danger: fill("error") }[type];
        asLayout(c, { p: [0, L ? 22 : 16], h: L ? 52 : 40, fixedCross: true, justify: "CENTER", fill: bg, r: L ? 16 : 12,
          stroke: type === "Tertiary" ? fill("ink", 0.14) : null });
        const lbl = text("Bouton", L ? "bodyStrong" : "smallStrong", { Primary: "white", Secondary: "primary", Tertiary: "ink", Danger: "white" }[type], { name: "Label" });
        c.appendChild(lbl);
        if (state === "Disabled") c.opacity = 0.4;
        return { texts: { Label: lbl } };
      } });
  makeSet("Button", "Boutons", V, { Label: "Bouton" }, {}, 4);
}

// ── Chips / filtres ──
makeSet("Chip", "Chips / filtres", ["Default", "Selected"].map(state => ({ props: { State: state }, build(c) {
  const sel = state === "Selected";
  asLayout(c, { p: [0, 14], h: 36, fixedCross: true, gap: 6, fill: sel ? fill("ink") : fill("white"), r: R.pill, stroke: sel ? null : fill("ink", 0.12) });
  const l = text("Filtre", sel ? "smallStrong" : "small", sel ? "white" : "ink", { name: "Label" });
  c.appendChild(l);
  return { texts: { Label: l } };
} })), { Label: "Filtre" }, {}, 2);

// ── Badges / statuts ──
makeSet("Badge", "Badges / statuts", Object.keys(TONE).map(st => ({ props: { Statut: st }, build(c) {
  const [bg, op, fg] = TONE[st];
  asLayout(c, { p: [0, 10], h: 24, fixedCross: true, gap: 6, fill: fill(bg, op), r: R.pill });
  c.appendChild(ellipse("Point", 6, fill(fg)));
  const l = text(st, "label", fg, { name: "Label" });
  c.appendChild(l);
  return { texts: { Label: l } };
} })), { Label: "Statut" }, {}, 5);

// ── Champs / formulaires ──
makeSet("Field", "Champs / formulaires", ["Default", "Focus", "Error", "Disabled"].map(state => ({ props: { State: state }, build(c) {
  asLayout(c, { dir: "v", gap: 8, w: CONTENT_W, fixedCross: true, align: "MIN" });
  const lab = text("Libellé", "label", "muted", { name: "Label" });
  const box = frame("Champ", { dir: "h", p: [0, 16], gap: 10, h: 52, fill: fill("white", state === "Disabled" ? 0 : 1), r: R.s,
    stroke: state === "Focus" ? fill("primary") : state === "Error" ? fill("error") : fill("ink", 0.12), sw: state === "Focus" ? 1.5 : 1, align: "CENTER" });
  if (state === "Disabled") box.fills = fill("ink", 0.04);
  const val = text("Valeur", "body", state === "Disabled" ? "muted" : "ink", { name: "Value" });
  const help = text("Message d'aide", "caption", state === "Error" ? "error" : "muted", { name: "Helper" });
  c.appendChild(lab); add(c, box, { fillW: true }); add(box, val, { fillW: true }); c.appendChild(help);
  return { texts: { Label: lab, Value: val, Helper: help }, bools: { Aide: help } };
} })), { Label: "Libellé", Value: "Valeur", Helper: "Message d'aide" }, { Aide: false }, 2);

makeSet("Search", "Champs / formulaires", [{ props: { State: "Default" }, build(c) {
  asLayout(c, { p: [0, 14], gap: 10, h: 48, w: CONTENT_W, fixedCross: true, fixedMain: true, fill: fill("ink", 0.05), r: R.s });
  c.appendChild(icon("search", 20, "muted"));
  const l = text("Rechercher…", "body", "muted", { name: "Placeholder" });
  c.appendChild(l);
  return { texts: { Placeholder: l } };
} }], { Placeholder: "Rechercher…" }, {}, 1);

makeSet("Segmented", "Champs / formulaires", ["1", "2"].map(sel => ({ props: { Selected: sel }, build(c) {
  asLayout(c, { p: 4, gap: 4, w: CONTENT_W, fixedMain: true, fill: fill("ink", 0.05), r: R.s });
  const segs = ["Option 1", "Option 2"].map((t, i) => {
    const on = String(i + 1) === sel;
    const s = frame(`Segment ${i + 1}`, { dir: "h", p: [0, 12], h: 40, justify: "CENTER", align: "CENTER", fill: on ? fill("white") : [], r: 10, shadow: on ? SHADOW_SOFT : null });
    const l = text(t, on ? "smallStrong" : "small", on ? "ink" : "muted", { name: "Label" });
    s.appendChild(l); add(c, s, { fillW: true });
    return l;
  });
  return { texts: { "Option 1": segs[0], "Option 2": segs[1] } };
} })), { "Option 1": "Option 1", "Option 2": "Option 2" }, {}, 1);

makeSet("Progress", "Champs / formulaires", ["1/3", "2/3", "3/3", "1/4", "2/4", "3/4", "4/4"].map(st => ({ props: { Étape: st }, build(c) {
  const [n, tot] = st.split("/").map(Number);
  asLayout(c, { gap: 6, w: CONTENT_W, fixedMain: true });
  for (let i = 1; i <= tot; i++) add(c, rect(`Segment ${i}`, 10, 4, i <= n ? fill("primary") : fill("ink", 0.1), 2), { fillW: true });
} })), {}, {}, 1);
