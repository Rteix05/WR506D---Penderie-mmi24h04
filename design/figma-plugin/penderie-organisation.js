// Penderie — nettoyage et organisation des pages « Maquette » et « Components »
// À coller dans Scripter (Plugins → Scripter) puis ▶ Run. Peut être relancé sans risque.
//
// Ce que fait le script :
//   A. Renomme les 126 frames de « Maquette » au format « Parcours — Écran ».
//   B. Range « Maquette » en 13 Sections Figma (01 → 13), une rangée par sous-parcours,
//      lecture gauche → droite, espacements réguliers, aucun chevauchement.
//   C. Range « Components » en Sections par catégorie, renomme les variantes mal nommées
//      (Message pop « État3 »…), crée le set de variantes « Statut » à partir des
//      pastilles existantes, et signale les doublons stricts sans les supprimer.
//
// Ce qu'il ne fait PAS : aucun contenu d'écran modifié, aucune couleur / typo /
// variable / style modifié, aucun écran créé ou supprimé, aucun lien de prototype
// ni interaction ni transition créé ou modifié. Les Sections ne sont pas des Frames.

const DRY_RUN = false;      // true = rapport seulement, rien n'est modifié
const DO_RENAME = true;
const DO_MAQUETTE = true;
const DO_COMPONENTS = true;

const STAMP = "penderie-organisation"; // marque les titres créés par ce script (relance propre)

// Mise en page (px, lisible à 100 %)
const PAD = 120, TITLE_H = 220, LABEL_H = 70, GAP_X = 100, ROW_GAP = 200, SECTION_GAP = 320;
const CMP_ROW_MAX = 2400, CMP_GAP = 80;

