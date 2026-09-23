// ═════════ Écrans · 7) Tenues · 8) Prêts · 9) Amis · 10) Partage privé ═════════

// ── Tenues : moodboard, la tenue se comprend d'un coup d'œil ──
const OUTFIT = [
  { t: "T-shirt Nike", g: "tshirt", tone: "rose" }, { t: "Veste en jean", g: "jacket", tone: "prune" },
  { t: "Pantalon noir", g: "pants", tone: "gris" }, { t: "Baskets Adidas", g: "shoe", tone: "rose" },
];
P("108:10558", "tenues", { top: { title: "Ma tenue" }, footer: [B("Créer une tenue")], body: [
  { title: "Ta tenue du jour", sub: "Composée avec ton dressing · 14 °C à Troyes" },
  { outfit: { items: OUTFIT, like: true } },
  { list: [{ t: "Dernière suggestion · Travail", s: "Streetwear · 92 % de cohérence", ic: "sparkle" }] },
  { h: "Mes tenues", more: "3 tenues enregistrées" },
] });
P("108:10604", "tenues", { top: { title: "Créer une tenue" }, footer: [B("Annuler", "Tertiary"), B("Générer")], body: [
  { title: "Tes préférences", sub: "Choisis l'occasion, on compose la tenue avec ton dressing." },
  { fields: [{ label: "Pour quand ?", value: "Aujourd'hui · 14 °C à Troyes" }] },
  { chips: ["Quotidien", "Sport", "Travail", "Soirée", "Événement"], sel: [2], wrap: true, label: "Contexte" },
  { chips: ["Casual", "Streetwear", "Sportif", "Élégant"], sel: [1], wrap: true, label: "Style" },
  { chips: ["Chaud", "Doux", "Frais", "Pluie"], sel: [1], wrap: true, label: "Météo" },
  { fields: [{ label: "Couleur ou envie (facultatif)", value: "Plutôt des tons neutres" }] },
] });
P("108:10687", "tenues", { top: { title: "Suggestion" }, footer: [B("Nouvelle tenue", "Tertiary"), B("J'aime cette tenue")], body: [
  { title: "Tenue du jour", sub: "Travail · Streetwear · 14 °C" },
  { outfit: { items: [{ ...OUTFIT[0], refuse: true }, ...OUTFIT.slice(1)], like: true } },
  { callout: { type: "Succès", t: "Cohérence de la tenue", s: "Très bonne · 92 % — tons neutres, style assorti" } },
  { h: "4 pièces de ton dressing" },
  { list: OUTFIT.map(o => ({ t: o.t, s: "Refuser pour la remplacer", ph: o.g, tone: o.tone })) },
] });
P("110:10928", "tenues", { top: { title: "Remplacer une pièce" }, footer: [B("Annuler", "Tertiary"), B("Remplacer la pièce")], body: [
  { title: "T-shirt Nike refusé", sub: "Voici des hauts compatibles de ton dressing" },
  { callout: { type: "Info", t: "Déjà refusé pour cette tenue", s: "T-shirt Nike · ne sera plus proposé" } },
  { h: "3 alternatives compatibles" },
  { list: [
    { t: "Sweat Nike Tech", s: "Compatible à 92 % · Chambre", ph: "tshirt", tone: "gris", st: "Disponible", badge: "Choisi", hl: true, chev: false },
    { t: "Chemise en lin", s: "Compatible à 88 % · Chambre", ph: "tshirt", tone: "vert", chev: false },
    { t: "Polo Lacoste", s: "Compatible à 81 % · Chambre", ph: "tshirt", tone: "prune", chev: false },
  ] },
] });
P("110:10977", "tenues", { top: { title: "Tenue enregistrée" }, toast: { type: "Succès", title: "Tenue enregistrée !", text: "Retrouve-la dans Mes tenues." },
  footer: [B("Je la porte aujourd'hui", "Tertiary"), B("Voir mes tenues")], body: [
  { title: "Bureau décontracté", sub: "Travail · Casual" },
  { outfit: { items: [{ t: "Sweat Nike Tech", g: "tshirt", tone: "gris" }, OUTFIT[1], { t: "Jean brut", g: "pants", tone: "prune" }, OUTFIT[3]] } },
  { callout: { type: "Succès", t: "Cohérence", s: "Très bonne · 94 % · Enregistrée dans Mes tenues" } },
] });
P("108:10725", "tenues", { top: { title: "Mes tenues" }, fab: "+ Créer une tenue", body: [
  { title: "Mes tenues", sub: "6 tenues enregistrées" },
  { search: "Rechercher une tenue…" },
  { chips: ["Toutes", "Quotidien", "Travail", "Sport", "Soirée", "Événement"], sel: 0 },
  { grid: [
    { t: "Week-end streetwear", m: "4 pièces · portée 3 fois", g: "jacket", tone: "prune" },
    { t: "Bureau décontracté", m: "4 pièces · portée hier", g: "tshirt", tone: "gris" },
    { t: "Balade en ville", m: "3 pièces", g: "shoe", tone: "rose" },
    { t: "Footing du dimanche", m: "3 pièces · portée 5 fois", g: "tshirt", tone: "vert" },
    { t: "Match de foot", m: "4 pièces", g: "cap", tone: "vert" },
    { t: "Balade d'automne", m: "4 pièces · jamais portée", g: "jacket", tone: "rose" },
  ] },
] });
P("108:10786", "tenues", { top: { title: "Ma tenue" }, body: [
  { text: "3 vêtements dans ton dressing" },
  { empty: { ic: "hanger", t: "Pas encore assez de vêtements pour créer une tenue.", s: "Il faut au moins un haut, un bas et des chaussures. Il te manque : un bas et des chaussures.", cta: "+ Ajouter un vêtement" } },
] });
P("108:10799", "tenues", { top: { title: "Suggestion" }, body: [
  { chips: ["Soirée", "Élégant", "Pluie", "8 °C"], sel: [0, 1, 2, 3] },
  { empty: { ic: "sparkle", t: "Aucun vêtement compatible avec ces préférences.", s: "Essaie un autre style ou une autre météo, ou ajoute une pièce élégante à ton dressing.", cta: "Modifier mes préférences" } },
] });
P("108:10812", "tenues", { top: { title: "Mes tenues" }, body: [
  { text: "0 tenue" },
  { empty: { ic: "heart", t: "Tu n'as pas encore enregistré de tenue.", s: "Crée une tenue avec ton dressing, puis appuie sur « J'aime » pour la garder.", cta: "+ Créer une tenue" } },
] });

