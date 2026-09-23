// ============================================================
// PENDERIE - REFONTE UI v2
// Partie 1/N : duplication de la page + refonte de l'ACCUEIL
//
// A. Duplique la page "Maquette" en "Maquette v2".
//    L'originale n'est JAMAIS touchee : ses connexions de
//    prototype restent intactes.
// B. Refait l'UI de "Accueil - Tableau de bord" sur la v2, en
//    conservant le NOEUD frame (ses reactions de niveau frame
//    survivent donc a la refonte).
//
// Relancable : relancer refait l'accueil v2, sans toucher au reste.
//
// CORRECTIFS v2 :
//  - resize() remet les sizing modes a FIXED -> on les re-applique
//    APRES le resize, sinon les colonnes ne huggent pas leur contenu.
//  - sur une auto-layout HORIZONTALE, counterAxisSizingMode pilote la
//    HAUTEUR (et non la largeur) -> plus de counter:"FIXED" sur les
//    rangees, sinon elles restent bloquees a 100 px.
//  - clipsContent = false par defaut (createFrame le met a true, ce
//    qui rognait tout le contenu de la colonne principale).
// ============================================================

const PAGE_SRC = "Maquette";
const PAGE_DST = "Maquette v2";

// ---------- TOKENS (charte existante, aucune couleur nouvelle) ----------
const C = {
  primary: { r: 0.827451, g: 0.113725, b: 0.400000 }, // #D31D66
  ink:     { r: 0.101961, g: 0.117647, b: 0.141176 }, // #1A1E24
  sub:     { r: 0.278431, g: 0.333333, b: 0.411765 }, // #475569
  bg:      { r: 0.972549, g: 0.980392, b: 0.988235 }, // #F8FAFC
  error:   { r: 0.862745, g: 0.149020, b: 0.149020 }, // #DC2626
  main:    { r: 0.066667, g: 0.490196, b: 0.435294 }, // #117D6F
  cloth:   { r: 0.513725, g: 0.070588, b: 0.592157 }, // #831297
  white:   { r: 1, g: 1, b: 1 }
};
const R  = { xs: 8, sm: 12, md: 16, lg: 24, full: 999 };
const S  = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, huge: 32 };
const GUT = 20;   // gouttiere d'ecran, constante partout
const W   = 393;
const H   = 817;
const NAVH = 72;

const FONT_T  = { family: "Typolio", style: "Regular" };
const FONT_L  = { family: "Luciole", style: "Regular" };
const FONT_LB = { family: "Luciole", style: "Bold" };

const solid = function (c, o) {
  return [{ type: "SOLID", color: c, opacity: o == null ? 1 : o }];
};

const SHADOW_E1 = {
  type: "DROP_SHADOW", color: { r: 0.10, g: 0.12, b: 0.14, a: 0.06 },
  offset: { x: 0, y: 1 }, radius: 3, spread: 0, visible: true, blendMode: "NORMAL"
};
const SHADOW_E2 = {
  type: "DROP_SHADOW", color: { r: 0.10, g: 0.12, b: 0.14, a: 0.10 },
  offset: { x: 0, y: 4 }, radius: 14, spread: 0, visible: true, blendMode: "NORMAL"
};