// ───────────────────────── A. Noms ─────────────────────────
const NAMES = {
  "14:1065": "Authentification — Connexion",
  "14:1726": "Authentification — E-mail de bienvenue",
  "14:1277": "Accueil — Tableau de bord",
  "69:6831": "Accueil — Menu d'ajout",
  "75:7871": "Accueil — Ajouter · Choix du type",
  "87:8138": "Objet — Scanner",
  "87:8179": "Objet — Résultat du scan",
  "75:7646": "Objet — Informations",
  "75:7724": "Objet — Localisation",
  "75:7796": "Objet — Vérification",
  "75:7977": "Objet — Confirmation",
  "87:8216": "Objet — Mes objets",
  "72:7184": "Objet — Fiche · Disponible",
  "87:8236": "Objet — Fiche · Prêté",
  "87:8271": "Objet — Fiche · Emprunté",
  "87:8306": "Objet — Statuts",
  "101:9373": "Objet — Déplacer",
  "64:6195": "Logement — Ajout · Type",
  "64:6286": "Logement — Ajout · Informations",
  "64:6362": "Logement — Ajout · Pièces",
  "64:6435": "Logement — Ajout · Vérification",
  "101:9066": "Logement — Mes logements",
  "101:9109": "Logement — Vue logement",
  "101:9152": "Logement — Vue pièce",
  "101:9215": "Rangement — Vue rangement",
  "14:1767": "Rangement — Mes cartons",
  "75:7496": "Rangement — Tous mes cartons",
  "72:7282": "Rangement — Fiche carton",
  "101:9275": "Rangement — Carton · Aperçu",
  "101:9313": "Rangement — Carton · Contenu",
  "14:1594": "Vêtement — Ajout · Type",
  "57:4530": "Vêtement — Ajout · Informations",
  "57:4654": "Vêtement — Ajout · Localisation",
  "55:4422": "Vêtement — Ajout · Vérification",
  "65:6559": "Vêtement — Ajout · Confirmation",
  "106:9507": "Vêtement — Dressing",
  "108:10010": "Vêtement — Catégorie · Hauts",
  "106:9567": "Vêtement — Filtrer",
  "72:7097": "Vêtement — Fiche",
  "106:9650": "Vêtement — Fiche complète",
  "106:9685": "Vêtement — Historique de port",
  "106:9723": "Vêtement — Modification",
  "106:9806": "Vêtement — Modification · Vérification",
  "108:10260": "Vêtement — Modification · Confirmation",
  "108:10303": "Vêtement — Fiche · Prêté",
  "108:10346": "Vêtement — Fiche · En vente",
  "108:10071": "Vêtement — État · Dressing vide",
  "108:10132": "Vêtement — État · Aucun résultat (recherche)",
  "108:10193": "Vêtement — État · Aucun résultat (filtre)",
  "108:10558": "Tenue — Ma tenue",
  "108:10604": "Tenue — Préférences",
  "108:10687": "Tenue — Suggestion",
  "110:10928": "Tenue — Remplacer une pièce",
  "110:10977": "Tenue — Tenue enregistrée",
  "108:10725": "Tenue — Mes tenues",
  "108:10786": "Tenue — État · Dressing insuffisant",
  "108:10799": "Tenue — État · Aucun vêtement compatible",
  "108:10812": "Tenue — État · Aucune tenue enregistrée",
  "95:8468": "Prêt — Choisir un ami",
  "95:8499": "Prêt — Informations",
  "95:8582": "Prêt — Vérification",
  "95:8615": "Prêt — Confirmation",
  "95:8785": "Prêt — Mes prêts · J'ai prêté",
  "95:8845": "Prêt — Mes prêts · J'ai emprunté",
  "95:8667": "Prêt — Retour · Objet rendu ?",
  "95:8750": "Prêt — Retour · Confirmation",
  "110:11158": "Amis — Mes amis",
  "110:11184": "Amis — Ajouter un ami",
  "110:11689": "Amis — Demande envoyée",
  "110:11210": "Amis — Demande reçue",
  "110:11236": "Amis — Profil ami",
  "110:11552": "Amis — État · Aucun ami",
  "110:11274": "Partage — Partager",
  "110:11357": "Partage — Lien de partage",
  "110:11741": "Partage — Lien copié",
  "110:11394": "Partage — Accès invité",
  "110:11437": "Partage — Mes partages",
  "110:11500": "Partage — Détail d'un accès",
  "110:11706": "Partage — Accès révoqué",
  "110:11526": "Partage — Commentaires",
  "110:11565": "Partage — État · Aucun partage",
  "110:11832": "Vente — Informations",
  "110:11915": "Vente — Annonce publiée",
  "110:11955": "Vente — À vendre chez mes amis",
  "110:12016": "Vente — Fiche article",
  "110:12059": "Vente — Confirmation d'achat",
  "110:12105": "Vente — Achat confirmé",
  "111:12249": "Vente — État · Vendu",
  "111:12288": "Vente — État · Retiré",
  "111:12327": "Vente — État · Paiement en attente",
  "111:12364": "Vente — État · Commande terminée",
  "111:12401": "Vente — État · Paiement refusé",
  "111:12473": "Paiement — Récapitulatif",
  "111:12512": "Paiement — Paiement",
  "111:12549": "Paiement — Paiement confirmé",
  "111:12586": "Livraison — Choix de livraison",
  "111:12669": "Livraison — Suivi de commande",
  "111:12732": "Livraison — Remise en main propre",
  "111:13021": "Livraison — Livraison problématique",
  "111:12769": "Paiement — Mes achats",
  "111:12808": "Paiement — Mes ventes",
  "111:12837": "Paiement — Problème de commande",
  "111:12937": "Paiement — Remboursement en cours",
  "111:12979": "Paiement — Remboursement terminé",
  "14:1730": "Compte — Profil",
  "111:13536": "Compte — Mon compte",
  "111:13364": "Compte — Paramètres",
  "111:13427": "Compte — Confidentialité",
  "111:13510": "Compte — Changer de profil",
  "111:13570": "Compte — Profil famille",
  "111:13604": "Compte — Nouveau profil enfant",
  "111:13687": "Compte — Autorisations parentales",
  "111:13128": "Notifications — Liste",
  "111:13191": "Notifications — État · Vide",
  "111:13204": "Recherche — Résultats",
  "111:13264": "Recherche — Filtres",
  "111:13331": "Recherche — État · Aucun résultat",
  "65:6665": "Système — Erreur",
  "111:13854": "Système — Chargement",
  "111:13867": "Système — Inventaire vide",
  "111:13770": "Système — Confirmation · Supprimer un objet",
  "111:13784": "Système — Confirmation · Supprimer un vêtement",
  "111:13798": "Système — Confirmation · Supprimer un carton",
  "111:13812": "Système — Confirmation · Supprimer un logement",
  "111:13826": "Système — Confirmation · Retirer un ami",
  "111:13840": "Système — Confirmation · Retirer un partage",
};

