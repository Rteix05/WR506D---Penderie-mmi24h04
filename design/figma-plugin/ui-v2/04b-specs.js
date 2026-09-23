// ═════════ Écrans · 4) Logements & rangements · 5) Dressing · 6) Ajout d'un vêtement ═════════

// ── Logements ──
P("101:9066", "logements", { tab: 3, fab: "+ Ajouter un logement", body: [
  { title: "Mes logements", sub: "2 logements · 15 pièces" },
  { list: [
    { t: "Maison principale", s: "12 rue Exemple · 6 pièces · 94 objets", ph: "house", tone: "rose" },
    { t: "Appartement", s: "Paris · 9 pièces · 34 objets", ph: "house", tone: "prune" },
  ] },
  { actions: [B("+ Ajouter un logement", "Secondary")] },
] });
const logForm = (step, title, sub, body, footer) => ({ top: { title: "Ajouter un logement", close: step === "1/4" }, footer, body: [{ progress: step }, { title, sub }, ...body] });
P("64:6195", "logements", logForm("1/4", "Type de logement", "Quel type de logement veux-tu ajouter ?", [
  { tiles: ["Maison", "Appartement", "Studio", "Chambre", "Bureau", "Garde-meuble", "Autre"].map(t => ({ t, ic: "house", hl: t === "Appartement" })), cols: 3 },
], [B("Annuler", "Tertiary"), B("Continuer")]));
P("64:6286", "logements", logForm("2/4", "Ton logement", "Juste de quoi le reconnaître — tu pourras compléter plus tard.", [
  { photoPick: { t: "Ajouter une photo", s: "optionnel" } },
  { fields: [{ label: "Nom", value: "Appartement Paris", state: "Focus" }, { label: "Adresse", value: "12 rue des Lilas, Paris" }] },
], [B("Retour", "Tertiary"), B("Continuer")]));
P("64:6362", "logements", logForm("3/4", "Combien de pièces ?", "Indique le nombre de pièces de ce logement.", [
  { stepper: { value: "3", label: "pièces" } },
  { fields: [{ label: "Surface — optionnel", value: "45 m²" }] },
], [B("Retour", "Tertiary"), B("Continuer")]));
P("64:6435", "logements", logForm("4/4", "Vérifie ton logement", null, [
  { hero: { g: "house", tone: "rose", h: 180, title: "Appartement Paris", sub: "Appartement" } },
  { kv: [["Adresse", "12 rue des Lilas, Paris"], ["Pièces", "3"], ["Surface", "45 m²"]] },
  { callout: { type: "Info", t: "Tu nommeras chaque pièce plus tard", s: "Chambre, salon… quand tu rangeras tes affaires." } },
], [B("Modifier", "Tertiary"), B("Ajouter ce logement")]));
P("101:9109", "logements", { top: { title: "Maison principale", action: true }, body: [
  { hero: { g: "house", tone: "rose", h: 190, title: "Maison principale", sub: "12 rue Exemple · 6 pièces · 94 objets" } },
  { h: "Pièces" },
  { tiles: [["Salon", "18 objets"], ["Cuisine", "22 objets"], ["Chambre", "16 objets"], ["Bureau", "9 objets"], ["Garage", "24 objets"], ["Cave", "5 objets"]]
      .map(([t, s]) => ({ t, s, ic: "box", hl: t === "Garage" })), cols: 2 },
  { link: "+ Ajouter une pièce", center: true },
] });
P("101:9152", "logements", { top: { title: "Garage" }, body: [
  { text: "Maison principale › Garage · 24 objets" },
  { list: [
    { t: "Étagère 1", s: "18 objets", ic: "sliders" },
    { t: "Étagère 2", s: "12 objets · 1 carton", ic: "sliders", hl: true },
    { t: "Armoire", s: "8 objets", ic: "box" },
    { t: "Cartons", s: "4 cartons · dont Carton Bricolage", ic: "box" },
    { t: "Posés dans la pièce", s: "5 objets sans rangement", ic: "pin" },
  ] },
  { link: "+ Ajouter un rangement", center: true },
] });
P("101:9215", "logements", { top: { title: "Étagère 2" }, body: [
  { text: "Maison principale › Garage › Étagère 2" },
  { search: "Rechercher sur cette étagère…" },
  { chips: ["Tout (5)", "Sur l'étagère", "Dans un carton"], sel: 0 },
  { list: [{ t: "Carton Bricolage", s: "Carton · 12 objets · ouvrir", ic: "box", alias: ["Ouvrir le carton ›"] }] },
  { grid: [
    { t: "Perceuse Bosch", m: "Dans Carton Bricolage", g: "drill", tone: "vert", st: "Disponible" },
    { t: "Marteau", m: "Dans Carton Bricolage", g: "drill", tone: "gris", st: "Disponible" },
    { t: "Tournevis", m: "Dans Carton Bricolage", g: "drill", tone: "rose", st: "Disponible" },
    { t: "Boîte à outils", m: "Sur l'étagère", g: "box", tone: "prune", st: "Disponible" },
  ] },
] });
P("101:9275", "logements", { top: { title: "Carton", action: true }, footer: [B("Modifier", "Tertiary"), B("Ajouter un objet")], body: [
  { hero: { g: "box", tone: "rose", h: 200, title: "Carton Bricolage", sub: "12 objets" } },
  { loc: { path: "Maison principale › Garage › Étagère 2" } },
  { h: "Contenu (12 objets)", more: "Voir les 12 objets ›" },
  { carousel: [
    { t: "Perceuse Bosch", m: "Outils", g: "drill", tone: "vert", st: "Disponible" },
    { t: "Marteau", m: "Outils", g: "drill", tone: "gris", st: "Disponible" },
  ] },
  { link: "Supprimer ce carton", tone: "error", center: true },
] });
P("101:9313", "logements", { top: { title: "Carton Bricolage" }, body: [
  { text: "12 objets · Garage › Étagère 2" },
  { search: "Rechercher dans le carton…" },
  { grid: [
    { t: "Perceuse Bosch", m: "Outils", g: "drill", tone: "vert", st: "Disponible" },
    { t: "Marteau", m: "Outils", g: "drill", tone: "gris", st: "Disponible" },
    { t: "Tournevis", m: "Outils", g: "drill", tone: "rose" },
    { t: "Clé à molette", m: "Outils", g: "drill", tone: "prune", st: "Prêté", badge: "Prêtée à Lucas" },
    { t: "Pince", m: "Outils", g: "drill", tone: "gris", st: "Disponible" },
  ] },
] });
P("14:1767", "logements", { tab: 1, body: [
  { title: "Mes cartons", sub: "13 cartons actifs" },
  { actions: [B("Créer un carton", "Secondary", { s: "S" }), B("Voir tout", "Primary", { s: "S" })] },
  { h: "Derniers ajouts" },
  { list: [
    { t: "T-shirt Nike", s: "Chambre · Armoire · aujourd'hui", ph: "tshirt", tone: "rose" },
    { t: "Veste en jean", s: "Entrée · hier", ph: "jacket", tone: "prune" },
  ] },
] });
P("75:7496", "logements", { top: { title: "Tous mes cartons" }, body: [
  { search: "Rechercher un carton…" },
  { list: [["Carton 1", "6 objets · Garage"], ["Carton 2", "5 objets · Cave"], ["Carton 3", "8 objets · Garage"], ["Carton 4", "3 objets · Chambre"],
    ["Carton 5", "10 objets · Grenier"], ["Carton 6", "4 objets · Bureau"], ["Carton 7", "7 objets · Cave"], ["Carton 8", "2 objets · Chambre"]].map(([t, s]) => ({ t, s, ic: "box" })) },
] });
P("72:7282", "logements", { top: { title: "Fiche carton", action: true }, footer: [B("Modifier", "Tertiary"), B("Ajouter un objet")], body: [
  { hero: { g: "box", tone: "rose", h: 200, title: "Carton 1", sub: "8 objets" } },
  { loc: { path: "Garage › Étagère 3" } },
  { h: "Contenu (8 objets)" },
  { list: [
    { t: "T-shirt Nike", s: "Chambre · Armoire", ph: "tshirt", tone: "rose", st: "Disponible" },
    { t: "Veste en jean", s: "Entrée", ph: "jacket", tone: "prune", st: "Disponible" },
  ] },
  { link: "Supprimer ce carton", tone: "error", center: true },
] });