// ---------- helpers ----------
// o.primary / o.counter : "AUTO" (hug) ou "FIXED".
// Rappel des axes : VERTICAL  -> primary = hauteur, counter = largeur
//                   HORIZONTAL-> primary = largeur, counter = hauteur
function frame(name, o) {
  o = o || {};
  const f = figma.createFrame();
  f.name = name;
  f.fills = o.fill ? solid(o.fill, o.fillOpacity) : [];
  if (o.radius != null) f.cornerRadius = o.radius;

  if (o.dir) {
    f.layoutMode = o.dir;
    f.itemSpacing = o.gap || 0;
    f.paddingTop    = o.pt != null ? o.pt : (o.py || 0);
    f.paddingBottom = o.pb != null ? o.pb : (o.py || 0);
    f.paddingLeft   = o.pl != null ? o.pl : (o.px || 0);
    f.paddingRight  = o.pr != null ? o.pr : (o.px || 0);
    if (o.align)   f.counterAxisAlignItems = o.align;
    if (o.justify) f.primaryAxisAlignItems = o.justify;
  }

  // resize AVANT de figer les modes : resize() force FIXED sur les 2 axes
  if (o.w != null && o.h != null) f.resize(o.w, o.h);
  else if (o.w != null)           f.resize(o.w, f.height);
  else if (o.h != null)           f.resize(f.width, o.h);

  if (o.dir) {
    f.primaryAxisSizingMode = o.primary || "AUTO";
    f.counterAxisSizingMode = o.counter || "AUTO";
  }

  if (o.shadow) f.effects = [o.shadow];
  f.clipsContent = o.clip === true; // par defaut on ne rogne PAS
  return f;
}

function text(chars, o) {
  o = o || {};
  const t = figma.createText();
  t.fontName = o.font || FONT_L;
  t.characters = String(chars);
  t.fontSize = o.size || 16;
  t.fills = solid(o.color || C.ink, o.opacity);
  t.textAutoResize = "WIDTH_AND_HEIGHT"; // imperatif : sinon boite 0
  if (o.lineHeight) t.lineHeight = { value: o.lineHeight, unit: "PIXELS" };
  if (o.align) t.textAlignHorizontal = o.align;
  t.name = String(chars).slice(0, 28);
  return t;
}

// append + largeur FILL (le parent doit deja etre en auto-layout)
function addFill(parent, node) {
  parent.appendChild(node);
  try { node.layoutSizingHorizontal = "FILL"; } catch (e) {}
  return node;
}

// carte blanche SANS bordure : le contraste vient du blanc sur #F8FAFC
function card(name, o) {
  const base = {
    fill: C.white, radius: R.md, dir: "VERTICAL", gap: S.sm,
    px: S.lg, py: S.lg, shadow: SHADOW_E1
  };
  for (const k in (o || {})) base[k] = o[k];
  return frame(name, base);
}

function statusPill(label, tone) {
  const map = {
    dispo:    [C.main,    0.10, C.main],
    prete:    [C.primary, 0.12, C.primary],
    emprunte: [C.cloth,   0.12, C.cloth],
    retard:   [C.error,   0.10, C.error],
    neutre:   [C.sub,     0.10, C.sub]
  };
  const t = map[tone] || map.neutre;
  const p = frame("Statut/" + label, {
    dir: "HORIZONTAL", fill: t[0], fillOpacity: t[1], radius: R.full,
    px: S.sm, py: S.xs, align: "CENTER"
  });
  p.appendChild(text(label, { font: FONT_LB, size: 12, color: t[2] }));
  return p;
}

// Recolore recursivement les vecteurs d'une icone clonee.
function tint(node, color, opacity) {
  // On ne recolore QUE ce qui est deja visible : les frames conteneurs
  // des icones portent un fill blanc « visible:false » qu'il ne faut
  // surtout pas reveiller, sinon l'icone devient un bloc plein.
  const aDuVisible = function (paints) {
    if (!Array.isArray(paints) || !paints.length) return false;
    for (let i = 0; i < paints.length; i++) {
      if (paints[i].visible !== false) return true;
    }
    return false;
  };
  try {
    if ("fills" in node && aDuVisible(node.fills)) node.fills = solid(color, opacity);
    if ("strokes" in node && aDuVisible(node.strokes)) node.strokes = solid(color, opacity);
  } catch (e) {}
  const kids = node.children || [];
  for (let i = 0; i < kids.length; i++) tint(kids[i], color, opacity);
}

// Clone une icone existante du fichier (vecteurs deja dessines) et la
// remet a la taille / couleur voulues. Evite createNodeFromSvg, qui ne
// gere que les SVG a un seul <path>.
function iconFrom(srcNode, size, color, opacity) {
  if (!srcNode) return null;
  try {
    const ic = srcNode.clone();
    ic.name = "Icone";
    ic.rescale(size / Math.max(ic.width, ic.height));
    tint(ic, color, opacity);
    return ic;
  } catch (e) { return null; }
}