// ───────────────────────── B. Sections « Maquette » ─────────────────────────
// [titre de section, [[libellé de rangée, [IDs dans l'ordre de lecture]], …]]
const SECTIONS = [
  ["01 — AUTHENTIFICATION", [
    ["Connexion", ["14:1065", "14:1726"]],
  ]],
  ["02 — ACCUEIL", [
    ["Tableau de bord et ajout", ["14:1277", "69:6831", "75:7871"]],
  ]],
  ["03 — INVENTAIRE / OBJETS", [
    ["Ajouter un objet", ["87:8138", "87:8179", "75:7646", "75:7724", "75:7796", "75:7977"]],
    ["Inventaire et fiches objet", ["87:8216", "72:7184", "87:8236", "87:8271", "87:8306", "101:9373"]],
  ]],
  ["04 — LOGEMENTS & RANGEMENTS", [
    ["Ajouter un logement", ["64:6195", "64:6286", "64:6362", "64:6435"]],
    ["Parcourir : logement → pièce → rangement → carton", ["101:9066", "101:9109", "101:9152", "101:9215", "101:9275", "101:9313"]],
    ["Cartons", ["14:1767", "75:7496", "72:7282"]],
  ]],
  ["05 — DRESSING / VÊTEMENTS", [
    ["Ajouter un vêtement", ["14:1594", "57:4530", "57:4654", "55:4422", "65:6559"]],
    ["Dressing et fiche vêtement", ["106:9507", "108:10010", "106:9567", "72:7097", "106:9650", "106:9685"]],
    ["Modifier un vêtement", ["106:9723", "106:9806", "108:10260"]],
    ["Statuts et états", ["108:10303", "108:10346", "108:10071", "108:10132", "108:10193"]],
  ]],
  ["06 — SUGGESTIONS DE TENUES", [
    ["Composer une tenue", ["108:10558", "108:10604", "108:10687", "110:10928", "110:10977", "108:10725"]],
    ["États", ["108:10786", "108:10799", "108:10812"]],
  ]],
  ["07 — PRÊTS", [
    ["Prêter un objet", ["95:8468", "95:8499", "95:8582", "95:8615"]],
    ["Suivi et retour", ["95:8785", "95:8845", "95:8667", "95:8750"]],
  ]],
  ["08 — AMIS", [
    ["Mes amis", ["110:11158", "110:11184", "110:11689", "110:11210", "110:11236", "110:11552"]],
  ]],
  ["09 — PARTAGE PRIVÉ", [
    ["Partager", ["110:11274", "110:11357", "110:11741", "110:11394"]],
    ["Gérer mes partages", ["110:11437", "110:11500", "110:11706", "110:11526", "110:11565"]],
  ]],
  ["10 — VENTE", [
    ["Vendeur", ["110:11832", "110:11915"]],
    ["Acheteur", ["110:11955", "110:12016", "110:12059", "110:12105"]],
    ["États de vente", ["111:12249", "111:12288", "111:12327", "111:12364", "111:12401"]],
  ]],
  ["11 — PAIEMENT / LIVRAISON", [
    ["Paiement", ["111:12473", "111:12512", "111:12549"]],
    ["Livraison", ["111:12586", "111:12669", "111:12732", "111:13021"]],
    ["Historique et problèmes de commande", ["111:12769", "111:12808", "111:12837", "111:12937", "111:12979"]],
  ]],
  ["12 — COMPTE / PARAMÈTRES", [
    ["Compte et paramètres", ["14:1730", "111:13536", "111:13364", "111:13427"]],
    ["Profils", ["111:13510", "111:13570", "111:13604", "111:13687"]],
  ]],
  ["13 — NOTIFICATIONS / RECHERCHE / ÉTATS SYSTÈME", [
    ["Notifications", ["111:13128", "111:13191"]],
    ["Recherche", ["111:13204", "111:13264", "111:13331"]],
    ["Confirmations", ["111:13770", "111:13784", "111:13798", "111:13812", "111:13826", "111:13840"]],
    ["États système", ["65:6665", "111:13854", "111:13867"]],
  ]],
];

