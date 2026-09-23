// ── Photos existantes du fichier (avatars) réutilisées pour les profils ──
const IMAGES = [];
{
  const seen = new Set();
  for (const p of [cmpPage, ...figma.root.children]) {
    for (const n of p.findAll(n => (n.type === "ELLIPSE" || n.type === "RECTANGLE") && Array.isArray(n.fills) && n.fills.some(f => f.type === "IMAGE"))) {
      for (const f of n.fills) if (f.type === "IMAGE" && f.imageHash && !seen.has(f.imageHash) && n.width < 200) { seen.add(f.imageHash); IMAGES.push(f); }
    }
    if (IMAGES.length >= 6) break;
  }
}
const photoPaint = i => (IMAGES.length ? [{ ...IMAGES[i % IMAGES.length], scaleMode: "FILL" }] : fill("primary", 0.15));

// ── Navigation ──
makeSet("Top bar", "Navigation", ["Back", "Close"].map(type => ({ props: { Type: type }, build(c) {
  asLayout(c, { p: [12, 12, 8, 12], w: W, h: TOPBAR_H, fixedMain: true, fixedCross: true, justify: "SPACE_BETWEEN", fill: fill("bg") });
  const left = frame("Bouton retour", { dir: "h", w: 40, h: 40, justify: "CENTER", align: "CENTER", fill: fill("white"), r: R.pill, shadow: SHADOW_SOFT });
  left.appendChild(icon(type === "Back" ? "back" : "close", 20, "ink"));
  const title = text("Titre", "headline", "ink", { name: "Title", align: "CENTER" });
  const right = frame("Action", { dir: "h", w: 40, h: 40, justify: "CENTER", align: "CENTER" });
  const act = icon("share", 20, "ink"); right.appendChild(act);
  c.appendChild(left); c.appendChild(title); c.appendChild(right);
  return { texts: { Title: title }, bools: { Action: act } };
} })), { Title: "Titre" }, { Action: false }, 1);

const TABS = [["Accueil", "home"], ["Inventaire", "box"], ["Dressing", "hanger"], ["Logements", "house"], ["Compte", "user"]];
makeSet("Tab bar", "Navigation", TABS.map(([active]) => ({ props: { Actif: active }, build(c) {
  asLayout(c, { p: [8, 10, 26, 10], w: W, h: TABBAR_H, fixedMain: true, fixedCross: true, justify: "SPACE_BETWEEN", align: "MIN", fill: fill("white") });
  c.strokes = fill("ink", 0.08); c.strokeAlign = "INSIDE"; c.strokeTopWeight = 1; c.strokeBottomWeight = 0; c.strokeLeftWeight = 0; c.strokeRightWeight = 0;
  TABS.forEach(([name, ic], i) => {
    const on = name === active;
    const item = frame(`Onglet ${i + 1} · ${name}`, { dir: "v", gap: 4, w: 68, align: "CENTER" });
    const pill = frame("Pastille", { dir: "h", w: 52, h: 30, justify: "CENTER", align: "CENTER", fill: on ? fill("primary", 0.12) : [], r: R.pill });
    pill.appendChild(icon(ic, 22, on ? "primary" : "muted"));
    item.appendChild(pill);
    item.appendChild(text(name, on ? "label" : "caption", on ? "primary" : "muted"));
    c.appendChild(item);
  });
} })), {}, {}, 1);

makeSet("Bouton flottant", "Navigation", [{ props: { Type: "Ajouter" }, build(c) {
  asLayout(c, { w: 56, h: 56, fixedMain: true, fixedCross: true, justify: "CENTER", fill: fill("primary"), r: R.pill, shadow: SHADOW_FLOAT });
  c.appendChild(icon("plus", 26, "white"));
} }], {}, {}, 1);

// ── Cards (grille façon moodboard : la photo d'abord, l'info ensuite) ──
const CARD_W = Math.floor((CONTENT_W - 13) / 2);
makeSet("Card item", "Cards", ["Aucun", "Disponible", "Prêté", "Emprunté", "En vente", "Vendu"].map(st => ({ props: { Statut: st }, build(c) {
  asLayout(c, { dir: "v", gap: 8, w: CARD_W, fixedCross: true, align: "MIN" });
  const photo = frame("Photo", { w: CARD_W, h: 196, fill: fill("pinkSoft", 0.35), r: R.l, clip: true });
  const g = icon("tshirt", 64, "ink"); g.opacity = 0.28; g.name = "Glyph";
  photo.appendChild(g); g.x = (CARD_W - 64) / 2; g.y = (196 - 64) / 2;
  if (st !== "Aucun") { const b = inst("Badge", { Statut: st }, { Label: st }); photo.appendChild(b); b.x = 10; b.y = 10; b.name = "Statut"; }
  if (st === "Vendu") photo.opacity = 0.55;
  add(c, photo, { fillW: true });
  const tx = frame("Textes", { dir: "v", gap: 2 });
  const t = text("Nom de l'article", "smallStrong", "ink", { name: "Title" });
  const m = text("Détail", "caption", "muted", { name: "Meta" });
  tx.appendChild(t); tx.appendChild(m); add(c, tx, { fillW: true });
  t.layoutSizingHorizontal = "FILL"; m.layoutSizingHorizontal = "FILL";
  return { texts: { Title: t, Meta: m } };
} })), { Title: "Nom de l'article", Meta: "Détail" }, {}, 6);