// Masque le libelle interne d'une instance « Vetements » : dans une
// vignette photo, le mot « Tshirt » en 4 px ne sert a rien.
function nettoieVignette(inst) {
  const kids = inst.children || [];
  for (let i = 0; i < kids.length; i++) {
    const k = kids[i];
    if (k.type === "TEXT" || k.name === "Libellé" || k.name === "Libelle") {
      try { k.visible = false; } catch (e) {}
    } else if (k.name === "Visuel") {
      try { k.strokes = []; } catch (e) {}   // plus de contour magenta
    }
  }
}

// zone photo : fond teinte (et non #F8FAFC sur blanc, invisible) + picto
function photoBox(w, h, radius, comp, tone) {
  const t = tone || C.primary;
  const box = frame("Photo", {
    fill: t, fillOpacity: 0.08, radius: radius, w: w, h: h,
    dir: "VERTICAL", align: "CENTER", justify: "CENTER",
    primary: "FIXED", counter: "FIXED", clip: true
  });
  if (comp && comp.type === "COMPONENT") {
    try {
      const inst = comp.createInstance();
      inst.rescale((Math.min(w, h) * 0.70) / Math.max(inst.width, inst.height));
      nettoieVignette(inst);
      box.appendChild(inst);
    } catch (e) {}
  }
  return box;
}

// Mosaique d'apercu : 4 vignettes carrees. Un apercu montre des objets,
// pas un compteur -> c'est ce qui donne envie d'entrer dans la rubrique.
function mosaique(size, gap, comps, tone) {
  const m = frame("Mosaique", { dir: "VERTICAL", gap: gap });
  for (let r = 0; r < 2; r++) {
    const row = frame("Rangee", { dir: "HORIZONTAL", gap: gap });
    for (let c = 0; c < 2; c++) {
      row.appendChild(photoBox(size, size, R.xs, comps[(r * 2 + c) % comps.length], tone));
    }
    m.appendChild(row);
  }
  return m;
}