// ───────────────────────── C. Catégories « Components » ─────────────────────────
const CMP_CATEGORIES = [
  "Navigation", "Boutons", "Champs / formulaires", "Cards", "États",
  "Fiches", "Modales / confirmations", "Autres composants réutilisables",
];
// Ordre de test (le premier qui correspond gagne)
const CMP_RULES = [
  ["Modales / confirmations", /message pop|toast|modale|modal|dialog|confirmation|État=(Succès|Erreur|État\d)/i],
  ["États", /^Statut$|Statut=|badge|pastille/i],
  ["Navigation", /(^|[\s/])Nav([\s/]|$)|navigation|tab ?bar|menu/i],
  ["Boutons", /bouton|button|Style=(Plein|Contour)|Add activity|FAB/i],
  ["Champs / formulaires", /champ|formulaire|input|select|chip/i],
  ["Cards", /Vetements|Type=Tshirt|Player=|Friends|Personna|card|carte/i],
  ["Fiches", /fiche/i],
];
const STATUT_LABELS = ["Disponible", "Prêté", "Emprunté", "À vendre", "En vente", "Vendu", "Perdu"];
const STATUT_SOURCE = "87:8306"; // écran « Objet — Statuts » : toutes les pastilles y sont
const COLOR_KIND = { "117D6F": "Succès", "DC2626": "Erreur", "D31D66": "Info", "831297": "Emprunt", "475569": "Neutre" };

// ═════════════════════════ Outils ═════════════════════════
const log = [];
const note = s => { log.push(s); };
if (figma.loadAllPagesAsync) await figma.loadAllPagesAsync();

const pageMaq = figma.root.children.find(p => p.name.trim() === "Maquette");
const pageCmp = figma.root.children.find(p => /^components?$/i.test(p.name.trim()))
  || figma.root.children.find(p => /component/i.test(p.name));
if (!pageMaq) throw new Error("Page « Maquette » introuvable");

const hex = c => [c.r, c.g, c.b].map(v => Math.round(v * 255).toString(16).padStart(2, "0")).join("").toUpperCase();

// Variables couleur existantes (réutilisées pour les titres, aucune créée)
const colorVars = figma.variables ? await figma.variables.getLocalVariablesAsync("COLOR") : [];
function findVar(h) {
  for (const v of colorVars) {
    const val = Object.values(v.valuesByMode)[0];
    if (val && typeof val === "object" && "r" in val && hex(val) === h) return v;
  }
  return null;
}
function paint(h) {
  const n = i => parseInt(h.slice(i, i + 2), 16) / 255;
  let p = { type: "SOLID", color: { r: n(0), g: n(2), b: n(4) } };
  const v = findVar(h);
  if (v) p = figma.variables.setBoundVariableForPaint(p, "color", v);
  return [p];
}
// Police du projet (Luciole) — aucun titre si elle n'est pas disponible, pas de police de secours
async function font(style) {
  try { const f = { family: "Luciole", style }; await figma.loadFontAsync(f); return f; } catch (e) { return null; }
}
const FONT_TITLE = (await font("Bold")) || (await font("Regular"));
const FONT_LABEL = await font("Regular");
if (!FONT_TITLE) note("⚠ Police Luciole indisponible : seuls les noms de Sections servent de titres.");