// ── Listes ──
makeSet("List row", "Listes", ["Icon", "Avatar", "Photo"].map(lead => ({ props: { Leading: lead }, build(c) {
  asLayout(c, { p: [12, 14], gap: 14, w: CONTENT_W, fixedMain: true, fill: fill("white"), r: R.l });
  let L;
  if (lead === "Icon") { L = frame("Leading", { dir: "h", w: 44, h: 44, justify: "CENTER", align: "CENTER", fill: fill("primary", 0.1), r: R.pill }); L.appendChild(icon("box", 22, "primary")); }
  else if (lead === "Avatar") { L = ellipse("Leading", 44, photoPaint(0)); }
  else { L = frame("Leading", { w: 52, h: 52, fill: fill("pinkSoft", 0.35), r: R.s, clip: true }); const g = icon("tshirt", 28, "ink"); g.opacity = 0.35; L.appendChild(g); g.x = 12; g.y = 12; g.name = "Glyph"; }
  c.appendChild(L);
  const tx = frame("Textes", { dir: "v", gap: 2 });
  const t = text("Titre", "bodyStrong", "ink", { name: "Title" }), s = text("Sous-titre", "small", "muted", { name: "Subtitle" });
  tx.appendChild(t); tx.appendChild(s); add(c, tx, { fillW: true });
  const b = inst("Badge", { Statut: "Info" }, { Label: "Statut" }); b.name = "Statut"; c.appendChild(b);
  const ch = icon("chevron", 18, "muted"); c.appendChild(ch);
  return { texts: { Title: t, Subtitle: s }, bools: { Statut: b, Chevron: ch } };
} })), { Title: "Titre", Subtitle: "Sous-titre" }, { Statut: false, Chevron: true }, 1);

makeSet("Section header", "Listes", [{ props: { Type: "Default" }, build(c) {
  asLayout(c, { w: CONTENT_W, fixedMain: true, justify: "SPACE_BETWEEN", align: "CENTER" });
  const t = text("Section", "headline", "ink", { name: "Title" }), l = text("Voir tout", "smallStrong", "primary", { name: "Lien" });
  c.appendChild(t); c.appendChild(l);
  return { texts: { Title: t, Lien: l }, bools: { "Afficher lien": l } };
} }], { Title: "Section", Lien: "Voir tout" }, { "Afficher lien": true }, 1);

// ── Fiches : ligne d'information ──
makeSet("Info row", "Fiches", ["Default", "Total"].map(type => ({ props: { Type: type }, build(c) {
  asLayout(c, { p: [10, 0], w: CONTENT_W, fixedMain: true, justify: "SPACE_BETWEEN" });
  const k = text("Libellé", type === "Total" ? "bodyStrong" : "small", type === "Total" ? "ink" : "muted", { name: "Key" });
  const v = text("Valeur", type === "Total" ? "price" : "smallStrong", "ink", { name: "Value", align: "RIGHT" });
  c.appendChild(k); c.appendChild(v);
  return { texts: { Key: k, Value: v } };
} })), { Key: "Libellé", Value: "Valeur" }, {}, 1);

// ── Notifications ──
const TOAST = { "Succès": ["success", "check"], "Erreur": ["error", "alert"], "Info": ["primary", "bell"] };
makeSet("Toast", "Notifications", Object.keys(TOAST).map(type => ({ props: { Type: type }, build(c) {
  const [tone, ic] = TOAST[type];
  asLayout(c, { p: 12, gap: 12, w: CONTENT_W, fixedMain: true, fill: fill("white"), r: R.l, shadow: SHADOW_FLOAT });
  const b = frame("Icône", { dir: "h", w: 36, h: 36, justify: "CENTER", align: "CENTER", fill: fill(tone, 0.12), r: R.pill }); b.appendChild(icon(ic, 18, tone));
  const tx = frame("Textes", { dir: "v", gap: 1 });
  const t = text("Titre", "smallStrong", "ink", { name: "Title" }), s = text("Message", "caption", "muted", { name: "Text" });
  tx.appendChild(t); tx.appendChild(s);
  c.appendChild(b); add(c, tx, { fillW: true }); c.appendChild(icon("close", 16, "muted"));
  return { texts: { Title: t, Text: s } };
} })), { Title: "Titre", Text: "Message" }, {}, 1);

