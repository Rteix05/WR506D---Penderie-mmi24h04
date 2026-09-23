// Penderie — prototype UX complet de la page « Maquette »
// À coller dans Scripter (Plugins → Scripter) puis ▶ Run. Relançable sans risque.
//
// Crée UNIQUEMENT des interactions de prototype (On click / After delay) et des points
// de départ de flow. Aucune frame créée, supprimée ou déplacée ; aucun contenu, style,
// composant ou variable modifié.
//
// • Les zones cliquables sont retrouvées par leur texte (bouton, carte, lien) ou leur nom de calque.
//   Un libellé dans un bouton → l'instance du bouton ; dans une carte → la carte entière.
// • Les interactions que tu as créées toi-même sont PRÉSERVÉES : un calque qui a déjà
//   une interaction non créée par ce script n'est pas touché (listé dans le rapport).
// • Règles par défaut : icône ✕ (Close_round), boutons « Retour » / « Annuler » → Retour arrière ;
//   dans une modale → Fermer la modale ; barre de navigation → onglets ; bouton + → menu d'ajout.

const DRY_RUN = false;
const STAMP = "penderie-proto";

// ───────── Transitions (sobres, type app mobile) ─────────
const EASE = { type: "EASE_OUT" };
const TR = {
  push: { type: "PUSH", direction: "LEFT", matchLayers: false, easing: EASE, duration: 0.3 },
  pushBack: { type: "PUSH", direction: "RIGHT", matchLayers: false, easing: EASE, duration: 0.3 },
  fade: { type: "DISSOLVE", easing: EASE, duration: 0.2 },
  tab: null, // instantané pour la barre d'onglets et les onglets internes
};

// ───────── Raccourcis ─────────
const t = (text, o = {}) => ({ text, ...o });        // zone trouvée par son texte
const nm = (name, o = {}) => ({ name, ...o });       // zone trouvée par son nom de calque
const go = (to, tr = "push") => ({ kind: "go", to, tr });
const ov = to => ({ kind: "ov", to });               // ouvrir en overlay (modale)
const back = { kind: "back" };
const close = { kind: "close" };
const after = (to, s) => ({ kind: "go", to, tr: "fade", after: s });
const FAB = nm("Add activity", { last: true, opt: true });
const TOP = { frame: true };                         // la frame elle-même (déclencheur « After delay »)

// ───────── Écrans ─────────
const S = {
  login: "14:1065", dash: "14:1277", menu: "69:6831", choix: "75:7871",
  scan: "87:8138", scanRes: "87:8179", objInfos: "75:7646", objLoc: "75:7724", objVerif: "75:7796", objOk: "75:7977",
  mesObjets: "87:8216", ficheDispo: "72:7184", fichePrete: "87:8236", ficheEmpr: "87:8271", statuts: "87:8306", deplacer: "101:9373",
  logements: "101:9066", logType: "64:6195", logInfos: "64:6286", logPieces: "64:6362", logVerif: "64:6435",
  vueLogement: "101:9109", vuePiece: "101:9152", vueRangement: "101:9215", carton: "101:9275", cartonContenu: "101:9313",
  mesCartons: "14:1767", tousCartons: "75:7496", ficheCarton: "72:7282",
  vetType: "14:1594", vetInfos: "57:4530", vetLoc: "57:4654", vetVerif: "55:4422", vetOk: "65:6559",
  dressing: "106:9507", hauts: "108:10010", filtrer: "106:9567", ficheVet: "72:7097", ficheVetFull: "106:9650",
  historique: "106:9685", vetModif: "106:9723", vetModifVerif: "106:9806", vetModifOk: "108:10260",
  vetPrete: "108:10303", vetEnVente: "108:10346", dressingVide: "108:10071", dressingNoRes: "108:10132", dressingNoFiltre: "108:10193",
  maTenue: "108:10558", prefs: "108:10604", suggestion: "108:10687", remplacer: "110:10928", tenueOk: "110:10977", mesTenues: "108:10725",
  tenueInsuff: "108:10786", tenueIncompat: "108:10799", tenueVide: "108:10812",
  pretAmi: "95:8468", pretInfos: "95:8499", pretVerif: "95:8582", pretOk: "95:8615",
  pretsPrete: "95:8785", pretsEmprunte: "95:8845", retour: "95:8667", retourOk: "95:8750",
  amis: "110:11158", ajoutAmi: "110:11184", demandeEnvoyee: "110:11689", demandeRecue: "110:11210", profilAmi: "110:11236", amisVide: "110:11552",
  partager: "110:11274", lien: "110:11357", lienCopie: "110:11741", accesInvite: "110:11394", mesPartages: "110:11437",
  detailAcces: "110:11500", accesRevoque: "110:11706", commentaires: "110:11526", partagesVide: "110:11565",
  venteInfos: "110:11832", annonce: "110:11915", aVendre: "110:11955", ficheArticle: "110:12016", confirmAchat: "110:12059", achatOk: "110:12105",
  vendu: "111:12249", retire: "111:12288", attente: "111:12327", terminee: "111:12364", refuse: "111:12401",
  recap: "111:12473", paiement: "111:12512", payeOk: "111:12549", livraison: "111:12586", suivi: "111:12669", mainPropre: "111:12732",
  livraisonKo: "111:13021", achats: "111:12769", ventes: "111:12808", probleme: "111:12837", rembEnCours: "111:12937", rembOk: "111:12979",
  profil: "14:1730", compte: "111:13536", parametres: "111:13364", confidentialite: "111:13427", changerProfil: "111:13510",
  profilFamille: "111:13570", profilEnfant: "111:13604", autorisations: "111:13687",
  notifs: "111:13128", notifsVide: "111:13191", recherche: "111:13204", filtresRech: "111:13264", rechVide: "111:13331",
  erreur: "65:6665", chargement: "111:13854", inventaireVide: "111:13867",
  delObjet: "111:13770", delVet: "111:13784", delCarton: "111:13798", delLogement: "111:13812", delAmi: "111:13826", delPartage: "111:13840",
};
const OVERLAYS = new Set([S.delObjet, S.delVet, S.delCarton, S.delLogement, S.delAmi, S.delPartage]);