function makeText(parent, s, f, size, h, x, y) {
  if (!f || DRY_RUN) return null;
  const t = figma.createText();
  t.fontName = f; t.characters = s; t.fontSize = size; t.fills = paint(h);
  t.textAutoResize = "WIDTH_AND_HEIGHT";
  t.setPluginData(STAMP, "1");
  parent.appendChild(t); t.x = x; t.y = y;
  return t;
}
// Section existante (relance) ou nouvelle ; on retire seulement les titres posés par ce script
function getSection(page, name) {
  let s = page.children.find(n => n.type === "SECTION" && n.name === name);
  if (!s) { s = figma.createSection(); s.name = name; page.appendChild(s); }
  for (const c of [...s.children]) if (c.getPluginData(STAMP)) c.remove();
  return s;
}
function removeEmptySections(page, keep) {
  for (const n of [...page.children]) {
    if (n.type === "SECTION" && !keep.has(n.id) && n.children.length === 0) { n.remove(); note(`Section vide retirée : « ${n.name} »`); }
  }
}

// ═════════════════════════ A. Renommage ═════════════════════════
const maqFrames = pageMaq.findAll(n => n.type === "FRAME" && (n.parent.type === "PAGE" || n.parent.type === "SECTION"));
const byId = new Map(maqFrames.map(f => [f.id, f]));

function titleOf(frame) {
  const texts = frame.findAll(n => n.type === "TEXT" && n.visible);
  const rel = t => t.absoluteTransform[1][2] - frame.absoluteTransform[1][2];
  const size = t => (typeof t.fontSize === "number" ? t.fontSize : 0);
  const big = texts.filter(t => size(t) >= 28).sort((a, b) => rel(a) - rel(b))[0];
  const header = texts.find(t => rel(t) < 60 && size(t) >= 20);
  return (big || header) ? (big || header).characters.replace(/\s+/g, " ").trim() : frame.name;
}

let renamed = 0;
if (DO_RENAME) {
  for (const f of maqFrames) {
    const target = NAMES[f.id] || (/^À classer — /.test(f.name) ? f.name : "À classer — " + titleOf(f));
    if (f.name !== target) { if (!DRY_RUN) f.name = target; renamed++; }
    if (!NAMES[f.id]) note(`Frame non prévue ${f.id} → « ${target} »`);
  }
}