// ── 5. Dressing ──
const DRESSING = [
  { t: "T-shirt Nike", m: "Nike · M · porté il y a 3 j", g: "tshirt", tone: "rose" },
  { t: "Veste en jean", m: "Levi's · L", g: "jacket", tone: "prune", st: "Prêté", badge: "Prêtée à Thomas" },
  { t: "Pantalon noir", m: "Zara · 40 · porté hier", g: "pants", tone: "gris" },
  { t: "Baskets Adidas", m: "Adidas · 42", g: "shoe", tone: "rose", st: "En vente", badge: "35 €" },
  { t: "Casquette NY", m: "New Era · il y a 2 sem.", g: "cap", tone: "vert" },
  { t: "Écharpe en laine", m: "Uniqlo · jamais portée", g: "hanger", tone: "prune" },
];
P("106:9507", "dressing", { tab: 2, fab: "+ Ajouter un vêtement", body: [
  { title: "Mon dressing", sub: "48 vêtements · 1 prêté · 1 en vente" },
  { search: "Rechercher un vêtement, une marque…" },
  { chips: ["Tout", "Hauts", "Pantalons", "Chaussures", "Vestes", "Accessoires"], sel: 0 },
  { chips: ["Filtres", "Trier : récemment ajouté"], sel: -1 },
  { grid: DRESSING },
] });
P("108:10010", "dressing", { top: { title: "Tous les hauts" }, body: [
  { text: "18 hauts" },
  { search: "Rechercher dans les hauts…" },
  { chips: ["Tout", "Couleur", "Taille", "Marque", "Style", "État"], sel: 0 },
  { chips: ["Tous les filtres", "Trier : récemment porté"], sel: -1 },
  { grid: [
    { t: "T-shirt Nike", m: "Nike · M · Noir", g: "tshirt", tone: "rose" },
    { t: "Sweat Nike Tech", m: "Nike · M · Gris · porté hier", g: "tshirt", tone: "gris" },
    { t: "Chemise en lin", m: "Zara · L · Blanc", g: "tshirt", tone: "vert" },
    { t: "Polo Lacoste", m: "Lacoste · M · jamais porté", g: "tshirt", tone: "prune" },
    { t: "Débardeur", m: "H&M · M · Noir", g: "tshirt", tone: "gris" },
    { t: "T-shirt basique", m: "Uniqlo · M · Blanc", g: "tshirt", tone: "rose" },
  ] },
] });
P("106:9567", "dressing", { top: { title: "Filtrer le dressing", close: true }, footer: [B("Réinitialiser", "Tertiary"), B("Appliquer")], body: [
  { title: "Filtres", sub: "3 filtres actifs · 12 vêtements trouvés" },
  { chips: ["Hauts", "Pantalons", "Chaussures", "Vestes", "Accessoires"], sel: [0], wrap: true, label: "Catégorie" },
  { chips: ["Toutes les marques", "Nike", "Levi's", "Zara", "Adidas"], sel: [1], wrap: true, label: "Marque" },
  { chips: ["Toutes les couleurs", "Noir", "Blanc", "Bleu", "Rose"], sel: [0], wrap: true, label: "Couleur" },
  { chips: ["XS", "S", "M", "L", "XL"], sel: [2], wrap: true, label: "Taille" },
  { chips: ["Casual", "Sport", "Élégant", "Streetwear"], sel: [3], wrap: true, label: "Style" },
  { chips: ["Neuf", "Très bon état", "Bon état", "Usé"], sel: [], wrap: true, label: "État" },
] });
const ficheVet = (o = {}) => ({ top: { title: "", action: true }, toast: o.toast, footer: [B("Modifier", "Tertiary"), B("Prêter")], body: [
  { hero: { g: "tshirt", tone: "rose", h: 340, st: "Disponible", badge: "Dans ma penderie", dots: true, title: "T-shirt Nike", sub: "Nike · Hauts · Streetwear" } },
  ...(o.full ? [{ actions: [B("Déplacer", "Secondary", { s: "S" }), B("Vendre", "Secondary", { s: "S" })] }] : []),
  { kv: [["Taille", "M"], ["Couleur", "Noir"], ["Style", "Streetwear"], ["État", "Très bon état"]], label: "Détails" },
  { loc: { path: "Maison › Chambre › Armoire › Étagère 2", action: o.full ? "Déplacer le vêtement ›" : null } },
  ...(o.full ? [{ h: "Historique de port", more: "Voir l'historique ›" }, { list: [{ t: "Porté 12 fois", s: "Dernière fois le 8 septembre", ic: "clock", chev: false }] }] : []),
  { link: "Supprimer ce vêtement", tone: "error", center: true },
] });
P("72:7097", "dressing", ficheVet());
P("106:9650", "dressing", ficheVet({ full: true }));
P("108:10260", "dressing", ficheVet({ full: true, toast: { type: "Succès", title: "Vêtement modifié !", text: "Tes modifications sont enregistrées." } }));
P("106:9685", "dressing", { top: { title: "Historique de port" }, footer: [B("Je le porte aujourd'hui")], body: [
  { hero: { g: "tshirt", tone: "rose", h: 180, title: "T-shirt Nike", sub: "Porté 12 fois" } },
  { callout: { type: "Info", t: "Dernière fois", s: "Lundi 8 septembre · il y a 3 jours" } },
  { h: "Dernières fois portées" },
  { list: [
    { t: "Soirée entre amis", s: "Tenue avec Veste en jean · 8 sept.", ph: "jacket", tone: "prune", chev: false },
    { t: "Journée au bureau", s: "Tenue avec Pantalon noir · 2 sept.", ph: "pants", tone: "gris", chev: false },
  ] },
] });
const vetEdit = [
  { photoPick: { t: "Changer la photo", s: "Scanner le vêtement" } },
  { fields: [{ label: "Nom", value: "T-shirt Nike", state: "Focus" }, { label: "Marque", value: "Nike" }] },
  { chips: ["XS", "S", "M", "L", "XL", "XXL", "Autre"], sel: [2], wrap: true, label: "Taille" },
  { fields: [{ label: "Couleur", value: "Noir" }] },
  { chips: ["Casual", "Sport", "Élégant", "Streetwear", "Chic", "Autre"], sel: [3], wrap: true, label: "Style" },
  { chips: ["Neuf", "Très bon état", "Bon état", "Usé"], sel: [1], wrap: true, label: "État" },
];
P("106:9723", "dressing", { top: { title: "Modifier le vêtement" }, footer: [B("Retour", "Tertiary"), B("Continuer")], body: [{ title: "Ton vêtement", sub: "Les infos actuelles sont déjà remplies." }, ...vetEdit] });
P("106:9806", "dressing", { top: { title: "Modifier le vêtement" }, footer: [B("Modifier", "Tertiary"), B("Enregistrer")], body: [
  { title: "Vérifie tes modifications" },
  { hero: { g: "tshirt", tone: "rose", h: 200, title: "T-shirt Nike", sub: "Nike" } },
  { callout: { type: "Info", t: "Modifié : nom et photo" } },
  { kv: [["Taille", "M"], ["Couleur", "Noir"], ["Style", "Streetwear"], ["État", "Très bon état"]] },
  { loc: { path: "Maison principale › Chambre › Armoire › Étagère 2" } },
] });
P("108:10303", "dressing", { top: { title: "", action: true }, footer: [B("Rappeler", "Tertiary"), B("Récupéré")], body: [
  { hero: { g: "jacket", tone: "prune", h: 320, st: "Prêté", badge: "Prêté à Thomas", title: "Veste en jean", sub: "Levi's · Vestes · L" } },
  { callout: { type: "Info", t: "Prêt et vente indisponibles tant qu'il est prêté.", s: "Récupère-le pour débloquer ces actions." } },
  { loc: { label: "Localisation actuelle", path: "Chez Thomas · retour prévu le 20 septembre" } },
  { text: "Rangement habituel : Chambre › Armoire › Étagère 2" },
  { link: "Supprimer ce vêtement", tone: "error", center: true },
] });
P("108:10346", "dressing", { top: { title: "", action: true }, footer: [B("Retirer", "Tertiary"), B("Modifier")], body: [
  { hero: { g: "tshirt", tone: "rose", h: 320, st: "En vente", badge: "En vente", title: "T-shirt Nike", sub: "Nike · M", price: "20 €", priceSub: "chez tes amis uniquement" } },
  { callout: { type: "Privé", t: "Visible uniquement par tes amis", s: "Personne d'autre ne voit cette annonce." } },
  { kv: [["Taille", "M"], ["État", "Très bon état"]] },
] });
P("108:10071", "dressing", { top: { title: "Mon dressing" }, fab: "+ Ajouter un vêtement", body: [
  { text: "0 vêtement" },
  { empty: { ic: "hanger", t: "Ton dressing est vide pour l'instant.", s: "Ajoute ton premier vêtement : il apparaîtra ici avec sa photo, sa marque et sa catégorie.", cta: "+ Ajouter un vêtement" } },
] });
P("108:10132", "dressing", { top: { title: "Mon dressing" }, body: [
  { search: "chemise hawaïenne" }, { text: "0 résultat" },
  { empty: { ic: "search", t: "Aucun résultat pour « chemise hawaïenne »", s: "Vérifie l'orthographe ou essaie une autre marque." } },
] });
P("108:10193", "dressing", { top: { title: "Tous les hauts" }, body: [
  { search: "Rechercher dans les hauts…" },
  { chips: ["Rouge", "Taille XS", "Élégant", "Filtres (3)"], sel: [0, 1, 2] },
  { empty: { ic: "filter", t: "0 résultat avec 3 filtres", s: "Retire un filtre pour voir plus de vêtements." } },
] });