// Barre de navigation (icônes de gauche à droite) : Accueil · Inventaire · Dressing · Logements · Compte
const NAV_DEST = [S.dash, S.mesObjets, S.dressing, S.logements, S.parametres];
const NAV_OVERRIDE = { [S.dash]: { 1: S.chargement } }; // depuis l'accueil, l'inventaire passe par l'état Chargement
const NO_NAV = new Set([S.menu]);                        // le voile du menu couvre la barre

// ───────── Fiches partagées par plusieurs écrans ─────────
const FICHE_OBJET = [
  [t("Prêter"), go(S.pretAmi)],
  [t("Modifier"), go(S.objInfos)],
  [t("Déplacer l'objet ›", { raw: true, opt: true }), go(S.deplacer)],
  [t("Partager"), go(S.partager)],
  [t("Vendre"), go(S.venteInfos)],
  [t("Supprimer cet objet", { raw: true }), ov(S.delObjet)],
];
const FICHE_VETEMENT = [
  [t("Déplacer"), go(S.vetLoc)],
  [t("Déplacer le vêtement ›", { raw: true, opt: true }), go(S.vetLoc)],
  [t("Modifier"), go(S.vetModif)],
  [t("Prêter"), go(S.pretAmi)],
  [t("Vendre"), go(S.venteInfos)],
  [t("Voir l'historique ›", { raw: true, opt: true }), go(S.historique)],
  [t("Supprimer ce vêtement", { raw: true }), ov(S.delVet)],
];
const DIALOG = dest => [[t("Annuler"), close], [t(/^(Supprimer|Retirer)$/), go(dest, "fade")], [nm("Close_round", { opt: true }), close]];

