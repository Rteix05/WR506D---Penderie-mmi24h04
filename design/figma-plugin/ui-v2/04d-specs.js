// ═════════ Écrans · 11) Vente · 12) Paiement & livraison · 13) Commandes · 14-17) Transversaux ═════════

// ── Vente (privée : seulement entre amis) ──
P("110:11832", "vente", { top: { title: "Mettre en vente", close: true }, footer: [B("Annuler", "Tertiary"), B("Publier")], body: [
  { title: "Informations de vente", sub: "Visible uniquement par tes amis. Tu peux retirer l'annonce à tout moment." },
  { callout: { type: "Privé", t: "Vente privée", s: "Seuls tes 25 amis voient cette annonce." } },
  { photoPick: { t: "Ajouter des photos (jusqu'à 5)", s: "Reprendre la photo du dressing" } },
  { fields: [{ label: "Prix", value: "20 €", state: "Focus" }, { label: "Description", value: "T-shirt Nike porté quelques fois, taille M." }] },
  { chips: ["Main propre", "Livraison", "Les deux"], sel: [2], wrap: true, label: "Modalité" },
  { fields: [{ label: "Visible par", value: "Mes amis uniquement (25)" }] },
] });
P("110:11915", "vente", { top: { title: "Mon annonce", action: true }, toast: { type: "Succès", title: "Annonce publiée !", text: "Visible uniquement par tes amis." },
  footer: [B("Retirer", "Tertiary"), B("Modifier")], body: [
  { hero: { g: "tshirt", tone: "rose", h: 300, st: "En vente", badge: "En vente", title: "T-shirt Nike", sub: "Nike · M · Très bon état", price: "20 €", priceSub: "chez tes amis" } },
  { kv: [["Taille", "M"], ["État", "Très bon état"], ["Modalité", "Main propre ou livraison"]] },
  { h: "Acheteurs potentiels" },
  { list: [{ t: "Voir qui est intéressé ›", s: "Tes 25 amis uniquement · 3 intéressés", ic: "users" }] },
  { link: "Supprimer ce vêtement", tone: "error", center: true },
] });
P("110:11955", "vente", { top: { title: "À vendre chez mes amis" }, body: [
  { text: "12 articles mis en vente par tes amis" },
  { search: "Rechercher un article…" },
  { chips: ["Tout", "Vêtements", "Objets", "Maison", "Autres"], sel: 0 },
  { chips: ["Prix : tous", "Trier : récents"], sel: -1 },
  { grid: [
    { t: "T-shirt Nike", m: "12 € · Lucas · M · Très bon", g: "tshirt", tone: "rose" },
    { t: "Veste en cuir", m: "45 € · Thomas · L · Bon état", g: "jacket", tone: "prune" },
    { t: "Jean Levi's", m: "20 € · Marie · 40 · Très bon", g: "pants", tone: "gris" },
    { t: "Baskets Nike", m: "35 € · Julie · 39 · Neuf", g: "shoe", tone: "vert" },
    { t: "Lampe de bureau", m: "8 € · Lucas · Bon état", g: "lamp", tone: "rose" },
    { t: "Écharpe en laine", m: "Marie · Très bon", g: "hanger", tone: "gris", st: "Vendu", badge: "Vendu" },
  ] },
] });
const article = (o = {}) => ({ top: { title: "Article à vendre", action: true }, footer: o.footer, body: [
  { hero: { g: "jacket", tone: "prune", h: 340, dots: true, st: o.st || "En vente", badge: o.badge || "En vente", title: "Veste en cuir", sub: "Vendue par Thomas", price: "45 €", priceSub: o.priceSub } },
  ...(o.callout ? [{ callout: o.callout }] : []),
  { kv: [["Taille", "L"], ["Couleur", "Marron"], ["Style", "Casual"], ["État", "Bon état"]] },
  { h: "Description" }, { text: "Portée quelques fois, doublure intacte.", kind: "body", color: "ink" },
  { list: [{ t: "Thomas", s: "Ami depuis mars 2024 · 3 amis en commun", av: 0 }] },
  ...(o.st ? [] : [{ link: "Poser une question à Thomas ›" }, { callout: { type: "Privé", t: "Vente privée entre amis", s: "Paiement sécurisé, versé au vendeur à la réception." } }]),
] });
P("110:12016", "vente", article({ priceSub: "Livraison (+5 €) ou main propre", footer: [B("Acheter · 45 €")] }));
P("111:12249", "vente", article({ st: "Vendu", badge: "Vendu", callout: { type: "Info", t: "Cet article a été vendu à un autre ami.", s: "Il n'est plus disponible." }, footer: [B("Déjà vendu", "Tertiary", { off: true })] }));
P("111:12288", "vente", article({ st: "Vendu", badge: "Retiré de la vente", callout: { type: "Info", t: "Thomas a retiré cet article de la vente.", s: "Tu peux lui demander s'il le remet en vente." }, footer: [B("Plus disponible", "Tertiary", { off: true })] }));
P("110:12059", "vente", { top: { title: "Acheter" }, footer: [B("Payer 50 €")], body: [
  { title: "Confirme ton achat" },
  { list: [{ t: "Veste en cuir", s: "Vendue par Thomas", ph: "jacket", tone: "prune", chev: false }] },
  { kv: [["Prix", "45 €"], ["Livraison", "Colissimo · 5 €"]], total: ["Total", "50 €"] },
  { fields: [{ label: "Adresse de livraison", value: "12 rue Exemple, 10000 Troyes" }, { label: "Paiement", value: "Carte se terminant par 4242" }] },
  { callout: { type: "Privé", t: "Paiement sécurisé", s: "L'argent est versé à Thomas quand tu confirmes la réception." } },
] });
P("110:12105", "vente", home({ toast: { type: "Succès", title: "Achat confirmé !", text: "Thomas prépare ta commande." }, lead: [
  { list: [
    { t: "Commande #PND-2481", s: "Veste en cuir · 50 € · livrée vers le 18 sept.", ph: "jacket", tone: "prune", st: "Info", badge: "Suivre", alias: ["Suivre"] },
    { t: "Mes commandes", s: "4 commandes · achats et ventes", ic: "card", alias: ["Commande en cours"] },
  ] },
] }));
P("111:12327", "vente", home({ toast: { type: "Info", title: "Paiement en attente", text: "Validation de ta banque en cours…" }, lead: [
  { list: [{ t: "Paiement en attente", s: "Validation de ta banque en cours…", ic: "clock", st: "Info", badge: "En attente", alias: ["Validation de ta banque en cours…"] }] },
] }));
P("111:12364", "vente", home({ toast: { type: "Succès", title: "Commande terminée !", text: "Merci ! L'échange est clôturé." }, lead: [
  { list: [{ t: "Commande terminée", s: "Reçue le 18 sept. · Thomas a été payé", ic: "check", st: "Retourné", badge: "Terminée" }] },
] }));
P("111:12401", "vente", { top: { title: "Paiement refusé" }, footer: [B("Réessayer")], body: [
  { callout: { type: "Erreur", t: "Paiement refusé", s: "Aucun montant n'a été débité." } },
  { kv: [["Commande", "#PND-2481"], ["Montant", "50 €"], ["Carte", "•••• 4242"]] },
  { link: "Changer de moyen de paiement", center: true },
] });

