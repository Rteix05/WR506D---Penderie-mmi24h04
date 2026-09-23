// Penderie — prototype UX complet de la page « Maquette v2 »
// A coller dans Scripter (Plugins → Scripter) puis Run. Relancable sans risque.
//
// Reprend telle quelle la table d'interactions de penderie-prototype.js
// (celle qui a dicte les libelles de tous les lots). Trois differences :
//   1. les ecrans sont retrouves par leur NOM sur la page v2, pas par leur
//      identifiant : la v2 est une duplication, les identifiants ont change ;
//   2. les regles par defaut visent les briques de la v2 (frame
//      « Button/Icon/Retour », frame « Nav » a onglets nommes) et non plus
//      les composants de la v1 ;
//   3. les interactions heritees de la v1 par la duplication de page, qui
//      portent notre marque et ne sont plus au plan, sont retirees.
//
// Cree UNIQUEMENT des interactions et des points de depart de flow : aucune
// frame creee, supprimee ou deplacee, aucun contenu ni style modifie.

const PAGE_CIBLE = "Maquette v2";

// Table identifiant v1 -> nom de frame, reprise de
// penderie-renommage-maquette.js : c'est le pont entre les identifiants de
// la table d'interactions et les frames de la page v2.
const NOMS = {
  "v2:carton-infos": "Rangement — Création · Informations",
  "v2:carton-emplacement": "Rangement — Création · Emplacement",
  "v2:carton-contenu": "Rangement — Création · Contenu",
  "v2:carton-verif": "Rangement — Création · Vérification",
  "v2:carton-confirmation": "Rangement — Création · Confirmation",
  "v2:abo-non": "Abonnés — Profil · Non abonné",
  "v2:abo-ok": "Abonnés — Abonnement confirmé",
  "v2:abo-oui": "Abonnés — Profil · Abonné",
  "v2:abo-desab": "Abonnés — Confirmation · Se désabonner",
  "v2:abo-a-moi": "Abonnés — Profil · Abonné à toi",
  "v2:abo-mutuel": "Abonnés — Mutuel · Proposition ami",
  "v2:abo-demande": "Abonnés — Mutuel · Demande envoyée",
  "v2:abo-abonnes": "Abonnés — Mes abonnés",
  "v2:abo-abonnes-vide": "Abonnés — Mes abonnés · État vide",
  "v2:abo-abonnements": "Abonnés — Mes abonnements",
  "v2:abo-abonnements-vide": "Abonnés — Mes abonnements · État vide",
  // lot 21 — règles métier objets / prêts / localisation
  "v2:obj-perdu": "Objet — Fiche · Perdu",
  "v2:obj-endommage": "Objet — Fiche · Endommagé",
  "v2:obj-vendu": "Objet — Fiche · Vendu",
  "v2:obj-aranger": "Objet — Fiche · À ranger",
  "v2:obj-historique": "Objet — Historique des prêts",
  "v2:obj-deplace": "Objet — Déplacé · Confirmation",
  "v2:scan-analyse": "Objet — Scan · Analyse en cours",
  "v2:scan-echec": "Objet — Scan · Échec",
  "v2:obj-notes": "Objet — Notes et souvenir",
  "v2:pret-probleme": "Prêt — Signaler un problème",
  "v2:pret-perdu": "Prêt — Confirmation · Objet perdu",
  "v2:pret-endommage": "Prêt — Retour · Objet endommagé",
  "v2:pret-nonrendu": "Prêt — Objet non rendu",
  // lot 22 — partage et accès
  "v2:partage-quoi": "Partage — Choisir quoi partager",
  "v2:acces-abonne": "Partage — Accès abonné · Lecture seule",
  "v2:inv-refuse": "Partage — Invité · Accès refusé",
  "v2:inv-expire": "Partage — Invité · Lien révoqué ou expiré",
  "v2:inv-indispo": "Partage — Invité · Contenu indisponible",
  // lot 23 — collections
  "v2:col-liste": "Collection — Mes collections",
  "v2:col-vide": "Collection — État · Aucune collection",
  "v2:col-infos": "Collection — Créer · Informations",
  "v2:col-elements": "Collection — Créer · Éléments",
  "v2:col-mood": "Collection — Créer · Moodboard",
  "v2:col-creee": "Collection — Créée · Confirmation",
  "v2:col-vue": "Collection — Vue",
  "v2:col-modifier": "Collection — Modifier",
  "v2:col-couverture": "Collection — Modifier la couverture",
  "v2:col-supprimer": "Collection — Confirmation · Supprimer",
  "v2:col-ajouter": "Collection — Ajouter à une collection",
  "v2:col-ajoutee": "Collection — Ajoutée · Confirmation",
  "v2:col-partager": "Collection — Partager",
  "v2:col-lien": "Collection — Lien et QR",
  "v2:col-ami": "Collection — Vue ami",
  "v2:col-abonne": "Collection — Vue abonné",
  // lot 24 — l'app m'habille
  "v2:tenue-refus": "Tenue — Pièce refusée",
  "v2:tenue-exclusions": "Tenue — Préférences · Mes exclusions",
  "v2:tenue-reactivee": "Tenue — Préférence réactivée",
  "v2:tenue-reinit": "Tenue — Confirmation · Réinitialiser",
  "v2:styles": "Vêtement — Catégories de style",
  // lot 25 — profils et contrôle parental
  "v2:profil-modifier": "Compte — Modifier un profil",
  "v2:enfant-bloque": "Compte — Enfant · Action bloquée",
  "v2:enfant-demande": "Compte — Enfant · Demande envoyée",
  "v2:code-parent": "Compte — Code parent",
  "v2:enfant-demandes": "Compte — Demandes du profil enfant",
  "v2:enfant-decision": "Compte — Demande pour Noé · Décision",
  "v2:enfant-autorisee": "Compte — Demande pour Noé · Autorisée",
  "v2:del-profil": "Système — Confirmation · Supprimer un profil",
  // lot 27 — commentaires et fil d'actualité
  "v2:com-proprio": "Collection — Vue propriétaire · Commentaires",
  "v2:com-actions-ami": "Collection — Commentaire · Actions (ami)",
  "v2:com-actions-mien": "Collection — Commentaire · Actions (le mien)",
  "v2:com-del": "Collection — Confirmation · Supprimer un commentaire",
  "v2:com-masque": "Collection — Commentaire masqué",
  "v2:com-supprime": "Collection — Commentaire supprimé",
  "v2:com-publie": "Collection — Commentaire publié",
  "v2:com-vide": "Collection — Commentaires · Aucun commentaire",
  "v2:com-off": "Collection — Commentaires · Désactivés",
  "v2:com-piece": "Collection — Pièce · Commentaires",
  "v2:com-piece-abonne": "Collection — Pièce · Vue abonné",
  "v2:fil": "Fil — Fil d'actualité",
  "v2:fil-vide": "Fil — État · Fil vide",
  "v2:fil-publier": "Fil — Publier",
  "v2:fil-publiee": "Fil — Publication publiée",
  "v2:fil-pub": "Fil — Publication",
  "v2:fil-pub-abonne": "Fil — Publication · Vue abonné",
  "v2:fil-mes": "Fil — Mes publications",
  "v2:fil-actions": "Fil — Publication · Actions",
  "v2:fil-del": "Fil — Confirmation · Supprimer une publication",
  "v2:fil-signaler": "Fil — Signaler un contenu",
  "v2:fil-signale": "Fil — Contenu signalé",
  // lot 28 — panneaux de navigation
  "v2:menu-accueil": "Accueil — Menu · Accueil",
  "v2:menu-inventaire": "Accueil — Menu · Inventaire",
  "v2:menu-logements": "Accueil — Menu · Logements",
  "v2:menu-profil": "Accueil — Menu · Profil",
  // lot 29 — paiement en espèces (parcours B de la vente)
  "v2:paiement-mode": "Paiement — Mode de paiement",
  "v2:especes-remise": "Livraison — Remise · Paiement en espèces",
  "v2:especes-ok": "Paiement — Remise confirmée · Espèces",
  // lot 26 — back-office (desktop)
  "v2:admin-login": "Admin — Connexion",
  "v2:admin-dash": "Admin — Tableau de bord",
  "v2:admin-users": "Admin — Utilisateurs",
  "v2:admin-user": "Admin — Fiche utilisateur",
  "v2:admin-signalements": "Admin — Signalements",
  "v2:admin-signalement": "Admin — Détail d'un signalement",
  "v2:admin-suspendre": "Admin — Confirmation · Suspendre un compte",
  "v2:admin-ventes": "Admin — Ventes et transactions",
  "v2:admin-litiges": "Admin — Litiges et remboursements",
  "v2:admin-litige": "Admin — Détail d'un litige",
  "v2:admin-categories": "Admin — Catégories",
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
const sw = to => ({ kind: "sw", to });               // échanger l'overlay ouvert contre un autre
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
  // Parcours ajoute en v2 : pas d'equivalent v1, donc des cles synthetiques.
  cartonInfos: "v2:carton-infos", cartonLieu: "v2:carton-emplacement", cartonContenuNew: "v2:carton-contenu",
  cartonVerif: "v2:carton-verif", cartonOk: "v2:carton-confirmation",
  // Parcours abonnés (lot 20)
  aboNon: "v2:abo-non", aboOk: "v2:abo-ok", aboOui: "v2:abo-oui", aboDesab: "v2:abo-desab",
  aboAMoi: "v2:abo-a-moi", aboMutuel: "v2:abo-mutuel", aboDemande: "v2:abo-demande",
  mesAbonnes: "v2:abo-abonnes", abonnesVide: "v2:abo-abonnes-vide",
  mesAbonnements: "v2:abo-abonnements", abonnementsVide: "v2:abo-abonnements-vide",
  // Règles métier objets (lot 21)
  fichePerdu: "v2:obj-perdu", ficheEndommage: "v2:obj-endommage", ficheVendu: "v2:obj-vendu",
  ficheARanger: "v2:obj-aranger", histoPrets: "v2:obj-historique", deplace: "v2:obj-deplace",
  scanAnalyse: "v2:scan-analyse", scanEchec: "v2:scan-echec", notesSouvenir: "v2:obj-notes",
  pretProbleme: "v2:pret-probleme", pretPerdu: "v2:pret-perdu", retourAbime: "v2:pret-endommage",
  nonRendu: "v2:pret-nonrendu",
  // Partage et accès (lot 22)
  choisirQuoi: "v2:partage-quoi", accesAbonne: "v2:acces-abonne",
  invRefuse: "v2:inv-refuse", invExpire: "v2:inv-expire", invIndispo: "v2:inv-indispo",
  // Collections (lot 23)
  colListe: "v2:col-liste", colVide: "v2:col-vide", colInfos: "v2:col-infos", colElements: "v2:col-elements",
  colMood: "v2:col-mood", colCreee: "v2:col-creee", colVue: "v2:col-vue", colModifier: "v2:col-modifier",
  colCouverture: "v2:col-couverture", colSupprimer: "v2:col-supprimer", colAjouter: "v2:col-ajouter",
  colAjoutee: "v2:col-ajoutee", colPartager: "v2:col-partager", colLien: "v2:col-lien",
  colAmi: "v2:col-ami", colAbonne: "v2:col-abonne",
  // L'app m'habille (lot 24)
  pieceRefusee: "v2:tenue-refus", exclusions: "v2:tenue-exclusions", prefReactivee: "v2:tenue-reactivee",
  reinitPrefs: "v2:tenue-reinit", styles: "v2:styles",
  // Profils et contrôle parental (lot 25)
  modifierProfil: "v2:profil-modifier", enfantBloque: "v2:enfant-bloque", enfantDemande: "v2:enfant-demande",
  codeParent: "v2:code-parent", demandesEnfant: "v2:enfant-demandes", decisionEnfant: "v2:enfant-decision",
  enfantAutorisee: "v2:enfant-autorisee", delProfil: "v2:del-profil",
  // Back-office (lot 26)
  adminLogin: "v2:admin-login", adminDash: "v2:admin-dash", adminUsers: "v2:admin-users", adminUser: "v2:admin-user",
  adminSignalements: "v2:admin-signalements", adminSignalement: "v2:admin-signalement",
  adminSuspendre: "v2:admin-suspendre", adminVentes: "v2:admin-ventes", adminLitiges: "v2:admin-litiges",
  adminLitige: "v2:admin-litige", adminCategories: "v2:admin-categories",
  // Commentaires et fil (lot 27)
  comProprio: "v2:com-proprio", comActionsAmi: "v2:com-actions-ami", comActionsMien: "v2:com-actions-mien",
  comDel: "v2:com-del", comMasque: "v2:com-masque", comSupprime: "v2:com-supprime", comPublie: "v2:com-publie",
  comVide: "v2:com-vide", comOff: "v2:com-off", comPiece: "v2:com-piece", comPieceAbonne: "v2:com-piece-abonne",
  fil: "v2:fil", filVide: "v2:fil-vide", filPublier: "v2:fil-publier", filPubliee: "v2:fil-publiee",
  filPub: "v2:fil-pub", filPubAbonne: "v2:fil-pub-abonne", filMes: "v2:fil-mes", filActions: "v2:fil-actions",
  filDel: "v2:fil-del", filSignaler: "v2:fil-signaler", filSignale: "v2:fil-signale",
  // Panneaux de navigation (lot 28)
  menuAccueil: "v2:menu-accueil", menuInventaire: "v2:menu-inventaire",
  menuLogements: "v2:menu-logements", menuProfil: "v2:menu-profil",
  // Paiement en espèces (lot 29)
  modePaiement: "v2:paiement-mode", especes: "v2:especes-remise", especesOk: "v2:especes-ok",
};
const OVERLAYS = new Set([S.delObjet, S.delVet, S.delCarton, S.delLogement, S.delAmi, S.delPartage, S.aboDesab,
  S.pretPerdu, S.colSupprimer, S.reinitPrefs, S.delProfil, S.adminSuspendre,
  S.comActionsAmi, S.comActionsMien, S.comDel, S.filActions, S.filDel,
  S.menuAccueil, S.menuInventaire, S.menuLogements, S.menuProfil]);