// ═════════════════ Carte des interactions : écran → [[zone, action], …] ═════════════════
const LINKS = {
  // 1. Authentification
  [S.login]: [
    [t("SE CONNECTER"), go(S.dash, "fade")],
    [t("SE CONNECTER COMME FABIEN"), go(S.dash, "fade")],
    [t("SE CONNECTER COMME BRICE"), go(S.dash, "fade")],
  ],
  // 2. Accueil
  [S.dash]: [
    [FAB, go(S.menu, "fade")],
    [nm("Communication / Bell_Notification"), go(S.notifs)],
    [nm("Communication / Share_Android"), go(S.mesPartages)],
    [t("Ma penderie", { raw: true }), go(S.mesObjets)],
    [t("128 articles · 4 prêtés", { raw: true }), go(S.pretsPrete)],
    [t("Voir la Penderie de mes amis"), go(S.aVendre)],
    [t("Amis : 25", { raw: true }), go(S.amis)],
    [t("13 Cartons Actifs", { raw: true }), go(S.mesCartons)],
    [t("Mathis Chhour", { raw: true }), go(S.profil)],
    [t("T-shirt Nike"), go(S.ficheVetFull)],
    [t("Veste en jean"), go(S.vetPrete)],
  ],
  [S.menu]: [
    [nm("Bulle Vêtement"), go(S.choix)],
    [nm("Bulle Objet"), go(S.tousCartons)],
    [nm("Bulle Logement"), go(S.logType)],
    [nm("Bulle Scanner"), go(S.scan)],
    [nm("Voile"), go(S.dash, "fade")],
    [FAB, go(S.dash, "fade")],
  ],
  [S.choix]: [
    [nm("Carte Vêtement"), go(S.vetType)],
    [nm("Carte Objet"), go(S.scan)],
  ],

  // 3. Ajout d'un objet (scan + ajout manuel)
  [S.scan]: [
    [t("Prendre une photo"), go(S.scanRes)],
    [t("Importer une photo"), go(S.scanRes)],
    [t("Ajouter manuellement", { raw: true }), go(S.objInfos)],
  ],
  [S.scanRes]: [[t("Continuer"), go(S.objInfos)], [t("Modifier"), go(S.objInfos)]],
  [S.objInfos]: [[t("Continuer"), go(S.objLoc)]],
  [S.objLoc]: [[t("Continuer"), go(S.objVerif)]],
  [S.objVerif]: [[t("Ajouter cet objet"), go(S.objOk, "fade")], [t("Modifier"), go(S.objInfos, "pushBack")]],
  [S.objOk]: [[t("Objet ajouté !"), go(S.ficheDispo)]],

  // 4. Gestion d'un objet
  [S.mesObjets]: [
    [t("Perceuse Bosch"), go(S.ficheDispo)],
    [t("Casque JBL"), go(S.ficheDispo)],
    [t("Appareil photo Sony"), go(S.fichePrete)],
    [t("Ballon"), go(S.ficheEmpr)],
    [t("Veste en jean"), go(S.ficheVetFull)],
    [t("Rechercher un objet…"), go(S.recherche)],
    [t("Vêtements"), go(S.dressing)],
    [t("Statut : tous"), go(S.statuts)],
    [FAB, go(S.choix)],
  ],
  [S.ficheDispo]: FICHE_OBJET,
  [S.retourOk]: FICHE_OBJET,
  [S.deplacer]: [[t("Confirmer"), go(S.ficheDispo, "fade")]],
  [S.fichePrete]: [[t("Marquer comme rendu"), go(S.retour)], [t("Modifier le prêt"), go(S.pretInfos)]],
  // Règle métier : un objet emprunté ne peut PAS être prêté → « Prêter » volontairement sans interaction.
  [S.ficheEmpr]: [[t("Rendre"), go(S.pretsEmprunte)]],
  [S.delObjet]: DIALOG(S.mesObjets),

  // 5. Logements / rangements
  [S.logements]: [[t("Maison principale"), go(S.vueLogement)], [t("+ Ajouter un logement"), go(S.logType)], [FAB, go(S.logType)]],
  [S.logType]: [[t("Continuer"), go(S.logInfos)]],
  [S.logInfos]: [[t("Continuer"), go(S.logPieces)]],
  [S.logPieces]: [[t("Continuer"), go(S.logVerif)]],
  [S.logVerif]: [[t("Ajouter ce logement"), go(S.logements, "fade")], [t("Modifier"), go(S.logInfos, "pushBack")]],
  [S.vueLogement]: [[t("Garage"), go(S.vuePiece)]],
  [S.vuePiece]: [[t("Étagère 2"), go(S.vueRangement)], [t("Cartons"), go(S.tousCartons)]],
  [S.vueRangement]: [[t("Ouvrir le carton ›"), go(S.carton)], [t("Perceuse Bosch"), go(S.ficheDispo)]],
  [S.carton]: [
    [t("Voir les 12 objets ›", { raw: true }), go(S.cartonContenu)],
    [t("Perceuse Bosch"), go(S.ficheDispo)],
    [t("Ajouter un objet", { opt: true }), go(S.scan)],
    [t("Supprimer ce carton", { raw: true, opt: true }), ov(S.delCarton)],
  ],
  [S.cartonContenu]: [[t("Perceuse Bosch"), go(S.ficheDispo)]],
  [S.mesCartons]: [[t("Voir tout"), go(S.tousCartons)]],
  [S.tousCartons]: [[t("Carton 1"), go(S.ficheCarton)]],
  [S.ficheCarton]: [
    [t("Ajouter un objet"), go(S.scan)],
    [t("T-shirt Nike", { opt: true }), go(S.ficheVet)],
    [t("Supprimer ce carton", { raw: true }), ov(S.delCarton)],
  ],
  [S.delCarton]: DIALOG(S.tousCartons),

  // 6. Dressing
  [S.dressing]: [
    [t("Hauts"), go(S.hauts)],
    [t("Filtres"), go(S.filtrer)],
    [t("T-shirt Nike"), go(S.ficheVetFull)],
    [t("Veste en jean"), go(S.vetPrete)],
    [t("Baskets Adidas"), go(S.vetEnVente)],
    [t("Rechercher un vêtement, une marque…"), go(S.dressingNoRes)],
    [FAB, go(S.vetType)],
  ],
  [S.hauts]: [
    [t("Sweat Nike Tech"), go(S.ficheVetFull)],
    [t("Chemise en lin"), go(S.ficheVetFull)],
    [t("Tous les filtres"), go(S.filtrer)],
    [t("Couleur"), go(S.dressingNoFiltre)],
  ],
  [S.filtrer]: [[t("Appliquer"), go(S.hauts, "fade")]],
  [S.dressingNoFiltre]: [[t("Filtres (3)"), go(S.filtrer)]],
  [S.ficheVetFull]: FICHE_VETEMENT,
  [S.vetModifOk]: FICHE_VETEMENT,
  [S.ficheVet]: [[t("Prêter"), go(S.pretAmi)], [t("Modifier"), go(S.vetModif)], [t("Supprimer ce vêtement", { raw: true }), ov(S.delVet)]],
  [S.historique]: [[t("Je le porte aujourd'hui"), go(S.maTenue)]],
  [S.vetModif]: [[t("Continuer"), go(S.vetModifVerif)]],
  [S.vetModifVerif]: [[t("Enregistrer"), go(S.vetModifOk, "fade")], [t("Modifier"), go(S.vetModif, "pushBack")]],
  [S.vetPrete]: [[t("Récupéré"), go(S.retour)], [t("Supprimer ce vêtement", { raw: true, opt: true }), ov(S.delVet)]],
  [S.vetEnVente]: [[t("Modifier"), go(S.venteInfos)], [t("Retirer"), go(S.ficheVetFull, "fade")]],
  [S.dressingVide]: [[t("+ Ajouter un vêtement", { raw: true }), go(S.vetType)], [FAB, go(S.vetType)]],
  [S.delVet]: DIALOG(S.dressing),

  // 7. Ajout d'un vêtement
  [S.vetType]: [[t("Continuer"), go(S.vetInfos)]],
  [S.vetInfos]: [[t("Continuer"), go(S.vetLoc)]],
  [S.vetLoc]: [[t("Continuer"), go(S.vetVerif)]],
  [S.vetVerif]: [[t("Ajouter"), go(S.vetOk, "fade")], [t("Modifier"), go(S.vetInfos, "pushBack")]],
  [S.vetOk]: [[t("Vêtement ajouté !"), go(S.ficheVet)]],

  // 8. Suggestion de tenue
  [S.maTenue]: [
    [t("Créer une tenue"), go(S.prefs)],
    [t("3 tenues enregistrées", { raw: true }), go(S.mesTenues)],
    [t("Dernière suggestion · Travail"), go(S.suggestion)],
  ],
  [S.prefs]: [[t("Générer"), go(S.suggestion, "fade")]],
  [S.suggestion]: [
    [t("J'aime cette tenue"), go(S.tenueOk, "fade")],
    [t("Refuser"), go(S.remplacer)],
    [t("Nouvelle tenue", { opt: true }), go(S.prefs, "pushBack")],
  ],
  [S.remplacer]: [[t("Remplacer la pièce"), go(S.suggestion, "fade")]],
  [S.tenueOk]: [[t("Voir mes tenues"), go(S.mesTenues)], [t("Tenue enregistrée !"), go(S.mesTenues)]],
  [S.mesTenues]: [[t("Bureau décontracté"), go(S.tenueOk)], [FAB, go(S.prefs)]],
  [S.tenueIncompat]: [[t("Modifier mes préférences", { raw: true }), go(S.prefs, "pushBack")]],
  [S.tenueVide]: [[t("+ Créer une tenue", { raw: true }), go(S.prefs)]],
  [S.tenueInsuff]: [[t("+ Ajouter un vêtement", { raw: true, opt: true }), go(S.vetType)]],

  // 9. Prêt d'objet
  [S.pretAmi]: [[t("Thomas"), go(S.pretInfos)], [t("Continuer", { opt: true }), go(S.pretInfos)]],
  [S.pretInfos]: [[t("Continuer"), go(S.pretVerif)]],
  [S.pretVerif]: [[t("Confirmer le prêt"), go(S.pretOk, "fade")], [t("Modifier"), go(S.pretInfos, "pushBack")]],
  [S.pretOk]: [[t("Voir l'objet"), go(S.fichePrete)], [t("Prêt enregistré !"), go(S.fichePrete)]],
  [S.pretsPrete]: [[t("J'ai emprunté"), go(S.pretsEmprunte, "tab")], [t("Prêtée à Thomas · retour 20 sept."), go(S.fichePrete)]],
  [S.pretsEmprunte]: [[t("J'ai prêté"), go(S.pretsPrete, "tab")], [t("Console"), go(S.ficheEmpr)]],
  [S.retour]: [[t("Confirmer le retour"), go(S.retourOk, "fade")]],

  // 10. Amis
  [S.amis]: [
    [t("+ Ajouter"), go(S.ajoutAmi)],
    [t("Demandes"), go(S.demandeRecue)],
    [t("Julie"), go(S.demandeRecue)],
    [t("Ami"), go(S.profilAmi)],
  ],
  [S.ajoutAmi]: [[t("Envoyer"), go(S.demandeEnvoyee, "fade")]],
  [S.demandeEnvoyee]: [[t("Demande envoyée !"), go(S.amis)], [t("Retour"), go(S.amis, "pushBack")]],
  [S.demandeRecue]: [[t("Accepter"), go(S.profilAmi, "fade")], [t("Refuser"), go(S.amis, "pushBack")]],
  [S.profilAmi]: [
    [t("Partager", { btn: true }), go(S.partager)],
    [t("Retirer"), ov(S.delAmi)],
    [t("Voir"), go(S.accesInvite)],
    [t("Voir les 3 éléments ›", { raw: true }), go(S.accesInvite)],
  ],
  [S.amisVide]: [[t("+ Ajouter un ami", { raw: true }), go(S.ajoutAmi)]],
  [S.delAmi]: DIALOG(S.amis),

  // 11. Partage privé
  [S.partager]: [[t("Partager", { btn: true }), go(S.lien, "fade")]],
  [S.lien]: [[t("Copier"), go(S.lienCopie, "fade")], [t("Révoquer"), ov(S.delPartage)]],
  [S.lienCopie]: [[t("Lien copié !"), go(S.mesPartages)], [t("Révoquer"), ov(S.delPartage)]],
  [S.accesInvite]: [[t("Voir les commentaires (3)"), go(S.commentaires)]],
  [S.mesPartages]: [[t("Veste en jean"), go(S.detailAcces)], [FAB, go(S.partager)]],
  [S.detailAcces]: [[t("Tout révoquer"), ov(S.delPartage)], [t("Révoquer"), ov(S.delPartage)], [t("Modifier"), go(S.partager)]],
  [S.accesRevoque]: [[t("Accès révoqué"), go(S.mesPartages)]],
  [S.partagesVide]: [[t("Partager un élément", { raw: true }), go(S.partager)]],
  [S.delPartage]: DIALOG(S.accesRevoque),

  // 12. Vente entre amis (vendeur puis acheteur)
  [S.venteInfos]: [[t("Publier"), go(S.annonce, "fade")]],
  [S.annonce]: [[t("Modifier"), go(S.venteInfos)], [t("Retirer"), go(S.ficheVetFull, "fade")], [t("Supprimer ce vêtement", { raw: true, opt: true }), ov(S.delVet)]],
  [S.aVendre]: [[t("Veste en cuir"), go(S.ficheArticle)], [t("Vendu"), go(S.vendu)]],
  [S.ficheArticle]: [[t("Acheter · 45 €"), go(S.recap)]],
  [S.recap]: [[t("Continuer vers le paiement"), go(S.paiement)]],
  [S.paiement]: [[t("Payer 50 €"), go(S.attente, "fade")]],
  [S.attente]: [[TOP, after(S.payeOk, 2.5)], [t("Validation de ta banque en cours…", { raw: true }), go(S.refuse, "fade")]],
  [S.refuse]: [[t("Réessayer"), go(S.paiement, "pushBack")]],
  [S.payeOk]: [[t("Paiement confirmé !"), go(S.livraison)], [t("Commande #PND-2481", { raw: true }), go(S.suivi)]],
  [S.confirmAchat]: [
    [t("Payer 50 €"), go(S.attente, "fade")],
    [t("Carte se terminant par 4242", { raw: true }), go(S.paiement)],
    [t("Colissimo · 5 €", { raw: true }), go(S.livraison)],
  ],

  // 13. Livraison
  [S.livraison]: [[t("Main propre · gratuit"), go(S.mainPropre)], [t(/^(Continuer|Valider|Confirmer)$/), go(S.achatOk, "fade")]],
  [S.achatOk]: [[t("Suivre"), go(S.suivi)], [t("Achat confirmé !"), go(S.suivi)], [t("Commande en cours", { raw: true }), go(S.achats)]],
  [S.suivi]: [[t("Signaler un problème"), go(S.probleme)], [t("Livrée"), go(S.terminee, "fade")], [t("En transit"), go(S.livraisonKo, "fade")]],
  [S.mainPropre]: [[t("J'ai reçu"), go(S.terminee, "fade")]],
  [S.livraisonKo]: [[t("Signaler un problème"), go(S.probleme)], [t("Incident de livraison"), go(S.probleme)]],

  // 14. Commandes / historique
  [S.terminee]: [[t("Commande terminée !"), go(S.achats)]],
  [S.achats]: [
    [t("Ventes"), go(S.ventes, "tab")],
    [t("Veste en cuir"), go(S.suivi)],
    [t("Baskets Nike"), go(S.terminee)],
    [t("T-shirt Nike"), go(S.terminee)],
    [t("Écharpe"), go(S.rembOk)],
  ],
  [S.ventes]: [[t("Achats"), go(S.achats, "tab")], [t("T-shirt Nike"), go(S.annonce)], [t("Baskets Adidas"), go(S.mainPropre)]],
  [S.probleme]: [[t("Envoyer"), go(S.rembEnCours, "fade")]],
  [S.rembEnCours]: [[t("Remboursement terminé"), go(S.rembOk)]],
  [S.rembOk]: [[t("Revenir à mes achats", { raw: true }), go(S.achats, "pushBack")]],

  // 15. Notifications
  [S.notifs]: [
    [t("Nouvel ami"), go(S.profilAmi)],
    [t("Paiement reçu"), go(S.ventes)],
    [t("Rappel de retour"), go(S.fichePrete)],
    [t("Prêt en retard"), go(S.pretsPrete)],
    [t("Nouveau commentaire"), go(S.commentaires)],
    [t("Partage reçu"), go(S.accesInvite)],
    [t("Colis expédié"), go(S.suivi)],
    [t("Objet retourné"), go(S.retourOk)],
    [t("Objet prêté", { opt: true }), go(S.fichePrete)],
    [t("Vente", { opt: true }), go(S.ventes)],
    [t("Achat confirmé", { opt: true }), go(S.achats)],
  ],
  [S.notifsVide]: [[t("Régler mes notifications", { raw: true }), go(S.parametres)]],

  // 16. Recherche
  [S.recherche]: [
    [t("Filtres"), go(S.filtresRech)],
    [t("Garage"), go(S.vuePiece)],
    [t("Perceuse Bosch"), go(S.ficheDispo)],
    [t("Carton Bricolage"), go(S.carton)],
    [t("Étagère 2"), go(S.vueRangement)],
    [t("Veste de pluie"), go(S.ficheVetFull)],
    [t("Thomas"), go(S.profilAmi)],
    [t("garage"), go(S.rechVide, "fade")],
  ],
  [S.filtresRech]: [[t(/^(Appliquer|Voir les résultats|Continuer)$/), go(S.recherche, "fade")]],
  [S.rechVide]: [[t("tondeuse"), go(S.recherche, "fade")]],

  // 17. Compte / paramètres
  [S.parametres]: [
    [t("Compte"), go(S.compte)],
    [t("Profils"), go(S.changerProfil)],
    [t("Notifications"), go(S.notifs)],
    [t("Confidentialité"), go(S.confidentialite)],
    [t("Partage"), go(S.mesPartages)],
    [t("Préférences du dressing"), go(S.filtrer)],
    [t("Préférences des tenues"), go(S.prefs)],
  ],
  [S.compte]: [
    [t("Changer"), go(S.changerProfil)],
    [t("Gérer"), go(S.profilFamille)],
    [t("Gérer", { nth: 1 }), go(S.autorisations)],
    [t("+ Ajouter un profil", { raw: true }), go(S.profilEnfant)],
  ],
  [S.confidentialite]: [
    [t("Partages"), go(S.mesPartages)],
    [t("Enregistrer"), go(S.parametres, "pushBack")],
    [t("3 partages · révoquer un accès"), go(S.mesPartages)],
    [t("Thomas, Lucas, Marie · gérer"), go(S.amis)],
  ],
  [S.changerProfil]: [
    [t("Mathis"), go(S.dash, "fade")],
    [t("Léa"), go(S.profilFamille)],
    [t("Noé"), go(S.autorisations)],
    [t("Gérer"), go(S.compte)],
    [t("Continuer", { opt: true }), go(S.dash, "fade")],
  ],
  [S.profilFamille]: [[t("Utiliser"), go(S.dash, "fade")]],
  [S.profilEnfant]: [[t("Créer"), go(S.autorisations, "fade")]],
  [S.autorisations]: [[t("Enregistrer"), go(S.compte, "fade")]],
  [S.profil]: [
    [t(/^Mes informations/, { opt: true }), go(S.compte)],
    [t(/^Location/, { opt: true }), go(S.logements)],
    [t(/^Security/, { opt: true }), go(S.confidentialite)],
    [t(/Amis$/, { opt: true }), go(S.amis)],
    [t(/^Se d[ée]connecter/, { opt: true }), go(S.login, "fade")],
  ],

  // États système
  [S.chargement]: [[TOP, after(S.mesObjets, 1.2)]],
  [S.inventaireVide]: [[t("+ Ajouter un objet", { raw: true }), go(S.choix)], [FAB, go(S.choix)]],
  [S.erreur]: [[t("Une erreur est survenue", { opt: true }), go(S.vetVerif, "pushBack")]],
  [S.delLogement]: DIALOG(S.logements),
};

