// ───────── Blocs d'interface : chaque écran est une suite de blocs ─────────
// Tons des « photos » (en attendant les vraies photos : calque « Photo », remplissage image)
const PHOTO_TONE = { rose: ["pinkSoft", 0.35], prune: ["clothSoft", 0.6], vert: ["success", 0.1], gris: ["ink", 0.06], rouge: ["error", 0.08], rosefort: ["primary", 0.1] };

function photo(w, h, g = "box", tone = "rose", r = R.l, name = "Photo") {
  const [c, o] = PHOTO_TONE[tone] || PHOTO_TONE.rose;
  const p = frame(name, { w, h, fill: fill(c, o), r, clip: true });
  const s = Math.round(Math.min(w, h) * 0.34), ic = icon(g, s, "ink");
  ic.opacity = 0.3; ic.name = "Glyph"; p.appendChild(ic); ic.x = (w - s) / 2; ic.y = (h - s) / 2;
  return p;
}
function swapGlyph(instance, g, tone) {
  const p = instance.findOne(n => n.name === "Photo" || n.name === "Leading");
  if (p && tone) { const [c, o] = PHOTO_TONE[tone] || PHOTO_TONE.rose; p.fills = fill(c, o); }
  const gl = instance.findOne(n => n.name === "Glyph" && n.type === "INSTANCE");
  if (gl && g && ICON[g]) gl.swapComponent(ICON[g]);
}
function hstack(name, gap = SP.s, o = {}) { return frame(name, { dir: "h", gap, align: o.align || "CENTER", ...o }); }
function vstack(name, gap = SP.s, o = {}) { return frame(name, { dir: "v", gap, align: o.align || "MIN", ...o }); }
function card(name, o = {}) { return frame(name, { dir: "v", gap: o.gap ?? 0, p: o.p ?? [4, 16], fill: fill("white"), r: R.l, ...o }); }
function hscroll(parent, name, gap = SP.s) {
  const f = frame(name, { dir: "h", gap, clip: true }); add(parent, f, { fillW: true });
  f.primaryAxisSizingMode = "FIXED"; f.overflowDirection = "HORIZONTAL"; return f;
}