// ═════════════════════════ B. Organisation « Maquette » ═════════════════════════
const sectionsMaq = [];
if (DO_MAQUETTE) {
  const listed = new Set(SECTIONS.flatMap(([, rows]) => rows.flatMap(([, ids]) => ids)));
  const extra = maqFrames.filter(f => !listed.has(f.id));
  const plan = extra.length ? [...SECTIONS, ["À CLASSER — écrans non prévus", [["À vérifier", extra.map(f => f.id)]]]] : SECTIONS;

  const flowsBefore = pageMaq.flowStartingPoints ? [...pageMaq.flowStartingPoints] : [];
  let cursorY = 0;
  for (const [title, rows] of plan) {
    const resolved = rows.map(([label, ids]) => [label, ids.map(id => byId.get(id)).filter(Boolean)]).filter(r => r[1].length);
    if (!resolved.length) { note(`Section « ${title} » : aucun écran trouvé`); continue; }
    if (DRY_RUN) { note(`[plan] ${title} : ${resolved.map(([l, fs]) => `${l} (${fs.length})`).join(" · ")}`); continue; }

    const sec = getSection(pageMaq, title);
    makeText(sec, title, FONT_TITLE, 72, "1A1E24", PAD, 70);
    let y = TITLE_H, maxRight = 0;
    for (const [label, frames] of resolved) {
      makeText(sec, label, FONT_LABEL, 32, "475569", PAD, y);
      const top = y + LABEL_H;
      let x = PAD, rowH = 0;
      for (const f of frames) {
        sec.appendChild(f);          // déplacement uniquement : contenu et liens intacts
        f.x = x; f.y = top;
        x += f.width + GAP_X; rowH = Math.max(rowH, f.height);
      }
      maxRight = Math.max(maxRight, x - GAP_X);
      y = top + rowH + ROW_GAP;
    }
    sec.resizeWithoutConstraints(Math.max(maxRight + PAD, 1800), y - ROW_GAP + PAD);
    sec.x = 0; sec.y = cursorY;
    cursorY += sec.height + SECTION_GAP;
    sectionsMaq.push(sec);
  }
  if (!DRY_RUN) {
    removeEmptySections(pageMaq, new Set(sectionsMaq.map(s => s.id)));
    // Sécurité prototype : les points de départ de flow ne doivent pas bouger
    if (pageMaq.flowStartingPoints && pageMaq.flowStartingPoints.length < flowsBefore.length) {
      try { pageMaq.flowStartingPoints = flowsBefore; note("Points de départ de flow restaurés."); }
      catch (e) { note("⚠ Des points de départ de flow ont changé : à vérifier dans l'onglet Prototype."); }
    }
  }
}

// ═════════════════════════ C. Organisation « Components » ═════════════════════════
const cmpReport = { moved: {}, renamedVariants: [], duplicates: [], statut: "" };

// Signature stricte (structure + couleurs + textes) pour repérer les vrais doublons
function sig(n) {
  const col = ps => (Array.isArray(ps) ? ps.filter(p => p.type === "SOLID").map(p => hex(p.color)).join("/") : "");
  const own = [n.type, Math.round(n.width || 0), Math.round(n.height || 0), col(n.fills), col(n.strokes),
    n.type === "TEXT" ? n.characters : ""].join(",");
  const kids = "children" in n ? n.children.map(sig).join(";") : "";
  return `${own}[${kids}]`;
}
async function instanceCount(n) {
  const comps = n.type === "COMPONENT_SET" ? n.children.filter(c => c.type === "COMPONENT") : n.type === "COMPONENT" ? [n] : [];
  let k = 0;
  for (const c of comps) k += (c.getInstancesAsync ? await c.getInstancesAsync() : c.instances).length;
  return k;
}
function strokeKind(n) {
  const all = [n, ...("findAll" in n ? n.findAll(() => true) : [])];
  for (const x of all) {
    for (const p of (Array.isArray(x.strokes) ? x.strokes : [])) if (p.type === "SOLID" && COLOR_KIND[hex(p.color)]) return COLOR_KIND[hex(p.color)];
  }
  return null;
}
const textCount = n => ("findAll" in n ? n.findAll(x => x.type === "TEXT" && x.visible).length : 0);