// Points de départ de flow (menu « Flows » du mode présentation)
const FLOWS = [
  ["01 · Connexion", S.login], ["02 · Accueil", S.dash], ["03 · Ajouter un objet", S.scan],
  ["04 · Gérer un objet", S.mesObjets], ["05 · Logements & rangements", S.logements], ["06 · Dressing", S.dressing],
  ["07 · Ajouter un vêtement", S.vetType], ["08 · Suggestion de tenue", S.maTenue], ["09 · Prêter un objet", S.ficheDispo],
  ["10 · Mes prêts & retour", S.pretsPrete], ["11 · Amis", S.amis], ["12 · Partage privé", S.partager],
  ["13 · Vendre", S.ficheVetFull], ["14 · Acheter chez un ami", S.aVendre], ["15 · Commandes", S.achats],
  ["16 · Notifications", S.notifs], ["17 · Recherche", S.recherche], ["18 · Compte & paramètres", S.parametres],
];

// ═════════════════ Moteur ═════════════════
if (figma.loadAllPagesAsync) await figma.loadAllPagesAsync();
const page = figma.root.children.find(p => p.name.trim() === "Maquette");
if (!page) throw new Error("Page « Maquette » introuvable");

const norm = s => s.replace(/\s+/g, " ").trim();
const matchText = (n, m) => (m.text instanceof RegExp ? m.text.test(norm(n.characters)) : norm(n.characters) === norm(m.text));
const hasPaint = p => [...(Array.isArray(p.fills) ? p.fills : []), ...(Array.isArray(p.strokes) ? p.strokes : [])]
  .some(f => f.visible !== false && (f.opacity === undefined || f.opacity > 0));