// ── Paiement & livraison : hiérarchie article → prix → remise → total ──
P("111:12473", "paiement", { top: { title: "Récapitulatif" }, footer: [B("Continuer vers le paiement")], body: [
  { title: "Ta commande" },
  { list: [{ t: "Veste en cuir", s: "Vendue par Thomas", ph: "jacket", tone: "prune", chev: false }] },
  { kv: [["Article", "45 €"], ["Livraison", "Colissimo · 5 €"], ["Vendeur", "Thomas · ton ami"]], total: ["Total", "50 €"] },
  { callout: { type: "Privé", t: "Paiement sécurisé", s: "L'argent est versé à Thomas à la réception." } },
] });
P("111:12512", "paiement", { top: { title: "Paiement" }, footer: [B("Retour", "Tertiary"), B("Payer 50 €")], body: [
  { title: "Paiement", sub: "Montant : 50 €. Paiement sécurisé, versé à Thomas à la réception." },
  { chips: ["Carte bancaire", "Apple Pay", "PayPal"], sel: [0], wrap: true },
  { fields: [{ label: "Numéro de carte", value: "4242 4242 4242 4242", state: "Focus" }, { label: "Expiration", value: "12/27" }, { label: "Code de sécurité", value: "123" }] },
  { callout: { type: "Privé", t: "Paiement sécurisé", s: "Tes informations bancaires ne sont jamais partagées avec le vendeur." } },
] });
P("111:12549", "paiement", home({ toast: { type: "Succès", title: "Paiement confirmé !", text: "Référence PND-2481 · 50 € payés" }, lead: [
  { list: [{ t: "Commande #PND-2481", s: "Veste en cuir · 50 € payés · en préparation par Thomas", ph: "jacket", tone: "prune", st: "Info", badge: "En préparation" }] },
] }));
P("111:12586", "paiement", { top: { title: "Livraison" }, footer: [B("Retour", "Tertiary"), B("Continuer")], body: [
  { title: "Comment la recevoir ?", sub: "Livraison à domicile ou remise en main propre avec Thomas." },
  { chips: ["Livraison · 5 €", "Main propre · gratuit"], sel: [0], wrap: true, label: "Mode de remise" },
  { fields: [{ label: "Adresse", value: "12 rue Exemple, 10000 Troyes" }] },
  { kv: [["Transporteur", "Colissimo · livré en 2 à 3 jours"]] },
] });
const suivi = (o = {}) => ({ top: { title: "Suivi de commande" }, toast: o.toast, body: [
  { list: [{ t: "Veste en cuir", s: "Commande #PND-2481 · 50 €", ph: "jacket", tone: "prune", chev: false }] },
  { timeline: o.incident ? [
    { t: "Commande préparée", s: "15 sept. · 10:12 · par Thomas", state: "done" },
    { t: "Expédiée", s: "15 sept. · 17:40 · Colissimo", state: "done" },
    { t: "Incident de livraison", s: "Colis bloqué au centre de tri", state: "current", tone: "error" },
    { t: "Livrée", s: "Retardée", state: "todo" },
  ] : [
    { t: "Commande préparée", s: "15 sept. · 10:12 · par Thomas", state: "done" },
    { t: "Expédiée", s: "15 sept. · 17:40 · Colissimo", state: "done" },
    { t: "En transit", s: "Arrivée prévue le 18 sept.", state: "current" },
    { t: "Livrée", s: "À venir", state: "todo" },
  ] },
  { list: [{ t: "Signaler un problème", s: o.incident ? "On t'aide à trouver une solution" : "Colis en retard, abîmé, non reçu…", ic: "alert", tone: "error" }] },
] });
P("111:12669", "paiement", suivi());
P("111:13021", "paiement", suivi({ incident: true, toast: { type: "Erreur", title: "Incident de livraison", text: "Colis bloqué au centre de tri" } }));
P("111:12732", "paiement", { top: { title: "Remise en main propre" }, footer: [B("Modifier", "Tertiary"), B("J'ai reçu")], body: [
  { title: "Rendez-vous", sub: "Avec Thomas pour la Veste en cuir · 45 €" },
  { hero: { g: "pin", tone: "vert", h: 180, title: "Café du Centre", sub: "5 place de la Mairie, Troyes" } },
  { kv: [["Date", "Samedi 20 sept. · 15h00"], ["Statut", "Confirmé par Thomas"]] },
  { callout: { type: "Info", t: "Pense à vérifier l'article sur place", s: "Confirme la réception une fois l'échange fait." } },
] });