// ── Prêts : statuts très lisibles (prêté, emprunté, en retard, retourné) ──
const pretForm = (step, title, sub, body, footer) => ({ top: { title: "Prêter un objet" }, footer, body: [{ progress: step }, { title, sub }, ...body] });
const PERCEUSE = { t: "Perceuse Bosch", s: "Outils · Très bon état", ph: "drill", tone: "vert", chev: false };
P("95:8468", "prets", pretForm("1/3", "À qui veux-tu prêter cet objet ?", "Perceuse Bosch · choisis un ami dans ta liste.", [
  { search: "Nom ou pseudo…" },
  { list: [
    { t: "Thomas", s: "Ami · 3 prêts ensemble", av: 0, st: "Info", badge: "Choisi", hl: true },
    { t: "Lucas", s: "Ami", av: 1 }, { t: "Marie", s: "Ami", av: 2 },
  ] },
], [B("Annuler", "Tertiary"), B("Continuer")]));
P("95:8499", "prets", pretForm("2/3", "Informations du prêt", "L'essentiel : l'ami, la date et le retour prévu.", [
  { list: [PERCEUSE] },
  { fields: [{ label: "Prêté à", value: "Thomas" }, { label: "Date du prêt", value: "12 septembre (aujourd'hui)" }] },
  { chips: ["15 sept.", "18 sept.", "20 sept.", "27 sept."], sel: [2], wrap: true, label: "Retour prévu" },
  { link: "Choisir une date" },
  { fields: [{ label: "Ajouter une note (facultatif)", value: "Pense à la remettre dans son carton." }] },
], [B("Retour", "Tertiary"), B("Continuer")]));
P("95:8582", "prets", pretForm("3/3", "Vérifie le prêt", null, [
  { list: [PERCEUSE] },
  { kv: [["Prêté à", "Thomas"], ["Date du prêt", "12 septembre"], ["Retour prévu", "20 septembre"], ["État avant le prêt", "Très bon état"]] },
  { callout: { type: "Info", t: "Thomas sera notifié du prêt", s: "Rappel automatique la veille du retour." } },
], [B("Modifier", "Tertiary"), B("Confirmer le prêt")]));
P("95:8615", "prets", home({ toast: { type: "Succès", title: "Prêt enregistré !", text: "Perceuse Bosch prêtée à Thomas." }, lead: [
  { list: [{ t: "Prêt en cours", s: "Perceuse Bosch · chez Thomas · retour le 20 septembre", ph: "drill", tone: "vert", st: "Prêté", alias: ["Voir l'objet"] }] },
] }));
P("95:8785", "prets", { top: { title: "Mes prêts" }, body: [
  { segment: ["J'ai prêté", "J'ai emprunté"], sel: 0 },
  { text: "3 prêts en cours · 1 en retard" },
  { chips: ["Trier : date de retour"], sel: -1 },
  { list: [
    { t: "Perceuse Bosch", s: "Prêtée à Thomas · retour 20 sept.", ph: "drill", tone: "vert", st: "Prêté", badge: "En cours", alias: ["Prêtée à Thomas · retour 20 sept."] },
    { t: "Appareil photo Sony", s: "Prêté à Lucas · retour 15 sept.", ph: "camera", tone: "rose", st: "Prêté", badge: "À rendre bientôt" },
    { t: "Casque JBL", s: "Prêté à Marie · retour 5 sept.", ph: "headphones", tone: "gris", st: "En retard" },
    { t: "Ballon", s: "Rendu par Lucas · 2 sept.", ph: "ball", tone: "prune", st: "Retourné", badge: "Terminé" },
  ] },
] });
P("95:8845", "prets", { top: { title: "Mes prêts" }, body: [
  { segment: ["J'ai prêté", "J'ai emprunté"], sel: 1 },
  { callout: { type: "Privé", t: "Tu peux les utiliser, mais pas les prêter.", s: "Un objet emprunté reste sous la responsabilité de son propriétaire." } },
  { list: [
    { t: "Console", s: "Empruntée à Thomas · retour 25 sept.", ph: "headphones", tone: "prune", st: "Emprunté", badge: "En cours" },
    { t: "Ponceuse Makita", s: "Empruntée à Léa · retour 14 sept.", ph: "drill", tone: "rouge", st: "En retard", badge: "À rendre" },
  ] },
] });
P("95:8667", "prets", { top: { title: "Retour de l'objet" }, footer: [B("Annuler", "Tertiary"), B("Confirmer le retour")], body: [
  { title: "Objet rendu ?", sub: "Confirme le retour : l'objet redevient disponible." },
  { list: [{ ...PERCEUSE, s: "Prêtée le 12 septembre" }] },
  { fields: [{ label: "Rendu par", value: "Thomas" }, { label: "Date du retour", value: "20 septembre (aujourd'hui)" }] },
  { chips: ["Comme avant", "Endommagé", "Autre"], sel: [0], wrap: true, label: "État de l'objet" },
  { loc: { label: "Où l'as-tu rangé ?", path: "Maison principale › Garage › Étagère 2" } },
] });

