// ═════════ Écrans · 1) Authentification · 2) Accueil · 3-4) Inventaire / objets ═════════
// Chaque écran = { id, group, top, tab, fab, footer, toast, body[] }. Les libellés des zones
// cliquables reprennent ceux de la V1 (ou les déclarent en alias) pour rebrancher le prototype.
const SPECS = [];
const P = (id, group, spec) => SPECS.push({ id, group, ...spec });
const B = (l, t = "Primary", o = {}) => ({ l, t, ...o });
const LINK = {}; // nouveaux éléments d'UI → écran EXISTANT (appliqué seulement si aucune interaction n'a été rebranchée)

// ── 1. Authentification ──
P("14:1065", "auth", { body: [
  { spacer: 24 }, { logo: true },
  { greet: "Penderie", sub: "Ranger, retrouver et partager tout ce que tu possèdes." },
  { fields: [{ label: "E-mail", value: "mathis@exemple.fr" }, { label: "Mot de passe", value: "••••••••" }] },
  { actions: [B("Se connecter", "Primary", { alias: ["SE CONNECTER"] })] },
  { link: "Pas encore de compte ? Créer un compte", center: true, alias: ["S’INSCRIRE"] },
  { text: "Comptes de démonstration", kind: "label", align: "CENTER" },
  { list: [
    { t: "Continuer comme Fabien", s: "Compte pré-existant", av: 1, alias: ["SE CONNECTER COMME FABIEN"] },
    { t: "Continuer comme Brice", s: "Compte pré-existant", av: 2, alias: ["SE CONNECTER COMME BRICE"] },
  ] },
] });

// ── 2. Accueil (utilisé aussi par les écrans « accueil + confirmation ») ──
function home(o = {}) {
  return { tab: 0, toast: o.toast, gap: SP.x3, body: [
    { homeHeader: { greet: "Bonjour Mathis", sub: "Ta penderie · 128 objets · 48 vêtements" } },
    ...(o.lead || []),
    { quick: [{ l: "Scanner", s: "Une photo, une fiche", ic: "scan" }, { l: "Ajouter", s: "Objet, vêtement, logement", ic: "plus", alias: ["fab"] }] },
    { h: "Ma penderie" },
    { tiles: [
      { t: "Inventaire", s: "128 objets", photos: [["drill", "vert"], ["camera", "rose"], ["lamp", "gris"]], alias: ["Ma penderie"] },
      { t: "Dressing", s: "48 vêtements", photos: [["tshirt", "rose"], ["jacket", "prune"], ["shoe", "gris"]] },
    ] },
    { h: "Récemment ajoutés", more: "Voir tout" },
    { carousel: [
      { t: "T-shirt Nike", m: "Chambre · Armoire", g: "tshirt", tone: "rose", st: "Nouveau", badge: "Aujourd'hui" },
      { t: "Veste en jean", m: "Entrée · hier", g: "jacket", tone: "prune" },
      { t: "Pantalon noir", m: "Chambre · il y a 3 j", g: "pants", tone: "gris" },
    ] },
    { h: "Prêts en cours", more: "4 prêtés", alias: [] },
    { list: [
      { t: "Perceuse Bosch", s: "Chez Thomas · retour le 20 sept.", ph: "drill", tone: "vert", st: "Prêté", alias: ["128 articles · 4 prêtés"] },
      { t: "Casque JBL", s: "Chez Marie · devait revenir le 5 sept.", ph: "headphones", tone: "gris", st: "En retard" },
    ] },
    { h: "Ta tenue du jour" },
    { list: [{ t: "Ta tenue du jour", s: "Composée avec ton dressing · 14 °C", ic: "sparkle" }] },
    { h: "Chez mes amis" },
    { list: [
      { t: "Voir la Penderie de mes amis", s: "12 articles à vendre, en privé", ic: "tag" },
      { t: "Mes amis", s: "25 amis · 1 demande reçue", ic: "users", alias: ["Amis : 25"] },
      { t: "Mes cartons", s: "13 cartons actifs", ic: "box", alias: ["13 Cartons Actifs"] },
    ] },
  ] };
}
LINK["14:1277"] = { "Scanner": "87:8138", "Dressing": "106:9507", "Perceuse Bosch": "87:8236", "Casque JBL": "95:8785", "Ta tenue du jour": "108:10558", "Voir tout": "87:8216", "4 prêtés": "95:8785" };
P("14:1277", "accueil", home());
P("69:6831", "accueil", { ...home(), sheet: { title: "Ajouter", options: [
  { t: "Vêtements et Objets", s: "Choisis le type, on s'occupe du formulaire", ic: "hanger" },
  { t: "Carton", s: "Regroupe des objets dans un contenant", ic: "box" },
  { t: "Logement", s: "Maison, appartement, garde-meuble…", ic: "house" },
  { t: "Scanner", s: "Une photo suffit pour créer la fiche", ic: "scan" },
] } });
P("75:7871", "accueil", { top: { title: "Ajouter", close: true }, body: [
  { title: "Qu'est-ce que tu ajoutes ?", sub: "Choisis le type pour avoir le bon formulaire." },
  { tiles: [
    { t: "Vêtement", s: "Habits, chaussures, accessoires", ic: "hanger" },
    { t: "Objet", s: "Meubles, électronique, autre", ic: "box" },
  ] },
] });