// ── Commandes / historique ──
P("111:12769", "commandes", { top: { title: "Mes commandes" }, body: [
  { segment: ["Achats", "Ventes"], sel: 0 },
  { text: "4 commandes" },
  { chips: ["Trier : récentes"], sel: -1 },
  { list: [
    { t: "Veste en cuir", s: "Thomas · 50 €", ph: "jacket", tone: "prune", st: "Info", badge: "En transit" },
    { t: "Baskets Nike", s: "Julie · 35 €", ph: "shoe", tone: "vert", st: "Disponible", badge: "Livrée" },
    { t: "T-shirt Nike", s: "Lucas · 12 €", ph: "tshirt", tone: "rose", st: "Retourné", badge: "Terminée" },
    { t: "Écharpe", s: "Marie · 10 €", ph: "hanger", tone: "gris", st: "Vendu", badge: "Annulée · remboursée" },
  ] },
] });
P("111:12808", "commandes", { top: { title: "Mes commandes" }, body: [
  { segment: ["Achats", "Ventes"], sel: 1 },
  { text: "2 ventes · 55 € reçus ou à recevoir" },
  { chips: ["Trier : récentes"], sel: -1 },
  { list: [
    { t: "T-shirt Nike", s: "Vendu à Lucas · 20 €", ph: "tshirt", tone: "rose", st: "Disponible", badge: "Payé" },
    { t: "Baskets Adidas", s: "Vendu à Julie · 35 €", ph: "shoe", tone: "vert", st: "Info", badge: "Remise samedi" },
  ] },
] });
P("111:12837", "commandes", { top: { title: "Problème de commande" }, footer: [B("Annuler", "Tertiary"), B("Envoyer")], body: [
  { title: "Un souci ?", sub: "Commande #PND-2481 · Veste en cuir" },
  { chips: ["Non reçu", "Abîmé", "Retard", "Autre"], sel: [0], wrap: true, label: "Type de problème" },
  { fields: [{ label: "Décris le problème", value: "Le colis n'est pas arrivé.", state: "Focus" }] },
  { photoPick: { t: "Ajouter une photo (facultatif)", s: "Montre-nous le problème" } },
  { chips: ["Remboursement", "Renvoi", "Geste commercial"], sel: [0], wrap: true, label: "Solution souhaitée" },
] });
P("111:12937", "commandes", { top: { title: "Remboursement" }, body: [
  { title: "Remboursement en cours", sub: "Commande #PND-2481 · 50 €" },
  { timeline: [
    { t: "Problème signalé", s: "16 sept. · colis non reçu", state: "done" },
    { t: "Commande annulée", s: "16 sept. · validé avec Thomas", state: "done" },
    { t: "Remboursement en cours", s: "50 € · sous 3 à 5 jours ouvrés", state: "current" },
    { t: "Remboursement terminé", s: "À venir", state: "todo" },
  ] },
  { list: [{ t: "Besoin d'aide ?", s: "Contacter le support Penderie", ic: "message" }] },
] });
P("111:12979", "commandes", { top: { title: "Remboursement" }, footer: [B("Revenir à mes achats")], body: [
  { title: "Remboursement terminé", sub: "Commande #PND-2481 · 50 €" },
  { timeline: [
    { t: "Problème signalé", s: "16 sept. · colis non reçu", state: "done" },
    { t: "Commande annulée", s: "16 sept.", state: "done" },
    { t: "Remboursement envoyé", s: "18 sept. · 50 €", state: "done" },
    { t: "Remboursement terminé", s: "20 sept. · 50 € reçus sur ta carte", state: "done" },
  ] },
  { callout: { type: "Succès", t: "Commande close", s: "Tout est réglé, l'argent est de retour sur ta carte." } },
] });