// ── Amis : un cercle privé, rassurant ──
const AMIS = [
  { t: "Thomas", s: "Ami depuis mars 2024", av: 0, alias: ["Ami"] },
  { t: "Lucas", s: "Ami · 2 partages", av: 1 }, { t: "Marie", s: "Ami · 1 prêt en cours", av: 2 },
  { t: "Nina", s: "Demande envoyée", av: 3, st: "Info", badge: "En attente" },
];
P("110:11158", "amis", { top: { title: "Mes amis" }, body: [
  { text: "25 amis · 1 demande reçue · 1 envoyée" },
  { actions: [B("Demandes", "Secondary", { s: "S" }), B("+ Ajouter", "Primary", { s: "S" })] },
  { search: "Rechercher un ami…" },
  { callout: { type: "Privé", t: "Ton cercle privé", s: "Seuls tes amis voient ce que tu choisis de partager avec eux." } },
  { h: "Demande reçue" },
  { list: [{ t: "Julie", s: "3 amis en commun", av: 4, st: "Nouveau", badge: "Nouvelle" }] },
  { h: "Amis (25)" },
  { list: AMIS },
] });
const ajoutAmi = toast => ({ top: { title: "Ajouter un ami" }, toast, footer: [B("Retour", "Tertiary"), B("Envoyer")], body: [
  { title: "Ajouter un ami", sub: "Recherche par nom ou pseudo. Ton ami devra accepter." },
  { fields: [{ label: "Nom ou pseudo", value: "julie.m", state: "Focus" }] },
  { list: [{ t: "Julie M.", s: "3 amis en commun", av: 4, chev: false }] },
] });
P("110:11184", "amis", ajoutAmi());
P("110:11689", "amis", ajoutAmi({ type: "Succès", title: "Demande envoyée !", text: "Julie doit maintenant l'accepter." }));
P("110:11210", "amis", { top: { title: "Demande reçue" }, footer: [B("Refuser", "Tertiary"), B("Accepter")], body: [
  { spacer: 12 },
  { profile: { name: "Julie M.", sub: "3 amis en commun : Thomas, Lucas et Marie", st: "Nouveau", badge: "Nouvelle demande", av: 4 } },
  { callout: { type: "Privé", t: "Julie veut devenir ton amie", s: "En acceptant, vous pourrez vous partager des affaires en privé. Rien n'est partagé automatiquement." } },
] });
P("110:11236", "amis", { top: { title: "Profil ami", action: true }, body: [
  { profile: { name: "Thomas", sub: "Ami depuis mars 2024 · 3 amis en commun", st: "Info", badge: "Ami", av: 0 } },
  { actions: [B("Retirer", "Tertiary", { s: "S" }), B("Partager", "Primary", { s: "S" })] },
  { h: "Partagé avec toi (3)", more: "Voir les 3 éléments ›" },
  { grid: [
    { t: "Polo Ralph Lauren", m: "Vêtement · accès : voir", g: "tshirt", tone: "vert", alias: ["Voir"] },
    { t: "Veste en cuir", m: "Vêtement · accès : emprunter", g: "jacket", tone: "prune" },
  ] },
  { link: "Bloquer Thomas", tone: "error", center: true },
] });
P("110:11552", "amis", { top: { title: "Mes amis" }, body: [
  { text: "0 ami" },
  { empty: { ic: "users", t: "Tu n'as pas encore d'amis sur Penderie.", s: "Ajoute des amis pour leur prêter, partager ou vendre tes affaires, en privé.", cta: "+ Ajouter un ami" } },
] });