function outerInstance(frame, n) { let top = null; for (let p = n.parent; p && p !== frame; p = p.parent) if (p.type === "INSTANCE") top = p; return top; }
function card(frame, n) {
  const area = frame.width * frame.height;
  for (let p = n.parent; p && p !== frame; p = p.parent) {
    if (p.type === "GROUP") return p;
    if (p.type === "FRAME" && hasPaint(p) && p.width * p.height < area * 0.5) return p;
  }
  return null;
}
function resolve(frame, m) {
  if (m.frame) return frame;
  let hits;
  if (m.text !== undefined) {
    hits = frame.findAll(n => n.type === "TEXT" && n.visible && matchText(n, m));
    if (m.btn) hits = hits.filter(h => outerInstance(frame, h));
  } else hits = frame.findAll(n => n.name === m.name && n.visible);
  const h = m.last ? hits[hits.length - 1] : hits[m.nth || 0];
  if (!h) return null;
  if (m.name || m.raw) return h;
  return outerInstance(frame, h) || card(frame, h) || h;
}
function reaction(a, inOverlay) {
  if (a.kind === "back") return { trigger: { type: "ON_CLICK" }, actions: [{ type: inOverlay ? "CLOSE" : "BACK" }] };
  if (a.kind === "close") return { trigger: { type: "ON_CLICK" }, actions: [{ type: "CLOSE" }] };
  return {
    trigger: a.after ? { type: "AFTER_TIMEOUT", timeout: a.after } : { type: "ON_CLICK" },
    actions: [{
      type: "NODE", destinationId: a.to, navigation: a.kind === "ov" ? "OVERLAY" : "NAVIGATE",
      transition: a.kind === "ov" ? TR.fade : TR[a.tr], preserveScrollPosition: false,
    }],
  };
}
async function setReactions(node, list) {
  const apply = async r => { if (node.setReactionsAsync) await node.setReactionsAsync(r); else node.reactions = r; };
  try { await apply(list); return null; }
  catch (e) {
    try { await apply(list.map(r => ({ trigger: r.trigger, action: r.actions[0] }))); return null; } // ancienne API
    catch (e2) { return e2.message || String(e2); }
  }
}
const label = n => `${n.name}${n.type === "TEXT" ? "" : ` (${n.type.toLowerCase()})`}`;