// ── Notifications & recherche ──
P("111:13128", "transversaux", { top: { title: "Notifications" }, body: [
  { text: "3 non lues" },
  { list: [
    { t: "Nouvel ami", s: "Julie a accepté ta demande · 5 min", ic: "users", unread: true },
    { t: "Paiement reçu", s: "20 € pour le T-shirt Nike · 1 h", ic: "card", tone: "success", unread: true },
    { t: "Rappel de retour", s: "Perceuse Bosch à récupérer demain", ic: "clock", unread: true },
    { t: "Prêt en retard", s: "Casque JBL · Marie devait le rendre le 5 sept.", ic: "alert", tone: "error" },
    { t: "Nouveau commentaire", s: "Marie · Veste en jean · hier", ic: "message" },
    { t: "Partage reçu", s: "Lucas · Carton Bricolage · hier", ic: "lock", tone: "cloth" },
    { t: "Colis expédié", s: "Veste en cuir · commande PND-2481", ic: "truck" },
    { t: "Objet retourné", s: "Thomas a rendu la perceuse · 20 sept.", ic: "swap", tone: "success" },
    { t: "Objet prêté", s: "Perceuse Bosch à Thomas · 12 sept.", ic: "swap" },
    { t: "Vente", s: "T-shirt Nike vendu à Lucas · 20 €", ic: "tag" },
    { t: "Achat confirmé", s: "Veste en cuir · commande PND-2481", ic: "check", tone: "success" },
  ] },
] });
P("111:13191", "transversaux", { top: { title: "Notifications" }, body: [
  { text: "0 notification" },
  { empty: { ic: "bell", t: "Tu es à jour !", s: "Les prêts, partages, ventes et livraisons apparaîtront ici.", cta: "Régler mes notifications" } },
] });
P("111:13204", "transversaux", { top: { title: "Recherche" }, body: [
  { search: "garage" }, { text: "6 résultats pour « garage »" },
  { chips: ["Tout", "Objets", "Vêtements", "Cartons", "Lieux", "Amis"], sel: 0 },
  { chips: ["Filtres", "Trier : pertinence"], sel: -1 },
  { list: [
    { t: "Garage", s: "Pièce · Maison principale · 24 objets", ic: "house" },
    { t: "Perceuse Bosch", s: "Objet · Garage › Étagère 2", ph: "drill", tone: "vert", st: "Disponible" },
    { t: "Carton Bricolage", s: "Carton · Garage · 12 objets", ic: "box" },
    { t: "Étagère 2", s: "Rangement · Garage · 12 objets", ic: "sliders" },
    { t: "Veste de pluie", s: "Vêtement · Garage › Armoire", ph: "jacket", tone: "prune" },
    { t: "Thomas", s: "Ami · accès au Garage · lien privé", av: 0 },
  ] },
] });
P("111:13264", "transversaux", { top: { title: "Filtres de recherche", close: true }, footer: [B("Réinitialiser", "Tertiary"), B("Appliquer")], body: [
  { title: "Filtres", sub: "Affine ta recherche dans tout Penderie." },
  { fields: [{ label: "Où chercher", value: "Tous mes logements" }, { label: "Chez qui", value: "Moi et ce qu'on m'a partagé" }] },
  { chips: ["Objets", "Vêtements", "Cartons", "Pièces", "Logements", "Amis"], sel: [0, 1], wrap: true, label: "Type" },
  { fields: [{ label: "Statut", value: "Tous les statuts" }] },
  { chips: ["Aujourd'hui", "7 jours", "30 jours", "Toujours"], sel: [3], wrap: true, label: "Ajouté" },
] });
P("111:13331", "transversaux", { top: { title: "Recherche" }, body: [
  { search: "tondeuse" },
  { chips: ["Tout", "Objets", "Vêtements", "Cartons", "Lieux", "Amis"], sel: 0 },
  { empty: { ic: "search", t: "Aucun résultat pour « tondeuse ».", s: "Vérifie l'orthographe, élargis les filtres ou cherche aussi chez tes amis." } },
] });

