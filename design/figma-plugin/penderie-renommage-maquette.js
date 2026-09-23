// Penderie — renommage des frames de la page « Maquette »
// À coller dans Scripter (Plugins → Scripter) puis ▶ Run.
//
// Ce script NE FAIT QUE renommer les frames de premier niveau de « Maquette ».
// Aucun contenu, position, composant, variable, style ou prototype n'est modifié.
//
// 1. Nom explicite par ID (chaque écran a été identifié à partir de son contenu).
// 2. Si une frame n'est pas dans la table (écran ajouté à la main entre-temps),
//    le script lit son titre d'en-tête et son titre principal pour proposer
//    « À classer — <titre> » : rien n'est laissé avec un nom générique.
// 3. Contrôle final : noms vides, génériques ou en double → listés dans le rapport.

const DRY_RUN = false; // true = affiche le rapport sans rien renommer

const NAMES = {
  // 01 — Authentification
  "14:1065": "Authentification — Connexion",
  "14:1726": "Authentification — E-mail de bienvenue",

  // 02 — Accueil
  "14:1277": "Accueil — Tableau de bord",
  "69:6831": "Accueil — Menu d'ajout",
  "75:7871": "Accueil — Ajouter · Choix du type",

  // 03 — Inventaire / Objets
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

  // 04 — Logements & rangements
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

  // 05 — Dressing / Vêtements
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

  // 06 — Suggestions de tenues
  "108:10558": "Tenue — Ma tenue",
  "108:10604": "Tenue — Préférences",
  "108:10687": "Tenue — Suggestion",
  "110:10928": "Tenue — Remplacer une pièce",
  "110:10977": "Tenue — Tenue enregistrée",
  "108:10725": "Tenue — Mes tenues",
  "108:10786": "Tenue — État · Dressing insuffisant",
  "108:10799": "Tenue — État · Aucun vêtement compatible",
  "108:10812": "Tenue — État · Aucune tenue enregistrée",

  // 07 — Prêts
  "95:8468": "Prêt — Choisir un ami",
  "95:8499": "Prêt — Informations",
  "95:8582": "Prêt — Vérification",
  "95:8615": "Prêt — Confirmation",
  "95:8785": "Prêt — Mes prêts · J'ai prêté",
  "95:8845": "Prêt — Mes prêts · J'ai emprunté",
  "95:8667": "Prêt — Retour · Objet rendu ?",
  "95:8750": "Prêt — Retour · Confirmation",

  // 08 — Amis
  "110:11158": "Amis — Mes amis",
  "110:11184": "Amis — Ajouter un ami",
  "110:11689": "Amis — Demande envoyée",
  "110:11210": "Amis — Demande reçue",
  "110:11236": "Amis — Profil ami",
  "110:11552": "Amis — État · Aucun ami",

  // 09 — Partage privé
  "110:11274": "Partage — Partager",
  "110:11357": "Partage — Lien de partage",
  "110:11741": "Partage — Lien copié",
  "110:11394": "Partage — Accès invité",
  "110:11437": "Partage — Mes partages",
  "110:11500": "Partage — Détail d'un accès",
  "110:11706": "Partage — Accès révoqué",
  "110:11526": "Partage — Commentaires",
  "110:11565": "Partage — État · Aucun partage",

  // 10 — Vente
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

  // 11 — Paiement / Livraison
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

  // 12 — Compte / Paramètres
  "14:1730": "Compte — Profil",
  "111:13536": "Compte — Mon compte",
  "111:13364": "Compte — Paramètres",
  "111:13427": "Compte — Confidentialité",
  "111:13510": "Compte — Changer de profil",
  "111:13570": "Compte — Profil famille",
  "111:13604": "Compte — Nouveau profil enfant",
  "111:13687": "Compte — Autorisations parentales",

  // 13 — Notifications / Recherche / États système
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

// Anciens noms hérités des clones : s'il en reste un après renommage, c'est une erreur.
const GENERIC = [
  /^Frame \d+$/i, /^Ajouter · Choix$/, /^Fiche (objet|vêtement|carton)$/,
  /^Tous mes cartons$/, /^confirmation (success|error)$/i,
  /^Ajouter un (objet|vêtement|logement) · \d/,
];

const page = figma.root.children.find(p => p.name === "Maquette");
if (!page) throw new Error("Page « Maquette » introuvable");
await page.loadAsync?.();

// Titre lisible d'une frame : en-tête (texte ≥ 20 px dans les 60 px du haut)
// puis grand titre (≥ 28 px). Sert au repli et au rapport.
function readTitles(frame) {
  const texts = frame.findAll(n => n.type === "TEXT" && n.visible);
  const rel = t => t.absoluteTransform[1][2] - frame.absoluteTransform[1][2];
  const size = t => (typeof t.fontSize === "number" ? t.fontSize : 0);
  const header = texts.find(t => rel(t) < 60 && size(t) >= 20);
  const big = texts.filter(t => size(t) >= 28).sort((a, b) => rel(a) - rel(b))[0];
  return {
    header: header ? header.characters.trim() : "",
    title: big ? big.characters.replace(/\s+/g, " ").trim() : "",
  };
}

const frames = page.children.filter(n => n.type === "FRAME");
const report = [];
const unmapped = [];

for (const f of frames) {
  const before = f.name;
  let after = NAMES[f.id];
  if (!after) {
    const { header, title } = readTitles(f);
    after = "À classer — " + (title || header || before);
    unmapped.push(`${f.id}  « ${before} » → « ${after} »`);
  }
  if (!DRY_RUN && after !== before) f.name = after;
  report.push({ id: f.id, before, after });
}

// Contrôles
const counts = {};
for (const r of report) counts[r.after] = (counts[r.after] || 0) + 1;
const dupes = Object.keys(counts).filter(k => counts[k] > 1);
const stillGeneric = report.filter(r => GENERIC.some(re => re.test(r.after)));
const missingIds = Object.keys(NAMES).filter(id => !frames.some(f => f.id === id));

print(`${DRY_RUN ? "[SIMULATION] " : ""}${frames.length} frames analysées sur « Maquette »`);
print(`Renommées : ${report.filter(r => r.before !== r.after).length}`);
print(`Doublons de nom : ${dupes.length ? dupes.join(" | ") : "aucun"}`);
print(`Noms encore génériques : ${stillGeneric.length ? stillGeneric.map(r => r.id).join(", ") : "aucun"}`);
print(`Frames non prévues (nom déduit du contenu) : ${unmapped.length ? "\n  " + unmapped.join("\n  ") : "aucune"}`);
print(`IDs de la table absents de la page : ${missingIds.length ? missingIds.join(", ") : "aucun"}`);
print("—");
for (const r of report) print(`${r.id}  ${r.before}  →  ${r.after}`);

figma.notify(`Maquette : ${report.filter(r => r.before !== r.after).length} frames renommées · doublons : ${dupes.length}`);