// Lot 28 : un onglet de la barre OUVRE son panneau (overlay). Dans un
// panneau ouvert, un autre onglet l'échange (SWAP), le sien le ferme.
const NAV_MENU = { "Accueil": S.menuAccueil, "Inventaire": S.menuInventaire, "Logements": S.menuLogements, "Profil": S.menuProfil };
const MENU_ONGLET = { [S.menuAccueil]: "Accueil", [S.menuInventaire]: "Inventaire", [S.menuLogements]: "Logements", [S.menuProfil]: "Profil" };

// Barre latérale du back-office : frames « Admin/Nav/<libellé>/Actif|Inactif »
const ADMIN_NAV = {
  "Tableau de bord": S.adminDash, "Utilisateurs": S.adminUsers, "Signalements": S.adminSignalements,
  "Ventes et transactions": S.adminVentes, "Litiges": S.adminLitiges, "Catégories": S.adminCategories,
};

// Barre de navigation v2 : les onglets sont des frames nommees
// « Nav/Tab/<libelle>/Actif|Inactif ». Il n'y a PAS d'onglet Dressing
// (l'emplacement central est celui du bouton +), donc on associe par
// libelle et jamais par position.
const NAV_DEST = { "Accueil": S.dash, "Inventaire": S.mesObjets, "Logements": S.logements, "Profil": S.profil };
// Depuis l'accueil, l'inventaire passe par l'etat Chargement.
const NAV_OVERRIDE = { [S.dash]: { "Inventaire": S.chargement } };
const NO_NAV = new Set([S.menu]);   // le voile du menu couvre la barre