// ── Compte & paramètres ──
P("111:13364", "compte", { tab: 4, body: [
  { title: "Paramètres" },
  { list: [
    { t: "Compte", s: "E-mail, mot de passe, déconnexion", ic: "user" },
    { t: "Profils", s: "Famille, enfants, changer de profil", ic: "users" },
    { t: "Notifications", s: "Prêts, ventes, rappels, livraisons", ic: "bell" },
    { t: "Confidentialité", s: "Inventaire privé par défaut", ic: "lock", tone: "cloth" },
    { t: "Partage", s: "Liens privés, personnes autorisées", ic: "link" },
    { t: "Sécurité", s: "Double authentification, appareils", ic: "shield", tone: "success" },
    { t: "Préférences du dressing", s: "Catégories, tailles, tri par défaut", ic: "hanger" },
    { t: "Préférences des tenues", s: "Styles, météo, pièces à éviter", ic: "sparkle" },
  ] },
] });
P("111:13536", "compte", { top: { title: "Mon compte" }, footer: [B("Modifier", "Tertiary"), B("Changer")], body: [
  { profile: { name: "Mathis", sub: "mathis@exemple.fr · membre depuis 2024", st: "Info", badge: "Principal", av: 0 } },
  { h: "Profils rattachés (2)" },
  { list: [
    { t: "Léa", s: "Profil famille · dressing séparé", av: 1, alias: ["Gérer"] },
    { t: "Noé", s: "Profil enfant · contrôle parental", av: 3 },
  ] },
  { link: "+ Ajouter un profil", center: true },
  { link: "Supprimer mon compte", tone: "error", center: true },
] });
P("111:13427", "compte", { top: { title: "Confidentialité" }, footer: [B("Partages", "Tertiary"), B("Enregistrer")], body: [
  { title: "Confidentialité", sub: "Ton inventaire est privé par défaut. Rien n'est visible sans ton accord." },
  { callout: { type: "Privé", t: "Privé par défaut", s: "Tu choisis, élément par élément, qui a accès." } },
  { list: [
    { t: "Personnes autorisées", s: "Thomas, Lucas, Marie · gérer", ic: "users" },
    { t: "Partages actifs", s: "3 partages · révoquer un accès", ic: "link" },
  ] },
  { chips: ["Privé", "Amis", "Amis d'amis"], sel: [0], wrap: true, label: "Visibilité de l'inventaire" },
  { fields: [{ label: "Qui peut m'ajouter", value: "Amis d'amis" }] },
  { chips: ["1 jour", "7 jours", "30 jours"], sel: [1], wrap: true, label: "Durée des liens privés" },
] });
P("111:13510", "compte", { top: { title: "Changer de profil", close: true }, footer: [B("Gérer", "Tertiary"), B("Continuer")], body: [
  { title: "Qui utilise Penderie ?", sub: "Chaque profil a son dressing et ses autorisations." },
  { list: [
    { t: "Mathis", s: "Ton profil", av: 0, st: "Info", badge: "Principal" },
    { t: "Léa", s: "Profil famille", av: 1, st: "Info", badge: "Famille" },
    { t: "Noé", s: "Profil enfant · 9 ans", av: 3, st: "Info", badge: "Enfant" },
  ] },
] });
P("111:13570", "compte", { top: { title: "Profil famille" }, footer: [B("Modifier", "Tertiary"), B("Utiliser")], body: [
  { profile: { name: "Léa", sub: "Compte de Mathis · Maison principale", st: "Info", badge: "Famille", av: 1 } },
  { h: "Ce que Léa peut faire" },
  { list: [
    { t: "Son dressing", s: "Ajouter, modifier, porter", ic: "hanger", st: "Disponible", badge: "Oui", chev: false },
    { t: "Objets de la maison", s: "Voir et emprunter", ic: "box", st: "Disponible", badge: "Oui", chev: false },
  ] },
  { link: "Modifier les accès ›" },
  { link: "Retirer ce profil", tone: "error", center: true },
] });
P("111:13604", "compte", { top: { title: "Nouveau profil", close: true }, footer: [B("Annuler", "Tertiary"), B("Créer")], body: [
  { title: "Profil enfant", sub: "Un espace simple et protégé, géré par toi." },
  { photoPick: { t: "Choisir un avatar", s: "Ou prendre une photo" } },
  { fields: [{ label: "Prénom", value: "Noé", state: "Focus" }, { label: "Âge", value: "9 ans" }] },
  { chips: ["Son dressing", "Ses jouets", "Sa chambre", "Toute la maison"], sel: [2], wrap: true, label: "Il peut voir" },
  { fields: [{ label: "Compte parent", value: "Mathis (toi)" }] },
  { chips: ["Aucune", "Prêts et ventes", "Ajout d'amis", "Tout"], sel: [1], wrap: true, label: "Validation parentale" },
] });
P("111:13687", "compte", { top: { title: "Autorisations" }, footer: [B("Annuler", "Tertiary"), B("Enregistrer")], body: [
  { title: "Autorisations de Noé", sub: "Tu gardes la main sur ce que Noé peut faire." },
  { chips: ["Jamais", "À la famille", "Avec mon accord", "Libre"], sel: [2], wrap: true, label: "Prêter ses affaires" },
  { chips: ["Jamais", "Avec mon accord", "Libre"], sel: [0], wrap: true, label: "Vendre" },
  { chips: ["Jamais", "Avec mon accord", "Libre"], sel: [1], wrap: true, label: "Ajouter des amis" },
] });
P("14:1730", "compte", { tab: 4, body: [
  { profile: { name: "Mathis Chhour", sub: "mathis@exemple.fr", st: "Info", badge: "Principal", av: 0 } },
  { list: [
    { t: "Mes informations personnelles", s: "Nom, e-mail, mot de passe", ic: "user" },
    { t: "Location", s: "Mes logements et mes pièces", ic: "house" },
    { t: "Security and privacy", s: "Confidentialité et sécurité", ic: "lock" },
    { t: "Ajouter / Gérer mes Amis", s: "25 amis · 1 demande", ic: "users" },
  ] },
  { link: "Se déconnecter", tone: "error", center: true },
] });