// Planification : interactions explicites d'abord, puis règles par défaut sur les calques restants
const plan = new Map();      // node.id → { node, frame, reaction, why }
const missing = [], conflicts = [];
const frames = {};
for (const id of new Set([...Object.values(S)])) {
  const f = await figma.getNodeByIdAsync(id);
  if (f && f.type === "FRAME") frames[id] = f; else missing.push(`Écran absent : ${id}`);
}
function put(frameId, node, a, why, explicit) {
  const inOverlay = OVERLAYS.has(frameId);
  if (a.kind !== "back" && a.kind !== "close" && !frames[a.to]) { missing.push(`${frames[frameId].name} → destination absente ${a.to}`); return; }
  const prev = plan.get(node.id);
  if (prev) { if (explicit && prev.why !== why) conflicts.push(`${frames[frameId].name} : « ${label(node)} » visé par « ${prev.why} » et « ${why} » (1re conservée)`); return; }
  plan.set(node.id, { node, frameId, reaction: reaction(a, inOverlay), why });
}

for (const [fid, rows] of Object.entries(LINKS)) {
  const f = frames[fid]; if (!f) continue;
  for (const [m, a] of rows) {
    const node = resolve(f, m);
    const why = m.frame ? "après délai" : (m.text !== undefined ? String(m.text) : m.name);
    if (!node) { if (!m.opt) missing.push(`${f.name} : zone introuvable « ${why} »`); continue; }
    put(fid, node, a, why, true);
  }
}
for (const [fid, f] of Object.entries(frames)) {
  const inOverlay = OVERLAYS.has(fid);
  // ✕ et boutons Retour / Annuler
  for (const n of f.findAll(n => n.visible && n.type === "INSTANCE" && n.name === "Close_round")) put(fid, n, inOverlay ? close : back, "✕", false);
  for (const tx of f.findAll(n => n.type === "TEXT" && n.visible && /^(Retour|Annuler)$/.test(norm(n.characters)))) {
    const node = outerInstance(f, tx) || tx;
    put(fid, node, inOverlay ? close : back, norm(tx.characters), false);
  }
  // Barre de navigation (la plus haute dans l'ordre des calques)
  const navs = f.findAll(n => n.type === "INSTANCE" && n.name === "Nav" && n.visible);
  if (navs.length && !NO_NAV.has(fid)) {
    const icons = navs[navs.length - 1].children;
    icons.forEach((icon, i) => {
      const dest = (NAV_OVERRIDE[fid] || {})[i] || NAV_DEST[i];
      if (dest && dest !== fid) put(fid, icon, go(dest, "tab"), `onglet ${i + 1}`, false);
    });
    const fab = resolve(f, FAB);
    if (fab) put(fid, fab, go(S.menu, "fade"), "bouton +", false);
  }
}

