// ───────── Écrans : structure commune + conservation du prototype ─────────
const maqPage = figma.root.children.find(p => p.name.trim() === "Maquette");
if (!maqPage) throw new Error("Page « Maquette » introuvable");

// 1) Relevé des interactions d'une frame avant refonte
function snapshot(fr) {
  const out = [];
  for (const n of fr.findAll(n => "reactions" in n && n.reactions && n.reactions.length)) {
    let kind = null;
    for (let q = n; q && q !== fr; q = q.parent)
      if (q.parent && q.parent.type === "INSTANCE" && q.parent.name === "Nav") kind = `nav:${q.parent.children.indexOf(q)}`;
    if (!kind && n.name === "Close_round") kind = "back";
    if (!kind && n.name === "Add activity") kind = "fab";
    const texts = n.type === "TEXT" ? [n.characters] : ("findAll" in n ? n.findAll(x => x.type === "TEXT").map(x => x.characters) : []);
    const isBack = n.reactions.every(r => (r.actions || [r.action]).every(a => a && (a.type === "BACK" || a.type === "CLOSE")));
    out.push({ kind, isBack, texts: texts.map(norm).filter(Boolean), name: n.name, reactions: JSON.parse(JSON.stringify(n.reactions)) });
  }
  return out;
}

// 2) Retrouve, dans la nouvelle UI, l'élément qui porte le même libellé
function hsOf(n) { try { return n.getPluginData("hs"); } catch (e) { return ""; } }
function aliasOf(n) { try { const a = n.getPluginData("hsAlias"); return a ? JSON.parse(a) : []; } catch (e) { return []; } }
function findHotspot(fr, t) {
  const tagged = fr.findOne(n => hsOf(n) === t || aliasOf(n).includes(t));
  if (tagged) return tagged;
  const tx = fr.findOne(n => n.type === "TEXT" && norm(n.characters) === t);
  if (!tx) return null;
  for (let p = tx.parent; p && p !== fr; p = p.parent) if (hsOf(p)) return p;
  for (let p = tx.parent; p && p !== fr; p = p.parent) if (/^(Segment \d|Onglet \d)/.test(p.name)) return p;
  for (let p = tx.parent; p && p !== fr; p = p.parent) if (p.type === "INSTANCE") return p;
  return tx;
}
async function setReactions(node, list) {
  const apply = async r => { if (node.setReactionsAsync) await node.setReactionsAsync(r); else node.reactions = r; };
  try { await apply(list); return true; } catch (e) { return false; }
}
async function restore(fr, snaps) {
  const used = new Set();
  for (const s of snaps) {
    let target = null;
    if (s.kind && s.kind.startsWith("nav:")) {
      const i = +s.kind.slice(4) + 1, tb = fr.findOne(n => n.name === "Tab bar");
      if (tb) target = tb.findOne(n => n.name.startsWith(`Onglet ${i} `));
    } else if (s.kind === "back" || (s.isBack && !s.texts.length)) target = fr.findOne(n => n.name === "Bouton retour");
    else if (s.kind === "fab") target = findHotspot(fr, "fab");
    if (!target) for (const t of s.texts) { target = findHotspot(fr, t); if (target) break; }
    if (!target) target = findHotspot(fr, norm(s.name)); // icône sans texte (cloche, partage, voile…) : alias = ancien nom de calque
    if (!target && s.isBack) target = fr.findOne(n => n.name === "Bouton retour");
    const label = s.texts[0] || s.kind || s.name;
    if (!target) { report.lost.push(`${fr.name} : « ${label} »`); continue; }
    if (used.has(target.id)) { report.lost.push(`${fr.name} : « ${label} » (zone déjà reliée)`); continue; }
    if (await setReactions(target, s.reactions)) { used.add(target.id); report.restored++; try { target.setPluginData("penderie-proto", "1"); } catch (e) {} }
    else report.lost.push(`${fr.name} : « ${label} » (réaction refusée par Figma)`);
  }
}

// 3) Structure d'écran : barre du haut fixe, contenu défilant, barre d'action ou onglets fixes
function resetFrame(fr) {
  for (const c of [...fr.children]) c.remove();
  if (fr.layoutMode && fr.layoutMode !== "NONE") fr.layoutMode = "NONE";
  fr.fills = fill("bg"); fr.strokes = []; fr.effects = []; fr.cornerRadius = 0; fr.clipsContent = true;
}