// ── Partage privé : qui voit quoi, révocable à tout moment ──
P("110:11274", "partage", { top: { title: "Partager", close: true }, footer: [B("Annuler", "Tertiary"), B("Partager")], body: [
  { title: "Partager en privé", sub: "Seules les personnes choisies y auront accès." },
  { callout: { type: "Privé", t: "Privé par défaut", s: "Rien d'autre de ton inventaire n'est visible." } },
  { list: [{ t: "Veste en jean", s: "Élément à partager", ph: "jacket", tone: "prune", chev: false }] },
  { chips: ["Objet", "Carton", "Vêtement", "Pièce", "Collection"], sel: [2], wrap: true, label: "Type" },
  { fields: [{ label: "Avec qui ?", value: "Thomas, Lucas" }] },
  { chips: ["Voir", "Commenter", "Emprunter"], sel: [0], wrap: true, label: "Niveau d'accès" },
  { chips: ["1 jour", "1 semaine", "1 mois", "Toujours"], sel: [1], wrap: true, label: "Durée" },
  { fields: [{ label: "Message (facultatif)", value: "Regarde ma veste pour samedi" }] },
] });
const lien = toast => ({ top: { title: "Lien de partage" }, toast, footer: [B("Révoquer", "Tertiary"), B("Copier")], body: [
  { callout: { type: "Privé", t: "Lien privé", s: "Veste en jean · seules les personnes qui ont ce lien peuvent la voir. Rien d'autre." } },
  { qr: "QR code · à scanner pour ouvrir le lien" },
  { kv: [["Lien", "penderie.app/p/7Kx9-veste"], ["Accès", "Voir seulement · sans compte"], ["Expiration", "Dans 7 jours"]] },
  { text: "Révocable à tout moment depuis Mes partages.", align: "CENTER" },
] });
P("110:11357", "partage", lien());
P("110:11741", "partage", lien({ type: "Succès", title: "Lien copié !", text: "Envoie-le uniquement à qui tu veux." }));
P("110:11394", "partage", { top: { title: "Partagé par Mathis", close: true }, footer: [B("Voir les commentaires (3)", "Secondary")], body: [
  { callout: { type: "Privé", t: "Lecture seule · lien privé", s: "Tu vois uniquement cet élément, pas le reste de l'inventaire." } },
  { hero: { g: "jacket", tone: "prune", h: 300, title: "Veste en jean", sub: "Levi's · partagée avec toi" } },
  { kv: [["Taille", "L"], ["État", "Très bon état"]] },
  { text: "Consultation sans compte, via lien privé", align: "CENTER" },
] });
const mesPartages = (withVeste, toast) => ({ top: { title: "Mes partages" }, toast, fab: "Partager un élément", body: [
  { callout: { type: "Privé", t: "Tout reste privé", s: "Tu choisis qui voit quoi, et tu peux révoquer un accès à tout moment." } },
  { list: [
    ...(withVeste ? [{ t: "Veste en jean", s: "Thomas, Lucas · peuvent voir", ph: "jacket", tone: "prune" }] : []),
    { t: "Carton Bricolage", s: "Thomas · peut emprunter", ic: "box" },
    { t: "Garage", s: "Lien privé · expire dans 5 jours", ic: "link" },
    { t: "Collection Hiver", s: "Marie · peut commenter", ic: "heart" },
  ] },
] });
P("110:11437", "partage", mesPartages(true));
P("110:11706", "partage", mesPartages(false, { type: "Succès", title: "Accès révoqué", text: "La Veste en jean n'est plus partagée." }));
P("110:11500", "partage", { top: { title: "Accès au partage" }, footer: [B("Tout révoquer", "Danger")], body: [
  { title: "Qui a accès ?", sub: "Veste en jean · partage privé, révocable à tout moment." },
  { list: [
    { t: "Thomas", s: "Peut voir", av: 0, chev: false }, { t: "Lucas", s: "Peut voir", av: 1, chev: false }, { t: "Marie", s: "Peut commenter", av: 2, chev: false },
  ] },
  { fields: [{ label: "Niveau d'accès par défaut", value: "Voir seulement" }] },
  { actions: [B("Modifier", "Tertiary", { s: "S" }), B("Révoquer", "Secondary", { s: "S" })] },
] });
P("110:11526", "partage", { top: { title: "Commentaires" }, footer: [B("Retour", "Tertiary"), B("Envoyer")], body: [
  { list: [{ t: "Veste en jean", s: "3 commentaires · visibles uniquement par les personnes autorisées", ph: "jacket", tone: "prune", chev: false }] },
  { list: [
    { t: "Marie", s: "Trop bien pour samedi ! · hier", av: 2, chev: false },
    { t: "Lucas", s: "Tu me la prêtes ? · lundi", av: 1, chev: false },
    { t: "Thomas", s: "Elle te va super bien · il y a 2 h", av: 0, chev: false },
  ] },
  { fields: [{ label: "Ajouter un commentaire", value: "Écris un message…", state: "Focus" }] },
] });
P("110:11565", "partage", { top: { title: "Mes partages" }, body: [
  { text: "0 partage" },
  { empty: { ic: "lock", t: "Tu ne partages rien pour l'instant.", s: "Ton inventaire est privé par défaut : rien n'est visible sans ton accord.", cta: "Partager un élément" } },
] });