// ───────── Fiches partagées par plusieurs écrans ─────────
const FICHE_OBJET = [
  [t("Prêter"), go(S.pretAmi)],
  [t("Modifier la note ›", { raw: true, opt: true }), go(S.notesSouvenir)],
  [t("Historique des prêts", { opt: true }), go(S.histoPrets)],
  [t("Ajouter à une collection", { opt: true }), go(S.colAjouter)],
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
  // Accueil v2 (reconstruit par le lot 01) : les zones sont visées par NOM
  // DE CALQUE. Les anciens libellés de la v1 (« Ma penderie », « Amis : 25 »…)
  // n'existent plus : tous ces boutons étaient inertes jusqu'au 14 septembre.
  [S.dash]: [
    [FAB, go(S.menu, "fade")],
    [nm("Notifications"), go(S.notifs)],
    [nm("Avatar"), go(S.profil)],
    [nm("Button/Primary/Scanner"), go(S.scan)],
    [nm("Button/Secondary/Ajouter"), go(S.menu, "fade")],
    [nm("Card/Apercu/Inventaire"), go(S.mesObjets)],
    [nm("Card/Apercu/Dressing"), go(S.dressing)],
    [t("Tout voir", { raw: true }), go(S.mesObjets)],              // Derniers ajouts
    [t("Tout voir", { raw: true, nth: 1 }), go(S.pretsPrete)],     // Prêts en cours
    [t("Tout voir", { raw: true, nth: 2 }), go(S.mesTenues)],      // Tenues suggérées
    [nm("Card/Object/T-shirt Nike"), go(S.ficheVetFull)],
    [nm("Card/Object/Veste en jean"), go(S.vetPrete)],
    [nm("Card/Object/Perceuse Bosch", { opt: true }), go(S.ficheDispo)],
    [nm("Card/Object/Casquette NY", { opt: true }), go(S.ficheVetFull)],
    [nm("Card/Loan/Appareil photo Sony", { opt: true }), go(S.fichePrete)],
    [nm("Card/Loan/Ponceuse Makita", { opt: true }), go(S.ficheEmpr)],
    [nm("Card/Loan/Ballon", { opt: true }), go(S.ficheEmpr)],      // ancien nom, tant que le calque n'est pas renommé
    [nm("Card/Loan/Perceuse Bosch", { opt: true }), go(S.nonRendu)],
    [nm("Card/Outfit/Decontracte", { opt: true }), go(S.suggestion)],
    [nm("Card/Outfit/Sortie du soir", { opt: true }), go(S.mesTenues)],
    [nm("Lien/Amis", { opt: true }), go(S.aVendre)],
  ],
  // Menu d'ajout remanie a la main dans Figma. Verifie dans le fichier le
  // 2026-09-12 : les NOMS DE CALQUES n'ont pas bouge, seuls les textes ont
  // change — « Bulle Vetement » porte desormais « Vetements et Objets » et
  // « Bulle Objet » porte « Cartons ». On vise donc par nom de calque, bien
  // plus sur ici : la frame contient une copie complete du tableau de bord
  // sous le voile, ou les mots « Scanner » et « Objets » apparaissent aussi.
  // Les noms « logiques » sont acceptes en repli, pour survivre a un
  // renommage ulterieur des calques.
  [S.menu]: [
    [nm("Bulle Vêtements et objets", { opt: true }), go(S.choix)],
    [nm("Bulle Vêtement"), go(S.choix)],          // porte « Vêtements et Objets »
    [nm("Bulle Cartons", { opt: true }), go(S.cartonInfos)],
    [nm("Bulle Objet"), go(S.cartonInfos)],       // porte « Cartons »
    [nm("Bulle Logement"), go(S.logType)],
    [nm("Bulle Scanner"), go(S.scan)],
    [t("Fermer", { last: true, opt: true }), go(S.dash, "fade")],
    [nm("Voile"), go(S.dash, "fade")],
    [FAB, go(S.dash, "fade")],
  ],
  [S.choix]: [
    [nm("Carte Vêtement"), go(S.vetType)],
    [nm("Carte Objet"), go(S.scan)],
  ],

  // 3. Ajout d'un objet (scan + ajout manuel)
  [S.scan]: [
    [t("Prendre une photo"), go(S.scanAnalyse, "fade")],
    [t("Importer une photo"), go(S.scanAnalyse, "fade")],
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
    [t("Casque JBL"), go(S.ficheARanger)],
    [t("Appareil photo Sony"), go(S.fichePrete)],
    [t("Ponceuse Makita"), go(S.ficheEmpr)],
    [t("Enceinte Marshall"), go(S.ficheVendu)],
    [t("Veste en jean"), go(S.ficheVetFull)],
    [t("Rechercher un objet..."), go(S.recherche)],
    [t("Vêtements"), go(S.dressing)],
    [t("Statut : tous"), go(S.statuts)],
    [FAB, go(S.choix)],
  ],
  [S.ficheDispo]: FICHE_OBJET,
  // L'écran de confirmation de retour n'est pas une fiche : ses propres actions
  [S.retourOk]: [[t("Voir l'objet"), go(S.ficheDispo)], [t("Mes prêts"), go(S.pretsPrete)], [t("Objet rendu !"), go(S.ficheDispo)]],
  [S.deplacer]: [[t("Confirmer"), go(S.deplace, "fade")]],
  [S.fichePrete]: [
    [t("Marquer comme rendu"), go(S.retour)], [t("Modifier le prêt"), go(S.pretInfos)],
    [t("Signaler un problème"), go(S.pretProbleme)], [t("Historique des prêts"), go(S.histoPrets)],
  ],

  // 4 bis. Règles métier (lot 21)
  [S.pretProbleme]: [[t("Continuer"), ov(S.pretPerdu)]],
  [S.pretPerdu]: [[t("Déclarer perdue"), go(S.fichePerdu, "fade")]],
  [S.fichePerdu]: [[t("Marquer comme retrouvé"), go(S.ficheDispo, "fade")], [t("Historique des prêts"), go(S.histoPrets)]],
  [S.ficheEndommage]: [
    [t("Marquer comme réparé"), go(S.ficheDispo, "fade")], [t("Modifier"), go(S.objInfos)],
    [t("Déplacer l'objet ›", { raw: true }), go(S.deplacer)], [t("Historique des prêts"), go(S.histoPrets)],
  ],
  [S.ficheVendu]: [[t("Voir l'historique"), go(S.histoPrets)], [t("Historique des prêts"), go(S.histoPrets)]],
  [S.ficheARanger]: [[t("Ranger"), go(S.deplacer)], [t("Prêter"), go(S.pretAmi)], [t("Vendre"), go(S.venteInfos)],
                     [t("Supprimer cet objet", { raw: true }), ov(S.delObjet)]],
  [S.deplace]: [[t("Voir l'objet"), go(S.ficheDispo)], [t("Annuler le déplacement"), go(S.deplacer, "pushBack")],
                [t("Objet déplacé !"), go(S.ficheDispo)]],
  [S.scanAnalyse]: [[TOP, after(S.scanRes, 1.8)], [t("Analyse en cours…", { raw: true }), go(S.scanEchec, "fade")],
                    [t("Ajouter manuellement"), go(S.objInfos)]],
  [S.scanEchec]: [[t("Réessayer"), go(S.scan, "pushBack")], [t("Ajouter manuellement"), go(S.objInfos)]],
  [S.notesSouvenir]: [[t("Enregistrer"), go(S.ficheDispo, "fade")], [t("Effacer la note et le souvenir", { raw: true }), go(S.ficheDispo, "fade")]],
  [S.retourAbime]: [[t("Confirmer le retour"), go(S.ficheEndommage, "fade")]],
  [S.nonRendu]: [[t("Relancer Julie"), go(S.pretsPrete, "fade")], [t("Prolonger le prêt"), go(S.pretInfos)],
                 [t("Déclarer perdue", { raw: true }), ov(S.pretPerdu)]],
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
  [S.vuePiece]: [[t("Étagère 2"), go(S.vueRangement)], [t("Cartons"), go(S.tousCartons)],
                 [t("Partager cette pièce"), go(S.choisirQuoi)]],
  [S.vueRangement]: [[t("Ouvrir le carton ›"), go(S.carton)], [t("Perceuse Bosch"), go(S.ficheDispo)]],
  [S.carton]: [
    [t("Voir les 12 objets ›", { raw: true }), go(S.cartonContenu)],
    [t("Perceuse Bosch"), go(S.ficheDispo)],
    [t("Ajouter un objet", { opt: true }), go(S.scan)],
    [t("Supprimer ce carton", { raw: true, opt: true }), ov(S.delCarton)],
  ],
  [S.cartonContenu]: [[t("Perceuse Bosch"), go(S.ficheDispo)]],
  [S.mesCartons]: [[t("Voir tout"), go(S.tousCartons)], [t("+ Créer un carton", { raw: true }), go(S.cartonInfos)]],
  [S.tousCartons]: [[t("Carton 1"), go(S.ficheCarton)]],
  [S.ficheCarton]: [
    [t("Ajouter un objet"), go(S.scan)],
    [t("T-shirt Nike", { opt: true }), go(S.ficheVet)],
    [t("Supprimer ce carton", { raw: true }), ov(S.delCarton)],
  ],
  [S.delCarton]: DIALOG(S.tousCartons),

  // 5 bis. Creation d'un carton (parcours ajoute en v2)
  [S.cartonInfos]: [[t("Continuer"), go(S.cartonLieu)]],
  [S.cartonLieu]: [[t("Continuer"), go(S.cartonContenuNew)]],
  [S.cartonContenuNew]: [[t("Continuer"), go(S.cartonVerif)], [t("Scanner les objets"), go(S.scan)]],
  [S.cartonVerif]: [[t("Créer le carton"), go(S.cartonOk, "fade")], [t("Modifier"), go(S.cartonInfos, "pushBack")]],
  [S.cartonOk]: [[t("Carton créé !"), go(S.ficheCarton)], [t("Voir le carton"), go(S.ficheCarton)],
                 [t("Créer un autre carton"), go(S.cartonInfos, "fade")]],

  // 6. Dressing
  [S.dressing]: [
    [t("Hauts"), go(S.hauts)],
    [t("Filtres"), go(S.filtrer)],
    [t("T-shirt Nike"), go(S.ficheVetFull)],
    [t("Veste en jean"), go(S.vetPrete)],
    [t("Baskets Adidas"), go(S.vetEnVente)],
    [t("Rechercher un vêtement, une marque..."), go(S.dressingNoRes)],
    [FAB, go(S.vetType)],
  ],
  [S.hauts]: [
    [t("T-shirt Nike"), go(S.ficheVetFull)],
    [t("Chemise blanche"), go(S.ficheVetFull)],
    [t("Veste en jean"), go(S.vetPrete)],
    [t("Tous"), go(S.dressing, "tab")],
  ],
  [S.filtrer]: [[t("Appliquer"), go(S.hauts, "fade")]],
  [S.dressingNoFiltre]: [[t("Réinitialiser les filtres"), go(S.filtrer)]],
  [S.ficheVetFull]: FICHE_VETEMENT,
  [S.vetModifOk]: FICHE_VETEMENT,
  [S.ficheVet]: [[t("Prêter"), go(S.pretAmi)], [t("Modifier"), go(S.vetModif)], [t("Supprimer ce vêtement", { raw: true }), ov(S.delVet)]],
  [S.historique]: [[t("Je le porte aujourd'hui"), go(S.maTenue)]],
  [S.vetModif]: [[t("Continuer"), go(S.vetModifVerif)]],
  [S.vetModifVerif]: [[t("Enregistrer"), go(S.vetModifOk, "fade")], [t("Modifier"), go(S.vetModif, "pushBack")]],
  [S.vetPrete]: [[t("Récupéré"), go(S.retour)], [t("Supprimer ce vêtement", { raw: true, opt: true }), ov(S.delVet)]],
  [S.vetEnVente]: [[t("Modifier"), go(S.venteInfos)], [t("Retirer de la vente"), go(S.ficheVetFull, "fade")]],
  [S.dressingVide]: [[t("Ajouter un vêtement"), go(S.vetType)], [FAB, go(S.vetType)]],
  [S.delVet]: DIALOG(S.dressing),

  // 7. Ajout d'un vêtement
  [S.vetType]: [[t("Continuer"), go(S.vetInfos)]],
  [S.vetInfos]: [[t("Continuer"), go(S.vetLoc)], [t("Voir les catégories de style"), go(S.styles)]],
  [S.vetLoc]: [[t("Continuer"), go(S.vetVerif)]],
  [S.vetVerif]: [[t("Ajouter"), go(S.vetOk, "fade")], [t("Modifier"), go(S.vetInfos, "pushBack")]],
  [S.vetOk]: [[t("Vêtement ajouté !"), go(S.ficheVet)]],

  // 8. Suggestion de tenue
  [S.maTenue]: [
    [t("Créer une tenue"), go(S.prefs)],
    [t("3 tenues enregistrées", { raw: true }), go(S.mesTenues)],
    [t("Dernière suggestion · Travail"), go(S.suggestion)],
  ],
  [S.prefs]: [
    [t("Générer"), go(S.suggestion, "fade")],
    [t("Gérer"), go(S.exclusions)],
    [t("Les catégories de style"), go(S.styles)],
    [t("Réinitialiser mes préférences", { raw: true }), ov(S.reinitPrefs)],
  ],
  // Lot 24 : « Refuser » global remplacé par deux actions par pièce
  [S.suggestion]: [
    [t("J'aime cette tenue"), go(S.tenueOk, "fade")],
    // 2e pièce = le T-shirt Nike, celui des écrans Remplacer et Pièce refusée
    [t("Remplacer", { raw: true, nth: 1 }), go(S.remplacer)],
    [t("Je n'aime pas", { raw: true, nth: 1 }), go(S.pieceRefusee, "fade")],
    [t("Nouvelle tenue", { opt: true }), go(S.prefs, "pushBack")],
  ],
  [S.pieceRefusee]: [
    [t("J'aime cette tenue"), go(S.tenueOk, "fade")],
    [t("Voir mes exclusions"), go(S.exclusions)],
    [t("Annuler le refus", { raw: true }), go(S.suggestion, "pushBack")],
  ],
  [S.exclusions]: [
    [t("Réactiver", { raw: true }), go(S.prefReactivee, "fade")],
    [t("Terminé"), go(S.prefs, "pushBack")],
    [t("Tout réinitialiser", { raw: true }), ov(S.reinitPrefs)],
  ],
  [S.prefReactivee]: [
    [t("Annuler la réactivation", { raw: true }), go(S.exclusions, "pushBack")],
    [t("Terminé"), go(S.prefs, "pushBack")],
    [t("Tout réinitialiser", { raw: true }), ov(S.reinitPrefs)],
  ],
  [S.reinitPrefs]: [[t("Réinitialiser"), go(S.prefs, "fade")]],
  [S.styles]: [[t("Compris"), back]],
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
  [S.pretsPrete]: [[t("J'ai emprunté"), go(S.pretsEmprunte, "tab")], [t("Prêtée à Thomas · retour 20 sept."), go(S.fichePrete)],
                   [t("Tondeuse"), go(S.nonRendu)]],
  [S.pretsEmprunte]: [[t("J'ai prêté"), go(S.pretsPrete, "tab")], [t("Ponceuse Makita"), go(S.ficheEmpr)]],
  [S.retour]: [[t("Confirmer le retour"), go(S.retourOk, "fade")], [t("Signaler un dommage"), go(S.retourAbime)]],

  // 10. Amis
  [S.amis]: [
    [t("+ Ajouter"), go(S.ajoutAmi)],
    [t("Demandes"), go(S.demandeRecue)],
    [t("Julie"), go(S.demandeRecue)],
    [t("Ami"), go(S.profilAmi)],
    // Onglets ajoutés par le lot 20 : visés par nom de calque (un onglet
    // inactif n'a pas de fond, son texte remonterait jusqu'au rail commun).
    [nm("Nav/Tab/Abonnés (5)/Inactif"), go(S.mesAbonnes, "tab")],
    [nm("Nav/Tab/Abonnements (4)/Inactif"), go(S.mesAbonnements, "tab")],
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

  // 10 bis. Abonnés (lot 20). « Annuler » de la modale : règle par défaut (close).
  [S.aboNon]: [[t("S'abonner"), go(S.aboOk, "fade")], [t("Demander en ami"), go(S.ajoutAmi)]],
  [S.aboOk]: [
    [t("Abonné"), ov(S.aboDesab)],
    [t("Abonnement confirmé !"), go(S.aboOui)],
    [t("Demander en ami"), go(S.ajoutAmi)],
  ],
  [S.aboOui]: [[t("Abonné"), ov(S.aboDesab)], [t("Demander en ami"), go(S.ajoutAmi)]],
  [S.aboDesab]: [[t("Se désabonner"), go(S.aboNon, "fade")]],
  [S.aboAMoi]: [[t("S'abonner en retour"), go(S.aboMutuel, "fade")], [t("Demander en ami"), go(S.ajoutAmi)]],
  [S.aboMutuel]: [[t("Devenir amis"), go(S.aboDemande, "fade")], [t("Plus tard"), go(S.mesAbonnements, "pushBack")]],
  [S.aboDemande]: [
    [t("Demande d'ami envoyée !"), go(S.mesAbonnements)],
    [t("Annuler la demande"), go(S.aboMutuel, "pushBack")],
  ],
  [S.mesAbonnes]: [
    [nm("Nav/Tab/Amis (12)/Inactif"), go(S.amis, "tab")],
    [nm("Nav/Tab/Abonnements (4)/Inactif"), go(S.mesAbonnements, "tab")],
    [nm("Button/Relation/S'abonner en retour"), go(S.aboMutuel, "fade")],   // 1re occurrence = Paul
    [t("Paul"), go(S.aboAMoi)],
    [nm("Button/Relation/Ami"), go(S.profilAmi)],                          // 1re occurrence = Thomas
    [t("Thomas"), go(S.profilAmi)],
  ],
  [S.mesAbonnements]: [
    [nm("Nav/Tab/Amis (12)/Inactif"), go(S.amis, "tab")],
    [nm("Nav/Tab/Abonnés (5)/Inactif"), go(S.mesAbonnes, "tab")],
    [nm("Button/Relation/Abonné", { nth: 1 }), ov(S.aboDesab)],           // 2e occurrence = Inès
    [t("Inès"), go(S.aboOui)],
    [t("Thomas"), go(S.profilAmi)],
  ],
  [S.abonnesVide]: [[t("Voir mes amis"), go(S.amis, "pushBack")]],
  [S.abonnementsVide]: [[t("Voir mes amis"), go(S.amis, "pushBack")]],

  // 11. Partage privé
  [S.partager]: [[t("Partager", { btn: true }), go(S.lien, "fade")], [t("Changer ›", { raw: true }), go(S.choisirQuoi)]],
  [S.lien]: [
    [t("Copier"), go(S.lienCopie, "fade")], [t("Révoquer"), ov(S.delPartage)],
    // Aperçu par profil de visiteur (lot 22)
    [t("Un ami autorisé"), go(S.accesInvite)],
    [t("Un abonné autorisé"), go(S.accesAbonne)],
    [t("Une personne non autorisée"), go(S.invRefuse)],
  ],
  [S.choisirQuoi]: [[t("Continuer"), go(S.partager)]],

  // 11 bis. Collections (lot 23). Les états « accès refusé » et « lien
  // révoqué » sont les écrans génériques du partage (lot 22).
  [S.colListe]: [[t("+ Créer une collection"), go(S.colInfos)], [t("Mon style — été 2026"), go(S.colVue)]],
  [S.colVide]: [[t("+ Créer une collection"), go(S.colInfos)]],
  [S.colInfos]: [[t("Continuer"), go(S.colElements)]],
  [S.colElements]: [[t("Continuer"), go(S.colMood)]],
  [S.colMood]: [[t("Enregistrer la collection"), go(S.colCreee, "fade")]],
  [S.colCreee]: [[t("Collection créée !"), go(S.colVue)], [t("Partager", { btn: true }), go(S.colPartager)],
                 [t("Modifier"), go(S.colModifier)]],
  [S.colVue]: [[t("Partager", { btn: true }), go(S.colPartager)], [t("Modifier"), go(S.colModifier)],
               [t("+ Ajouter des éléments"), go(S.colElements)],
               [t("Commentaires"), go(S.comProprio)], [t("Publier dans le fil"), go(S.filPublier)]],

  // 11 ter. Commentaires d'une collection (lot 27). Les « ··· » ouvrent une
  // feuille d'actions en overlay ; « Annuler » la ferme (règle par défaut).
  [S.comProprio]: [
    [t("···", { raw: true }), ov(S.comActionsAmi)],             // 1er = Julie
    [t("···", { raw: true, nth: 1 }), ov(S.comActionsMien)],    // 2e = mon commentaire
    [t("···", { raw: true, nth: 2 }), ov(S.comActionsAmi)],     // 3e = Thomas
    [t("Publier"), go(S.comPublie, "fade")],
  ],
  [S.comActionsAmi]: [
    [t("Masquer ce commentaire"), go(S.comMasque, "fade")],
    [t("Signaler"), go(S.filSignaler)],
    [t("Répondre"), close],
  ],
  [S.comActionsMien]: [[t("Supprimer mon commentaire"), ov(S.comDel)], [t("Modifier"), close]],
  [S.comDel]: [[t("Supprimer"), go(S.comSupprime, "fade")]],
  [S.comMasque]: [[t("Annuler le masquage", { raw: true }), go(S.comProprio, "pushBack")], [t("Retour à la collection"), go(S.colVue, "pushBack")]],
  [S.comSupprime]: [[t("Retour à la collection"), go(S.colVue, "pushBack")]],
  [S.comPublie]: [[t("Retour à la collection"), go(S.colAmi, "pushBack")]],
  [S.comVide]: [[t("Publier"), go(S.comPublie, "fade")]],
  [S.comOff]: [[t("Fermer"), back]],
  [S.comPiece]: [[t("Publier"), go(S.comPublie, "fade")], [t("···", { raw: true }), go(S.filSignaler)]],
  [S.comPieceAbonne]: [[t("Fermer"), back]],
  [S.colAmi]: [[t("Publier"), go(S.comPublie, "fade")], [nm("Moodboard/Tuile/À la une"), go(S.comPiece)]],

  // 11 quater. Fil d'actualité (lot 27)
  [S.fil]: [
    [nm("Nav/Tab/Mes publications/Inactif"), go(S.filMes, "tab")],
    [t("+ Publier", { raw: true }), go(S.filPublier)],
    [t("Commenter (3)", { raw: true }), go(S.filPub)],
    [t("Voir la collection ›", { raw: true }), go(S.colAmi)],
    [t("···", { raw: true }), go(S.filSignaler)],
    [nm("Card/Post/Julie"), go(S.filPubAbonne)],
  ],
  [S.filVide]: [[t("Publier quelque chose"), go(S.filPublier)]],
  [S.filPublier]: [[t("Publier", { btn: true }), go(S.filPubliee, "fade")], [t("Changer ›", { raw: true }), go(S.colListe)]],
  [S.filPubliee]: [[t("Voir mes publications"), go(S.filMes)], [t("Retour au fil"), go(S.fil, "pushBack")], [t("Publié !"), go(S.filMes)]],
  [S.filPub]: [[t("Publier"), go(S.filPub, "fade")], [t("···", { raw: true }), go(S.filSignaler)],
               [t("Voir la collection ›", { raw: true }), go(S.colAmi)]],
  [S.filPubAbonne]: [[t("Fermer"), back]],
  [S.filMes]: [[nm("Nav/Tab/Fil/Inactif"), go(S.fil, "tab")], [t("···", { raw: true }), ov(S.filActions)]],
  [S.filActions]: [
    [t("Supprimer la publication"), ov(S.filDel)],
    [t("Changer qui peut voir"), go(S.filPublier)],
    [t("Modifier le message"), go(S.filPublier)],
    [t("Désactiver les commentaires"), close],
  ],
  [S.filDel]: [[t("Supprimer"), go(S.filMes, "fade")]],
  [S.filSignaler]: [[t("Envoyer le signalement"), go(S.filSignale, "fade")]],
  [S.filSignale]: [[t("Retour au fil"), go(S.fil, "pushBack")]],
  [S.colModifier]: [
    [t("Enregistrer"), go(S.colVue, "fade")], [t("+ Ajouter des éléments"), go(S.colElements)],
    [t("Changer"), go(S.colCouverture)], [t("Gérer"), go(S.colPartager)],
    [t("Supprimer la collection", { raw: true }), ov(S.colSupprimer)],
  ],
  [S.colCouverture]: [[t("Utiliser cette image"), go(S.colModifier, "pushBack")], [t("Revenir"), go(S.colModifier, "pushBack")]],
  [S.colSupprimer]: [[t("Supprimer"), go(S.colListe, "fade")]],
  [S.colAjouter]: [[t("Valider"), go(S.colAjoutee, "fade")], [t("+ Créer une collection"), go(S.colInfos)]],
  [S.colAjoutee]: [[t("Voir la collection"), go(S.colVue)], [t("Retour à l'objet"), go(S.ficheDispo, "pushBack")]],
  [S.colPartager]: [[t("Partager", { btn: true }), go(S.colLien, "fade")]],
  [S.colLien]: [
    [t("Copier"), go(S.lienCopie, "fade")],
    [t("Un ami autorisé"), go(S.colAmi)],
    [t("Un abonné autorisé"), go(S.colAbonne)],
    [t("Une personne non autorisée"), go(S.invRefuse)],
    [t("Révoquer le lien", { raw: true }), go(S.invExpire, "fade")],
  ],
  [S.colAbonne]: [[t("Fermer"), back], [nm("Moodboard/Tuile/À la une"), go(S.comPieceAbonne)]],
  [S.accesAbonne]: [[t("Fermer"), back]],
  [S.invRefuse]: [[t("Fermer"), go(S.dash, "fade")]],
  [S.invExpire]: [[t("Fermer"), go(S.dash, "fade")]],
  [S.invIndispo]: [[t("Fermer"), go(S.dash, "fade")]],
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
  // Depuis le 21 septembre, le mode de paiement se choisit AVANT la commande :
  // le récapitulatif ouvre donc le choix, et c'est lui qui mène au paiement
  // en ligne (parcours A) ou à la remise en espèces (parcours B).
  [S.recap]: [[t("Continuer vers le paiement"), go(S.modePaiement)]],
  [S.modePaiement]: [
    [t("En espèces à la remise", { raw: true }), go(S.especes)],
    [t("Continuer"), go(S.paiement)],
  ],
  [S.especes]: [
    [t("J'ai reçu l'objet"), go(S.especesOk, "fade")],
    [t("Signaler un problème"), go(S.probleme)],
  ],
  [S.especesOk]: [[t("Voir mes achats"), go(S.achats)]],
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
    // Relations (lot 20) et profil enfant (lot 25)
    [t("Demande pour Noé"), go(S.demandesEnfant)],
    [t("Demande d'ami"), go(S.demandeRecue)],
    [t("Nouvel abonné"), go(S.aboAMoi)],
    [t("Abonnement mutuel"), go(S.mesAbonnements)],
    [t("Nouvelle abonnée"), go(S.mesAbonnes)],
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
    // lot 25 : les réglages du profil enfant sont protégés par le code parent
    [t("Gérer", { nth: 1 }), go(S.codeParent)],
    [t("+ Ajouter un profil", { raw: true }), go(S.profilEnfant)],
  ],
  // Profils et contrôle parental (lot 25)
  [S.modifierProfil]: [[t("Enregistrer"), go(S.profilFamille, "fade")], [t("Supprimer ce profil", { raw: true }), ov(S.delProfil)]],
  [S.delProfil]: [[t("Supprimer"), go(S.compte, "fade")]],
  [S.codeParent]: [[t("1"), go(S.autorisations, "fade")], [t("2", { opt: true }), go(S.autorisations, "fade")]],
  [S.enfantBloque]: [[t("Demander à Mathis"), go(S.enfantDemande, "fade")], [t("Retour à mes objets"), back]],
  [S.enfantDemande]: [[t("Retour à mes objets"), back]],
  [S.demandesEnfant]: [[t("Hugo"), go(S.decisionEnfant)], [t("@max_2014"), go(S.decisionEnfant)]],
  [S.decisionEnfant]: [
    [t("Autoriser"), go(S.enfantAutorisee, "fade")],
    [t("Refuser"), go(S.demandesEnfant, "pushBack")],
    [t("Bloquer", { raw: true }), go(S.demandesEnfant, "pushBack")],
  ],
  [S.enfantAutorisee]: [[t("Voir les demandes"), go(S.demandesEnfant, "pushBack")]],
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
  [S.profilFamille]: [[t("Utiliser"), go(S.dash, "fade")], [t("Modifier"), go(S.modifierProfil)],
                      [t("Supprimer ce profil", { raw: true }), ov(S.delProfil)]],
  [S.profilEnfant]: [[t("Créer"), go(S.autorisations, "fade")]],
  [S.autorisations]: [[t("Enregistrer"), go(S.compte, "fade")], [t("Voir"), go(S.demandesEnfant)]],
  [S.profil]: [
    [t(/^Mes informations/, { opt: true }), go(S.compte)],
    [t(/^Location/, { opt: true }), go(S.logements)],
    [t(/^Security/, { opt: true }), go(S.confidentialite)],
    [t(/Amis$/, { opt: true }), go(S.amis)],
    [t("Mes amis", { opt: true }), go(S.amis)],
    [t("Mes collections", { opt: true }), go(S.colListe)],
    [t("Fil d'actualité", { opt: true }), go(S.fil)],
    [t(/^Se d[ée]connecter/, { opt: true }), go(S.login, "fade")],
  ],

  // États système
  [S.chargement]: [[TOP, after(S.mesObjets, 1.2)]],
  [S.inventaireVide]: [[t("+ Ajouter un objet", { raw: true }), go(S.choix)], [FAB, go(S.choix)]],
  [S.erreur]: [[t("Une erreur est survenue", { opt: true }), go(S.vetVerif, "pushBack")]],
  [S.delLogement]: DIALOG(S.logements),

  // 18 bis. Panneaux de navigation (lot 28). Les onglets sont câblés par la
  // règle par défaut ; ici, les pages de chaque panneau et le voile.
  [S.menuAccueil]: [
    [t("Tableau de bord"), go(S.dash, "fade")], [t("Fil d'actualité"), go(S.fil, "fade")],
    [t("Notifications"), go(S.notifs, "fade")], [t("Recherche"), go(S.recherche, "fade")],
    [nm("Voile"), close],
  ],
  [S.menuInventaire]: [
    [t("Mes objets"), go(S.mesObjets, "fade")], [t("Mon dressing"), go(S.dressing, "fade")],
    [t("Mes tenues"), go(S.maTenue, "fade")], [t("Mes collections"), go(S.colListe, "fade")],
    [t("Mes prêts"), go(S.pretsPrete, "fade")], [nm("Voile"), close],
  ],
  [S.menuLogements]: [
    [t("Mes logements"), go(S.logements, "fade")], [t("Maison principale"), go(S.vueLogement, "fade")],
    [t("Mes cartons"), go(S.mesCartons, "fade")], [t("Créer un carton"), go(S.cartonInfos, "fade")],
    [nm("Voile"), close],
  ],
  [S.menuProfil]: [
    [t("Mon profil"), go(S.profil, "fade")], [t("Amis et abonnés"), go(S.amis, "fade")],
    [t("Mes partages"), go(S.mesPartages, "fade")], [t("À vendre chez mes amis"), go(S.aVendre, "fade")],
    [t("Achats et ventes"), go(S.achats, "fade")], [t("Paramètres"), go(S.parametres, "fade")],
    [nm("Voile"), close],
  ],

  // 19. Back-office (lot 26) — la barre latérale est câblée par règle par défaut
  [S.adminLogin]: [[t("Se connecter"), go(S.adminDash, "fade")]],
  [S.adminDash]: [
    [t("Commentaire signalé"), go(S.adminSignalement)],
    [t("Litige #PND-2419"), go(S.adminLitige)],
    [t("Compte @max_2014"), go(S.adminUsers)],
  ],
  [S.adminUsers]: [[t("Voir ›", { raw: true }), go(S.adminUser)]],
  [S.adminUser]: [[t("Suspendre le compte"), ov(S.adminSuspendre)]],
  [S.adminSignalements]: [
    [t("Examiner ›", { raw: true }), go(S.adminSignalement)],
    [t("Litiges (3)", { opt: true }), go(S.adminLitiges)],
  ],
  [S.adminSignalement]: [[t("Appliquer la décision"), go(S.adminSignalements, "fade")]],
  [S.adminSuspendre]: [[t("Suspendre"), go(S.adminUsers, "fade")]],
  [S.adminLitiges]: [[t("#PND-2419", { raw: true }), go(S.adminLitige)]],
  [S.adminLitige]: [
    [t("Rembourser l'acheteur"), go(S.adminLitiges, "fade")],
    [t("Donner raison à la vendeuse"), go(S.adminLitiges, "fade")],
  ],
};