function screen(fr, spec) {
  resetFrame(fr);
  if (spec.dialog) return dialogScreen(fr, spec.dialog);
  if (spec.dark) fr.fills = fill("ink");
  const topPad = spec.top ? TOPBAR_H + 8 : spec.toast ? 96 : 56;
  const botPad = (spec.tab != null ? TABBAR_H : 0) + (spec.footer ? 96 : 0) + 32;
  const body = frame("Contenu", { dir: "v", gap: spec.gap ?? SP.xxl, p: [topPad, spec.bleed ? 0 : GUTTER, botPad, spec.bleed ? 0 : GUTTER], w: W });
  body.counterAxisSizingMode = "FIXED";
  fr.appendChild(body); body.x = 0; body.y = 0;
  for (const b of spec.body || []) renderBlock(body, b, spec);

  // Éléments fixes : ajoutés en dernier (au-dessus), puis « fixés au défilement »
  let fixed = 0;
  if (spec.footer) {
    const bar = frame("Barre d'action", { dir: "h", gap: SP.m, p: [12, GUTTER, spec.tab != null ? 12 : 30, GUTTER], w: W, fill: fill("white") });
    bar.primaryAxisSizingMode = "FIXED";
    bar.strokes = fill("ink", 0.08); bar.strokeTopWeight = 1; bar.strokeBottomWeight = 0; bar.strokeLeftWeight = 0; bar.strokeRightWeight = 0;
    for (const a of spec.footer) add(bar, button(a), { fillW: a.grow !== false });
    fr.appendChild(bar); bar.x = 0; bar.y = H - (spec.tab != null ? TABBAR_H : 0) - bar.height; fixed++;
  }
  if (spec.tab != null) { const tb = inst("Tab bar", { Actif: TABS[spec.tab][0] }); tb.name = "Tab bar"; fr.appendChild(tb); tb.x = 0; tb.y = H - TABBAR_H; fixed++; }
  if (spec.fab) {
    const f = inst("Bouton flottant"); hotspot(f, "fab", [spec.fab]); f.name = "Bouton ajouter";
    fr.appendChild(f); f.x = W - GUTTER - 56; f.y = H - (spec.tab != null ? TABBAR_H : 0) - (spec.footer ? 96 : 0) - 20 - 56; fixed++;
  }
  if (spec.top) {
    const tb = inst("Top bar", { Type: spec.top.close ? "Close" : "Back" }, { Title: spec.top.title || "" }, { Action: !!spec.top.action });
    tb.name = "Top bar"; fr.appendChild(tb); tb.x = 0; tb.y = 0; fixed++;
    if (spec.dark) tb.fills = fill("ink");
  }
  if (spec.toast) {
    const t = inst("Toast", { Type: spec.toast.type || "Succès" }, { Title: spec.toast.title, Text: spec.toast.text || "" });
    hotspot(t, spec.toast.title); t.name = "Toast"; fr.appendChild(t); t.x = GUTTER; t.y = spec.top ? TOPBAR_H + 4 : 48; fixed++;
  }
  fr.resize(W, H);
  fr.overflowDirection = body.height > H ? "VERTICAL" : "NONE";
  fr.numberOfFixedChildren = fixed;
}

// Modale de confirmation (frame ouverte en overlay) : la carte seule, fond transparent
function dialogScreen(fr, d) {
  fr.fills = [];
  const dl = inst("Dialog", { Type: d.danger === false ? "Default" : "Danger" }, { Title: d.title, Text: d.text });
  dl.name = "Dialog";
  const setBtn = (name, label) => { const b = dl.findOne(n => n.type === "INSTANCE" && n.name === name); if (b) { const k = Object.keys(b.componentProperties).find(x => x.startsWith("Label")); if (k) b.setProperties({ [k]: label }); } };
  setBtn("Annuler", d.cancel || "Annuler"); setBtn("Confirmer", d.confirm);
  fr.appendChild(dl); dl.x = 0; dl.y = 0;
  fr.resize(dl.width, dl.height);
}

// Bouton : { l: libellé, t: Primary|Secondary|Tertiary|Danger, s: L|S, off: désactivé, alias: [...] }
function button(a) {
  const b = inst("Button", { Type: a.t || "Primary", Size: a.s || "L", State: a.off ? "Disabled" : "Default" }, { Label: a.l });
  b.name = a.l; if (!a.off) hotspot(b, a.l, a.alias || []);
  return b;
}