// ---------- execution ----------
(async function () {
  await figma.loadAllPagesAsync();
  await figma.loadFontAsync(FONT_T);
  await figma.loadFontAsync(FONT_L);
  await figma.loadFontAsync(FONT_LB);

  const log = [];

  // ===== A. duplication de la page =====
  const src = figma.root.children.filter(function (p) { return p.name === PAGE_SRC; })[0];
  if (!src) { console.log("X Page « " + PAGE_SRC + " » introuvable."); return; }
  await src.loadAsync();

  let dst = figma.root.children.filter(function (p) { return p.name === PAGE_DST; })[0];
  if (!dst) {
    if (typeof src.clone === "function") {
      dst = src.clone();
      dst.name = PAGE_DST;
      log.push("OK Page « " + PAGE_DST + " » creee par duplication.");
    } else {
      dst = figma.createPage();
      dst.name = PAGE_DST;
      const kids = src.children.slice();
      for (let i = 0; i < kids.length; i++) dst.appendChild(kids[i].clone());
      log.push("! page.clone() indisponible -> duplication noeud par noeud.");
    }
  } else {
    log.push(". Page « " + PAGE_DST + " » deja presente, reutilisee.");
  }
  await dst.loadAsync();

  // ===== B. refonte de l'accueil =====
  function findFrames(page, test) {
    const out = [];
    const walk = function (n) {
      if (n.type === "FRAME") { if (test(n)) out.push(n); return; }
      const kids = n.children || [];
      for (let i = 0; i < kids.length; i++) walk(kids[i]);
    };
    const top = page.children || [];
    for (let i = 0; i < top.length; i++) walk(top[i]);
    return out;
  }

  const cands = findFrames(dst, function (f) { return f.name.indexOf("Accueil") === 0; });
  let screen = cands.filter(function (f) { return f.name.indexOf("Tableau de bord") > -1; })[0];
  if (!screen) screen = cands[0];
  if (!screen) { console.log("X Ecran Accueil introuvable sur " + PAGE_DST); return; }
  log.push("-> Refonte de : " + screen.name + " (" + screen.id + ")");

  async function comp(id) {
    try {
      const n = await figma.getNodeByIdAsync(id);
      return (n && n.type === "COMPONENT") ? n : null;
    } catch (e) { return null; }
  }
  async function node(id) {
    try { return await figma.getNodeByIdAsync(id); } catch (e) { return null; }
  }

  const PIC = {
    tshirt:  await comp("39:50"),
    jacket:  await comp("39:55"),
    pants:   await comp("39:82"),
    baskets: await comp("52:2013"),
    cap:     await comp("39:109"),
    robe:    await comp("52:2003")
  };
  const LOGO = await comp("18:595");
  const FABC = await comp("45:725");
  const NAVIC = {
    accueil:    await node("39:22"),
    inventaire: await node("39:24"),
    logements:  await node("39:26"),
    profil:     await node("39:32")
  };

  // on vide le contenu mais on GARDE le noeud frame
  const olds = screen.children.slice();
  for (let i = 0; i < olds.length; i++) olds[i].remove();
  screen.layoutMode = "NONE";
  screen.fills = solid(C.bg);
  screen.clipsContent = true;
  screen.resize(W, H);

  // ---- colonne de contenu (defile) ----
  const content = frame("Contenu", {
    dir: "VERTICAL", gap: S.xxl, w: W,
    primary: "AUTO", counter: "FIXED", pt: 0, pb: 120
  });
  screen.appendChild(content);
  content.x = 0; content.y = 0;

  // 1. barre haute
  const top = frame("Barre haute", {
    dir: "HORIZONTAL", w: W, h: 56, primary: "FIXED", counter: "FIXED",
    px: GUT, align: "CENTER", justify: "SPACE_BETWEEN"
  });
  const brand = frame("Marque", { dir: "HORIZONTAL", gap: S.sm, align: "CENTER" });
  if (LOGO) {
    try {
      const li = LOGO.createInstance();
      li.rescale(28 / Math.max(li.width, li.height));
      brand.appendChild(li);
    } catch (e) {}
  }
  brand.appendChild(text("PENDERIE", { font: FONT_LB, size: 16, color: C.ink }));
  top.appendChild(brand);

  const topActions = frame("Actions", { dir: "HORIZONTAL", gap: S.md, align: "CENTER" });
  const bell = frame("Notifications", {
    fill: C.white, radius: R.full, w: 36, h: 36, shadow: SHADOW_E1,
    dir: "VERTICAL", align: "CENTER", justify: "CENTER", primary: "FIXED", counter: "FIXED"
  });
  bell.appendChild(text("!", { font: FONT_LB, size: 14, color: C.ink }));
  const ava = frame("Avatar", {
    fill: C.primary, fillOpacity: 0.12, radius: R.full, w: 36, h: 36,
    dir: "VERTICAL", align: "CENTER", justify: "CENTER", primary: "FIXED", counter: "FIXED"
  });
  ava.appendChild(text("M", { font: FONT_LB, size: 12, color: C.primary }));
  topActions.appendChild(bell);
  topActions.appendChild(ava);
  top.appendChild(topActions);
  addFill(content, top);

  // 2. salutation : le SEUL gros titre de l'ecran
  const hello = frame("Salutation", { dir: "VERTICAL", gap: S.xs, px: GUT });
  hello.appendChild(text("Bonjour Mathis", { font: FONT_T, size: 32, color: C.ink, lineHeight: 38 }));
  hello.appendChild(text("128 objets · 48 vêtements · 4 prêtés", { size: 12, color: C.sub }));
  addFill(content, hello);

  // 3. actions principales
  const actions = frame("Actions principales", { dir: "HORIZONTAL", gap: S.md, px: GUT });
  function bigAction(label, glyph, isPrimary) {
    const b = frame("Button/" + (isPrimary ? "Primary" : "Secondary") + "/" + label, {
      dir: "HORIZONTAL", gap: S.sm, radius: R.md, h: 52, px: S.lg,
      align: "CENTER", justify: "CENTER", counter: "FIXED",
      fill: isPrimary ? C.primary : C.white,
      shadow: isPrimary ? SHADOW_E2 : SHADOW_E1
    });
    b.appendChild(text(glyph, { font: FONT_LB, size: 16, color: isPrimary ? C.white : C.primary }));
    b.appendChild(text(label, { font: FONT_LB, size: 16, color: isPrimary ? C.white : C.ink }));
    return b;
  }
  addFill(actions, bigAction("Scanner", "[ ]", true));
  addFill(actions, bigAction("Ajouter", "+", false));
  addFill(content, actions);

  // 4. apercus inventaire / dressing : des OBJETS, pas des chiffres
  const apercus = frame("Apercus", { dir: "HORIZONTAL", gap: S.md, px: GUT });
  function apercu(titre, meta, comps, tone) {
    const t = card("Card/Apercu/" + titre, { gap: S.md, px: S.md, py: S.md });
    t.appendChild(mosaique(63, 6, comps, tone));
    const txt = frame("Texte", { dir: "VERTICAL", gap: 2, pl: S.xs });
    txt.appendChild(text(titre, { font: FONT_LB, size: 16, color: C.ink }));
    txt.appendChild(text(meta, { size: 12, color: C.sub }));
    t.appendChild(txt);
    return t;
  }
  addFill(apercus, apercu("Inventaire", "128 objets", [PIC.baskets, PIC.cap, PIC.pants, PIC.jacket], C.primary));
  addFill(apercus, apercu("Dressing", "48 vêtements", [PIC.tshirt, PIC.jacket, PIC.robe, PIC.cap], C.cloth));
  addFill(content, apercus);

  // en-tete de section reutilisable
  function entete(titre) {
    const h = frame("Entete", {
      dir: "HORIZONTAL", px: GUT, justify: "SPACE_BETWEEN", align: "CENTER"
    });
    h.appendChild(text(titre, { font: FONT_LB, size: 16, color: C.ink }));
    h.appendChild(text("Tout voir", { size: 12, color: C.primary }));
    return h;
  }

  // 5. derniers ajouts : carrousel, la photo porte la carte
  const sec1 = frame("Section/Derniers ajouts", { dir: "VERTICAL", gap: S.md });
  addFill(sec1, entete("Derniers ajouts"));
  const carrousel = frame("Carrousel", { dir: "HORIZONTAL", gap: S.md, pl: GUT, pr: GUT });
  const recents = [
    ["T-shirt Nike",   "Chambre · Armoire",  PIC.tshirt,  C.cloth,   "Aujourd'hui"],
    ["Veste en jean",  "Entrée",             PIC.jacket,  C.cloth,   "Hier"],
    ["Perceuse Bosch", "Garage · Étagère 2", PIC.baskets, C.primary, "Il y a 3 j"],
    ["Casquette NY",   "Chambre · Armoire",  PIC.cap,     C.cloth,   "Il y a 5 j"]
  ];
  for (let i = 0; i < recents.length; i++) {
    const nom = recents[i][0], meta = recents[i][1], pic = recents[i][2];
    const tone = recents[i][3], quand = recents[i][4];
    const c = frame("Card/Object/" + nom, {
      dir: "VERTICAL", gap: S.sm, w: 140, radius: R.md, fill: C.white,
      px: S.sm, pt: S.sm, pb: S.md, shadow: SHADOW_E1,
      primary: "AUTO", counter: "FIXED"
    });
    c.appendChild(photoBox(124, 162, R.sm, pic, tone)); // ratio ~3:4
    const b = frame("Texte", { dir: "VERTICAL", gap: 2, pl: S.xs, pr: S.xs });
    b.appendChild(text(nom, { font: FONT_LB, size: 12, color: C.ink }));
    b.appendChild(text(meta, { size: 12, color: C.sub }));
    b.appendChild(text(quand, { size: 12, color: C.sub, opacity: 0.6 }));
    addFill(c, b);
    carrousel.appendChild(c);
  }
  sec1.appendChild(carrousel);
  addFill(content, sec1);

  // 6. prets en cours
  const sec2 = frame("Section/Prets en cours", { dir: "VERTICAL", gap: S.md });
  addFill(sec2, entete("Prets en cours"));
  const liste = frame("Liste", { dir: "VERTICAL", gap: S.md, px: GUT });
  const prets = [
    ["Appareil photo Sony", "Prêté à Thomas · retour le 18/09", "Prêté",     "prete",    PIC.baskets, C.primary],
    // 14 sept. : même objet emprunté que partout ailleurs (Ponceuse Makita, propriétaire Thomas)
    ["Ponceuse Makita",     "Empruntée à Thomas",               "Emprunté",  "emprunte", PIC.cap,     C.cloth],
    ["Perceuse Bosch",      "Prêté à Sarah · en retard de 2 j", "En retard", "retard",   PIC.pants,   C.error]
  ];
  for (let i = 0; i < prets.length; i++) {
    const p = prets[i];
    const row = frame("Card/Loan/" + p[0], {
      dir: "HORIZONTAL", gap: S.md, radius: R.md, fill: C.white,
      px: S.md, py: S.md, align: "CENTER", shadow: SHADOW_E1
    });
    row.appendChild(photoBox(48, 48, R.sm, p[4], p[5]));
    const b = frame("Texte", { dir: "VERTICAL", gap: 2 });
    b.appendChild(text(p[0], { font: FONT_LB, size: 16, color: C.ink }));
    b.appendChild(text(p[1], { size: 12, color: C.sub }));
    row.appendChild(b);
    row.appendChild(statusPill(p[2], p[3]));
    addFill(liste, row);
    try { b.layoutSizingHorizontal = "FILL"; } catch (e) {}
  }
  addFill(sec2, liste);
  addFill(content, sec2);

  // 7. suggestions de tenues : la partie la plus visuelle de l'accueil
  const sec3 = frame("Section/Tenues suggerees", { dir: "VERTICAL", gap: S.md });
  addFill(sec3, entete("Tenues suggerees"));
  const carrTenues = frame("Carrousel tenues", { dir: "HORIZONTAL", gap: S.md, pl: GUT, pr: GUT });
  const tenues = [
    ["Decontracte",    "3 pièces · Chambre", [PIC.tshirt, PIC.pants, PIC.baskets]],
    ["Sortie du soir", "3 pièces · Armoire", [PIC.robe,   PIC.jacket, PIC.cap]]
  ];
  for (let i = 0; i < tenues.length; i++) {
    const nom = tenues[i][0], meta = tenues[i][1], pieces = tenues[i][2];
    const c = frame("Card/Outfit/" + nom, {
      dir: "VERTICAL", gap: S.md, w: 232, radius: R.md, fill: C.white,
      px: S.md, py: S.md, shadow: SHADOW_E1,
      primary: "AUTO", counter: "FIXED"
    });
    // une piece dominante + deux secondaires : la tenue se lit d'un coup
    const compo = frame("Composition", { dir: "HORIZONTAL", gap: 6 });
    compo.appendChild(photoBox(122, 150, R.sm, pieces[0], C.cloth));
    const cote = frame("Secondaires", { dir: "VERTICAL", gap: 6 });
    cote.appendChild(photoBox(72, 72, R.sm, pieces[1], C.cloth));
    cote.appendChild(photoBox(72, 72, R.sm, pieces[2], C.cloth));
    compo.appendChild(cote);
    c.appendChild(compo);
    const b = frame("Texte", { dir: "VERTICAL", gap: 2, pl: 2 });
    b.appendChild(text(nom, { font: FONT_LB, size: 16, color: C.ink }));
    b.appendChild(text(meta, { size: 12, color: C.sub }));
    addFill(c, b);
    carrTenues.appendChild(c);
  }
  sec3.appendChild(carrTenues);
  addFill(content, sec3);

  // 8. lien discret vers les amis
  const lien = frame("Lien/Amis", { dir: "HORIZONTAL", justify: "CENTER", px: GUT });
  lien.appendChild(text("Voir la penderie de mes amis >", { size: 12, color: C.primary }));
  addFill(content, lien);

  // ---- navigation : surface blanche, filet fin, actif en primary ----
  const nav = frame("Nav", {
    dir: "HORIZONTAL", w: W, h: NAVH, primary: "FIXED", counter: "FIXED",
    fill: C.white, px: S.sm, justify: "SPACE_BETWEEN", align: "CENTER", shadow: SHADOW_E2
  });
  const tabs = [
    ["Accueil",    NAVIC.accueil,    true],
    ["Inventaire", NAVIC.inventaire, false],
    [null, null, false],          // emplacement central du FAB
    ["Logements",  NAVIC.logements,  false],
    ["Profil",     NAVIC.profil,     false]
  ];
  for (let i = 0; i < tabs.length; i++) {
    const label = tabs[i][0], srcIcon = tabs[i][1], actif = tabs[i][2];
    if (!label) {
      nav.appendChild(frame("Emplacement FAB", {
        w: 64, h: 48, dir: "VERTICAL", primary: "FIXED", counter: "FIXED"
      }));
      continue;
    }
    const tab = frame("Nav/Tab/" + label + (actif ? "/Actif" : "/Inactif"), {
      dir: "VERTICAL", gap: S.xs, w: 68, h: 48, primary: "FIXED", counter: "FIXED",
      align: "CENTER", justify: "CENTER"
    });
    const tone = actif ? C.primary : C.sub;
    const op = actif ? 1 : 0.7;
    const ic = iconFrom(srcIcon, 20, tone, op);
    if (ic) tab.appendChild(ic);
    tab.appendChild(text(label, { font: FONT_LB, size: 12, color: tone, opacity: op }));
    // 14 sept. (lot 28) : chevron « l'onglet déplie un panneau », comme la lib
    const cv = text("›", { font: FONT_LB, size: 12, color: tone, opacity: op });
    cv.name = "Nav/Chevron";
    cv.rotation = 90;
    tab.appendChild(cv);
    try { cv.layoutPositioning = "ABSOLUTE"; cv.x = tab.width - 14; cv.y = 14; } catch (e) {}
    nav.appendChild(tab);
  }
  screen.appendChild(nav);
  nav.x = 0; nav.y = H - NAVH;
  // 14 sept. (lot 28) : le contenu dépasse 817 px -> écran défilable dans le prototype
  try { screen.overflowDirection = "VERTICAL"; } catch (e) {}

  const filet = figma.createRectangle();
  filet.name = "Filet";
  filet.resize(W, 1);
  filet.fills = solid(C.ink, 0.07);
  screen.appendChild(filet);
  filet.x = 0; filet.y = H - NAVH;

  if (FABC) {
    try {
      const fab = FABC.createInstance();
      fab.rescale(60 / Math.max(fab.width, fab.height));
      screen.appendChild(fab);
      fab.x = (W - fab.width) / 2;
      fab.y = H - NAVH - fab.height / 2 + 6;
      fab.effects = [SHADOW_E2];
      log.push("OK FAB : instance de « Add activity » (45:725) reutilisee.");
    } catch (e) { log.push("! FAB non instancie : " + e.message); }
  } else {
    log.push("! FAB introuvable (45:725) - a replacer a la main.");
  }

  log.push("OK Accueil reconstruit - colonne de contenu : " + Math.round(content.height) + " px.");
  if (content.height < 600) {
    log.push("!! La colonne devrait faire ~1100 px : verifier le hug de « Contenu ».");
  }
  figma.currentPage = dst;
  figma.viewport.scrollAndZoomIntoView([screen]);
  console.log(log.join("\n"));
})();