// Points de départ de flow (menu « Flows » du mode présentation)
const FLOWS = [
  ["01 · Connexion", S.login], ["02 · Accueil", S.dash], ["03 · Ajouter un objet", S.scan],
  ["04 · Gérer un objet", S.mesObjets], ["05 · Logements & rangements", S.logements], ["06 · Dressing", S.dressing],
  ["07 · Ajouter un vêtement", S.vetType], ["08 · Suggestion de tenue", S.maTenue], ["09 · Prêter un objet", S.ficheDispo],
  ["10 · Mes prêts & retour", S.pretsPrete], ["11 · Amis", S.amis], ["12 · Partage privé", S.partager],
  ["13 · Vendre", S.ficheVetFull], ["14 · Acheter chez un ami", S.aVendre], ["15 · Commandes", S.achats],
["19 · Créer un carton", S.cartonInfos], ["20 · Abonnés", S.aboNon],
  ["21 · Incident de prêt", S.fichePrete], ["22 · Partage : vue ami, abonné, refus", S.lien],
  ["23 · Lien expiré", S.invExpire], ["24 · Contenu indisponible", S.invIndispo],
  ["25 · Collections", S.colListe], ["26 · Ajouter à une collection", S.ficheDispo],
  ["27 · L'app m'habille", S.maTenue], ["28 · Profil enfant bloqué", S.enfantBloque],
  ["29 · Demandes pour un enfant", S.demandesEnfant], ["30 · Back-office", S.adminLogin],
  ["31 · Commentaires d'une collection", S.comProprio], ["32 · Fil d'actualité", S.fil],
  ["33 · Acheter en espèces", S.modePaiement],
    ["16 · Notifications", S.notifs], ["17 · Recherche", S.recherche], ["18 · Compte & paramètres", S.parametres],
];


