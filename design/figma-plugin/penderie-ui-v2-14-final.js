// GENERE PAR build-lot.py — NE PAS EDITER A LA MAIN.
// Corriger penderie-ui-v2-lib.js ou lots/14-final.body.js,
// puis relancer : python build-lot.py 14-final

// ============================================================
// PENDERIE - REFONTE UI v2 — BIBLIOTHEQUE COMMUNE
//
// Source unique des tokens et des helpers. A coller EN TETE de
// chaque script de lot (voir build-lot.py, qui le fait tout seul).
//
// Ne pas modifier un helper dans un lot : le corriger ICI, puis
// regenerer les lots. Les 7 bugs de la session 9 venaient tous de
// helpers recopies et corriges dans un seul fichier sur trois.
//
// Pieges Figma encodes dans ces helpers, ne pas les defaire :
//   - resize() repasse les sizing modes a FIXED -> on les re-applique apres
//   - sur une auto-layout HORIZONTALE, counterAxis pilote la HAUTEUR
//   - createFrame() a clipsContent = true par defaut -> on force false
//   - layoutWrap = WRAP est refuse tant que primaryAxisSizingMode = AUTO
//   - recolorer une icone doit ignorer les paints visible:false
//   - solid() refuse tout ce qui n'est pas un RGB (cle de statut != couleur)
// ============================================================

// ---------- TOKENS ----------
const C = {
  primary: { r: 0.827451, g: 0.113725, b: 0.400000 },
  ink:     { r: 0.101961, g: 0.117647, b: 0.141176 },
  sub:     { r: 0.278431, g: 0.333333, b: 0.411765 },
  bg:      { r: 0.972549, g: 0.980392, b: 0.988235 },
  error:   { r: 0.862745, g: 0.149020, b: 0.149020 },
  main:    { r: 0.066667, g: 0.490196, b: 0.435294 },
  cloth:   { r: 0.513725, g: 0.070588, b: 0.592157 },
  white:   { r: 1, g: 1, b: 1 },
  // Variantes assombries reservees au TEXTE des pastilles de statut.
  // Sur un aplat teinte a 10-12 %, la couleur de marque ne tient pas le
  // 4.5:1 exige pour du 12 px (mesure : 4.39 / 4.20 / 4.13). Assombrie de
  // 4 a 8 %, elle passe sur carte blanche comme sur le fond d'ecran.
  mainTexte:    { r: 0.062745, g: 0.470588, b: 0.419608 },   // #10786B
  primaryTexte: { r: 0.760784, g: 0.105882, b: 0.368627 },   // #C21B5E
  errorTexte:   { r: 0.792157, g: 0.137255, b: 0.137255 }    // #CA2323
};
const R  = { xs: 8, sm: 12, md: 16, lg: 24, full: 999 };
const S  = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, huge: 32 };
const GUT = 20;
const W = 393;

const FONT_T  = { family: "Typolio", style: "Regular" };
const FONT_L  = { family: "Luciole", style: "Regular" };
const FONT_LB = { family: "Luciole", style: "Bold" };

const solid = function (c, o) {
  if (!c || typeof c !== "object" || typeof c.r !== "number") {
    throw new Error("solid() attend une couleur RGB, recu : " + JSON.stringify(c));
  }
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
  if (o.w != null && o.h != null) f.resize(o.w, o.h);
  else if (o.w != null)           f.resize(o.w, f.height);
  else if (o.h != null)           f.resize(f.width, o.h);
  if (o.dir) {
    f.primaryAxisSizingMode = o.primary || "AUTO";
    f.counterAxisSizingMode = o.counter || "AUTO";
    // WRAP doit etre pose APRES : Figma le refuse tant que
    // primaryAxisSizingMode vaut AUTO.
    if (o.wrap && o.dir === "HORIZONTAL") {
      f.layoutWrap = "WRAP";
      f.counterAxisSpacing = o.gapY == null ? (o.gap || 0) : o.gapY;
    }
  }
  if (o.shadow) f.effects = [o.shadow];
  f.clipsContent = o.clip === true;
  return f;
}

function text(chars, o) {
  o = o || {};
  const t = figma.createText();
  t.fontName = o.font || FONT_L;
  t.characters = String(chars);
  t.fontSize = o.size || 16;
  t.fills = solid(o.color || C.ink, o.opacity);
  t.textAutoResize = "WIDTH_AND_HEIGHT";
  if (o.lineHeight) t.lineHeight = { value: o.lineHeight, unit: "PIXELS" };
  if (o.align) t.textAlignHorizontal = o.align;
  t.name = String(chars).slice(0, 28);
  return t;
}

function addFill(parent, node) {
  parent.appendChild(node);
  try { node.layoutSizingHorizontal = "FILL"; } catch (e) {}
  return node;
}

function para(chars, width, o) {
  const t = text(chars, o);
  t.textAutoResize = "HEIGHT";
  t.resize(width, t.height);
  return t;
}

function card(name, o) {
  const base = {
    fill: C.white, radius: R.md, dir: "VERTICAL", gap: S.sm,
    px: S.lg, py: S.lg, shadow: SHADOW_E1
  };
  for (const k in (o || {})) base[k] = o[k];
  return frame(name, base);
}

// [couleur de l'aplat, opacite de l'aplat, couleur du libelle].
// L'aplat garde la couleur de la charte ; seul le libelle est assombri
// quand la charte ne tient pas le contraste (voir PENDERIE_RGAA.md).
const TONES = {
  dispo:    [C.main,    0.10, C.mainTexte],
  penderie: [C.main,    0.10, C.mainTexte],
  prete:    [C.primary, 0.12, C.primaryTexte],
  emprunte: [C.cloth,   0.12, C.cloth],
  vente:    [C.primary, 0.12, C.primaryTexte],
  vendu:    [C.sub,     0.10, C.sub],
  // statuts de pret : memes couleurs que la v1 (En cours vert, A rendre
  // primary, En retard rouge, Termine gris)
  encours:  [C.main,    0.10, C.mainTexte],
  arendre:  [C.primary, 0.12, C.primaryTexte],
  retard:   [C.error,   0.10, C.errorTexte],
  termine:  [C.sub,     0.10, C.sub],
  neutre:   [C.sub,     0.10, C.sub],
  // etats d'objet ajoutes par le lot 21 (regles metier) : un probleme se
  // lit en rouge, un objet sans emplacement en primary comme « a rendre »
  aranger:   [C.primary, 0.12, C.primaryTexte],
  perdu:     [C.error,   0.10, C.errorTexte],
  endommage: [C.error,   0.10, C.errorTexte]
};

// Les 8 etats metier d'un objet. « Deplace » n'en fait pas partie :
// deplacer est une ACTION, l'emplacement change, l'etat reste.
const ETATS_OBJET = [
  ["À ranger",   "aranger"],
  ["Disponible", "dispo"],
  ["Prêté",      "prete"],
  ["Emprunté",   "emprunte"],
  ["Perdu",      "perdu"],
  ["Endommagé",  "endommage"],
  ["À vendre",   "vente"],
  ["Vendu",      "vendu"]
];
function couleurDe(tone) {
  const t = TONES[tone];
  return t ? t[2] : C.primary;
}

// tone = cle de statut. `surPhoto` = pastille posee sur une image :
// aplat de couleur + texte blanc, car une pastille blanche disparait
// sur un fond photo clair. Hors photo, teinte legere + texte colore.
function statusPill(label, tone, surPhoto) {
  const t = TONES[tone] || TONES.neutre;
  const p = frame("Statut/" + label, {
    dir: "HORIZONTAL",
    fill: surPhoto ? t[2] : t[0], fillOpacity: surPhoto ? 1 : t[1],
    radius: R.full, px: S.sm, py: S.xs, align: "CENTER",
    shadow: surPhoto ? SHADOW_E1 : null
  });
  p.appendChild(text(label, { font: FONT_LB, size: 12, color: surPhoto ? C.white : t[2] }));
  return p;
}

function nettoieVignette(inst) {
  const kids = inst.children || [];
  for (let i = 0; i < kids.length; i++) {
    const k = kids[i];
    if (k.type === "TEXT" || k.name === "Libellé" || k.name === "Libelle") {
      try { k.visible = false; } catch (e) {}
    } else if (k.name === "Visuel") {
      try { k.strokes = []; } catch (e) {}
    }
  }
}