// ── États système ──
P("111:13854", "systeme", { top: { title: "Mes objets" }, body: [
  { text: "On récupère ton inventaire…" },
  { grid: [1, 2, 3, 4].map(i => ({ t: "Chargement…", m: " ", g: "box", tone: "gris" })) },
  { text: "Quelques secondes, tes 128 objets arrivent.", align: "CENTER" },
] });
P("111:13867", "systeme", { top: { title: "Mes objets" }, fab: "+ Ajouter un objet", body: [
  { text: "0 objet" },
  { empty: { ic: "box", t: "Ton inventaire est vide.", s: "Ajoute un objet ou scanne-le pour commencer à ranger.", cta: "+ Ajouter un objet" } },
] });
P("65:6665", "systeme", home({ toast: { type: "Erreur", title: "Une erreur est survenue", text: "Réessaie dans quelques instants." } }));

// ── Modales de confirmation (ouvertes en overlay) ──
[["111:13770", "Supprimer la Perceuse Bosch ?", "Elle sera retirée de ton inventaire. Cette action est définitive.", "Supprimer"],
 ["111:13784", "Supprimer le T-shirt Nike ?", "Il disparaîtra de ton dressing et de tes tenues enregistrées.", "Supprimer"],
 ["111:13798", "Supprimer le Carton Bricolage ?", "Ses 12 objets restent dans ton inventaire, rangés sur l'Étagère 2.", "Supprimer"],
 ["111:13812", "Supprimer la Maison principale ?", "Ses 12 pièces et 94 objets seront supprimés. Pense à exporter ton inventaire.", "Supprimer"],
 ["111:13826", "Retirer Thomas de tes amis ?", "Il n'aura plus accès à tes partages. Les prêts en cours restent visibles.", "Retirer"],
 ["111:13840", "Retirer l'accès à la Veste en jean ?", "Thomas et Lucas ne pourront plus la voir. Le lien privé sera désactivé.", "Retirer"],
].forEach(([id, title, text, confirm]) => P(id, "systeme", { dialog: { title, text, confirm } }));