// ═════════════════ Moteur ═════════════════
// Différence avec la v1 : les écrans sont retrouvés par leur NOM sur la
// page v2, pas par leur identifiant. La page v2 est une duplication :
// les identifiants ont changé, les noms non.
if (figma.loadAllPagesAsync) await figma.loadAllPagesAsync();
const page = figma.root.children.find(p => p.name.trim() === PAGE_CIBLE);
if (!page) throw new Error(`Page « ${PAGE_CIBLE} » introuvable`);
if (page.loadAsync) await page.loadAsync();

const norm = s => s.replace(/\s+/g, " ").trim();

// Les noms de frames mélangent tiret cadratin, point médian et accents :
// on compare sur une forme normalisée, comme la bibliothèque des lots.
const normeNom = s => String(s).toLowerCase()
  .replace(/[—–·•>-]/g, " ")
  .replace(/[àâä]/g, "a").replace(/[éèêë]/g, "e").replace(/[îï]/g, "i")
  .replace(/[ôö]/g, "o").replace(/[ùûü]/g, "u").replace(/ç/g, "c")
  .replace(/\s+/g, " ").trim();

// Index nom normalisé → frame (les écrans sont rangés dans des Sections)
const parNom = new Map();
const doublons = [];
(function indexer(n) {
  for (const k of n.children || []) {
    if (k.type === "FRAME") {
      const cle = normeNom(k.name);
      if (parNom.has(cle)) doublons.push(k.name);
      else parNom.set(cle, k);
    } else if (k.type === "SECTION" || k.type === "GROUP") indexer(k);
  }
})(page);