const CALLOUT = { "Privé": ["cloth", "lock"], "Info": ["ink", "bell"], "Succès": ["success", "check"], "Erreur": ["error", "alert"] };
makeSet("Callout", "Notifications", Object.keys(CALLOUT).map(type => ({ props: { Type: type }, build(c) {
  const [tone, ic] = CALLOUT[type];
  asLayout(c, { p: 14, gap: 12, w: CONTENT_W, fixedMain: true, align: "MIN", fill: fill(tone, 0.07), r: R.m });
  c.appendChild(icon(ic, 20, tone));
  const tx = frame("Textes", { dir: "v", gap: 2 });
  const t = text("Titre", "smallStrong", "ink", { name: "Title" }), s = text("Message", "caption", "muted", { name: "Text" });
  tx.appendChild(t); tx.appendChild(s); add(c, tx, { fillW: true }); t.layoutSizingHorizontal = "FILL"; s.layoutSizingHorizontal = "FILL";
  return { texts: { Title: t, Text: s } };
} })), { Title: "Titre", Text: "Message" }, {}, 1);

// ── Modales ──
makeSet("Dialog", "Modales", ["Danger", "Default"].map(type => ({ props: { Type: type }, build(c) {
  const tone = type === "Danger" ? "error" : "primary";
  asLayout(c, { dir: "v", p: [28, 24, 24, 24], gap: 16, w: W - 24, fixedCross: true, fill: fill("white"), r: R.xl, shadow: SHADOW_FLOAT });
  const b = frame("Icône", { dir: "h", w: 56, h: 56, justify: "CENTER", align: "CENTER", fill: fill(tone, 0.1), r: R.pill }); b.appendChild(icon(type === "Danger" ? "trash" : "check", 26, tone));
  const t = text("Titre", "title", "ink", { name: "Title", align: "CENTER" }), s = text("Message", "body", "muted", { name: "Text", align: "CENTER" });
  c.appendChild(b); add(c, t, { fillW: true }); add(c, s, { fillW: true });
  t.textAutoResize = "HEIGHT"; s.textAutoResize = "HEIGHT";
  const row = frame("Actions", { dir: "h", gap: 12 });
  const a = inst("Button", { Type: "Tertiary", Size: "L" }, { Label: "Annuler" }); a.name = "Annuler";
  const o = inst("Button", { Type: type === "Danger" ? "Danger" : "Primary", Size: "L" }, { Label: "Confirmer" }); o.name = "Confirmer";
  add(row, a, { fillW: true }); add(row, o, { fillW: true }); add(c, row, { fillW: true });
  return { texts: { Title: t, Text: s } };
} })), { Title: "Titre", Text: "Message" }, {}, 2);

// ── Profil ──
makeSet("Avatar", "Éléments de profil", [["S", 32], ["M", 44], ["L", 72], ["XL", 96]].map(([s, d]) => ({ props: { Taille: s }, build(c) {
  asLayout(c, { w: d, h: d, fixedMain: true, fixedCross: true, r: R.pill });
  c.clipsContent = true;
  add(c, ellipse("Photo", d, photoPaint(0)), { fillW: true, fillH: true });
} })), {}, {}, 4);

// ── Autres : état vide ──
makeSet("Empty state", "Autres composants réutilisables", [{ props: { Type: "Default" }, build(c) {
  asLayout(c, { dir: "v", p: [24, 0], gap: 12, w: CONTENT_W, fixedCross: true });
  const b = frame("Illustration", { dir: "h", w: 96, h: 96, justify: "CENTER", align: "CENTER", fill: fill("primary", 0.08), r: R.pill }); b.appendChild(icon("box", 40, "primary"));
  const t = text("Rien ici pour l'instant", "headline", "ink", { name: "Title", align: "CENTER" }), s = text("Message", "small", "muted", { name: "Text", align: "CENTER", w: 280 });
  c.appendChild(b); c.appendChild(t); c.appendChild(s);
  return { texts: { Title: t, Text: s } };
} }], { Title: "Rien ici pour l'instant", Text: "Message" }, {}, 1);

// ── Rangement des Sections « UI v2 · … » à droite de l'existant ──
if (!DRY_RUN) {
  const ORDER = ["Icônes", "Navigation", "Boutons", "Champs / formulaires", "Cards", "Chips / filtres", "Badges / statuts", "Listes",
    "Fiches", "Modales", "Notifications", "Éléments de profil", "Autres composants réutilisables"];
  const others = cmpPage.children.filter(n => !n.name.startsWith("UI v2 · "));
  const startX = others.length ? Math.max(...others.map(n => n.x + n.width)) + 600 : 0;
  let y = 0;
  for (const cat of ORDER) {
    const sec = cmpPage.children.find(n => n.type === "SECTION" && n.name === `UI v2 · ${cat}`);
    if (!sec) continue;
    let x = 80, rowY = 160, rowH = 0, maxR = 0;
    for (const s of sec.children) {
      if (x > 80 && x + s.width > 2600) { x = 80; rowY += rowH + 80; rowH = 0; }
      s.x = x; s.y = rowY; x += s.width + 80; rowH = Math.max(rowH, s.height); maxR = Math.max(maxR, x);
    }
    sec.resizeWithoutConstraints(Math.max(maxR, 1200), rowY + rowH + 80);
    sec.x = startX; sec.y = y; y += sec.height + 200;
  }
}