if (DO_COMPONENTS && pageCmp) {
  // 1) Éléments à ranger (y compris ceux déjà dans des Sections)
  const items = [];
  for (const n of pageCmp.children) {
    if (n.type === "SECTION") items.push(...n.children.filter(c => !c.getPluginData(STAMP)));
    else items.push(n);
  }

  // 2) Variantes mal nommées de « Message pop » : État3/État4… → nom d'état réel
  for (const set of items.filter(n => n.type === "COMPONENT_SET")) {
    const used = new Set(set.children.map(c => c.name));
    for (const v of set.children) {
      const m = v.name.match(/^(État)=(État\d+)$/);
      if (!m) continue;
      const kind = strokeKind(v);
      if (!kind) { note(`Variante « ${set.name} / ${v.name} » : état non identifiable, nom conservé`); continue; }
      let value = kind + (textCount(v) > 1 ? " + détail" : "");
      let candidate = `${m[1]}=${value}`, i = 2;
      while (used.has(candidate)) candidate = `${m[1]}=${value} ${i++}`;
      cmpReport.renamedVariants.push(`${set.name} : ${v.name} → ${candidate}`);
      if (!DRY_RUN) { used.delete(v.name); v.name = candidate; used.add(candidate); }
    }
  }
  // Composants isolés au nom identique (ex. deux « Message pop/État3 ») → nom selon l'état réel
  const singles = items.filter(n => n.type === "COMPONENT");
  const nameCount = {};
  for (const c of singles) nameCount[c.name] = (nameCount[c.name] || 0) + 1;
  const takenNames = new Set(singles.map(c => c.name));
  for (const c of singles.filter(c => nameCount[c.name] > 1)) {
    const kind = strokeKind(c);
    if (!kind) continue;
    const base = c.name.includes("/") ? c.name.replace(/\/[^/]*$/, "/" + kind) : `${c.name} ${kind}`;
    let candidate = base, i = 2;
    while (takenNames.has(candidate)) candidate = `${base} ${i++}`;
    cmpReport.renamedVariants.push(`${c.name} (${c.id}) → ${candidate}`);
    if (!DRY_RUN) { c.name = candidate; takenNames.add(candidate); }
  }

  // 3) Set « Statut » à partir des pastilles existantes (copie à l'identique, rien n'est redessiné)
  const hasStatut = pageCmp.findAll(n => n.type === "COMPONENT_SET" && n.name === "Statut").length > 0;
  if (hasStatut) cmpReport.statut = "déjà présent, conservé";
  else {
    const src = byId.get(STATUT_SOURCE);
    const pools = [src, ...maqFrames].filter(Boolean);
    const pills = [];
    for (const label of STATUT_LABELS) {
      let found = null;
      for (const scr of pools) {
        found = scr.findOne(n => n.type === "TEXT" && n.characters.trim() === label && n.parent.type === "FRAME"
          && typeof n.parent.cornerRadius === "number" && n.parent.cornerRadius > 0 && n.parent.children.length <= 2);
        if (found) break;
      }
      if (found) pills.push([label, found.parent]);
    }
    if (pills.length >= 2 && !DRY_RUN) {
      const comps = pills.map(([label, pill]) => {
        const copy = pill.clone();
        pageCmp.appendChild(copy);
        const comp = figma.createComponentFromNode(copy);
        comp.name = `Statut=${label}`;
        return comp;
      });
      const set = figma.combineAsVariants(comps, pageCmp);
      set.name = "Statut";
      set.layoutMode = "HORIZONTAL"; set.itemSpacing = 16;
      set.paddingLeft = set.paddingRight = set.paddingTop = set.paddingBottom = 24;
      set.primaryAxisSizingMode = "AUTO"; set.counterAxisSizingMode = "AUTO";
      items.push(set);
    }
    cmpReport.statut = pills.length >= 2 ? `créé (${pills.map(p => p[0]).join(", ")})` : "pastilles introuvables, non créé";
  }

  // 4) Doublons stricts : signalés + mis à part s'ils ne sont utilisés nulle part (jamais supprimés)
  const groups = {};
  for (const n of items.filter(n => n.type === "COMPONENT" || n.type === "COMPONENT_SET")) {
    const s = sig(n); (groups[s] = groups[s] || []).push(n);
  }
  const parked = new Set();
  for (const g of Object.values(groups).filter(g => g.length > 1)) {
    const counts = [];
    for (const n of g) counts.push([n, await instanceCount(n)]);
    counts.sort((a, b) => b[1] - a[1]);
    const [keep, ...rest] = counts;
    for (const [n, k] of rest) {
      cmpReport.duplicates.push(`« ${n.name} » (${n.id}, ${k} instance(s)) = doublon de « ${keep[0].name} » (${keep[0].id}, ${keep[1]} instance(s))`);
      if (k === 0) parked.add(n.id);
    }
  }

  // 5) Classement par catégorie
  const cat = n => {
    if (parked.has(n.id)) return "À vérifier — doublons non utilisés";
    if (n.type !== "COMPONENT" && n.type !== "COMPONENT_SET") return "Hors composants (conservés)";
    const text = n.type === "COMPONENT_SET" ? `${n.name} ${n.children.map(c => c.name).join(" ")}` : n.name;
    for (const [c, re] of CMP_RULES) if (re.test(text)) return c;
    return "Autres composants réutilisables";
  };
  const buckets = {};
  for (const n of items) (buckets[cat(n)] = buckets[cat(n)] || []).push(n);
  const order = [...CMP_CATEGORIES, "Hors composants (conservés)", "À vérifier — doublons non utilisés"];

  const sectionsCmp = [];
  let cursorY = 0;
  for (const name of order) {
    const nodes = buckets[name];
    if (!nodes || !nodes.length) continue;
    cmpReport.moved[name] = nodes.map(n => n.name);
    if (DRY_RUN) continue;
    const sec = getSection(pageCmp, name);
    makeText(sec, name, FONT_TITLE, 56, "1A1E24", PAD, 60);
    let x = PAD, y = 200, rowH = 0, maxRight = 0;
    for (const n of nodes) {
      if (x > PAD && x + n.width > PAD + CMP_ROW_MAX) { x = PAD; y += rowH + CMP_GAP; rowH = 0; }
      sec.appendChild(n); n.x = x; n.y = y;
      x += n.width + CMP_GAP; rowH = Math.max(rowH, n.height); maxRight = Math.max(maxRight, x - CMP_GAP);
    }
    sec.resizeWithoutConstraints(Math.max(maxRight + PAD, 1200), y + rowH + PAD);
    sec.x = 0; sec.y = cursorY; cursorY += sec.height + 200;
    sectionsCmp.push(sec);
  }
  if (!DRY_RUN) removeEmptySections(pageCmp, new Set(sectionsCmp.map(s => s.id)));
} else if (DO_COMPONENTS) note("⚠ Page « Components » introuvable.");