// ── 3. Ajout d'un objet ──
P("87:8138", "objets", { dark: true, bleed: true, gap: SP.xxl, top: { title: "Scanner un objet", close: true }, body: [
  { camera: { hint: "Place l'objet dans le cadre" } },
  { shutter: { main: "Prendre une photo", left: "Importer une photo", right: "Ajouter manuellement" } },
] });
P("87:8179", "objets", { top: { title: "Résultat du scan" }, footer: [B("Modifier", "Tertiary"), B("Continuer")], body: [
  { hero: { g: "drill", tone: "vert", h: 260, st: "Info", badge: "Détecté automatiquement", over: "Objet détecté", title: "Perceuse Bosch", sub: "Outils · Bosch" } },
  { kv: [["Modèle", "Perceuse-visseuse sans fil"], ["Couleur", "Verte"], ["Catégorie", "Outils"]], label: "Informations détectées" },
  { callout: { type: "Info", t: "À compléter par toi", s: "État · Localisation · Notes" } },
] });
const objetForm = (step, title, sub, body, footer) => ({ top: { title: "Ajouter un objet" }, footer, body: [{ progress: step }, { title, sub }, ...body] });
P("75:7646", "objets", objetForm("1/3", "Ton objet", "Un nom suffit pour commencer, tu pourras compléter plus tard.", [
  { photoPick: { t: "Ajouter une photo", s: "optionnel" } },
  { fields: [{ label: "Nom", value: "Appareil photo Canon", state: "Focus" }, { label: "Catégorie", value: "Électronique" }, { label: "Description — optionnel", value: "Canon EOS 2000D + sacoche" }] },
], [B("Annuler", "Tertiary"), B("Continuer")]));
P("75:7724", "objets", objetForm("2/3", "Où le ranges-tu ?", null, [
  { callout: { type: "Info", t: "Il sera rangé ici", s: "Maison principale › Bureau › Étagère haute" } },
  { fields: [{ label: "Logement", value: "Maison principale" }, { label: "Pièce", value: "Bureau" }, { label: "Rangement (meuble, étagère…)", value: "Étagère haute", state: "Focus" }, { label: "Conteneur (facultatif)", value: "Aucun · choisir un carton" }] },
], [B("Retour", "Tertiary"), B("Continuer")]));
P("75:7796", "objets", objetForm("3/3", "Vérifie ton objet", null, [
  { hero: { g: "camera", tone: "rose", h: 200, st: "Disponible", title: "Appareil photo Canon", sub: "Électronique" } },
  { kv: [["Description", "Canon EOS 2000D + sacoche"], ["Catégorie", "Électronique"]] },
  { loc: { path: "Maison principale › Bureau › Étagère haute" } },
], [B("Modifier", "Tertiary"), B("Ajouter cet objet")]));
P("75:7977", "objets", home({ toast: { type: "Succès", title: "Objet ajouté !", text: "Il est maintenant dans ta penderie." } }));