const missing = [], conflicts = [];
const frames = {};                    // identifiant v1 (clé de S) → frame v2
for (const cle of Object.keys(S)) {
  const ancienId = S[cle];
  if (frames[ancienId]) continue;
  const nom = NOMS[ancienId];
  if (!nom) { missing.push(`Pas de nom connu pour « ${cle} » (${ancienId})`); continue; }
  const f = parNom.get(normeNom(nom));
  if (f) frames[ancienId] = f;
  else missing.push(`Écran absent de ${PAGE_CIBLE} : « ${nom} »`);
}

const matchText = (n, m) => (m.text instanceof RegExp ? m.text.test(norm(n.characters)) : norm(n.characters) === norm(m.text));
const hasPaint = p => [...(Array.isArray(p.fills) ? p.fills : []), ...(Array.isArray(p.strokes) ? p.strokes : [])]
  .some(f => f.visible !== false && (f.opacity === undefined || f.opacity > 0));
function outerInstance(frame, n) { let top = null; for (let p = n.parent; p && p !== frame; p = p.parent) if (p.type === "INSTANCE") top = p; return top; }

// Remonte du texte vers la surface cliquable qui le porte : un bouton,
// une carte, une rangée de liste. En v2 ce sont des frames peintes et
// non plus des instances de composants — d'où la recherche sur la peinture.
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
    if (m.btn) hits = hits.filter(h => outerInstance(frame, h) || card(frame, h));
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
      type: "NODE", destinationId: frames[a.to].id,
      navigation: a.kind === "ov" ? "OVERLAY" : a.kind === "sw" ? "SWAP" : "NAVIGATE",
      transition: (a.kind === "ov" || a.kind === "sw") ? TR.fade : TR[a.tr], preserveScrollPosition: false,
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