// Application
let created = 0;
const preserved = [], failed = [];
for (const { node, frameId, reaction: r, why } of plan.values()) {
  const own = (() => { try { return node.getPluginData(STAMP) === "1"; } catch (e) { return false; } })();
  if (node.reactions && node.reactions.length && !own) { preserved.push(`${frames[frameId].name} : « ${why} » (interaction existante conservée)`); continue; }
  if (DRY_RUN) { created++; continue; }
  const err = await setReactions(node, [r]);
  if (err) { failed.push(`${frames[frameId].name} : « ${why} » → ${err}`); continue; }
  try { node.setPluginData(STAMP, "1"); } catch (e) { /* calque d'instance : marquage impossible, sans gravité */ }
  created++;
}

// Flows
let flowsAdded = 0;
if (!DRY_RUN) {
  const current = [...(page.flowStartingPoints || [])];
  for (const [name, id] of FLOWS) if (frames[id] && !current.some(x => x.nodeId === id)) { current.push({ nodeId: id, name }); flowsAdded++; }
  try { page.flowStartingPoints = current; } catch (e) { failed.push(`Flows : ${e.message}`); flowsAdded = 0; }
}

// Vérification : écrans sans aucun accès (ni lien entrant, ni départ de flow)
const incoming = new Set((page.flowStartingPoints || []).map(f => f.nodeId));
for (const n of page.findAll(n => "reactions" in n && n.reactions && n.reactions.length)) {
  for (const r of n.reactions) for (const a of (r.actions || (r.action ? [r.action] : []))) if (a && a.destinationId) incoming.add(a.destinationId);
}
if (DRY_RUN) for (const p of plan.values()) { const a = p.reaction.actions[0]; if (a.destinationId) incoming.add(a.destinationId); }
const isolated = page.findAll(n => n.type === "FRAME" && (n.parent.type === "SECTION" || n.parent.type === "PAGE") && !incoming.has(n.id)).map(n => n.name);

print(`${DRY_RUN ? "[SIMULATION] " : ""}Interactions créées : ${created} · flows ajoutés : ${flowsAdded}`);
print(`Zones introuvables / destinations absentes : ${missing.length ? "\n  " + missing.join("\n  ") : "aucune"}`);
print(`Échecs : ${failed.length ? "\n  " + failed.join("\n  ") : "aucun"}`);
print(`Interactions existantes préservées : ${preserved.length ? "\n  " + preserved.join("\n  ") : "aucune"}`);
print(`Conflits : ${conflicts.length ? "\n  " + conflicts.join("\n  ") : "aucun"}`);
print(`Écrans sans accès entrant : ${isolated.length ? "\n  " + isolated.join("\n  ") : "aucun"}`);
figma.notify(`Prototype : ${created} interactions · ${flowsAdded} flows${missing.length ? ` · ${missing.length} à vérifier` : ""}`);