// ── 6. Ajout d'un vêtement ──
const vetForm = (step, title, sub, body, footer) => ({ top: { title: "Ajouter un vêtement", close: step === "1/4" }, footer, body: [{ progress: step }, { title, sub }, ...body] });
P("14:1594", "vetement", vetForm("1/4", "Type de vêtement", "Quel type veux-tu ajouter ?", [
  { tiles: [["T-shirt", "tshirt"], ["Chemise", "tshirt"], ["Pull", "tshirt"], ["Veste", "jacket"], ["Manteau", "jacket"], ["Pantalon", "pants"],
    ["Short", "pants"], ["Robe", "hanger"], ["Chaussures", "shoe"], ["Casquette", "cap"], ["Accessoires", "sparkle"], ["Autre", "box"]].map(([t, ic]) => ({ t, ic, hl: t === "T-shirt" })), cols: 3 },
], [B("Annuler", "Tertiary"), B("Continuer")]));
P("57:4530", "vetement", vetForm("2/4", "Ton vêtement", "Ajoute une photo puis les infos principales.", [
  { photoPick: { t: "Prendre ou importer une photo", s: "Scanner le vêtement" } },
  { fields: [{ label: "Nom", value: "Sweat Nike Tech", state: "Focus" }, { label: "Marque", value: "Nike" }] },
  { chips: ["XS", "S", "M", "L", "XL", "XXL", "Autre"], sel: [2], wrap: true, label: "Taille" },
  { fields: [{ label: "Couleur", value: "Noir" }] },
  { chips: ["Casual", "Sport", "Élégant", "Streetwear", "Chic", "Autre"], sel: [3], wrap: true, label: "Style" },
  { chips: ["Neuf", "Très bon état", "Bon état", "Usé"], sel: [1], wrap: true, label: "État" },
], [B("Retour", "Tertiary"), B("Continuer")]));
P("57:4654", "vetement", vetForm("3/4", "Où se trouve ce vêtement ?", "Indique où il est rangé pour le retrouver facilement.", [
  { fields: [{ label: "Lieu", value: "Maison" }, { label: "Pièce", value: "Chambre" }, { label: "Rangement", value: "Armoire" }, { label: "Emplacement", value: "Étagère 2", state: "Focus" }] },
  { callout: { type: "Info", t: "Il sera rangé ici", s: "Maison › Chambre › Armoire › Étagère 2" } },
], [B("Retour", "Tertiary"), B("Continuer")]));
P("55:4422", "vetement", vetForm("4/4", "Vérifie ton vêtement", null, [
  { hero: { g: "tshirt", tone: "gris", h: 220, st: "Disponible", badge: "Dans ma penderie", title: "Sweat Nike Tech", sub: "Nike" } },
  { kv: [["Taille", "M"], ["Couleur", "Noir"], ["Style", "Streetwear"], ["État", "Très bon état"]] },
  { loc: { path: "Maison › Chambre › Armoire › Étagère 2" } },
], [B("Modifier", "Tertiary"), B("Ajouter")]));
P("65:6559", "vetement", home({ toast: { type: "Succès", title: "Vêtement ajouté !", text: "Retrouve-le dans ton dressing." } }));