// Planification : interactions explicites d'abord, puis règles par défaut
const plan = new Map();      // node.id → { node, frameId, reaction, why }
function put(frameId, node, a, why, explicit) {
  const inOverlay = OVERLAYS.has(frameId);
  if (a.kind !== "back" && a.kind !== "close" && !frames[a.to]) {
    missing.push(`${frames[frameId].name} → destination absente (${NOMS[a.to] || a.to})`); return;
  }
  const prev = plan.get(node.id);
  if (prev) {
    if (explicit && prev.why !== why) conflicts.push(`${frames[frameId].name} : « ${label(node)} » visé par « ${prev.why} » et « ${why} » (1re conservée)`);
    return;
  }
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

  // Bouton de retour de la v2 : une frame « Button/Icon/Retour » (‹ ou ✕)
  for (const n of f.findAll(n => n.visible && n.name === "Button/Icon/Retour")) {
    put(fid, n, inOverlay ? close : back, "retour", false);
  }
  // Ancienne icône de fermeture, si elle traîne encore quelque part
  for (const n of f.findAll(n => n.visible && n.type === "INSTANCE" && n.name === "Close_round")) {
    put(fid, n, inOverlay ? close : back, "✕", false);
  }
  // Textes « Retour » / « Annuler »
  for (const tx of f.findAll(n => n.type === "TEXT" && n.visible && /^(Retour|Annuler)$/.test(norm(n.characters)))) {
    put(fid, card(f, tx) || tx, inOverlay ? close : back, norm(tx.characters), false);
  }

  // Barre d'onglets : en v2 c'est une frame « Nav » posée en absolu, dont
  // les enfants s'appellent « Nav/Tab/<libellé>/Actif|Inactif ». Il n'y a
  // pas d'onglet Dressing : on associe par libellé, jamais par position.
  const navs = f.findAll(n => n.visible && n.name === "Nav" && (n.type === "FRAME" || n.type === "INSTANCE"));
  if (navs.length && !NO_NAV.has(fid)) {
    for (const onglet of navs[navs.length - 1].children) {
      const m = /^Nav\/Tab\/([^/]+)\//.exec(onglet.name);
      if (!m) continue;
      // Lot 28 : l'onglet déplie son panneau au lieu d'aller à une page fixe
      if (MENU_ONGLET[fid]) {
        put(fid, onglet, m[1] === MENU_ONGLET[fid] ? close : sw(NAV_MENU[m[1]]), `onglet ${m[1]}`, false);
      } else if (NAV_MENU[m[1]]) {
        put(fid, onglet, ov(NAV_MENU[m[1]]), `onglet ${m[1]}`, false);
      }
    }
  }

  // Barre latérale du back-office (lot 26), associée par libellé
  for (const item of f.findAll(n => n.visible && /^Admin\/Nav\//.test(n.name))) {
    const m = /^Admin\/Nav\/(.+)\/(Actif|Inactif)$/.exec(item.name);
    const dest = m ? ADMIN_NAV[m[1]] : null;
    if (dest && dest !== fid) put(fid, item, go(dest, "tab"), `menu admin ${m[1]}`, false);
  }

  // Le bouton + ouvre le menu d'ajout, qu'il y ait une barre ou non :
  // plusieurs écrans v2 portent un FAB seul, en bas à droite.
  if (fid !== S.menu) {
    const fab = resolve(f, FAB);
    if (fab) put(fid, fab, go(S.menu, "fade"), "bouton +", false);
  }
}

// Nettoyage : la page v2 est une duplication, elle a hérité des
// interactions posées par la v1. Celles qui portent notre marque et ne
// sont plus au plan visent des calques que la refonte a remplacés : on
// les retire, sinon le prototype garde des liens morts invisibles.
const orphelines = [];
for (const n of page.findAll(n => "reactions" in n && n.reactions && n.reactions.length)) {
  let own = false;
  try { own = n.getPluginData(STAMP) === "1"; } catch (e) {}
  if (!own || plan.has(n.id)) continue;
  if (!DRY_RUN) {
    await setReactions(n, []);
    try { n.setPluginData(STAMP, ""); } catch (e) {}
  }
  orphelines.push(label(n));
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
  for (const [name, id] of FLOWS) {
    const f = frames[id];
    if (f && !current.some(x => x.nodeId === f.id)) { current.push({ nodeId: f.id, name }); flowsAdded++; }
  }
  try { page.flowStartingPoints = current; } catch (e) { failed.push(`Flows : ${e.message}`); flowsAdded = 0; }
}

// Vérification : écrans sans aucun accès (ni lien entrant, ni départ de flow)
const incoming = new Set((page.flowStartingPoints || []).map(f => f.nodeId));
for (const n of page.findAll(n => "reactions" in n && n.reactions && n.reactions.length)) {
  for (const r of n.reactions) for (const a of (r.actions || (r.action ? [r.action] : []))) if (a && a.destinationId) incoming.add(a.destinationId);
}
if (DRY_RUN) for (const p of plan.values()) { const a = p.reaction.actions[0]; if (a && a.destinationId) incoming.add(a.destinationId); }
const isolated = page.findAll(n => n.type === "FRAME" && (n.parent.type === "SECTION" || n.parent.type === "PAGE") && !incoming.has(n.id)).map(n => n.name);

print(`${DRY_RUN ? "[SIMULATION] " : ""}Page : ${PAGE_CIBLE} · écrans résolus : ${Object.keys(frames).length}/${new Set(Object.values(S)).size}`);
print(`Interactions créées : ${created} · flows ajoutés : ${flowsAdded} · liens morts retirés : ${orphelines.length}`);
print(`Zones introuvables / destinations absentes : ${missing.length ? "\n  " + missing.join("\n  ") : "aucune"}`);
print(`Échecs : ${failed.length ? "\n  " + failed.join("\n  ") : "aucun"}`);
print(`Interactions existantes préservées : ${preserved.length ? "\n  " + preserved.join("\n  ") : "aucune"}`);
print(`Conflits : ${conflicts.length ? "\n  " + conflicts.join("\n  ") : "aucun"}`);
print(`Noms de frames en double : ${doublons.length ? "\n  " + doublons.join("\n  ") : "aucun"}`);
print(`Écrans sans accès entrant : ${isolated.length ? "\n  " + isolated.join("\n  ") : "aucun"}`);
figma.notify(`Prototype v2 : ${created} interactions · ${flowsAdded} flows${missing.length ? ` · ${missing.length} à vérifier` : ""}`);