function photoBox(w, h, radius, comp, tone) {
  const t = tone || C.ink;
  const box = frame("Photo", {
    fill: t, fillOpacity: t === C.ink ? 0.04 : 0.08, radius: radius, w: w, h: h,
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

function overlay(parent, node, x, y) {
  parent.appendChild(node);
  try {
    node.layoutPositioning = "ABSOLUTE";
    node.x = x;
    node.y = y;
  } catch (e) {}
  return node;
}

// ---------- briques ----------
function titrePage(titre, meta) {
  const b = frame("Titre de page", { dir: "VERTICAL", gap: S.xs, px: GUT });
  b.appendChild(text(titre, { font: FONT_T, size: 32, color: C.ink, lineHeight: 38 }));
  if (meta) b.appendChild(text(meta, { size: 12, color: C.sub }));
  return b;
}

function boutonRetour(glyphe) {
  const b = frame("Button/Icon/Retour", {
    fill: C.white, radius: R.full, w: 40, h: 40, shadow: SHADOW_E1,
    dir: "VERTICAL", align: "CENTER", justify: "CENTER", primary: "FIXED", counter: "FIXED"
  });
  b.appendChild(text(glyphe || "<", { font: FONT_LB, size: 16, color: C.ink }));
  return b;
}

function barreRetour(glyphe) {
  const bar = frame("Barre haute", { dir: "HORIZONTAL", px: GUT, align: "CENTER", h: 44, counter: "FIXED" });
  bar.appendChild(boutonRetour(glyphe));
  return bar;
}

function champRecherche(placeholder) {
  const f = frame("Field/Search", {
    dir: "HORIZONTAL", gap: S.sm, fill: C.white, radius: R.sm,
    px: S.lg, h: 48, counter: "FIXED", align: "CENTER", shadow: SHADOW_E1
  });
  f.appendChild(text("o-", { font: FONT_LB, size: 14, color: C.sub, opacity: 0.85 }));
  f.appendChild(text(placeholder, { size: 16, color: C.sub, opacity: 0.85 }));
  return f;
}

function champSelect(label, valeur) {
  const b = frame("Field/Select/" + label, { dir: "VERTICAL", gap: S.xs });
  b.appendChild(text(label, { font: FONT_LB, size: 12, color: C.sub }));
  const f = frame("Champ", {
    dir: "HORIZONTAL", fill: C.white, radius: R.sm, px: S.lg, h: 48,
    counter: "FIXED", align: "CENTER", justify: "SPACE_BETWEEN", shadow: SHADOW_E1
  });
  f.appendChild(text(valeur, { size: 16, color: C.ink }));
  f.appendChild(text("v", { font: FONT_LB, size: 12, color: C.sub, opacity: 0.85 }));
  addFill(b, f);
  return b;
}

function chip(label, actif, petite) {
  const c = frame("Chip/Filter/" + label + (actif ? "/Selectionne" : "/Non selectionne"), {
    dir: "HORIZONTAL", radius: R.full, px: petite ? S.md : S.lg, h: petite ? 32 : 36,
    counter: "FIXED", align: "CENTER",
    fill: actif ? C.primary : C.white,
    shadow: actif ? null : SHADOW_E1
  });
  c.appendChild(text(label, { font: FONT_LB, size: 12, color: actif ? C.white : C.sub }));
  return c;
}

function rangeeChips(items, selected) {
  const row = frame("Chips", { dir: "HORIZONTAL", gap: S.sm, pl: GUT, pr: GUT });
  for (let i = 0; i < items.length; i++) row.appendChild(chip(items[i], i === selected, false));
  return row;
}

// groupe de chips sur plusieurs lignes (filtres)
function groupeChips(label, items, selection) {
  const b = frame("Groupe/" + label, { dir: "VERTICAL", gap: S.sm });
  b.appendChild(text(label, { font: FONT_LB, size: 12, color: C.sub }));
  const zone = frame("Chips", { dir: "HORIZONTAL", gap: S.sm, gapY: S.sm, wrap: true, primary: "FIXED" });
  for (let i = 0; i < items.length; i++) {
    zone.appendChild(chip(items[i], selection.indexOf(items[i]) > -1, true));
  }
  addFill(b, zone);
  return b;
}

function bouton(label, variante) {
  const conf = {
    primary:     [C.primary, C.white, SHADOW_E2],
    secondary:   [C.white, C.ink, SHADOW_E1],
    ghost:       [null, C.primary, null],
    danger:      [C.error, C.white, SHADOW_E2],
    disabled:    [C.ink, C.sub, null],
    destructive: [null, C.error, null]
  }[variante] || [C.primary, C.white, SHADOW_E2];
  const b = frame("Button/" + variante + "/" + label, {
    dir: "HORIZONTAL", gap: S.sm, radius: R.md, h: 52, px: S.lg,
    align: "CENTER", justify: "CENTER", counter: "FIXED",
    fill: conf[0], fillOpacity: variante === "disabled" ? 0.06 : 1,
    shadow: conf[2]
  });
  b.appendChild(text(label, { font: FONT_LB, size: 16, color: conf[1] }));
  return b;
}

function ligneInfo(label, valeur) {
  const r = frame("Detail/Info row", { dir: "HORIZONTAL", gap: S.md, justify: "SPACE_BETWEEN", align: "CENTER" });
  r.appendChild(text(label, { size: 12, color: C.sub }));
  r.appendChild(text(valeur, { font: FONT_LB, size: 16, color: C.ink }));
  return r;
}

// ============================================================
// RUNNER — ouverture de page, recherche d'ecran, rapport.
// Mutualise ici pour que chaque lot ne contienne plus que ses ecrans.
// ============================================================

let PAGE = null;
const REUSSIS = [];
const ECHOUES = [];
let NETTOYES = 0;

// Noms de frames de travail : s'ils se retrouvent a la RACINE de la page,
// ce sont des orphelins laisses par une execution interrompue.
const NOMS_TRAVAIL = [
  "Grille", "Colonne", "Rangee", "Photo", "Contenu", "Texte", "Blocs", "Entete",
  "Statut/", "Card/", "Button/", "Chip/", "Field/", "Detail/", "Groupe/",
  "Titre", "Recherche", "Filtres", "Tri", "Secondaires", "Destructif",
  "Barre haute", "Chips", "Champ", "RAPPORT", "Empty state", "Illustration",
  "Liste", "Derniere", "Section/", "Lien", "Attributs", "Action", "Marque",
  "Apercus", "Carrousel", "Composition", "Mosaique", "Nav", "Emplacement FAB"
];

async function ouvrirPage(nomPage) {
  await figma.loadAllPagesAsync();
  await figma.loadFontAsync(FONT_T);
  await figma.loadFontAsync(FONT_L);
  await figma.loadFontAsync(FONT_LB);

  PAGE = figma.root.children.filter(function (p) { return p.name === nomPage; })[0];
  if (!PAGE) throw new Error("page « " + nomPage + " » introuvable — lance d'abord le lot 01");
  await PAGE.loadAsync();
  figma.currentPage = PAGE;

  const racine = PAGE.children.slice();
  for (let i = 0; i < racine.length; i++) {
    const n = racine[i];
    if (n.type !== "FRAME" && n.type !== "TEXT") continue;
    for (let j = 0; j < NOMS_TRAVAIL.length; j++) {
      if (n.name.indexOf(NOMS_TRAVAIL[j]) === 0) {
        try { n.remove(); NETTOYES++; } catch (e) {}
        break;
      }
    }
  }
  return PAGE;
}

// Les noms de frames melangent tiret cadratin, point median et accents :
// on compare sur une forme normalisee pour ne pas dependre du separateur.
function norme(s) {
  return String(s)
    .toLowerCase()
    .replace(/[—–·•>-]/g, " ")
    .replace(/[àâä]/g, "a")
    .replace(/[éèêë]/g, "e")
    .replace(/[îï]/g, "i")
    .replace(/[ôö]/g, "o")
    .replace(/[ùûü]/g, "u")
    .replace(/ç/g, "c")
    .replace(/\s+/g, " ")
    .trim();
}

function trouver(nom) {
  const cible = norme(nom);
  const out = [];
  const walk = function (n) {
    if (n.type === "FRAME") { if (norme(n.name) === cible) out.push(n); return; }
    const kids = n.children || [];
    for (let i = 0; i < kids.length; i++) walk(kids[i]);
  };
  const top = (PAGE && PAGE.children) || [];
  for (let i = 0; i < top.length; i++) walk(top[i]);
  return out[0] || null;
}

// Vide l'ecran mais CONSERVE le noeud frame : ses reactions de prototype
// de niveau frame survivent donc a la refonte.
function preparer(screen, pbas, phaut) {
  const olds = screen.children.slice();
  for (let i = 0; i < olds.length; i++) olds[i].remove();
  screen.layoutMode = "NONE";
  screen.fills = solid(C.bg);
  screen.clipsContent = true;
  const col = frame("Contenu", {
    dir: "VERTICAL", gap: S.xxl, w: W,
    primary: "AUTO", counter: "FIXED",
    pt: phaut == null ? S.xl : phaut,
    pb: pbas == null ? 40 : pbas
  });
  screen.appendChild(col);
  col.x = 0; col.y = 0;
  return col;
}

function finaliser(screen, col, nom) {
  const h = Math.max(817, Math.ceil(col.height));
  screen.resize(W, h);
  return h;
}

// Un ecran isole : son echec n'empeche pas les autres et remonte
// avec le nom de l'ecran et le message exact.
function ecran(nom, build) {
  try {
    const screen = trouver(nom);
    if (!screen) throw new Error("frame introuvable sur la page");
    build(screen);
    REUSSIS.push(nom);
  } catch (e) {
    const msg = (e && e.message) ? e.message : String(e);
    ECHOUES.push(nom + " : " + msg);
    figma.notify("Echec " + nom + " -> " + msg, { error: true, timeout: 6000 });
  }
}

// Rapport lisible DANS Figma : la console de Scripter n'est pas toujours
// sous les yeux, et un « il ne se passe rien » n'aide pas a debugger.
function rapport(nomLot) {
  const total = REUSSIS.length + ECHOUES.length;
  const resume = REUSSIS.length + "/" + total + " ecrans refaits";
  const lignes = ["RAPPORT - " + nomLot, resume, ""];
  for (let i = 0; i < REUSSIS.length; i++) lignes.push("OK    " + REUSSIS[i]);
  if (ECHOUES.length) {
    lignes.push("");
    for (let i = 0; i < ECHOUES.length; i++) lignes.push("ECHEC " + ECHOUES[i]);
  }
  if (CREES) { lignes.push(""); lignes.push(CREES + " ecran(s) cree(s)"); }
  if (NETTOYES) { lignes.push(""); lignes.push(NETTOYES + " orphelin(s) supprime(s)"); }

  try {
    const rap = figma.createText();
    rap.name = "RAPPORT " + nomLot;
    rap.fontName = FONT_L;
    rap.characters = lignes.join(String.fromCharCode(10));
    rap.fontSize = 14;
    rap.lineHeight = { value: 22, unit: "PIXELS" };
    rap.textAutoResize = "WIDTH_AND_HEIGHT";
    rap.fills = solid(ECHOUES.length ? C.error : C.main);
    PAGE.appendChild(rap);
    rap.x = -620; rap.y = 600;
    figma.viewport.scrollAndZoomIntoView([rap]);
  } catch (e) {}

  console.log(lignes.join(String.fromCharCode(10)));
  if (ECHOUES.length) {
    figma.notify(resume + " - " + ECHOUES.length + " en echec (voir RAPPORT sur le canvas)",
                 { error: true, timeout: 10000 });
  } else {
    figma.notify(nomLot + " termine : " + resume, { timeout: 6000 });
  }
}

// ============================================================
// ICONES — clonage d'icones existantes du fichier.
// createNodeFromSvg ne gere que les SVG a un seul <path> : on clone
// donc les vecteurs deja dessines plutot que de les redessiner.
// ============================================================

// Recolore recursivement les vecteurs d'une icone clonee.
// On ne touche QU'aux paints deja visibles : les frames conteneurs
// portent un fill blanc « visible:false » qu'il ne faut pas reveiller,
// sinon l'icone devient un bloc plein.
function tint(node, color, opacity) {
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

// ============================================================
// NAVIGATION — barre d'onglets + FAB.
// Etait en local dans le lot 01 : remonte ici pour que tous les
// ecrans « hub » aient la meme barre (le lot 02 et le lot 03
// reservaient 110 px en bas sans jamais dessiner la nav).
// ============================================================

const H = 817;        // hauteur de reference d'un ecran (= plancher de finaliser)
const NAVH = 72;

let NAVIC = null;
async function chargerNav() {
  if (NAVIC) return NAVIC;
  const n = async function (id) {
    try { return await figma.getNodeByIdAsync(id); } catch (e) { return null; }
  };
  NAVIC = {
    accueil:    await n("39:22"),
    inventaire: await n("39:24"),
    logements:  await n("39:26"),
    profil:     await n("39:32"),
    fab:        await n("45:725")
  };
  return NAVIC;
}

// Un ecran qui defile est plus haut que le viewport : la nav est donc
// posee a la hauteur du viewport, pas en bas de la frame, et marquee
// « fixe au defilement » pour rester visible dans le prototype.
function fixerAuDefilement(n) {
  try { n.constraints = { horizontal: "STRETCH", vertical: "MAX" }; } catch (e) {}
  try { n.scrollBehavior = "FIXED"; } catch (e) {}
}

function construireNav(actif) {
  if (!NAVIC) return null;
  const nav = frame("Nav", {
    dir: "HORIZONTAL", w: W, h: NAVH, primary: "FIXED", counter: "FIXED",
    fill: C.white, px: S.sm, justify: "SPACE_BETWEEN", align: "CENTER", shadow: SHADOW_E2
  });
  const tabs = [
    ["Accueil",    NAVIC.accueil],
    ["Inventaire", NAVIC.inventaire],
    [null, null],                     // emplacement central du FAB
    ["Logements",  NAVIC.logements],
    ["Profil",     NAVIC.profil]
  ];
  for (let i = 0; i < tabs.length; i++) {
    const label = tabs[i][0], srcIcon = tabs[i][1];
    if (!label) {
      nav.appendChild(frame("Emplacement FAB", {
        w: 64, h: 48, dir: "VERTICAL", primary: "FIXED", counter: "FIXED"
      }));
      continue;
    }
    const est = (label === actif);
    const tab = frame("Nav/Tab/" + label + (est ? "/Actif" : "/Inactif"), {
      dir: "VERTICAL", gap: S.xs, w: 68, h: 48, primary: "FIXED", counter: "FIXED",
      align: "CENTER", justify: "CENTER"
    });
    const tone = est ? C.primary : C.sub;
    const op = est ? 1 : 0.85;
    const ic = iconFrom(srcIcon, 20, tone, op);
    if (ic) tab.appendChild(ic);
    tab.appendChild(text(label, { font: FONT_LB, size: 12, color: tone, opacity: op }));
    chevronNav(tab, est);
    nav.appendChild(tab);
  }
  return nav;
}

// Chevron « s'ouvre vers le haut » : chaque onglet déplie un panneau qui
// regroupe ses pages (lot 28). Posé en absolu en haut à droite de l'onglet.
function chevronNav(tab, actif) {
  for (let i = 0; i < tab.children.length; i++) {
    if (tab.children[i].name === "Nav/Chevron") return null;
  }
  const c = text("›", { font: FONT_LB, size: 12, color: actif ? C.primary : C.sub, opacity: actif ? 1 : 0.85 });
  c.name = "Nav/Chevron";
  c.rotation = 90;
  overlay(tab, c, tab.width - 14, 14);
  return c;
}

function poserNav(screen, actif) {
  const nav = construireNav(actif);
  if (!nav) return null;
  const y = Math.min(H, screen.height) - NAVH;
  screen.appendChild(nav);
  nav.x = 0; nav.y = y;
  fixerAuDefilement(nav);

  const filet = figma.createRectangle();
  filet.name = "Filet";
  filet.resize(W, 1);
  filet.fills = solid(C.ink, 0.07);
  screen.appendChild(filet);
  filet.x = 0; filet.y = y;
  fixerAuDefilement(filet);

  if (NAVIC.fab) {
    try {
      const fab = NAVIC.fab.createInstance();
      fab.rescale(60 / Math.max(fab.width, fab.height));
      screen.appendChild(fab);
      fab.x = (W - fab.width) / 2;
      fab.y = y - fab.height / 2 + 6;
      fab.effects = [SHADOW_E2];
      fab.constraints = { horizontal: "CENTER", vertical: "MAX" };
      try { fab.scrollBehavior = "FIXED"; } catch (e) {}
    } catch (e) {}
  }
  return nav;
}

// FAB seul, pour un ecran sans barre de navigation.
function poserFAB(screen) {
  if (!NAVIC || !NAVIC.fab) return null;
  try {
    const fab = NAVIC.fab.createInstance();
    fab.rescale(60 / Math.max(fab.width, fab.height));
    screen.appendChild(fab);
    fab.x = W - 60 - GUT;
    fab.y = Math.min(H, screen.height) - 60 - 24;
    fab.effects = [SHADOW_E2];
    fab.constraints = { horizontal: "MAX", vertical: "MAX" };
    try { fab.scrollBehavior = "FIXED"; } catch (e) {}
    return fab;
  } catch (e) { return null; }
}

// ============================================================
// BRIQUES PARTAGEES — ecrites d'abord en local dans les lots 04 et 05,
// remontees ici des qu'un 3e lot en a eu besoin. Le rendu est
// identique : ce sont les memes corps de fonction.
// ============================================================

let AMIS_COMP = null;
// Photo de profil de l'accueil v1 (« Mathis Chhour », page Maquette,
// calque 60:4869) : un rond rempli par une image recadrée. On en recopie
// le REMPLISSAGE (image + recadrage), pas le calque : l'avatar reste un
// vrai rond à la taille voulue, quel que soit l'écran.
const AVATAR_PHOTO_ID = "60:4869";
// 2026-09-21 : le calque 60:4869 a disparu du fichier (page v1 nettoyee).
// Sans lui, avatar() retombait sur le composant Player, rescale en fine
// bande illisible — le defaut que la photo devait justement corriger.
// Deux filets ont ete ajoutes : on recupere le remplissage d'un avatar
// DEJA pose dans la maquette, sinon ce remplissage constant, releve sur
// « Card/Friend/Thomas » (l'image reste dans le document meme quand le
// calque source est supprime).
const AVATAR_PAINT_SECOURS = [{
  type: "IMAGE",
  scaleMode: "CROP",
  imageHash: "227fda49e4faff526628752697fe199f1a6a4516",
  imageTransform: [[0.285879522562027, 0, 0.05096835270524025],
                   [0, 0.38117271661758423, 0.15566425025463104]]
}];
let AVATAR_PAINTS = null;

// Un avatar photo deja construit par un lot precedent : meme image, meme
// recadrage, sans dependre d'un calque de la v1.
function avatarDejaPose() {
  if (!PAGE) return null;
  try {
    const n = PAGE.findOne(function (k) {
      return k.type === "ELLIPSE"
        && String(k.name).indexOf("Avatar/") === 0
        && Array.isArray(k.fills)
        && k.fills.some(function (p) { return p.type === "IMAGE" && p.visible !== false; });
    });
    if (!n) return null;
    return JSON.parse(JSON.stringify(n.fills.filter(function (p) {
      return p.type === "IMAGE" && p.visible !== false;
    })));
  } catch (e) { return null; }
}
async function chargerAmis() {
  if (AMIS_COMP) return AMIS_COMP;
  const c = async function (id) {
    try {
      const n = await figma.getNodeByIdAsync(id);
      return (n && n.type === "COMPONENT") ? n : null;
    } catch (e) { return null; }
  };
  // set « Player » de la page Components (repli si la photo est introuvable)
  AMIS_COMP = [await c("39:34"), await c("39:39"), await c("39:44")];
  try {
    const photo = await figma.getNodeByIdAsync(AVATAR_PHOTO_ID);
    const fills = photo && Array.isArray(photo.fills) ? photo.fills : [];
    const images = fills.filter(function (p) { return p.type === "IMAGE" && p.visible !== false; });
    if (images.length) AVATAR_PAINTS = JSON.parse(JSON.stringify(images));
  } catch (e) { AVATAR_PAINTS = null; }
  if (!AVATAR_PAINTS) AVATAR_PAINTS = avatarDejaPose();
  if (!AVATAR_PAINTS) AVATAR_PAINTS = JSON.parse(JSON.stringify(AVATAR_PAINT_SECOURS));
  return AMIS_COMP;
}

// Avatar : la photo de l'accueil v1 dans un rond. Replis successifs : le
// composant Player, puis des initiales — un avatar manquant ne doit pas
// trouer une liste d'amis.
function avatar(nom, i, taille) {
  const d = taille || 48;
  if (AVATAR_PAINTS) {
    try {
      const rond = figma.createEllipse();
      rond.name = "Avatar/" + nom;
      rond.resize(d, d);
      rond.fills = AVATAR_PAINTS;
      return rond;
    } catch (e) {}
  }
  const src = AMIS_COMP ? AMIS_COMP[i % AMIS_COMP.length] : null;
  if (src) {
    try {
      const inst = src.createInstance();
      inst.rescale(d / Math.max(inst.width, inst.height));
      inst.name = "Avatar/" + nom;
      return inst;
    } catch (e) {}
  }
  const a = frame("Avatar/" + nom, {
    w: d, h: d, radius: R.full, fill: C.primary, fillOpacity: 0.12,
    dir: "VERTICAL", align: "CENTER", justify: "CENTER",
    primary: "FIXED", counter: "FIXED", clip: true
  });
  a.appendChild(text(nom.slice(0, 1).toUpperCase(),
    { font: FONT_LB, size: 16, color: C.primary }));
  return a;
}

function toastSucces(titre, corps) {
  const t = frame("Toast/Succes", {
    dir: "HORIZONTAL", gap: S.md, radius: R.md, px: S.lg, py: S.md,
    align: "CENTER", fill: C.main, fillOpacity: 0.10
  });
  const rond = frame("Pastille", {
    w: 32, h: 32, radius: R.full, fill: C.main, dir: "VERTICAL",
    align: "CENTER", justify: "CENTER", primary: "FIXED", counter: "FIXED"
  });
  rond.appendChild(text("v", { font: FONT_LB, size: 14, color: C.white }));
  t.appendChild(rond);
  const g = frame("Texte", { dir: "VERTICAL", gap: 2 });
  g.appendChild(text(titre, { font: FONT_LB, size: 16, color: C.ink }));
  if (corps) g.appendChild(text(corps, { size: 12, color: C.sub }));
  t.appendChild(g);
  try { g.layoutSizingHorizontal = "FILL"; } catch (e) {}
  return t;
}

function toastInfo(titre, corps, couleur) {
  const c = couleur || C.sub;
  const t = frame("Toast/Info", {
    dir: "HORIZONTAL", gap: S.md, radius: R.md, px: S.lg, py: S.md,
    align: "CENTER", fill: c, fillOpacity: 0.10
  });
  const rond = frame("Pastille", {
    w: 32, h: 32, radius: R.full, fill: c, dir: "VERTICAL",
    align: "CENTER", justify: "CENTER", primary: "FIXED", counter: "FIXED"
  });
  rond.appendChild(text("i", { font: FONT_LB, size: 14, color: C.white }));
  t.appendChild(rond);
  const g = frame("Texte", { dir: "VERTICAL", gap: 2 });
  g.appendChild(text(titre, { font: FONT_LB, size: 16, color: C.ink }));
  if (corps) g.appendChild(text(corps, { size: 12, color: C.sub }));
  t.appendChild(g);
  try { g.layoutSizingHorizontal = "FILL"; } catch (e) {}
  return t;
}

function ligneToggle(label, sous, actif) {
  const r = frame("List/Row/" + label, {
    dir: "HORIZONTAL", gap: S.md, radius: R.md, fill: C.white,
    px: S.lg, py: S.md, align: "CENTER", justify: "SPACE_BETWEEN", shadow: SHADOW_E1
  });
  const g = frame("Texte", { dir: "VERTICAL", gap: 2 });
  g.appendChild(text(label, { font: FONT_LB, size: 16, color: C.ink }));
  if (sous) g.appendChild(text(sous, { size: 12, color: C.sub }));
  r.appendChild(g);
  const t = frame("Field/Toggle/" + (actif ? "On" : "Off"), {
    dir: "HORIZONTAL", w: 48, h: 28, radius: R.full, px: S.xs,
    primary: "FIXED", counter: "FIXED", align: "CENTER",
    justify: actif ? "MAX" : "MIN",
    fill: actif ? C.primary : C.ink, fillOpacity: actif ? 1 : 0.12
  });
  const knob = figma.createEllipse();
  knob.name = "Pastille";
  knob.resize(20, 20);
  knob.fills = solid(C.white);
  t.appendChild(knob);
  r.appendChild(t);
  try { g.layoutSizingHorizontal = "FILL"; } catch (e) {}
  return r;
}

// `action` remplace le chevron par un libelle d'action colore, quand la
// rangee mene a une action nommee plutot qu'a un simple ecran suivant.
function lienRangee(label, meta, action) {
  const r = frame("List/Row/" + label, {
    dir: "HORIZONTAL", gap: S.md, radius: R.md, fill: C.white,
    px: S.lg, py: S.md, align: "CENTER", justify: "SPACE_BETWEEN", shadow: SHADOW_E1
  });
  const g = frame("Texte", { dir: "VERTICAL", gap: 2 });
  g.appendChild(text(label, { font: FONT_LB, size: 16, color: C.ink }));
  if (meta) g.appendChild(text(meta, { size: 12, color: C.sub }));
  r.appendChild(g);
  if (action) r.appendChild(text(action, { font: FONT_LB, size: 12, color: C.primary }));
  else r.appendChild(text("\u203a", { font: FONT_LB, size: 16, color: C.sub, opacity: 0.85 }));
  try { g.layoutSizingHorizontal = "FILL"; } catch (e) {}
  return r;
}

function enteteSection(titre, lien) {
  const h = frame("Entete", { dir: "HORIZONTAL", px: GUT, justify: "SPACE_BETWEEN", align: "CENTER" });
  h.appendChild(text(titre, { font: FONT_LB, size: 16, color: C.ink }));
  if (lien) h.appendChild(text(lien, { size: 12, color: C.primary }));
  return h;
}

function carteSection(titre, lignes) {
  const c = card("Card/Section/" + titre, { gap: S.md });
  c.appendChild(text(titre, { font: FONT_LB, size: 12, color: C.sub }));
  for (let i = 0; i < lignes.length; i++) addFill(c, lignes[i]);
  return c;
}

function champTexte(label, valeur, hauteur) {
  const b = frame("Field/Textarea/" + label, { dir: "VERTICAL", gap: S.xs });
  b.appendChild(text(label, { font: FONT_LB, size: 12, color: C.sub }));
  const f = frame("Champ", {
    dir: "VERTICAL", fill: C.white, radius: R.sm, px: S.lg, py: S.md,
    h: hauteur || 88, primary: "FIXED", shadow: SHADOW_E1
  });
  f.appendChild(para(valeur, W - GUT * 2 - S.lg * 2,
    { size: 16, color: C.sub, opacity: 0.85, lineHeight: 22 }));
  addFill(b, f);
  return b;
}

// 1 action principale + des secondaires cote a cote + une note
// explicative : c'est le « Detail / Action bar » du DS.
function barreActions(col, principale, secondaires, destructive, note) {
  const zone = frame("Detail/Action bar", { dir: "VERTICAL", gap: S.md, px: GUT });
  addFill(zone, principale);
  if (secondaires && secondaires.length) {
    const row = frame("Secondaires", { dir: "HORIZONTAL", gap: S.md });
    for (let i = 0; i < secondaires.length; i++) addFill(row, secondaires[i]);
    addFill(zone, row);
  }
  if (note) zone.appendChild(para(note, W - GUT * 2, { size: 12, color: C.sub, align: "CENTER" }));
  if (destructive) {
    const d = frame("Destructif", { dir: "HORIZONTAL", justify: "CENTER" });
    d.appendChild(text(destructive, { font: FONT_LB, size: 12, color: C.error }));
    addFill(zone, d);
  }
  addFill(col, zone);
}

// Rangee d'ami : avatar, nom, une ligne de contexte, et un emplacement
// libre a droite (pastille de statut, action, ou chevron par defaut).
function rangeeAmi(nom, meta, i, droite) {
  const r = frame("Card/Friend/" + nom, {
    dir: "HORIZONTAL", gap: S.md, radius: R.md, fill: C.white,
    px: S.md, py: S.md, align: "CENTER", justify: "SPACE_BETWEEN", shadow: SHADOW_E1
  });
  const g = frame("Gauche", { dir: "HORIZONTAL", gap: S.md, align: "CENTER" });
  g.appendChild(avatar(nom, i, 48));
  const t = frame("Texte", { dir: "VERTICAL", gap: 2 });
  t.appendChild(text(nom, { font: FONT_LB, size: 16, color: C.ink }));
  if (meta) t.appendChild(para(meta, 180, { size: 12, color: C.sub, lineHeight: 16 }));
  g.appendChild(t);
  r.appendChild(g);
  r.appendChild(droite || text("\u203a", { font: FONT_LB, size: 16, color: C.sub, opacity: 0.85 }));
  try { g.layoutSizingHorizontal = "FILL"; } catch (e) {}
  return r;
}

// Onglets, un seul actif : c'est une bascule de contenu, pas des
// boutons d'action — d'ou le rail gris et l'onglet plein.
// Le prototype vise les onglets inactifs par leur NOM de calque
// (« Nav/Tab/<libelle>/Inactif ») : un onglet inactif n'a pas de fond,
// viser son texte remonterait jusqu'au rail, commun a tous les onglets.
function ongletsN(labels, actif) {
  const b = frame("Onglets", { dir: "VERTICAL", px: GUT });
  const rail = frame("Rail", {
    dir: "HORIZONTAL", gap: S.xs, radius: R.full, px: S.xs, py: S.xs,
    fill: C.ink, fillOpacity: 0.05, align: "CENTER"
  });
  for (let i = 0; i < labels.length; i++) {
    const est = i === actif;
    const o = frame("Nav/Tab/" + labels[i] + (est ? "/Actif" : "/Inactif"), {
      dir: "HORIZONTAL", radius: R.full, h: 36, counter: "FIXED",
      align: "CENTER", justify: "CENTER",
      fill: est ? C.white : null, shadow: est ? SHADOW_E1 : null
    });
    // 0.85 et non 0.8 : seuil RGAA du texte (voir PENDERIE_RGAA.md)
    o.appendChild(text(labels[i], {
      font: FONT_LB, size: 12, color: est ? C.ink : C.sub, opacity: est ? 1 : 0.85
    }));
    addFill(rail, o);
  }
  addFill(b, rail);
  return b;
}

function onglets(gauche, droite, actifGauche) {
  return ongletsN([gauche, droite], actifGauche ? 0 : 1);
}

// Rangee « objet + contexte + statut » : la meme dans un prêt, un
// partage ou une commande. `prefixe` ne change que le nom du calque.
function carteListe(nom, meta, statut, tone, pic, prefixe) {
  const c = frame((prefixe || "Card/Row") + "/" + nom, {
    dir: "HORIZONTAL", gap: S.md, radius: R.md, fill: C.white,
    px: S.md, py: S.md, align: "CENTER", shadow: SHADOW_E1
  });
  c.appendChild(photoBox(56, 56, R.sm, pic, C.ink));
  const g = frame("Texte", { dir: "VERTICAL", gap: S.xs });
  g.appendChild(text(nom, { font: FONT_LB, size: 16, color: C.ink }));
  g.appendChild(para(meta, 190, { size: 12, color: C.sub, lineHeight: 16 }));
  if (statut) {
    const p = frame("Statuts", { dir: "HORIZONTAL", gap: S.xs });
    p.appendChild(statusPill(statut, tone));
    g.appendChild(p);
  }
  c.appendChild(g);
  c.appendChild(text("›", { font: FONT_LB, size: 16, color: C.sub, opacity: 0.85 }));
  try { g.layoutSizingHorizontal = "FILL"; } catch (e) {}
  return c;
}

// ============================================================
// CREATION D'ECRANS
// Jusqu'au lot 14 les lots ne faisaient que reconstruire des frames
// existantes. Un parcours ajoute apres coup a besoin de creer les
// siennes : on les range dans leur Section et on les pose sur une
// nouvelle rangee, sous les ecrans deja presents.
// ============================================================

let CREES = 0;
const RANGEES = {};

function sectionParNom(nomSection) {
  const enfants = (PAGE && PAGE.children) || [];
  const cible = norme(nomSection);
  for (let i = 0; i < enfants.length; i++) {
    if (enfants[i].type === "SECTION" && norme(enfants[i].name).indexOf(cible) > -1) return enfants[i];
  }
  return null;
}

// Une Section capture ses enfants par la geometrie : un ecran pose hors
// de ses limites en ressort a la prochaine manipulation (cf. lot 19).
// On l'agrandit donc pour qu'elle contienne l'ecran, marge comprise.
function agrandirSection(sec, node) {
  if (!sec || sec.type !== "SECTION") return;
  const marge = 160;
  const w = Math.max(sec.width, node.x + node.width + marge);
  const h = Math.max(sec.height, node.y + node.height + marge);
  if (w > sec.width || h > sec.height) {
    try { sec.resizeWithoutConstraints(w, h); } catch (e) {}
  }
}

// Section introuvable -> creee sous la plus basse des sections existantes.
// Sert aux fonctionnalites qui n'ont pas encore de section (collections,
// back-office). Relancable : au 2e passage elle est retrouvee par son nom.
function sectionAssuree(nomComplet, motCle) {
  const existante = sectionParNom(motCle || nomComplet);
  if (existante) return existante;
  let bas = 0, gauche = null;
  const kids = PAGE.children;
  for (let i = 0; i < kids.length; i++) {
    const k = kids[i];
    if (k.type !== "SECTION") continue;
    bas = Math.max(bas, k.y + k.height);
    gauche = gauche == null ? k.x : Math.min(gauche, k.x);
  }
  const sec = figma.createSection();
  sec.name = nomComplet;
  PAGE.appendChild(sec);
  sec.x = gauche == null ? 0 : gauche;
  sec.y = bas + 400;
  try { sec.resizeWithoutConstraints(2400, 1400); } catch (e) {}
  return sec;
}

// Origine de la nouvelle rangee : sous le plus bas des ecrans de la
// section, aligne sur le plus a gauche. Calcule une seule fois par
// section, et depuis les freres : peu importe le repere de coordonnees.
function origineRangee(sec) {
  if (RANGEES[sec.id]) return RANGEES[sec.id];
  let bas = null, gauche = null;
  const kids = sec.children || [];
  for (let i = 0; i < kids.length; i++) {
    const k = kids[i];
    if (k.type !== "FRAME") continue;
    bas = bas == null ? k.y + k.height : Math.max(bas, k.y + k.height);
    gauche = gauche == null ? k.x : Math.min(gauche, k.x);
  }
  RANGEES[sec.id] = { x: gauche == null ? 0 : gauche, y: (bas == null ? 0 : bas) + 160 };
  return RANGEES[sec.id];
}

// Comme ecran(), mais cree la frame si elle n'existe pas encore.
// Relancable : au 2e passage la frame est retrouvee par son nom et
// simplement reconstruite, elle ne se duplique pas.
// `rangee` (facultatif) empile plusieurs rangees sous l'existant.
const PAS_RANGEE = 1400;
// `largeur` (facultatif) : largeur de la frame, pour espacer les ecrans
// desktop (back-office, 1440 px) sans qu'ils se chevauchent.
function ecranNouveau(nomSection, nom, index, build, rangee, largeur) {
  try {
    let screen = trouver(nom);
    if (!screen) {
      const sec = sectionParNom(nomSection);
      if (!sec) throw new Error("section « " + nomSection + " » introuvable");
      const o = origineRangee(sec);
      const lw = largeur || W;
      screen = figma.createFrame();
      screen.name = nom;
      screen.resize(lw, H);
      sec.appendChild(screen);
      screen.x = o.x + index * (lw + 60);
      screen.y = o.y + (rangee || 0) * PAS_RANGEE;
      CREES++;
    }
    build(screen);
    agrandirSection(screen.parent, screen);
    REUSSIS.push(nom);
  } catch (e) {
    const msg = (e && e.message) ? e.message : String(e);
    ECHOUES.push(nom + " : " + msg);
    figma.notify("Echec " + nom + " -> " + msg, { error: true, timeout: 6000 });
  }
}

// ============================================================
// PERSONNES ET RELATIONS — ecrites en local dans les lots 06 (amis) et
// 11 (modale, notification), remontees ici quand le lot 20 (abonnes) en
// a eu besoin. Memes corps de fonction : rendu identique.
// Les lots 07 et 10 gardent leur copie locale de bandeauPrive /
// enteteProfil : une fonction locale masque celle de la lib, sans conflit.
// ============================================================

// En-tete de profil : l'avatar porte l'identite, le reste est secondaire.
// `extras` : noeuds poses sous le nom (compteurs, pastilles de relation).
// Les compteurs restent en Luciole 16 et non en titre : c'est une
// information de contexte, pas un tableau de bord.
function enteteProfil(col, nom, i, meta, sous, extras) {
  const bande = frame("Entete", {
    dir: "VERTICAL", w: W, gap: S.md, px: GUT, pt: 56, pb: S.xl,
    align: "CENTER", primary: "AUTO", counter: "FIXED",
    fill: C.primary, fillOpacity: 0.06
  });
  bande.appendChild(avatar(nom, i, 88));
  const t = frame("Texte", { dir: "VERTICAL", gap: S.xs, align: "CENTER" });
  t.appendChild(text(nom, { font: FONT_T, size: 32, color: C.ink, lineHeight: 38 }));
  t.appendChild(para(meta, W - GUT * 2, { size: 16, color: C.sub, lineHeight: 22, align: "CENTER" }));
  if (sous) t.appendChild(para(sous, W - GUT * 2, { size: 12, color: C.sub, lineHeight: 16, align: "CENTER" }));
  addFill(bande, t);
  const ex = extras || [];
  for (let k = 0; k < ex.length; k++) if (ex[k]) bande.appendChild(ex[k]);
  col.appendChild(bande);
  return bande;
}

// [[nombre, libelle], ...] separes par un filet
function compteursProfil(items) {
  const row = frame("Profil/Compteurs", { dir: "HORIZONTAL", gap: S.md, align: "CENTER" });
  for (let k = 0; k < items.length; k++) {
    const c = frame("Compteur/" + items[k][1], { dir: "VERTICAL", gap: 2, px: S.sm, align: "CENTER" });
    c.appendChild(text(String(items[k][0]), { font: FONT_LB, size: 16, color: C.ink }));
    c.appendChild(text(items[k][1], { size: 12, color: C.sub }));
    row.appendChild(c);
    if (k < items.length - 1) {
      row.appendChild(frame("Filet", {
        w: 1, h: 24, fill: C.ink, fillOpacity: 0.10,
        dir: "VERTICAL", primary: "FIXED", counter: "FIXED"
      }));
    }
  }
  return row;
}

// Etat de la relation en pastilles : [[libelle, cle de statut], ...]
function pastillesRelation(items) {
  const row = frame("Profil/Relation", { dir: "HORIZONTAL", gap: S.xs, align: "CENTER" });
  for (let k = 0; k < items.length; k++) row.appendChild(statusPill(items[k][0], items[k][1]));
  return row;
}

// Bandeau « ce que l'autre voit » : l'app est privee par defaut.
function bandeauPrive(texte) {
  const b = frame("Badge/Private", {
    dir: "HORIZONTAL", gap: S.md, radius: R.md, px: S.lg, py: S.md,
    align: "CENTER", fill: C.ink, fillOpacity: 0.04
  });
  const rond = frame("Pastille", {
    w: 32, h: 32, radius: R.full, fill: C.ink, fillOpacity: 0.08,
    dir: "VERTICAL", align: "CENTER", justify: "CENTER",
    primary: "FIXED", counter: "FIXED"
  });
  rond.appendChild(text("o", { font: FONT_LB, size: 14, color: C.ink }));
  b.appendChild(rond);
  b.appendChild(para(texte, W - GUT * 2 - S.lg * 2 - 44, { size: 12, color: C.sub, lineHeight: 16 }));
  return b;
}

// Etat vide des listes de personnes (amis, abonnes, abonnements)
function etatVidePersonnes(screen, titreEcran, sousTitre, titre, corps, action) {
  const col = preparer(screen, 40);
  addFill(col, barreRetour("X"));
  addFill(col, titrePage(titreEcran, sousTitre));

  const bloc = frame("Empty state", {
    dir: "VERTICAL", gap: S.lg, px: GUT, pt: S.huge, align: "CENTER", justify: "CENTER"
  });
  const rond = frame("Illustration", {
    dir: "VERTICAL", w: 120, h: 120, radius: R.full, fill: C.ink, fillOpacity: 0.04,
    align: "CENTER", justify: "CENTER", primary: "FIXED", counter: "FIXED", clip: true
  });
  rond.appendChild(avatar("?", 0, 64));
  bloc.appendChild(rond);

  const txt = frame("Texte", { dir: "VERTICAL", gap: S.sm, align: "CENTER" });
  txt.appendChild(para(titre, W - GUT * 2,
    { font: FONT_T, size: 24, color: C.ink, lineHeight: 30, align: "CENTER" }));
  txt.appendChild(para(corps, W - GUT * 2 - S.xl,
    { size: 16, color: C.sub, lineHeight: 22, align: "CENTER" }));
  addFill(bloc, txt);

  const a = frame("Action", { dir: "VERTICAL", pt: S.sm });
  a.appendChild(bouton(action, "primary"));
  bloc.appendChild(a);
  addFill(col, bloc);
  finaliser(screen, col);
}

// Notification : une pastille coloree porte la categorie, le titre
// porte l'action. Non lue = fond legerement teinte.
function notif(titre, texte, temps, tone, nonLue) {
  const coul = couleurDe(tone);
  const r = frame("Notification/Row/" + titre, {
    dir: "HORIZONTAL", gap: S.md, radius: R.md, px: S.md, py: S.md,
    align: "MIN", fill: nonLue ? coul : C.white, fillOpacity: nonLue ? 0.06 : 1,
    shadow: nonLue ? null : SHADOW_E1
  });
  const rond = frame("Pastille", {
    w: 40, h: 40, radius: R.full, fill: coul, fillOpacity: 0.16,
    dir: "VERTICAL", align: "CENTER", justify: "CENTER",
    primary: "FIXED", counter: "FIXED"
  });
  rond.appendChild(text(titre.slice(0, 1), { font: FONT_LB, size: 16, color: coul }));
  r.appendChild(rond);

  const g = frame("Texte", { dir: "VERTICAL", gap: 2 });
  const tete = frame("Ligne", { dir: "HORIZONTAL", gap: S.sm, align: "CENTER", justify: "SPACE_BETWEEN" });
  tete.appendChild(text(titre, { font: FONT_LB, size: 16, color: C.ink }));
  tete.appendChild(text(temps, { size: 12, color: C.sub, opacity: 0.85 }));
  addFill(g, tete);
  g.appendChild(para(texte, W - GUT * 2 - S.md * 2 - 40 - S.md,
    { size: 12, color: C.sub, lineHeight: 16 }));
  r.appendChild(g);
  try { g.layoutSizingHorizontal = "FILL"; } catch (e) {}
  return r;
}

// Modale de confirmation : voile sombre + carte centree. On ne passe
// pas par preparer(), qui pose un fond d'ecran opaque.
// `variante` du bouton de confirmation : « danger » par defaut (actions
// destructives) ; une action reversible prend « primary ».
function modale(screen, titre, corps, confirmer, detail, variante) {
  const olds = screen.children.slice();
  for (let i = 0; i < olds.length; i++) olds[i].remove();
  screen.layoutMode = "NONE";
  screen.fills = solid(C.ink, 0.55);
  screen.clipsContent = true;
  screen.resize(W, H);

  const col = frame("Contenu", {
    dir: "VERTICAL", w: W, h: H, px: GUT, primary: "FIXED", counter: "FIXED",
    justify: "CENTER", align: "CENTER"
  });
  screen.appendChild(col);
  col.x = 0; col.y = 0;

  const c = frame("Modal/Confirm", {
    dir: "VERTICAL", gap: S.lg, radius: R.lg, fill: C.white,
    px: S.xl, py: S.xl, shadow: SHADOW_E2
  });
  const util = W - GUT * 2 - S.xl * 2;
  const t = frame("Texte", { dir: "VERTICAL", gap: S.sm });
  t.appendChild(para(titre, util, { font: FONT_T, size: 24, color: C.ink, lineHeight: 30 }));
  t.appendChild(para(corps, util, { size: 16, color: C.sub, lineHeight: 22 }));
  addFill(c, t);

  if (detail) {
    const d = frame("Detail", {
      dir: "VERTICAL", gap: S.xs, radius: R.sm, px: S.md, py: S.md,
      fill: C.ink, fillOpacity: 0.04
    });
    d.appendChild(para(detail, util - S.md * 2, { size: 12, color: C.sub, lineHeight: 16 }));
    addFill(c, d);
  }

  const actions = frame("Detail/Action bar", { dir: "VERTICAL", gap: S.md });
  addFill(actions, bouton(confirmer, variante || "danger"));
  addFill(actions, bouton("Annuler", "secondary"));
  addFill(c, actions);

  addFill(col, c);
  return col;
}

// Bouton de relation, compact (36 px) pour tenir dans une rangee de
// personne. Le grand bouton de 52 px ne rentre pas a cote d'un avatar.
// [fond, opacite du fond, couleur du libelle, ombre]
const RELATION = {
  "S'abonner":           [C.primary, 1,    C.white,        SHADOW_E1],
  "S'abonner en retour": [C.primary, 1,    C.white,        SHADOW_E1],
  "Abonné":              [C.white,   1,    C.ink,          SHADOW_E1],
  "Devenir amis":        [C.primary, 0.12, C.primaryTexte, null],
  "Demande envoyée":     [C.ink,     0.06, C.sub,          null],
  "Ami":                 [C.main,    0.10, C.mainTexte,    null]
};
function boutonRelation(etat) {
  const conf = RELATION[etat];
  if (!conf) throw new Error("etat de relation inconnu : " + etat);
  const b = frame("Button/Relation/" + etat, {
    dir: "HORIZONTAL", radius: R.full, px: S.md, h: 36, counter: "FIXED",
    align: "CENTER", justify: "CENTER",
    fill: conf[0], fillOpacity: conf[1], shadow: conf[3]
  });
  b.appendChild(text(etat, { font: FONT_LB, size: 12, color: conf[2] }));
  return b;
}

// ============================================================
// BRIQUES DES LOTS 21 A 26 — ecrites une fois ici. Les lots 07, 12 et
// 15 gardent leurs copies locales (carteElement, filAriane, jauge,
// zonePhoto, carteLien, carteQR, commentaire) : meme rendu, elles
// masquent simplement celles-ci.
// ============================================================

const UTIL = W - GUT * 2;                 // largeur utile d'un ecran
const UTIL_CARTE_LIB = UTIL - S.lg * 2;   // largeur utile dans une carte

// Composants photo du fichier (set Vetements de la page Components)
let PICS = null;
async function chargerPics() {
  if (PICS) return PICS;
  const c = async function (id) {
    try {
      const n = await figma.getNodeByIdAsync(id);
      return (n && n.type === "COMPONENT") ? n : null;
    } catch (e) { return null; }
  };
  PICS = {
    tshirt: await c("39:50"), jacket: await c("39:55"), coat: await c("39:67"),
    pants: await c("39:82"), baskets: await c("52:2013"), cap: await c("39:109"),
    scarf: await c("39:115"), robe: await c("52:2003"), cintre: await c("52:2024")
  };
  return PICS;
}

function carteElement(nom, meta, pic, pastille, tone) {
  const c = card("Card/Section/Element", { gap: S.md });
  const l = frame("Ligne", { dir: "HORIZONTAL", gap: S.md, align: "CENTER" });
  l.appendChild(photoBox(56, 56, R.sm, pic, C.ink));
  const g = frame("Texte", { dir: "VERTICAL", gap: 2 });
  g.appendChild(text(nom, { font: FONT_LB, size: 16, color: C.ink }));
  g.appendChild(para(meta, 170, { size: 12, color: C.sub, lineHeight: 16 }));
  l.appendChild(g);
  if (pastille) l.appendChild(statusPill(pastille, tone));
  addFill(c, l);
  try { g.layoutSizingHorizontal = "FILL"; } catch (e) {}
  return c;
}

function filAriane(chemin, actif) {
  const plein = actif !== false;
  const b = frame("Nav/Breadcrumb", {
    dir: "HORIZONTAL", gap: S.xs, gapY: S.xs, wrap: true, px: GUT, primary: "FIXED"
  });
  for (let i = 0; i < chemin.length; i++) {
    const dernier = i === chemin.length - 1;
    const p = frame("Chip/Category/" + chemin[i], {
      dir: "HORIZONTAL", radius: R.full, px: S.md, h: 32, counter: "FIXED", align: "CENTER",
      fill: dernier && plein ? C.primary : C.white, shadow: dernier && plein ? null : SHADOW_E1
    });
    p.appendChild(text(chemin[i], { font: FONT_LB, size: 12, color: dernier && plein ? C.white : C.sub }));
    b.appendChild(p);
    if (!dernier) {
      const s = frame("Separateur", { dir: "VERTICAL", align: "CENTER", justify: "CENTER", h: 32, counter: "FIXED" });
      s.appendChild(text("›", { font: FONT_LB, size: 12, color: C.sub, opacity: 0.85 }));
      b.appendChild(s);
    }
  }
  return b;
}

function jauge(total, courant) {
  const b = frame("Jauge", { dir: "HORIZONTAL", gap: S.xs, px: GUT });
  for (let i = 0; i < total; i++) {
    addFill(b, frame("Segment", {
      h: 4, radius: R.full, dir: "VERTICAL", primary: "FIXED", counter: "FIXED",
      fill: i <= courant ? C.primary : C.ink, fillOpacity: i <= courant ? 1 : 0.10
    }));
  }
  return b;
}

function zonePhoto(hauteur, pic, legende) {
  const z = frame("Field/Upload photo", {
    dir: "VERTICAL", gap: S.md, w: UTIL, h: hauteur, radius: R.lg,
    fill: C.ink, fillOpacity: 0.04, align: "CENTER", justify: "CENTER",
    primary: "FIXED", counter: "FIXED", clip: true
  });
  if (pic) {
    try {
      const inst = pic.createInstance();
      inst.rescale((hauteur * 0.5) / Math.max(inst.width, inst.height));
      nettoieVignette(inst);
      z.appendChild(inst);
    } catch (e) {}
  }
  if (legende) z.appendChild(text(legende, { size: 12, color: C.sub }));
  return z;
}

function carteLien(lien, expire) {
  const c = card("Card/Section/Lien", { gap: S.sm });
  c.appendChild(text("Lien de partage", { font: FONT_LB, size: 12, color: C.sub }));
  const boite = frame("Champ", {
    dir: "HORIZONTAL", radius: R.sm, px: S.md, py: S.md, align: "CENTER",
    fill: C.ink, fillOpacity: 0.04
  });
  boite.appendChild(para(lien, UTIL_CARTE_LIB - S.md * 2, { font: FONT_LB, size: 16, color: C.ink }));
  addFill(c, boite);
  if (expire) c.appendChild(text(expire, { size: 12, color: C.sub }));
  return c;
}

function carteQR(legende) {
  const c = card("Card/QR", { gap: S.md, align: "CENTER" });
  const carre = frame("Photo", {
    w: 140, h: 140, radius: R.md, fill: C.ink, fillOpacity: 0.06,
    dir: "VERTICAL", align: "CENTER", justify: "CENTER",
    primary: "FIXED", counter: "FIXED", clip: true
  });
  carre.appendChild(text("QR", { font: FONT_LB, size: 16, color: C.sub, opacity: 0.85 }));
  c.appendChild(carre);
  c.appendChild(text(legende || "À scanner en face à face", { size: 12, color: C.sub }));
  return c;
}

function commentaire(nom, i, texte, date, aMoi) {
  const r = frame("Detail/Comment/" + nom, {
    dir: "HORIZONTAL", gap: S.md, radius: R.md, px: S.md, py: S.md,
    align: "MIN", fill: aMoi ? C.primary : C.white, fillOpacity: aMoi ? 0.06 : 1,
    shadow: aMoi ? null : SHADOW_E1
  });
  r.appendChild(avatar(nom, i, 40));
  const g = frame("Texte", { dir: "VERTICAL", gap: S.xs });
  const tete = frame("Ligne", { dir: "HORIZONTAL", gap: S.sm, align: "CENTER", justify: "SPACE_BETWEEN" });
  tete.appendChild(text(nom, { font: FONT_LB, size: 16, color: C.ink }));
  tete.appendChild(text(date, { size: 12, color: C.sub, opacity: 0.85 }));
  addFill(g, tete);
  g.appendChild(para(texte, UTIL - S.md * 2 - 40 - S.md, { size: 16, color: C.ink, lineHeight: 22 }));
  r.appendChild(g);
  try { g.layoutSizingHorizontal = "FILL"; } catch (e) {}
  return r;
}

// Personne avec son niveau d'acces dans un partage : l'acces se lit en
// pastille (vert = commentaires autorises, gris = lecture seule).
function rangeeAcces(nom, meta, i, niveau, choisi) {
  const droite = frame("Droite", { dir: "HORIZONTAL", gap: S.xs, align: "CENTER" });
  droite.appendChild(statusPill(niveau, niveau === "Lecture seule" ? "neutre" : "encours"));
  if (choisi) droite.appendChild(statusPill("Choisi", "arendre"));
  const r = frame("Card/Friend/" + nom, {
    dir: "HORIZONTAL", gap: S.md, radius: R.md, fill: C.white,
    px: S.md, py: S.md, align: "CENTER", justify: "SPACE_BETWEEN", shadow: SHADOW_E1
  });
  const g = frame("Gauche", { dir: "HORIZONTAL", gap: S.md, align: "CENTER" });
  g.appendChild(avatar(nom, i, 40));
  const t = frame("Texte", { dir: "VERTICAL", gap: 2 });
  t.appendChild(text(nom, { font: FONT_LB, size: 16, color: C.ink }));
  t.appendChild(para(meta, 100, { size: 12, color: C.sub, lineHeight: 16 }));
  g.appendChild(t);
  r.appendChild(g);
  r.appendChild(droite);
  try { g.layoutSizingHorizontal = "FILL"; } catch (e) {}
  return r;
}

// Etat plein ecran d'un visiteur (acces refuse, lien expire...) : pas de
// barre de navigation, un seul message, une seule sortie.
function etatAcces(screen, glyphe, titre, corps, lignes, action, bandeau) {
  const col = preparer(screen, 40);
  addFill(col, barreRetour("X"));
  const bloc = frame("Empty state", {
    dir: "VERTICAL", gap: S.lg, px: GUT, pt: S.huge, align: "CENTER", justify: "CENTER"
  });
  const rond = frame("Illustration", {
    dir: "VERTICAL", w: 120, h: 120, radius: R.full, fill: C.ink, fillOpacity: 0.04,
    align: "CENTER", justify: "CENTER", primary: "FIXED", counter: "FIXED"
  });
  rond.appendChild(text(glyphe, { font: FONT_T, size: 48, color: C.sub }));
  bloc.appendChild(rond);
  const txt = frame("Texte", { dir: "VERTICAL", gap: S.sm, align: "CENTER" });
  txt.appendChild(para(titre, UTIL, { font: FONT_T, size: 24, color: C.ink, lineHeight: 30, align: "CENTER" }));
  txt.appendChild(para(corps, UTIL - S.xl, { size: 16, color: C.sub, lineHeight: 22, align: "CENTER" }));
  addFill(bloc, txt);
  addFill(col, bloc);
  const blocs = frame("Blocs", { dir: "VERTICAL", gap: S.md, px: GUT });
  if (lignes) addFill(blocs, lignes);
  if (bandeau) addFill(blocs, bandeauPrive(bandeau));
  addFill(col, blocs);
  barreActions(col, bouton(action, "primary"), null, null, null);
  finaliser(screen, col);
}

// ---------- MOODBOARD ----------
// Grille de 6 colonnes a unites carrees. Chaque tuile : [col, rang,
// largeur, hauteur, photo, teinte, etiquette]. La composition est
// ASYMETRIQUE a dessein : une piece dominante, des tailles melangees,
// du blanc entre les images — un tableau, pas une liste.
const MOOD_GAP = 8;
function uniteMood(largeur, colonnes) {
  return (largeur - MOOD_GAP * (colonnes - 1)) / colonnes;
}
function tuileMood(t, u, rayon) {
  const w = Math.round(t[2] * u + (t[2] - 1) * MOOD_GAP);
  const h = Math.round(t[3] * u + (t[3] - 1) * MOOD_GAP);
  const teinte = t[5] || C.ink;
  const box = photoBox(w, h, rayon, t[4], teinte);
  box.name = "Moodboard/Tuile" + (t[6] ? "/" + t[6] : "");
  box.x = Math.round(t[0] * (u + MOOD_GAP));
  box.y = Math.round(t[1] * (u + MOOD_GAP));
  if (t[6]) overlay(box, statusPill(t[6], "neutre", false), S.sm, S.sm);
  return box;
}
function moodboard(tuiles, largeur, colonnes, nom) {
  const n = colonnes || 6;
  const u = uniteMood(largeur, n);
  let rangs = 0;
  for (let i = 0; i < tuiles.length; i++) rangs = Math.max(rangs, tuiles[i][1] + tuiles[i][3]);
  const h = Math.round(rangs * u + (rangs - 1) * MOOD_GAP);
  const m = frame(nom || "Moodboard", { w: largeur, h: h });
  m.clipsContent = false;
  const boxes = [];
  for (let i = 0; i < tuiles.length; i++) {
    const b = tuileMood(tuiles[i], u, largeur > 200 ? R.md : R.xs);
    m.appendChild(b);
    b.x = Math.round(tuiles[i][0] * (u + MOOD_GAP));
    b.y = Math.round(tuiles[i][1] * (u + MOOD_GAP));
    boxes.push(b);
  }
  m.setPluginData("tuiles", String(boxes.length));
  return { node: m, boxes: boxes, unite: u };
}
// Le moodboard pose dans un ecran, avec la gouttiere laterale
function blocMoodboard(tuiles, nom) {
  const wrap = frame("Blocs", { dir: "VERTICAL", px: GUT });
  const mb = moodboard(tuiles, UTIL, 6, nom);
  wrap.appendChild(mb.node);
  return { node: wrap, boxes: mb.boxes };
}

// ---------- COMMENTAIRES ET FIL (lot 27) ----------

// Commentaire avec un menu « ··· » : c'est le point d'entrée des actions
// (répondre, masquer, signaler, supprimer). Le menu est un calque nommé,
// que le prototype vise par son texte.
function commentaireMenu(nom, i, texte, date, aMoi, etiquette) {
  const r = commentaire(nom, i, texte, date, aMoi);
  const g = r.children[1];
  const pied = frame("Pied", { dir: "HORIZONTAL", gap: S.lg, align: "CENTER", justify: "SPACE_BETWEEN" });
  pied.appendChild(text(etiquette || "Répondre", { font: FONT_LB, size: 12, color: C.sub }));
  pied.appendChild(text("···", { font: FONT_LB, size: 16, color: C.sub }));
  addFill(g, pied);
  return r;
}

// Publication du fil : auteur, audience TOUJOURS visible (le fil est
// privé), texte court, visuel, et une seule action sociale : commenter.
// Pas de « j'aime » ni de compteur de popularité, volontairement.
function cartePost(auteur, i, quand, audience, tone, texte, visuel, action, lien) {
  const c = card("Card/Post/" + auteur, { gap: S.md });
  const tete = frame("Entete", { dir: "HORIZONTAL", gap: S.md, align: "CENTER", justify: "SPACE_BETWEEN" });
  const g = frame("Auteur", { dir: "HORIZONTAL", gap: S.md, align: "CENTER" });
  g.appendChild(avatar(auteur, i, 40));
  const t = frame("Texte", { dir: "VERTICAL", gap: 2 });
  t.appendChild(text(auteur, { font: FONT_LB, size: 16, color: C.ink }));
  t.appendChild(text(quand, { size: 12, color: C.sub }));
  g.appendChild(t);
  tete.appendChild(g);
  tete.appendChild(text("···", { font: FONT_LB, size: 16, color: C.sub }));
  addFill(c, tete);
  const p = frame("Statuts", { dir: "HORIZONTAL" });
  p.appendChild(statusPill(audience, tone));
  c.appendChild(p);
  if (texte) c.appendChild(para(texte, UTIL_CARTE_LIB, { size: 16, color: C.ink, lineHeight: 22 }));
  if (visuel) addFill(c, visuel);
  if (action || lien) {
    const a = frame("Actions", { dir: "HORIZONTAL", align: "CENTER", justify: "SPACE_BETWEEN" });
    if (action) a.appendChild(text(action, { font: FONT_LB, size: 12, color: C.primary }));
    if (lien) a.appendChild(text(lien, { font: FONT_LB, size: 12, color: C.sub }));
    addFill(c, a);
  }
  return c;
}

// Feuille d'actions en bas d'écran (overlay) : voile + panneau arrondi.
// actions = [[libellé, « normal » | « danger »], ...] ; « Annuler » en dernier.
function feuilleActions(screen, titre, contexte, actions) {
  const olds = screen.children.slice();
  for (let i = 0; i < olds.length; i++) olds[i].remove();
  screen.layoutMode = "NONE";
  screen.fills = solid(C.ink, 0.55);
  screen.clipsContent = true;
  screen.resize(W, H);
  const col = frame("Contenu", { dir: "VERTICAL", w: W, h: H, primary: "FIXED", counter: "FIXED", justify: "MAX" });
  screen.appendChild(col);
  col.x = 0; col.y = 0;
  const f = frame("Sheet/Actions", {
    dir: "VERTICAL", gap: S.xs, px: GUT, pt: S.lg, pb: S.huge, fill: C.white, shadow: SHADOW_E2
  });
  f.topLeftRadius = R.lg; f.topRightRadius = R.lg;
  const poignee = frame("Poignee", { dir: "HORIZONTAL", justify: "CENTER", pb: S.sm });
  poignee.appendChild(frame("Barre", { w: 40, h: 4, radius: R.full, fill: C.ink, fillOpacity: 0.15, dir: "VERTICAL", primary: "FIXED", counter: "FIXED" }));
  addFill(f, poignee);
  const t = frame("Texte", { dir: "VERTICAL", gap: 2, pb: S.md });
  t.appendChild(text(titre, { font: FONT_LB, size: 16, color: C.ink }));
  if (contexte) t.appendChild(para(contexte, UTIL, { size: 12, color: C.sub, lineHeight: 16 }));
  addFill(f, t);
  for (let i = 0; i < actions.length; i++) {
    const danger = actions[i][1] === "danger";
    const r = frame("List/Row/" + actions[i][0], {
      dir: "HORIZONTAL", h: 52, counter: "FIXED", align: "CENTER", px: S.md, radius: R.md,
      fill: C.ink, fillOpacity: 0.03
    });
    r.appendChild(text(actions[i][0], { font: FONT_LB, size: 16, color: danger ? C.error : C.ink }));
    addFill(f, r);
  }
  addFill(col, f);
  return col;
}

// Carte d'une collection : la couverture EST la carte (composition des
// premiers elements), le texte reste court dessous.
function carteCollection(nom, meta, pics, pastille, tone, largeur) {
  const c = frame("Card/Collection/" + nom, {
    dir: "VERTICAL", gap: 0, w: largeur, radius: R.md, fill: C.white,
    shadow: SHADOW_E1, primary: "AUTO", counter: "FIXED", clip: true
  });
  const cov = frame("Couverture", {
    dir: "VERTICAL", w: largeur, px: S.sm, pt: S.sm, primary: "AUTO", counter: "FIXED"
  });
  const mb = moodboard([
    [0, 0, 2, 2, pics[0], null, null],
    [2, 0, 1, 1, pics[1], C.primary, null],
    [2, 1, 1, 1, pics[2], null, null]
  ], largeur - S.sm * 2, 3, "Couverture/Composition");
  cov.appendChild(mb.node);
  c.appendChild(cov);
  const b = frame("Texte", { dir: "VERTICAL", gap: 2, px: S.md, pt: S.md, pb: S.md });
  b.appendChild(para(nom, largeur - S.md * 2, { font: FONT_LB, size: 16, color: C.ink, lineHeight: 20 }));
  b.appendChild(para(meta, largeur - S.md * 2, { size: 12, color: C.sub }));
  if (pastille) {
    const p = frame("Statuts", { dir: "HORIZONTAL", pt: S.xs });
    p.appendChild(statusPill(pastille, tone));
    b.appendChild(p);
  }
  addFill(c, b);
  return c;
}

// ============================================================
// Lot 14 — AUTHENTIFICATION, MENU D'AJOUT, VÊTEMENT
// (page "Maquette v2", sections 01, 02 et 05)
//
// 13 ecrans : les derniers de la refonte v2.
//
// ATTENTION — deux ecrans sont cibles par NOM DE CALQUE, pas par texte,
// dans penderie-prototype.js. Ces noms doivent etre reproduits a
// l'identique, sinon le menu radial et l'ecran de choix perdent leurs
// liens :
//   Menu d'ajout : « Voile », « Bulle Vêtement », « Bulle Objet »,
//                  « Bulle Logement », « Bulle Scanner », « Add activity »
//   Choix du type : « Carte Vêtement », « Carte Objet »
//
// Libelles cliquables : « SE CONNECTER », « SE CONNECTER COMME FABIEN »,
// « SE CONNECTER COMME BRICE », « Continuer », « Ajouter »,
// « Vetement ajoute ! », « Preter », « Modifier », « Enregistrer »,
// « Supprimer ce vetement », « Deplacer », « Vendre »,
// « Voir l'historique › », « Deplacer le vetement › ».
// ============================================================

(async function () {
  try {
    figma.notify("Lot 14 Final : demarrage...", { timeout: 1500 });
    await ouvrirPage("Maquette v2");
    await chargerNav();

    async function comp(id) {
      try {
        const n = await figma.getNodeByIdAsync(id);
        return (n && n.type === "COMPONENT") ? n : null;
      } catch (e) { return null; }
    }
    const PIC = {
      tshirt:  await comp("39:50"),
      jacket:  await comp("39:55"),
      coat:    await comp("39:67"),
      pants:   await comp("39:82"),
      baskets: await comp("52:2013"),
      cap:     await comp("39:109"),
      scarf:   await comp("39:115"),
      robe:    await comp("52:2003"),
      cintre:  await comp("52:2024"),
      short:   await comp("39:74")
    };
    const LOGO = await comp("18:595");

    const UTIL_CARTE = W - GUT * 2 - S.lg * 2;
    const VET = "T-shirt Nike";
    const LOC_VET = "Maison principale › Chambre › Armoire › Étagère 2";

    // ---------- briques ----------

    function jauge(total, courant) {
      const b = frame("Jauge", { dir: "HORIZONTAL", gap: S.xs, px: GUT });
      for (let i = 0; i < total; i++) {
        const t = frame("Segment", {
          h: 4, radius: R.full, dir: "VERTICAL", primary: "FIXED", counter: "FIXED",
          fill: i <= courant ? C.primary : C.ink, fillOpacity: i <= courant ? 1 : 0.10
        });
        addFill(b, t);
      }
      return b;
    }

    function zonePhoto(hauteur, pic, legende) {
      const z = frame("Field/Upload photo", {
        dir: "VERTICAL", gap: S.md, w: W - GUT * 2, h: hauteur, radius: R.lg,
        fill: C.ink, fillOpacity: 0.04, align: "CENTER", justify: "CENTER",
        primary: "FIXED", counter: "FIXED", clip: true
      });
      if (pic) {
        try {
          const inst = pic.createInstance();
          inst.rescale((hauteur * 0.5) / Math.max(inst.width, inst.height));
          nettoieVignette(inst);
          z.appendChild(inst);
        } catch (e) {}
      }
      if (legende) z.appendChild(text(legende, { size: 12, color: C.sub }));
      return z;
    }

    function attributs(liste) {
      const zone = frame("Attributs", {
        dir: "HORIZONTAL", gap: S.sm, gapY: S.sm, wrap: true, px: GUT, primary: "FIXED"
      });
      for (let i = 0; i < liste.length; i++) {
        const a = frame("Garment/Attribute/" + liste[i], {
          dir: "HORIZONTAL", radius: R.full, px: S.md, h: 32,
          counter: "FIXED", align: "CENTER", fill: C.white, shadow: SHADOW_E1
        });
        a.appendChild(text(liste[i], { font: FONT_LB, size: 12, color: C.ink }));
        zone.appendChild(a);
      }
      return zone;
    }

    function heroVetement(col, nom, marque, statut, tone, pic, glypheRetour) {
      const hero = frame("Detail/Hero photo", {
        dir: "VERTICAL", w: W, h: 320, primary: "FIXED", counter: "FIXED",
        fill: C.ink, fillOpacity: 0.04, align: "CENTER", justify: "CENTER", clip: true
      });
      if (pic) {
        try {
          const inst = pic.createInstance();
          inst.rescale(200 / Math.max(inst.width, inst.height));
          nettoieVignette(inst);
          hero.appendChild(inst);
        } catch (e) {}
      }
      col.appendChild(hero);
      overlay(hero, boutonRetour(glypheRetour || "X"), GUT, S.xl);

      const tete = frame("Titre", { dir: "VERTICAL", gap: S.sm, px: GUT });
      const ligne = frame("Ligne", { dir: "HORIZONTAL", gap: S.md, align: "CENTER", justify: "SPACE_BETWEEN" });
      const g = frame("Gauche", { dir: "VERTICAL", gap: 2 });
      g.appendChild(text(nom, { font: FONT_T, size: 24, color: C.ink, lineHeight: 30 }));
      g.appendChild(text(marque, { size: 12, color: C.sub }));
      ligne.appendChild(g);
      if (statut) ligne.appendChild(statusPill(statut, tone));
      addFill(tete, ligne);
      addFill(col, tete);
      return hero;
    }

    function blocLocalisation(titre, chemin, lien) {
      const c = card("Card/Section/Localisation", { gap: S.sm });
      c.appendChild(text(titre, { font: FONT_LB, size: 12, color: C.sub }));
      c.appendChild(para(chemin, UTIL_CARTE, { font: FONT_LB, size: 16, color: C.ink, lineHeight: 22 }));
      if (lien) c.appendChild(text(lien, { size: 12, color: C.primary }));
      return c;
    }

    // ============ 1. Connexion ============
    ecran("Authentification — Connexion", function (screen) {
      const col = preparer(screen, 40, 0);

      const bande = frame("Entete", {
        dir: "VERTICAL", w: W, gap: S.lg, px: GUT, pt: 96, pb: 56,
        align: "CENTER", primary: "AUTO", counter: "FIXED",
        fill: C.primary, fillOpacity: 0.06
      });
      if (LOGO) {
        try {
          const li = LOGO.createInstance();
          li.rescale(72 / Math.max(li.width, li.height));
          bande.appendChild(li);
        } catch (e) {}
      }
      const t = frame("Texte", { dir: "VERTICAL", gap: S.sm, align: "CENTER" });
      t.appendChild(text("PENDERIE", { font: FONT_T, size: 32, color: C.ink, lineHeight: 38 }));
      t.appendChild(para("Range, retrouve, prête. Entre amis, et sans rien publier.",
        W - GUT * 2, { size: 16, color: C.sub, lineHeight: 22, align: "CENTER" }));
      addFill(bande, t);
      col.appendChild(bande);

      const champs = frame("Champs", { dir: "VERTICAL", gap: S.xl, px: GUT });
      addFill(champs, champSelect("Adresse e-mail", "mathis@example.com"));
      addFill(champs, champSelect("Mot de passe", "· · · · · · · ·"));
      addFill(col, champs);

      const oubli = frame("Lien", { dir: "HORIZONTAL", justify: "MAX", px: GUT });
      oubli.appendChild(text("Mot de passe oublié ?", { size: 12, color: C.primary }));
      addFill(col, oubli);

      barreActions(col, bouton("SE CONNECTER", "primary"), null, null, null);

      // Raccourcis de demonstration : conserves tels quels, le prototype
      // s'en sert pour entrer dans l'app sans formulaire.
      const demo = frame("Section/Demo", { dir: "VERTICAL", gap: S.md });
      addFill(demo, enteteSection("Comptes de démonstration", null));
      const d = frame("Detail/Action bar", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(d, bouton("SE CONNECTER COMME FABIEN", "secondary"));
      addFill(d, bouton("SE CONNECTER COMME BRICE", "secondary"));
      addFill(demo, d);
      addFill(col, demo);

      const inscr = frame("Lien", { dir: "HORIZONTAL", justify: "CENTER", px: GUT });
      inscr.appendChild(text("Pas encore de compte ? Créer un compte",
        { font: FONT_LB, size: 12, color: C.primary }));
      addFill(col, inscr);
      finaliser(screen, col);
    });

    // ============ 2. E-mail de bienvenue ============
    // Ce n'est pas un ecran d'app mais la maquette d'un e-mail : on le
    // presente comme tel, dans un cadre de message.
    ecran("Authentification — E-mail de bienvenue", function (screen) {
      const col = preparer(screen, 40);
      addFill(col, barreRetour("X"));
      addFill(col, titrePage("E-mail de bienvenue", "Envoyé à l'inscription"));

      const blocs = frame("Blocs", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(blocs, carteSection("L'en-tête", [
        ligneInfo("De", "Penderie"),
        ligneInfo("À", "mathis@example.com"),
        ligneInfo("Objet", "Bienvenue dans ta penderie")
      ]));

      const corps = card("Card/Section/Message", { gap: S.md });
      const entete = frame("Ligne", { dir: "HORIZONTAL", gap: S.md, align: "CENTER" });
      if (LOGO) {
        try {
          const li = LOGO.createInstance();
          li.rescale(32 / Math.max(li.width, li.height));
          entete.appendChild(li);
        } catch (e) {}
      }
      entete.appendChild(text("PENDERIE", { font: FONT_T, size: 24, color: C.ink, lineHeight: 30 }));
      addFill(corps, entete);
      corps.appendChild(para("Bonjour Mathis,", UTIL_CARTE,
        { font: FONT_LB, size: 16, color: C.ink, lineHeight: 22 }));
      corps.appendChild(para("Ton compte est prêt. Commence par ajouter un logement, puis un premier objet : tu sauras toujours où il est rangé et à qui tu l'as prêté.",
        UTIL_CARTE, { size: 16, color: C.sub, lineHeight: 22 }));
      corps.appendChild(para("Ta penderie est privée : rien n'est visible tant que tu n'as pas partagé quelque chose.",
        UTIL_CARTE, { size: 16, color: C.sub, lineHeight: 22 }));
      const cta = frame("Detail/Action bar", { dir: "VERTICAL" });
      addFill(cta, bouton("Ouvrir Penderie", "primary"));
      addFill(corps, cta);
      corps.appendChild(para("À bientôt,\nL'équipe Penderie", UTIL_CARTE,
        { size: 12, color: C.sub, lineHeight: 18 }));
      addFill(blocs, corps);

      addFill(blocs, carteSection("Le pied de page", [
        ligneInfo("Désabonnement", "En un clic"),
        ligneInfo("Données", "Jamais revendues")
      ]));
      addFill(col, blocs);
      finaliser(screen, col);
    });

    // ============ 3. Menu d'ajout ============
    // Menu radial pose en absolu au-dessus d'un voile. Les noms de
    // calques « Voile » et « Bulle ... » sont les zones du prototype :
    // ne pas les renommer.
    // L'ecran « Menu d'ajout » a ete remanie A LA MAIN dans Figma apres le
    // premier passage : les bulles « Vetement » et « Objet » y ont fusionne
    // en « Habit/Objet » et une bulle « Cartons » a ete ajoutee. Le rebatir
    // ecraserait ce travail, donc le bloc est desactive. Ne remettre a true
    // qu'apres accord explicite de l'utilisateur.
    const RUN_MENU_AJOUT = false;
    if (RUN_MENU_AJOUT) ecran("Accueil — Menu d'ajout", function (screen) {
      const olds = screen.children.slice();
      for (let i = 0; i < olds.length; i++) olds[i].remove();
      screen.layoutMode = "NONE";
      screen.fills = solid(C.bg);
      screen.clipsContent = true;
      screen.resize(W, H);

      const voile = frame("Voile", {
        w: W, h: H, dir: "VERTICAL", primary: "FIXED", counter: "FIXED",
        fill: C.ink, fillOpacity: 0.58
      });
      screen.appendChild(voile);
      voile.x = 0; voile.y = 0;

      const titre = text("Qu'est-ce que tu ajoutes ?", {
        font: FONT_T, size: 24, color: C.white, lineHeight: 30, align: "CENTER"
      });
      titre.textAutoResize = "HEIGHT";
      titre.resize(W - GUT * 2, titre.height);
      screen.appendChild(titre);
      titre.x = GUT; titre.y = H - 420;

      // Quatre bulles en arc au-dessus du FAB : deux hautes ecartees,
      // deux basses rapprochees, pour rester atteignables au pouce.
      const bulles = [
        ["Bulle Vêtement", "Vêtement", "Un haut, un bas, une paire", 40,  H - 340],
        ["Bulle Objet",    "Objet",    "Outil, livre, matériel",     213, H - 340],
        ["Bulle Logement", "Logement", "Maison, cave, bureau",       40,  H - 224],
        ["Bulle Scanner",  "Scanner",  "Photographier pour remplir", 213, H - 224]
      ];
      for (let i = 0; i < bulles.length; i++) {
        const b = bulles[i];
        const bulle = frame(b[0], {
          dir: "VERTICAL", gap: S.xs, w: 140, radius: R.md, fill: C.white,
          px: S.md, py: S.md, shadow: SHADOW_E2, primary: "AUTO", counter: "FIXED"
        });
        const rond = frame("Illustration", {
          w: 36, h: 36, radius: R.full, fill: C.primary, fillOpacity: 0.12,
          dir: "VERTICAL", align: "CENTER", justify: "CENTER",
          primary: "FIXED", counter: "FIXED"
        });
        rond.appendChild(text(b[1].slice(0, 1), { font: FONT_LB, size: 14, color: C.primary }));
        bulle.appendChild(rond);
        bulle.appendChild(text(b[1], { font: FONT_LB, size: 16, color: C.ink }));
        bulle.appendChild(para(b[2], 140 - S.md * 2, { size: 12, color: C.sub, lineHeight: 16 }));
        screen.appendChild(bulle);
        bulle.x = b[3]; bulle.y = b[4];
      }

      // Le FAB reprend sa place exacte dans la barre : le menu doit
      // donner l'impression de s'ouvrir depuis lui.
      if (NAVIC && NAVIC.fab) {
        try {
          const fab = NAVIC.fab.createInstance();
          fab.rescale(60 / Math.max(fab.width, fab.height));
          screen.appendChild(fab);
          fab.x = (W - fab.width) / 2;
          fab.y = H - NAVH - fab.height / 2 + 6;
          fab.effects = [SHADOW_E2];
        } catch (e) {}
      }

      const fermer = text("Fermer", { font: FONT_LB, size: 12, color: C.white, align: "CENTER" });
      fermer.textAutoResize = "HEIGHT";
      fermer.resize(W - GUT * 2, fermer.height);
      screen.appendChild(fermer);
      fermer.x = GUT; fermer.y = H - 128;
    });

    // ============ 4. Ajouter · Choix du type ============
    // « Carte Vêtement » et « Carte Objet » : noms de calques cibles.
    ecran("Accueil — Ajouter · Choix du type", function (screen) {
      const col = preparer(screen, 40);
      addFill(col, barreRetour("X"));
      addFill(col, titrePage("Tu ajoutes quoi ?", "Les deux se rangent au même endroit"));

      const cartes = frame("Blocs", { dir: "VERTICAL", gap: S.md, px: GUT });
      const choix = [
        ["Carte Vêtement", "Vêtement", "Il rejoint ton dressing : taille, marque, couleur, historique de port.", PIC.tshirt],
        ["Carte Objet", "Objet", "Il rejoint ton inventaire : catégorie, état, rangement précis.", PIC.pants]
      ];
      for (let i = 0; i < choix.length; i++) {
        const c = choix[i];
        const carte = frame(c[0], {
          dir: "HORIZONTAL", gap: S.md, radius: R.md, fill: C.white,
          px: S.md, py: S.md, align: "CENTER", shadow: SHADOW_E1
        });
        carte.appendChild(photoBox(72, 72, R.sm, c[3], C.ink));
        const g = frame("Texte", { dir: "VERTICAL", gap: S.xs });
        g.appendChild(text(c[1], { font: FONT_T, size: 24, color: C.ink, lineHeight: 30 }));
        g.appendChild(para(c[2], 190, { size: 12, color: C.sub, lineHeight: 16 }));
        carte.appendChild(g);
        addFill(cartes, carte);
        try { g.layoutSizingHorizontal = "FILL"; } catch (e) {}
      }
      addFill(col, cartes);

      const blocs = frame("Blocs", { dir: "VERTICAL", px: GUT });
      const n = card("Card/Section/Info", { gap: S.sm });
      n.appendChild(para("Un vêtement peut être prêté et vendu comme un objet. La différence est ce qu'on te demande à l'ajout, et l'endroit où tu le retrouves.",
        UTIL_CARTE, { size: 16, color: C.sub, lineHeight: 22 }));
      addFill(blocs, n);
      addFill(col, blocs);

      const scan = frame("Liste", { dir: "VERTICAL", px: GUT });
      addFill(scan, lienRangee("Scanner à la place", "Photographie, on remplit pour toi"));
      addFill(col, scan);
      finaliser(screen, col);
    });

    // ============ 5. Vêtement · Ajout · Type ============
    ecran("Vêtement — Ajout · Type", function (screen) {
      const col = preparer(screen, 40);
      addFill(col, barreRetour("X"));
      addFill(col, jauge(4, 0));
      addFill(col, titrePage("C'est quoi ?", "Étape 1 sur 4"));

      const types = [
        ["T-shirt", PIC.tshirt], ["Chemise", PIC.tshirt], ["Pull", PIC.coat],
        ["Veste", PIC.jacket], ["Manteau", PIC.coat], ["Pantalon", PIC.pants],
        ["Short", PIC.short], ["Robe", PIC.robe], ["Chaussures", PIC.baskets],
        ["Casquette", PIC.cap], ["Écharpe", PIC.scarf], ["Autre", PIC.cintre]
      ];
      const largeur = Math.floor((W - GUT * 2 - S.md * 2) / 3);
      const g = frame("Grille", {
        dir: "HORIZONTAL", gap: S.md, gapY: S.md, wrap: true, px: GUT, primary: "FIXED"
      });
      for (let i = 0; i < types.length; i++) {
        const t = types[i];
        const actif = i === 0;
        const c = frame("Card/Garment/" + t[0], {
          dir: "VERTICAL", gap: S.sm, w: largeur, radius: R.md,
          fill: actif ? C.primary : C.white, fillOpacity: actif ? 0.12 : 1,
          px: S.sm, py: S.md, align: "CENTER", shadow: actif ? null : SHADOW_E1,
          primary: "AUTO", counter: "FIXED"
        });
        c.appendChild(photoBox(largeur - S.sm * 2, 56, R.sm, t[1], C.ink));
        c.appendChild(para(t[0], largeur - S.sm * 2,
          { font: FONT_LB, size: 12, color: actif ? C.primary : C.ink, align: "CENTER", lineHeight: 16 }));
        g.appendChild(c);
      }
      addFill(col, g);

      barreActions(col, bouton("Continuer", "primary"), null, null,
        "Le type sert à ranger le vêtement dans la bonne catégorie du dressing.");
      finaliser(screen, col);
    });

    // ============ 6. Vêtement · Ajout · Informations ============
    ecran("Vêtement — Ajout · Informations", function (screen) {
      const col = preparer(screen, 40);
      addFill(col, barreRetour());
      addFill(col, jauge(4, 1));
      addFill(col, titrePage("Ton vêtement", "Étape 2 sur 4"));

      const zone = frame("Blocs", { dir: "VERTICAL", px: GUT });
      addFill(zone, zonePhoto(200, PIC.tshirt, "Prendre une photo ou scanner l'étiquette"));
      addFill(col, zone);

      const champs = frame("Champs", { dir: "VERTICAL", gap: S.xl, px: GUT });
      addFill(champs, champSelect("Nom", VET));
      addFill(champs, champSelect("Marque", "Nike"));
      addFill(champs, groupeChips("Taille", ["XS", "S", "M", "L", "XL", "XXL"], ["M"]));
      addFill(champs, champSelect("Couleur", "Noir"));
      // lot 24 : les usages sont des familles de style, à choix multiple
      addFill(champs, groupeChips("Usages (plusieurs choix)",
        ["Travail", "Quotidien", "Sport", "Soirée", "Événement", "Maison"], ["Quotidien", "Sport"]));
      addFill(champs, groupeChips("Style",
        ["Casual", "Streetwear", "Détente", "Fitness", "Smart casual"], ["Streetwear", "Fitness"]));
      addFill(champs, lienRangee("Voir les catégories de style", "Ce que chaque usage exclut"));
      addFill(champs, groupeChips("État",
        ["Neuf", "Très bon état", "Bon état", "Usé"], ["Très bon état"]));
      addFill(col, champs);

      barreActions(col, bouton("Continuer", "primary"), null, null, null);
      finaliser(screen, col);
    });

    // ============ 7. Vêtement · Ajout · Localisation ============
    ecran("Vêtement — Ajout · Localisation", function (screen) {
      const col = preparer(screen, 40);
      addFill(col, barreRetour());
      addFill(col, jauge(4, 2));
      addFill(col, titrePage("Où tu le ranges ?", "Étape 3 sur 4"));

      const fil = frame("Blocs", { dir: "VERTICAL", px: GUT });
      const c = card("Card/Section/Chemin", { gap: S.sm });
      c.appendChild(text("Emplacement choisi", { font: FONT_LB, size: 12, color: C.sub }));
      c.appendChild(para(LOC_VET, UTIL_CARTE, { font: FONT_LB, size: 16, color: C.ink, lineHeight: 22 }));
      addFill(fil, c);
      addFill(col, fil);

      const champs = frame("Champs", { dir: "VERTICAL", gap: S.xl, px: GUT });
      addFill(champs, champSelect("Logement", "Maison principale"));
      addFill(champs, champSelect("Pièce", "Chambre"));
      addFill(champs, champSelect("Rangement", "Armoire"));
      addFill(champs, champSelect("Étagère", "Étagère 2"));
      addFill(col, champs);

      const rec = frame("Section/Recents", { dir: "VERTICAL", gap: S.md });
      addFill(rec, enteteSection("Emplacements récents", null));
      const l = frame("Liste", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(l, lienRangee("Chambre › Armoire › Étagère 2", "18 vêtements rangés ici"));
      addFill(l, lienRangee("Chambre › Penderie", "24 vêtements rangés ici"));
      addFill(rec, l);
      addFill(col, rec);

      barreActions(col, bouton("Continuer", "primary"), null, null, null);
      finaliser(screen, col);
    });

    // ============ 8. Vêtement · Ajout · Vérification ============
    ecran("Vêtement — Ajout · Vérification", function (screen) {
      const col = preparer(screen, 40);
      addFill(col, barreRetour());
      addFill(col, jauge(4, 3));
      addFill(col, titrePage("Vérifie ton vêtement", "Étape 4 sur 4"));

      const zone = frame("Blocs", { dir: "VERTICAL", px: GUT });
      addFill(zone, zonePhoto(200, PIC.tshirt, null));
      addFill(col, zone);

      addFill(col, attributs(["Taille M", "Noir", "Quotidien · Sport", "Très bon état"]));

      const blocs = frame("Blocs", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(blocs, carteSection("Le vêtement", [
        ligneInfo("Nom", VET),
        ligneInfo("Marque", "Nike"),
        ligneInfo("Catégorie", "Hauts")
      ]));
      addFill(blocs, blocLocalisation("Localisation", LOC_VET, null));
      addFill(blocs, carteSection("À l'ajout", [
        ligneInfo("Statut", "Dans ma penderie"),
        ligneInfo("Visible par", "Toi seul")
      ]));
      addFill(col, blocs);

      barreActions(col,
        bouton("Ajouter", "primary"),
        [bouton("Modifier", "secondary")], null, null);
      finaliser(screen, col);
    });

    // ============ 9. Vêtement · Ajout · Confirmation ============
    ecran("Vêtement — Ajout · Confirmation", function (screen) {
      const col = preparer(screen, 40);

      const z = frame("Blocs", { dir: "VERTICAL", px: GUT });
      addFill(z, toastSucces("Vêtement ajouté !", "49 vêtements dans ton dressing."));
      addFill(col, z);

      addFill(col, titrePage(VET, "Dans ma penderie · Chambre"));

      const zone = frame("Blocs", { dir: "VERTICAL", px: GUT });
      addFill(zone, zonePhoto(200, PIC.tshirt, null));
      addFill(col, zone);

      const blocs = frame("Blocs", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(blocs, blocLocalisation("Localisation", LOC_VET, null));
      addFill(blocs, carteSection("Et maintenant", [
        ligneInfo("Le porter", "Il entre dans les suggestions de tenue"),
        ligneInfo("Le prêter", "À un ami, en 3 étapes"),
        ligneInfo("Le vendre", "Visible par tes amis")
      ]));
      addFill(col, blocs);

      barreActions(col,
        bouton("Voir le vêtement", "primary"),
        [bouton("Ajouter un autre vêtement", "secondary")], null, null);
      finaliser(screen, col);
    });

    // ============ 10. Vêtement · Fiche ============
    ecran("Vêtement — Fiche", function (screen) {
      const col = preparer(screen, 40, 0);
      heroVetement(col, VET, "Nike · Hauts · M", "Dans ma penderie", "penderie", PIC.tshirt, "<");
      addFill(col, attributs(["Taille M", "Noir", "Quotidien · Sport", "Très bon état"]));

      const blocs = frame("Blocs", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(blocs, blocLocalisation("Localisation", LOC_VET, "Déplacer le vêtement ›"));
      const h = card("Card/Section/Historique", { gap: S.sm });
      h.appendChild(text("Historique de port", { font: FONT_LB, size: 12, color: C.sub }));
      h.appendChild(para("Porté 12 fois · dernière fois le 8 septembre", UTIL_CARTE,
        { size: 16, color: C.ink, lineHeight: 22 }));
      h.appendChild(text("Voir l'historique ›", { size: 12, color: C.primary }));
      addFill(blocs, h);
      addFill(col, blocs);

      barreActions(col,
        bouton("Prêter", "primary"),
        [bouton("Modifier", "secondary"), bouton("Déplacer", "secondary"), bouton("Vendre", "secondary")],
        "Supprimer ce vêtement", null);
      finaliser(screen, col);
    });

    // ============ 11. Vêtement · Modification ============
    ecran("Vêtement — Modification", function (screen) {
      const col = preparer(screen, 40);
      addFill(col, barreRetour("X"));
      addFill(col, titrePage("Modifier", VET));

      const zone = frame("Blocs", { dir: "VERTICAL", px: GUT });
      addFill(zone, zonePhoto(200, PIC.tshirt, "Changer la photo"));
      addFill(col, zone);

      const champs = frame("Champs", { dir: "VERTICAL", gap: S.xl, px: GUT });
      addFill(champs, champSelect("Nom", VET));
      addFill(champs, champSelect("Marque", "Nike"));
      addFill(champs, groupeChips("Taille", ["XS", "S", "M", "L", "XL", "XXL"], ["M"]));
      addFill(champs, champSelect("Couleur", "Noir"));
      addFill(champs, groupeChips("Usages (plusieurs choix)",
        ["Travail", "Quotidien", "Sport", "Soirée", "Événement", "Maison"], ["Quotidien", "Sport"]));
      addFill(champs, groupeChips("Style",
        ["Casual", "Streetwear", "Détente", "Fitness", "Smart casual"], ["Streetwear", "Fitness"]));
      addFill(champs, groupeChips("État",
        ["Neuf", "Très bon état", "Bon état", "Usé"], ["Bon état"]));
      addFill(col, champs);

      const blocs = frame("Blocs", { dir: "VERTICAL", px: GUT });
      addFill(blocs, blocLocalisation("Localisation", LOC_VET, "Déplacer le vêtement ›"));
      addFill(col, blocs);

      barreActions(col, bouton("Continuer", "primary"), null,
        "Supprimer ce vêtement", null);
      finaliser(screen, col);
    });

    // ============ 12. Vêtement · Modification · Vérification ============
    ecran("Vêtement — Modification · Vérification", function (screen) {
      const col = preparer(screen, 40);
      addFill(col, barreRetour());
      addFill(col, titrePage("Vérifie tes changements", VET));

      const zone = frame("Blocs", { dir: "VERTICAL", px: GUT });
      addFill(zone, zonePhoto(160, PIC.tshirt, null));
      addFill(col, zone);

      const blocs = frame("Blocs", { dir: "VERTICAL", gap: S.md, px: GUT });
      // Ce qui change est isole : une verification qui reliste tout
      // n'aide pas a reperer la modification.
      const ch = card("Card/Section/Changements", { gap: S.md });
      ch.appendChild(text("Ce qui change", { font: FONT_LB, size: 12, color: C.sub }));
      const l1 = frame("Ligne", { dir: "HORIZONTAL", justify: "SPACE_BETWEEN", align: "CENTER" });
      l1.appendChild(text("État", { size: 12, color: C.sub }));
      const v1 = frame("Valeurs", { dir: "HORIZONTAL", gap: S.sm, align: "CENTER" });
      v1.appendChild(text("Très bon état", { size: 12, color: C.sub, opacity: 0.85 }));
      v1.appendChild(text("›", { font: FONT_LB, size: 12, color: C.sub, opacity: 0.85 }));
      v1.appendChild(text("Bon état", { font: FONT_LB, size: 16, color: C.ink }));
      l1.appendChild(v1);
      addFill(ch, l1);
      addFill(blocs, ch);

      addFill(blocs, carteSection("Inchangé", [
        ligneInfo("Nom", VET),
        ligneInfo("Marque", "Nike"),
        ligneInfo("Taille", "M"),
        ligneInfo("Localisation", "Étagère 2")
      ]));
      addFill(col, blocs);

      barreActions(col,
        bouton("Enregistrer", "primary"),
        [bouton("Modifier", "secondary")], null, null);
      finaliser(screen, col);
    });

    // ============ 13. Vêtement · Modification · Confirmation ============
    ecran("Vêtement — Modification · Confirmation", function (screen) {
      const col = preparer(screen, 40, 0);

      const z = frame("Blocs", { dir: "VERTICAL", px: GUT, pt: S.xl });
      addFill(z, toastSucces("Modifications enregistrées", "L'état est passé à « Bon état »."));
      addFill(col, z);

      heroVetement(col, VET, "Nike · Hauts · M", "Dans ma penderie", "penderie", PIC.tshirt, "<");
      addFill(col, attributs(["Taille M", "Noir", "Quotidien · Sport", "Bon état"]));

      const blocs = frame("Blocs", { dir: "VERTICAL", gap: S.md, px: GUT });
      addFill(blocs, blocLocalisation("Localisation", LOC_VET, "Déplacer le vêtement ›"));
      const h = card("Card/Section/Historique", { gap: S.sm });
      h.appendChild(text("Historique de port", { font: FONT_LB, size: 12, color: C.sub }));
      h.appendChild(para("Porté 12 fois · dernière fois le 8 septembre", UTIL_CARTE,
        { size: 16, color: C.ink, lineHeight: 22 }));
      h.appendChild(text("Voir l'historique ›", { size: 12, color: C.primary }));
      addFill(blocs, h);
      addFill(col, blocs);

      barreActions(col,
        bouton("Prêter", "primary"),
        [bouton("Modifier", "secondary"), bouton("Déplacer", "secondary"), bouton("Vendre", "secondary")],
        "Supprimer ce vêtement", null);
      finaliser(screen, col);
    });

    rapport("Lot 14 Final");

  } catch (e) {
    const msg = (e && e.message) ? e.message : String(e);
    console.log("ERREUR GLOBALE : " + msg);
    figma.notify("ERREUR GLOBALE : " + msg, { error: true, timeout: 12000 });
  }
})();