// ═════════════════════════ Rapport ═════════════════════════
const names = maqFrames.map(f => (DRY_RUN ? (NAMES[f.id] || f.name) : f.name));
const dupNames = names.filter((n, i) => names.indexOf(n) !== i);
print(`${DRY_RUN ? "[SIMULATION] " : ""}Maquette : ${maqFrames.length} frames · ${renamed} renommées · ${sectionsMaq.length} sections`);
print(`Noms en double : ${dupNames.length ? [...new Set(dupNames)].join(" | ") : "aucun"}`);
print("");
print("Components :");
for (const [k, v] of Object.entries(cmpReport.moved)) print(`  ${k} (${v.length}) : ${v.join(", ")}`);
print(`  Variantes renommées : ${cmpReport.renamedVariants.length ? "\n    " + cmpReport.renamedVariants.join("\n    ") : "aucune"}`);
print(`  Set « Statut » : ${cmpReport.statut}`);
print(`  Doublons stricts : ${cmpReport.duplicates.length ? "\n    " + cmpReport.duplicates.join("\n    ") : "aucun"}`);
if (log.length) { print(""); for (const l of log) print(l); }

if (!DRY_RUN && figma.currentPage === pageMaq && sectionsMaq.length) figma.viewport.scrollAndZoomIntoView(sectionsMaq);
figma.notify(DRY_RUN ? "Simulation terminée — voir le rapport" : `Organisation terminée : ${sectionsMaq.length} sections Maquette, ${renamed} frames renommées`);