// ── 4. Inventaire et fiches objet ──
P("87:8216", "objets", { tab: 1, fab: "Ajouter un objet", body: [
  { title: "Inventaire", sub: "128 objets · 4 prêtés · 2 empruntés" },
  { search: "Rechercher un objet…" },
  { chips: ["Tous", "Vêtements", "Outils", "Électronique", "Maison", "Autres"], sel: 0 },
  { chips: ["Statut : tous", "Trier : récents"], sel: -1 },
  { grid: [
    { t: "Perceuse Bosch", m: "Outils · Garage", g: "drill", tone: "vert", st: "Disponible" },
    { t: "Appareil photo Sony", m: "Électronique · Bureau", g: "camera", tone: "rose", st: "Prêté", badge: "Prêté à Thomas" },
    { t: "Casque JBL", m: "Électronique · Chambre", g: "headphones", tone: "gris", st: "Disponible" },
    { t: "Ballon", m: "Sport · Garage", g: "ball", tone: "prune", st: "Emprunté", badge: "Emprunté à Léa" },
    { t: "Veste en jean", m: "Vêtements · Entrée", g: "jacket", tone: "prune", st: "Disponible" },
    { t: "Lampe de bureau", m: "Maison · Bureau", g: "lamp", tone: "rose", st: "En vente", badge: "15 €" },
  ] },
] });
const ficheObjet = (o = {}) => ({ top: { title: "", action: true }, toast: o.toast, footer: [B("Modifier", "Tertiary"), B("Prêter")], body: [
  { hero: { g: "drill", tone: "vert", h: 320, st: "Disponible", dots: true, title: "Perceuse Bosch", sub: "Outils · Très bon état" } },
  { actions: [B("Partager", "Secondary", { s: "S" }), B("Vendre", "Secondary", { s: "S" })] },
  { loc: { path: "Maison principale › Garage › Étagère 2 › Carton Bricolage", action: "Déplacer l'objet ›" } },
  { kv: [["Catégorie", "Outils"], ["État", "Très bon état"], ...(o.lastLoan ? [["Dernier prêt", o.lastLoan]] : [])], label: "Détails" },
  { h: "Notes" }, { text: "Perceuse utilisée pour les travaux de la maison.", kind: "body", color: "ink" },
  { link: "Supprimer cet objet", tone: "error", center: true },
] });
P("72:7184", "objets", ficheObjet());
P("95:8750", "prets", ficheObjet({ toast: { type: "Succès", title: "Objet rendu !", text: "La perceuse est de nouveau disponible." }, lastLoan: "Rendu par Thomas le 20 sept." }));
P("87:8236", "objets", { top: { title: "", action: true }, footer: [B("Rappeler Thomas", "Tertiary"), B("Marquer comme rendu")], body: [
  { hero: { g: "drill", tone: "vert", h: 280, st: "Prêté", badge: "Prêté à Thomas", title: "Perceuse Bosch", sub: "Outils · Très bon état" } },
  { kv: [["Prêté à", "Thomas"], ["Prêté le", "12 septembre"], ["Retour prévu", "20 septembre"]], label: "Prêt en cours" },
  { callout: { type: "Info", t: "Rappel automatique le 19 septembre", s: "Thomas recevra une notification la veille." } },
  { loc: { label: "Localisation actuelle", path: "Chez Thomas" } },
  { loc: { label: "Localisation habituelle", path: "Maison principale › Garage › Étagère 2 › Carton Bricolage" } },
  { link: "Modifier le prêt", center: true },
] });
P("87:8271", "objets", { top: { title: "", action: true }, footer: [B("Prêter", "Tertiary", { off: true }), B("Rendre")], body: [
  { hero: { g: "drill", tone: "prune", h: 280, st: "Emprunté", title: "Perceuse Bosch", sub: "Outils · appartient à Thomas" } },
  { callout: { type: "Privé", t: "Objet emprunté : tu ne peux pas le prêter.", s: "Seul son propriétaire peut le prêter à quelqu'un d'autre." } },
  { kv: [["Propriétaire", "Thomas"], ["Emprunté le", "12 septembre"], ["À rendre avant le", "20 septembre"]], label: "Emprunt" },
  { loc: { path: "Maison › Garage › Étagère 2" } },
] });
P("87:8306", "objets", { top: { title: "Statuts d'un objet" }, body: [
  { title: "Les statuts", sub: "Chaque statut débloque des actions différentes." },
  { list: [
    { t: "Disponible", s: "Prêter · Partager · Vendre", ic: "check", tone: "success", st: "Disponible", chev: false },
    { t: "Prêté", s: "Récupéré · Modifier", ic: "swap", tone: "primary", st: "Prêté", chev: false },
    { t: "Emprunté", s: "Rendre · Prêter désactivé", ic: "swap", tone: "cloth", st: "Emprunté", chev: false },
    { t: "À vendre", s: "Modifier le prix · Retirer", ic: "tag", tone: "ink", st: "En vente", badge: "À vendre", chev: false },
    { t: "Vendu", s: "Aucune (historique)", ic: "check", tone: "muted", st: "Vendu", chev: false },
    { t: "Perdu", s: "Retrouvé · Supprimer", ic: "alert", tone: "error", st: "Perdu", chev: false },
  ] },
] });
P("101:9373", "objets", { top: { title: "Déplacer un objet" }, footer: [B("Retour", "Tertiary"), B("Confirmer")], body: [
  { title: "Où le déplacer ?", sub: "Perceuse Bosch" },
  { loc: { label: "Emplacement actuel", path: "Maison principale › Garage › Étagère 2 › Carton Bricolage" } },
  { fields: [{ label: "Nouveau logement", value: "Maison principale" }, { label: "Nouvelle pièce", value: "Cave", state: "Focus" }, { label: "Nouveau rangement", value: "Étagère 1" }, { label: "Nouveau conteneur (facultatif)", value: "Aucun" }] },
] });