function renderBlock(parent, b, spec) {
  if (typeof renderExtra === "function" && renderExtra(parent, b, spec)) return;
  // Titres
  if (b.greet) {
    const v = vstack("Salutation", 4); add(parent, v, { fillW: true });
    v.appendChild(text(b.greet, "brand", "ink"));
    if (b.sub) v.appendChild(text(b.sub, "small", "muted"));
    return;
  }
  if (b.title) {
    const v = vstack("Titre", 6); add(parent, v, { fillW: true });
    const t = text(b.title, "display", spec.dark ? "white" : "ink"); add(v, t, { fillW: true }); t.textAutoResize = "HEIGHT";
    if (b.sub) { const s = text(b.sub, "body", spec.dark ? "white" : "muted", { opacity: spec.dark ? 0.7 : 1 }); add(v, s, { fillW: true }); s.textAutoResize = "HEIGHT"; }
    return;
  }
  if (b.h) {
    const s = inst("Section header", {}, { Title: b.h, Lien: b.more || "Voir tout" }, { "Afficher lien": !!b.more });
    add(parent, s, { fillW: true }); if (b.more) hotspot(s, b.more, [b.h]);
    return;
  }
  if (b.text) {
    const t = text(b.text, b.kind || "small", b.color || "muted", { align: b.align }); add(parent, t, { fillW: true }); t.textAutoResize = "HEIGHT";
    if (b.hs) hotspot(t, b.text);
    return;
  }
  if (b.link) {
    const t = text(b.link, "smallStrong", b.tone || "primary", { align: b.center ? "CENTER" : "LEFT" });
    add(parent, t, { fillW: !!b.center }); if (b.center) t.textAutoResize = "HEIGHT"; hotspot(t, b.link, b.alias || []);
    return;
  }
  // Recherche, filtres, onglets
  if (b.search) { const s = inst("Search", {}, { Placeholder: b.search }); add(parent, s, { fillW: true }); hotspot(s, b.search); return; }
  if (b.chips) {
    const row = b.wrap ? frame("Filtres", { dir: "h", gap: SP.s, wrap: true }) : null;
    const f = row || hscroll(parent, "Filtres");
    if (row) add(parent, row, { fillW: true });
    b.chips.forEach((c, i) => {
      const on = Array.isArray(b.sel) ? b.sel.includes(i) : b.sel === i;
      const ch = inst("Chip", { State: on ? "Selected" : "Default" }, { Label: c }); ch.name = c; hotspot(ch, c); f.appendChild(ch);
    });
    if (b.label) { const lab = text(b.label, "label", "muted"); parent.insertChild(parent.children.indexOf(f), lab); }
    return;
  }
  if (b.segment) {
    const s = inst("Segmented", { Selected: String((b.sel ?? 0) + 1) }, { "Option 1": b.segment[0], "Option 2": b.segment[1] });
    add(parent, s, { fillW: true }); return;
  }
  if (b.progress) {
    const v = vstack("Progression", 8); add(parent, v, { fillW: true });
    v.appendChild(text(b.label || `Étape ${b.progress.replace("/", " sur ")}`, "label", "primary"));
    add(v, inst("Progress", { Étape: b.progress }), { fillW: true });
    return;
  }
  // Actions rapides (accueil)
  if (b.quick) {
    const row = hstack("Actions rapides", SP.m); add(parent, row, { fillW: true });
    b.quick.forEach((q, i) => {
      const main = i === 0;
      const t = frame(q.l, { dir: "v", gap: SP.m, p: 16, h: 124, fill: main ? fill("primary") : fill("white"), r: R.xl, shadow: main ? null : SHADOW_SOFT, justify: "SPACE_BETWEEN" });
      const bub = frame("Icône", { dir: "h", w: 44, h: 44, justify: "CENTER", align: "CENTER", fill: main ? fill("white", 0.18) : fill("primary", 0.1), r: R.pill });
      bub.appendChild(icon(q.ic, 22, main ? "white" : "primary"));
      const tx = vstack("Textes", 2);
      tx.appendChild(text(q.l, "headline", main ? "white" : "ink")); if (q.s) tx.appendChild(text(q.s, "caption", main ? "white" : "muted", { opacity: main ? 0.8 : 1 }));
      t.appendChild(bub); t.appendChild(tx);
      add(row, t, { fillW: true }); hotspot(t, q.l, q.alias || []);
    });
    return;
  }
  // Tuiles d'aperçu (inventaire, dressing, pièces…)
  if (b.tiles) {
    const g = frame("Tuiles", { dir: "h", gap: SP.m, wrap: true }); add(parent, g, { fillW: true });
    const cols = b.cols || 2, w = Math.floor((CONTENT_W - SP.m * (cols - 1)) / cols);
    for (const t of b.tiles) {
      const c = frame(t.t, { dir: "v", gap: SP.m, p: 14, w, fill: fill("white"), r: R.l, shadow: SHADOW_SOFT });
      c.counterAxisSizingMode = "FIXED";
      if (t.photos) {
        const ph = hstack("Photos", 6); t.photos.forEach(([gl, tone]) => ph.appendChild(photo(Math.floor((w - 28 - 12) / 3), 64, gl, tone, R.s)));
        c.appendChild(ph);
      } else {
        const bub = frame("Icône", { dir: "h", w: 40, h: 40, justify: "CENTER", align: "CENTER", fill: fill(t.tone || "primary", 0.1), r: R.pill });
        bub.appendChild(icon(t.ic || "box", 20, t.tone || "primary")); c.appendChild(bub);
      }
      const tx = vstack("Textes", 2); tx.appendChild(text(t.t, "bodyStrong", "ink")); if (t.s) tx.appendChild(text(t.s, "caption", "muted"));
      c.appendChild(tx); if (t.badge) c.appendChild(inst("Badge", { Statut: t.badgeSt || "Info" }, { Label: t.badge }));
      if (t.hl) { c.strokes = fill("primary"); c.strokeWeight = 1.5; c.strokeAlign = "INSIDE"; }
      g.appendChild(c); hotspot(c, t.t, t.alias || []);
    }
    return;
  }
  // Grille photo (inventaire, dressing, vente)
  if (b.grid || b.carousel) {
    const items = b.grid || b.carousel;
    const g = b.carousel ? hscroll(parent, "Carrousel", 13) : frame("Grille", { dir: "h", gap: 13, wrap: true });
    if (!b.carousel) add(parent, g, { fillW: true });
    for (const it of items) {
      const c = inst("Card item", { Statut: it.st || "Aucun" }, { Title: it.t, Meta: it.m || "" });
      c.name = it.t; swapGlyph(c, it.g, it.tone);
      if (it.st && it.badge) { const bd = c.findOne(n => n.name === "Statut" && n.type === "INSTANCE"); if (bd) { const k = Object.keys(bd.componentProperties).find(x => x.startsWith("Label")); if (k) bd.setProperties({ [k]: it.badge }); } }
      g.appendChild(c); hotspot(c, it.t, it.alias || []);
    }
    return;
  }
  // Listes
  if (b.list) {
    const v = vstack(b.name || "Liste", SP.s); add(parent, v, { fillW: true });
    for (const it of b.list) {
      const row = inst("List row", { Leading: it.av != null ? "Avatar" : it.ph ? "Photo" : "Icon" }, { Title: it.t, Subtitle: it.s || "" }, { Statut: !!it.st, Chevron: it.chev !== false });
      row.name = it.t;
      if (it.st) { const bd = row.findOne(n => n.name === "Statut" && n.type === "INSTANCE"); if (bd) { const defs = bd.componentProperties, k = Object.keys(defs).find(x => x.startsWith("Label")); const p = { Statut: TONE[it.st] ? it.st : "Info" }; if (k) p[k] = it.badge || it.st; try { bd.setProperties(p); } catch (e) {} } }
      if (it.av != null) { const e = row.findOne(n => n.name === "Leading"); if (e) e.fills = photoPaint(it.av); }
      else if (it.ph) swapGlyph(row, it.ph, it.tone);
      else if (it.ic) { const L = row.findOne(n => n.name === "Leading"); const g = L && L.findOne(n => n.type === "INSTANCE"); if (g && ICON[it.ic]) { g.swapComponent(ICON[it.ic]); const gl = g.findOne(n => n.name === "Glyph"); if (gl) gl.strokes = fill(it.tone || "primary"); } if (L && it.tone) L.fills = fill(it.tone, 0.1); }
      if (it.hl) { row.strokes = fill(it.hlTone || "primary"); row.strokeWeight = 1.5; row.strokeAlign = "INSIDE"; }
      if (it.unread) row.fills = fill("primary", 0.05);
      add(v, row, { fillW: true }); hotspot(row, it.t, it.alias || []);
    }
    return;
  }
  // Fiche : grande photo + identité
  if (b.hero) {
    const h = b.hero, v = vstack("En-tête", SP.l); add(parent, v, { fillW: true });
    const ph = photo(CONTENT_W, h.h || 300, h.g, h.tone, R.xl); add(v, ph, { fillW: true });
    if (h.st) { const bd = inst("Badge", { Statut: h.st }, { Label: h.badge || h.st }); ph.appendChild(bd); bd.x = 14; bd.y = 14; }
    if (h.dots) { const d = hstack("Pagination", 6); for (let i = 0; i < 4; i++) d.appendChild(ellipse("Point", 6, fill("ink", i ? 0.2 : 0.7))); ph.appendChild(d); d.x = (CONTENT_W - 42) / 2; d.y = (h.h || 300) - 20; }
    const id = vstack("Identité", 4); add(v, id, { fillW: true });
    if (h.over) id.appendChild(text(h.over, "label", "muted", { upper: true }));
    const t = text(h.title, "display", "ink"); add(id, t, { fillW: true }); t.textAutoResize = "HEIGHT";
    if (h.sub) id.appendChild(text(h.sub, "small", "muted"));
    if (h.price) { const p = hstack("Prix", 10); p.appendChild(text(h.price, "price", "ink")); if (h.priceSub) p.appendChild(text(h.priceSub, "caption", "muted")); id.appendChild(p); }
    return;
  }
  // Profil (avatar + nom)
  if (b.profile) {
    const p = b.profile, v = vstack("Profil", 8, { align: "CENTER" }); add(parent, v, { fillW: true });
    const a = inst("Avatar", { Taille: p.size || "XL" }); const e = a.findOne(n => n.name === "Photo"); if (e && p.av != null) e.fills = photoPaint(p.av);
    v.appendChild(a); v.appendChild(text(p.name, "title", "ink", { align: "CENTER" }));
    if (p.sub) v.appendChild(text(p.sub, "small", "muted", { align: "CENTER" }));
    if (p.st) v.appendChild(inst("Badge", { Statut: TONE[p.st] ? p.st : "Info" }, { Label: p.badge || p.st }));
    return;
  }
  // Informations clé → valeur
  if (b.kv) {
    const c = card("Informations", { p: [4, 16] }); add(parent, c, { fillW: true });
    if (b.label) parent.insertChild(parent.children.indexOf(c), text(b.label, "label", "muted"));
    b.kv.forEach(([k, val], i) => {
      if (i) add(c, rect("Séparateur", 10, 1, fill("ink", 0.06)), { fillW: true });
      const r = inst("Info row", { Type: "Default" }, { Key: k, Value: val }); add(c, r, { fillW: true });
    });
    if (b.total) { add(c, rect("Séparateur", 10, 1, fill("ink", 0.1)), { fillW: true }); add(c, inst("Info row", { Type: "Total" }, { Key: b.total[0], Value: b.total[1] }), { fillW: true }); }
    return;
  }
  // Localisation (fil d'Ariane + action)
  if (b.loc) {
    const c = frame("Localisation", { dir: "h", gap: SP.m, p: 14, fill: fill("white"), r: R.l, align: "CENTER" }); add(parent, c, { fillW: true });
    const bub = frame("Icône", { dir: "h", w: 40, h: 40, justify: "CENTER", align: "CENTER", fill: fill("primary", 0.1), r: R.pill }); bub.appendChild(icon("pin", 20, "primary"));
    const tx = vstack("Textes", 2); tx.appendChild(text(b.loc.label || "Localisation", "caption", "muted"));
    const path = text(b.loc.path, "smallStrong", "ink"); add(tx, path, { fillW: true }); path.textAutoResize = "HEIGHT";
    c.appendChild(bub); add(c, tx, { fillW: true });
    if (b.loc.action) { const a = text(b.loc.action, "smallStrong", "primary"); tx.appendChild(a); hotspot(a, b.loc.action, b.loc.alias || []); }
    return;
  }
  // Formulaires
  if (b.fields) {
    for (const f of b.fields) { const i = inst("Field", { State: f.state || "Default" }, { Label: f.label, Value: f.value, Helper: f.help || "" }, { Aide: !!f.help }); add(parent, i, { fillW: true }); if (f.hs) hotspot(i, f.value); }
    return;
  }
  if (b.photoPick) {
    const c = frame("Photo", { dir: "v", gap: 8, p: 24, align: "CENTER", fill: fill("primary", 0.06), r: R.l, stroke: fill("primary", 0.35) });
    c.dashPattern = [6, 6]; add(parent, c, { fillW: true });
    const bub = frame("Icône", { dir: "h", w: 52, h: 52, justify: "CENTER", align: "CENTER", fill: fill("white"), r: R.pill, shadow: SHADOW_SOFT }); bub.appendChild(icon("camera", 24, "primary"));
    c.appendChild(bub); c.appendChild(text(b.photoPick.t, "smallStrong", "ink", { align: "CENTER" }));
    if (b.photoPick.s) { const s = text(b.photoPick.s, "smallStrong", "primary", { align: "CENTER" }); c.appendChild(s); hotspot(s, b.photoPick.s); }
    return;
  }
  if (b.callout) { const c = inst("Callout", { Type: b.callout.type || "Info" }, { Title: b.callout.t, Text: b.callout.s || "" }); add(parent, c, { fillW: true }); if (b.callout.hs) hotspot(c, b.callout.t); return; }
  if (b.actions) {
    const row = frame("Actions", { dir: b.vertical ? "v" : "h", gap: SP.m }); add(parent, row, { fillW: true });
    for (const a of b.actions) add(row, button(a), { fillW: true });
    return;
  }
  if (b.empty) {
    const e = inst("Empty state", {}, { Title: b.empty.t, Text: b.empty.s || "" }); add(parent, e, { fillW: true });
    const il = e.findOne(n => n.name === "Illustration"), g = il && il.findOne(n => n.type === "INSTANCE");
    if (g && ICON[b.empty.ic]) { g.swapComponent(ICON[b.empty.ic]); const gl = g.findOne(n => n.name === "Glyph"); if (gl) gl.strokes = fill("primary"); }
    if (b.empty.cta) { const w = hstack("CTA", 0, { justify: "CENTER" }); add(parent, w, { fillW: true }); w.primaryAxisAlignItems = "CENTER"; w.appendChild(button({ l: b.empty.cta, s: "S", alias: b.empty.alias || [] })); }
    return;
  }
  if (b.timeline) {
    const c = card("Suivi", { p: [16, 16], gap: 0 }); add(parent, c, { fillW: true });
    b.timeline.forEach((s, i) => {
      const done = s.state === "done", cur = s.state === "current", tone = s.tone || (done || cur ? "primary" : "ink");
      const row = hstack(s.t, SP.m, { align: "MIN" }); add(c, row, { fillW: true });
      const rail = vstack("Rail", 0, { align: "CENTER" });
      const dot = frame("Point", { dir: "h", w: 22, h: 22, justify: "CENTER", align: "CENTER", fill: done ? fill(tone) : cur ? fill(tone, 0.15) : fill("ink", 0.06), r: R.pill });
      if (done) dot.appendChild(icon("check", 14, "white")); else if (cur) dot.appendChild(ellipse("Centre", 8, fill(tone)));
      rail.appendChild(dot);
      if (i < b.timeline.length - 1) rail.appendChild(rect("Ligne", 2, 30, done ? fill(tone, 0.5) : fill("ink", 0.08), 1));
      const tx = vstack("Textes", 2, { p: [1, 0, 12, 0] }); tx.appendChild(text(s.t, done || cur ? "smallStrong" : "small", s.tone === "error" ? "error" : done || cur ? "ink" : "muted"));
      if (s.s) tx.appendChild(text(s.s, "caption", "muted"));
      row.appendChild(rail); add(row, tx, { fillW: true }); hotspot(row, s.t);
    });
    return;
  }
  if (b.outfit) {
    // Moodboard : une pièce maîtresse + pièces secondaires, lisible d'un coup d'œil
    const o = b.outfit, board = frame("Tenue", { w: CONTENT_W, h: 360, fill: fill("white"), r: R.xl, clip: true, shadow: SHADOW_SOFT }); add(parent, board, { fillW: true });
    const gap = 8, pad = 10, bigW = Math.round((CONTENT_W - pad * 2 - gap) * 0.58), smallW = CONTENT_W - pad * 2 - gap - bigW;
    const slots = [[pad, pad, bigW, 360 - pad * 2], [pad + bigW + gap, pad, smallW, 140], [pad + bigW + gap, pad + 140 + gap, smallW, 96], [pad + bigW + gap, pad + 244 + gap * 2, smallW, 360 - pad * 2 - 244 - gap * 2]];
    o.items.slice(0, 4).forEach((it, i) => {
      const [x, y, w, h] = slots[i], p = photo(w, h, it.g, it.tone, R.l, it.t);
      const tag = hstack("Étiquette", 4, { p: [4, 8], fill: fill("white", 0.92), r: R.pill }); tag.appendChild(text(it.t, "label", "ink"));
      if (it.refuse) { tag.appendChild(text("· Refuser", "label", "primary")); }
      p.appendChild(tag); tag.x = 8; tag.y = h - 32;
      board.appendChild(p); p.x = x; p.y = y; hotspot(p, it.t, it.refuse ? ["Refuser"] : []);
    });
    if (o.like) { const lk = frame("J'aime", { dir: "h", w: 44, h: 44, justify: "CENTER", align: "CENTER", fill: fill("white"), r: R.pill, shadow: SHADOW_SOFT }); lk.appendChild(icon("heart", 22, "primary")); board.appendChild(lk); lk.x = bigW + pad - 54; lk.y = pad + 10; }
    return;
  }
  if (b.camera) {
    // Scanner : la caméra occupe l'écran, un seul geste principal
    const v = frame("Caméra", { w: W, h: 560, fill: fill("ink"), clip: true }); add(parent, v, { fillW: true });
    const vf = frame("Cadre", { w: 260, h: 260 }); v.appendChild(vf); vf.x = (W - 260) / 2; vf.y = 130;
    [[0, 0, 0], [220, 0, 90], [220, 220, 180], [0, 220, 270]].forEach(([x, y, rot], i) => {
      const cr = figma.createVector(); cr.vectorPaths = [{ windingRule: "NONE", data: "M 0 40 L 0 12 C 0 5.37 5.37 0 12 0 L 40 0" }];
      cr.strokes = fill("white"); cr.strokeWeight = 4; cr.strokeCap = "ROUND"; cr.fills = []; cr.name = `Coin ${i + 1}`;
      vf.appendChild(cr); cr.rotation = -rot; cr.x = x + (rot === 90 || rot === 180 ? 40 : 0); cr.y = y + (rot === 180 || rot === 270 ? 40 : 0);
    });
    const hint = hstack("Consigne", 8, { p: [8, 14], fill: fill("white", 0.14), r: R.pill }); hint.appendChild(text(b.camera.hint, "small", "white"));
    v.appendChild(hint); hint.x = (W - hint.width) / 2; hint.y = 420;
    return;
  }
  if (b.shutter) {
    const row = hstack("Commandes", 0, { justify: "SPACE_BETWEEN", p: [0, 24] }); add(parent, row, { fillW: true }); row.primaryAxisAlignItems = "SPACE_BETWEEN";
    const side = (l, ic) => { const f = vstack(l, 6, { align: "CENTER", w: 84 }); const bub = frame("Icône", { dir: "h", w: 48, h: 48, justify: "CENTER", align: "CENTER", fill: fill("white", 0.12), r: R.pill }); bub.appendChild(icon(ic, 22, "white")); f.appendChild(bub); f.appendChild(text(l, "caption", "white", { align: "CENTER" })); hotspot(f, l); return f; };
    const sh = frame(b.shutter.main, { dir: "h", w: 76, h: 76, justify: "CENTER", align: "CENTER", fill: [], r: R.pill, stroke: fill("white"), sw: 4 });
    sh.appendChild(ellipse("Déclencheur", 60, fill("white"))); hotspot(sh, b.shutter.main);
    row.appendChild(side(b.shutter.left, "image")); row.appendChild(sh); row.appendChild(side(b.shutter.right, "edit"));
    return;
  }
  if (b.qr) {
    const c = frame("QR code", { dir: "v", gap: 12, p: 24, align: "CENTER", fill: fill("white"), r: R.xl, shadow: SHADOW_SOFT }); add(parent, c, { fillW: true });
    const q = frame("Code", { dir: "h", w: 180, h: 180, justify: "CENTER", align: "CENTER", fill: fill("ink", 0.04), r: R.m }); q.appendChild(icon("qr", 120, "ink"));
    c.appendChild(q); c.appendChild(text(b.qr, "caption", "muted", { align: "CENTER" }));
    return;
  }
  if (b.spacer) { add(parent, rect("Espace", 10, b.spacer, []), { fillW: true }); return; }
  warn(`Bloc inconnu dans ${spec.id} : ${Object.keys(b).join(",")}`);
}
