# PENDERIE — Structure du projet (Asana)

**Nom du projet (provisoire) :** PENDERIE — Ranger, retrouver et partager tout ce que je possède

> Le nom est provisoire et pourra être modifié.

## Résumé

| Éléments | Nombre |
|---|---|
| Sections (phases) | 26 |
| Tâches | 267 |
| Sous-tâches | 183 |
| Tâches de décision / validation client | 54 |

**Priorités :** `High` = MVP + décisions bloquantes · `Medium` = important non bloquant · `Low` = V2 / futur.

**Étiquettes :** `Validation client`, `MVP`, `V2`, `Prototype`, `Référence`.

**Ordre de travail :** comprendre le besoin → définir les utilisateurs → lister les fonctionnalités → identifier les fonctions critiques → définir le MVP → faire valider le MVP → parcours utilisateurs → UX/UI → prototype concret rapide → test client → ajustements → validation finale → développement.

---

## 01 — Cadrage du projet

- **Reformuler le concept et la proposition de valeur** — `High`
  - _PENDERIE — Ranger, retrouver et partager tout ce que je possède (nom provisoire)._
- **Définir précisément la problématique utilisateur** — `High`
- **Définir les utilisateurs cibles** — `High`
- **Identifier les principaux cas d'usage** — `High`
- **Définir les fonctionnalités indispensables** — `High`
- **Identifier les fonctionnalités secondaires** — `High`
- **Identifier les fonctionnalités à reporter en V2** — `High`
- **Identifier les fonctionnalités à supprimer** — `High`
- **Définir le périmètre du MVP** — `High` _(MVP)_
  - _Premier objectif du projet : cadrer le MVP avant tout développement._
- **Définir les priorités de développement** — `High`
- **VALIDATION CLIENT — Valider le périmètre du projet** — `High` _(Validation client)_ **[DÉCISION CLIENT]**
  - _Faire valider le périmètre (concept, cibles, MVP, priorités) avec le client avant de continuer._

## 02 — Utilisateurs & personas

- **Définir les personas principaux** — `High`
  - _Personas / cibles envisagés :_
- **Identifier les besoins des utilisateurs** — `High`
- **Identifier les problèmes rencontrés par les utilisateurs** — `High`
- **Définir les principaux scénarios d'utilisation** — `High`
- **Étudier le profil des utilisateurs intéressés par la gestion de vêtements** — `Medium`
- **Étudier le profil des utilisateurs intéressés par le prêt d'objets** — `Medium`
- **Étudier le cas d'utilisation des collections personnelles** — `Medium`
- **Étudier le compte enfant** — `Medium` _(Validation client)_ **[DÉCISION CLIENT]**
  - _Compte permettant à un enfant de gérer ses propres objets sans interactions sociales non souhaitées._
  - [ ] Permettre à un enfant de gérer ses propres objets
  - [ ] Empêcher les interactions sociales non souhaitées
  - [ ] Étudier le contrôle parental
  - [ ] Définir les permissions du compte enfant

## 03 — Comptes & profils

- **Création de compte** — `High` _(MVP)_
- **Connexion / déconnexion** — `High` _(MVP)_
- **Gestion du profil** — `High` _(MVP)_
- **Gestion des informations personnelles** — `Medium`
- **Gestion de plusieurs profils / membres du foyer** — `Medium` _(Validation client)_ **[DÉCISION CLIENT]**
- **Création de sous-comptes** — `Medium` _(Validation client)_ **[DÉCISION CLIENT]**
- **Gestion des permissions des sous-comptes** — `Medium`
- **Gestion des demandes d'amis pour les sous-comptes** — `Medium`
- **Gestion d'un compte enfant** — `Medium` _(Validation client)_ **[DÉCISION CLIENT]**
  - _Voir aussi : 02 — Étudier le compte enfant._
- **Définition des différents niveaux d'accès** — `Medium`

## 04 — Logement & organisation

- **Ajouter un logement** — `High` _(MVP)_
  - _Structure envisagée : Logement > Pièce > Meuble/rangement > Carton > Objet._
- **Gérer plusieurs logements** — `Medium` _(Validation client)_ **[DÉCISION CLIENT]**
- **Décrire son logement** — `Medium`
- **Ajouter les différentes pièces** — `High` _(MVP)_
- **Ajouter des espaces de rangement** — `High` _(MVP)_
  - _Meubles, rangements, étagères…_
- **Organiser les objets par emplacement** — `High` _(MVP)_
- **Déplacer un objet** — `High` _(MVP)_
- **Modifier l'emplacement d'un objet** — `High` _(MVP)_
- **Gérer un deuxième domicile** — `Low` _(V2)_
- **Rechercher un objet à partir de son emplacement** — `Medium`

## 05 — Gestion des objets

- **Ajouter un objet manuellement** — `High` _(MVP)_
  - _Saisie manuelle : réduire au maximum les champs obligatoires._
- **Ajouter une photo** — `High` _(MVP)_
- **Ajouter une description** — `High` _(MVP)_
- **Ajouter des notes personnelles** — `High` _(MVP)_
- **Ajouter un souvenir / contexte lié à l'objet** — `Medium`
- **Ajouter une catégorie** — `High` _(MVP)_
- **Créer ses propres catégories** — `Medium`
- **Définir l'état de l'objet** — `High` _(MVP)_
  - _États à prévoir : Disponible, Prêté, Perdu, Vendu, À vendre, Déplacé._
- **Définir l'emplacement** — `High` _(MVP)_
- **Modifier les informations d'un objet** — `High` _(MVP)_
- **Supprimer un objet** — `High` _(MVP)_
- **Rechercher un objet** — `High` _(MVP)_
- **Filtrer les objets** — `Medium`
- **Trier les objets** — `Medium`

## 06 — Scan d'objet (fonctionnalité clé)

- **Définir exactement ce que le scan doit reconnaître** — `High`
  - _Le scan est une fonctionnalité CRITIQUE du projet._
- **Définir les informations récupérées automatiquement** — `High`
- **Étudier la faisabilité technique du scan** — `High`
- **Tester différents types d'étiquettes / objets** — `High`
- **Tester la fiabilité du scan** — `High`
- **Définir le comportement lorsque le scan échoue** — `High`
- **Prévoir une saisie manuelle en cas d'échec** — `High`
- **Réduire au maximum les informations à saisir manuellement** — `High`
- **Tester le parcours complet d'ajout via scan** — `High`
- **VALIDATION CLIENT — Le scan apporte-t-il suffisamment de valeur ?** — `High` _(Validation client)_ **[DÉCISION CLIENT]**
  - _Le scan doit réellement faire gagner du temps à l'utilisateur. S'il est trop peu fiable ou nécessite trop de saisie manuelle, son intérêt pour l'application devra être réévalué._

## 07 — Cartons & contenants

- **Créer un carton / contenant** — `High` _(MVP)_
  - _Objectif UX : gérer un carton rempli d'objets sans surcharger l'interface principale._
- **Ajouter des objets dans un carton** — `High` _(MVP)_
- **Donner un nom au carton** — `High` _(MVP)_
- **Ajouter une photo du carton** — `Medium` _(MVP)_
- **Définir l'emplacement du carton** — `High` _(MVP)_
- **Afficher uniquement le carton dans la vue principale** — `High` _(MVP)_
- **Ouvrir un carton pour afficher son contenu** — `High` _(MVP)_
- **Rechercher le contenu d'un carton** — `High` _(MVP)_
- **Déplacer un carton** — `High` _(MVP)_
- **Modifier le contenu d'un carton** — `High` _(MVP)_

## 08 — Dressing & vêtements

- **Ajouter des vêtements** — `Medium` _(Validation client)_ **[DÉCISION CLIENT]**
  - _Inclusion dans le MVP à valider avec le client._
- **Ajouter une photo du vêtement** — `Medium`
- **Définir la catégorie** — `Medium`
- **Définir la marque** — `Medium`
- **Définir la taille** — `Medium`
- **Définir la couleur** — `Medium`
- **Définir le style** — `Medium`
- **Définir l'usage** — `Medium`
- **Définir l'état** — `Medium`
- **Définir si le vêtement est disponible** — `Medium`
- **Définir si le vêtement est à vendre** — `Medium`
- **Définir si le vêtement est prêté** — `Medium`
- **Historique des vêtements portés** — `Medium`

## 09 — Suggestions de tenues

- **VALIDATION CLIENT — Inclure les suggestions de tenues dans le MVP ?** — `High` _(Validation client)_ **[DÉCISION CLIENT]**
  - _Fonctionnalité importante mais son inclusion dans le MVP doit être validée._
- **Proposer automatiquement une tenue** — `Medium`
- **Prendre en compte la météo** — `Medium`
- **Prendre en compte le contexte** — `Medium`
- **Prendre en compte les vêtements disponibles** — `Medium`
- **Prendre en compte les vêtements portés récemment** — `Medium`
- **Éviter de proposer trop souvent les mêmes pièces** — `Medium`
- **Éviter de proposer les vêtements refusés** — `Medium`
- **Permettre de refuser une pièce** — `Medium`
- **Permettre de revenir sur une préférence** — `Medium`
- **Permettre de modifier ses préférences** — `Medium`
- **Prendre en compte les couleurs** — `Medium`
- **Prendre en compte les styles** — `Medium`
- **Créer des catégories de styles** — `Medium`
- **Différencier travail / sport / soirée / quotidien** — `Medium`
  - _Exemple : ne pas proposer un vêtement de sport pour aller travailler, ni un costume pour faire du sport._
- **Éviter les associations incohérentes** — `Medium`

## 10 — Prêt d'objets

- **Statut & localisation dynamiques de l'objet** — `High`
  - _CONCEPT CENTRAL À CONSERVER : chaque objet a un statut ET une localisation dynamiques, toujours à jour — on sait en permanence ce que l'on possède et où ça se trouve._
  - [ ] Afficher le statut courant de l'objet (Disponible / Prêté / …)
  - [ ] Afficher la localisation logique d'un objet prêté (« Chez Thomas »)
  - [ ] Restaurer automatiquement l'emplacement habituel au retour
  - [ ] Permettre de définir un nouvel emplacement après le retour
  - [ ] Garder l'objet visible dans l'inventaire du propriétaire pendant le prêt
- **Gestion du prêt** — `Medium`
  - [ ] Marquer un objet comme « Prêté »
  - [ ] Sélectionner l'ami à qui l'objet est prêté
  - [ ] Enregistrer la date du prêt
  - [ ] Ajouter une date de retour prévue
  - [ ] Ajouter une note concernant le prêt
  - [ ] Voir les objets actuellement prêtés
  - [ ] Voir à qui chaque objet a été prêté
  - [ ] Voir depuis combien de temps l'objet est prêté
  - [ ] Modifier les informations du prêt
  - [ ] Annuler un prêt
- **Retour de l'objet prêté** — `Medium`
  - [ ] Marquer un objet comme « Rendu »
  - [ ] Enregistrer la date de retour réelle
  - [ ] Vérifier / modifier l'état de l'objet après son retour
  - [ ] Ajouter une note après le retour
  - [ ] Conserver l'historique du prêt
  - [ ] Action rapide « Marquer comme rendu »
- **Historique des prêts** — `Medium`
  - [ ] Voir l'historique des prêts d'un objet
  - [ ] Voir toutes les personnes à qui l'objet a été prêté
  - [ ] Voir les dates de chaque prêt
  - [ ] Voir les objets déjà empruntés par un ami
  - [ ] Conserver l'historique même après le retour de l'objet
- **États particuliers — objet prêté** — `Medium`
  - [ ] Marquer un objet comme perdu pendant un prêt
  - [ ] Marquer un objet comme endommagé
  - [ ] Ajouter une description des dommages
  - [ ] Gérer un objet non rendu
  - [ ] Gérer un objet définitivement perdu
- **Règles métier du prêt** — `High`
  - [ ] Empêcher de prêter un objet déjà prêté
  - [ ] Empêcher de vendre un objet actuellement prêté
  - [ ] Empêcher de prêter un objet vendu
  - [ ] L'objet reste la propriété de son propriétaire pendant le prêt
  - [ ] Mettre automatiquement à jour le statut de l'objet lors du prêt
  - [ ] Mettre automatiquement à jour le statut lors du retour
- **Interdiction de sous-prêt (chaînage de prêts)** — `High`
  - _RÈGLE MÉTIER FORTE — pas de chaîne de prêts._
  - [ ] Désactiver l'action « Prêter » sur un objet emprunté
  - [ ] Afficher le propriétaire réel de l'objet emprunté
  - [ ] Afficher le statut « Objet emprunté » dans l'inventaire de l'emprunteur
  - [ ] Bloquer techniquement toute création de prêt sur un objet emprunté
  - [ ] Afficher un message explicite en cas de tentative de sous-prêt
  - [ ] Rendre l'objet à nouveau prêtable uniquement après retour au propriétaire
  - [ ] Gérer le cas où l'emprunteur acquiert ensuite l'objet (changement de propriété)
- **Notifications de prêt** — `Medium`
  - [ ] Notification lors de la création d'un prêt
  - [ ] Notification avant la date de retour prévue
  - [ ] Notification lorsque la date de retour est dépassée
  - [ ] Notification lors du retour de l'objet
  - [ ] Notification en cas de modification du prêt
- **Vue « Mes prêts »** — `Medium`
  - [ ] Afficher les objets que j'ai prêtés
  - [ ] Afficher les objets que j'ai empruntés
  - [ ] Filtrer les prêts actifs / terminés
  - [ ] Afficher les retards
  - [ ] Accéder rapidement aux informations du prêt
- **UX du prêt** — `Medium`
  - [ ] Prêter un objet en quelques clics
  - [ ] Afficher clairement le statut « Prêté »
  - [ ] Afficher le nom de la personne qui détient actuellement l'objet
  - [ ] Afficher l'emplacement logique : « Chez Thomas »
  - [ ] Retrouver rapidement un objet prêté
- **Changement de localisation pendant le prêt** — `Medium`
  - [ ] Gérer le changement d'emplacement pendant le prêt
  - [ ] Indiquer que l'objet est actuellement chez un ami
  - [ ] Restaurer automatiquement l'emplacement habituel lorsqu'il est rendu
  - [ ] Permettre de définir un nouvel emplacement après le retour
- **VALIDATION CLIENT — Règles de prêt à définir** — `High` _(Validation client)_ **[DÉCISION CLIENT]**
  - _Points à trancher avec le client avant développement du module de prêt._
  - [ ] Date de retour : obligatoire ou facultative ?
  - [ ] Rappels de retour activés par défaut ?
  - [ ] Le propriétaire peut-il envoyer un rappel à l'emprunteur ?
  - [ ] L'emprunteur doit-il confirmer la réception de l'objet ?
  - [ ] L'emprunteur doit-il confirmer le retour de l'objet ?

## 11 — Partage privé

- **Partager un objet** — `High` _(MVP)_
  - _PRINCIPE FONDAMENTAL : le dressing est privé par défaut. Aucun contenu accessible publiquement par défaut._
- **Partager une collection** — `High` _(MVP)_
- **Partager une pièce** — `High` _(MVP)_
- **Partager un carton** — `High` _(MVP)_
- **Partager via un lien** — `High` _(MVP)_
- **Partager via QR code** — `Medium` _(MVP)_
- **Définir les personnes autorisées** — `High` _(MVP)_
- **Gérer les permissions de partage** — `High` _(MVP)_
- **Révoquer un accès** — `High` _(MVP)_
- **Permettre la consultation sans compte** — `High` _(MVP)_
  - _Un lien de partage doit être consultable sans créer de compte._
- **Permettre à un ami d'accéder directement au contenu via un lien** — `High` _(MVP)_
- **Commenter les objets / collections / pièces** — `Medium` _(Validation client)_ **[DÉCISION CLIENT]**
- **Lire les commentaires des amis** — `Medium`
- **Gérer les notifications** — `Medium`

## 12 — Amis & abonnés

- **Fonctionnalités amis** — `High` _(MVP)_
  - _Principe : les amis ont accès à davantage de fonctionnalités que les abonnés._
  - [ ] Ajouter un ami
  - [ ] Accepter une demande d'ami
  - [ ] Refuser une demande d'ami
  - [ ] Supprimer un ami
  - [ ] Partager du contenu avec certains amis
  - [ ] Gérer les permissions des amis
  - [ ] Donner la priorité aux amis sur les annonces
  - [ ] Permettre aux amis d'acheter les objets mis en vente
- **Fonctionnalités abonnés (à étudier)** — `Low` _(V2,Validation client)_ **[DÉCISION CLIENT]**
  - _Principe envisagé : les amis ont accès à davantage de fonctionnalités que les abonnés._
  - [ ] Étudier l'intérêt du système d'abonnés
  - [ ] Définir ce que les abonnés peuvent voir
  - [ ] Définir si les abonnés peuvent voir les collections
  - [ ] Définir si les abonnés peuvent voir les objets
  - [ ] Définir si les abonnés peuvent commenter
  - [ ] Étudier la possibilité d'empêcher les abonnés de commenter
  - [ ] Définir la différence entre amis et abonnés

## 13 — Vente entre amis

- **Marquer un objet comme « À vendre »** — `Medium` _(Validation client)_ **[DÉCISION CLIENT]**
  - _PRINCIPE VALIDÉ : les objets sont vendus uniquement entre personnes de confiance / amis. Les objets ne sont pas automatiquement mis en vente : la vente est déclenchée par l'utilisateur._
- **Mettre un objet en vente en quelques clics** — `Medium`
- **Générer automatiquement l'annonce à partir des informations de l'objet** — `Medium`
- **Définir le prix** — `Medium`
- **Ajouter / modifier les photos** — `Medium`
- **Ajouter une description** — `Medium`
- **Publier l'annonce** — `Medium`
- **Donner la priorité aux amis sur les annonces** — `Medium`
- **Limiter l'achat aux amis** — `Medium`
  - _Décidé : seuls les amis peuvent acheter. Ne pas redemander au client._
- **Acheter directement dans l'application** — `Medium`
- **Gérer le statut de l'annonce** — `Medium`
- **Passer automatiquement l'objet en « Vendu »** — `Medium`
- **Retirer l'objet des objets disponibles** — `Medium`
- **Historique des ventes** — `Medium`

## 14 — Paiement

- **Étudier l'intégration de MangoPay** — `Medium` _(Validation client)_ **[DÉCISION CLIENT]**
  - _PRINCIPE : le client ne souhaite pas gérer directement les paiements. Le paiement doit toutefois être intégré à l'application._
- **Vérifier la faisabilité de MangoPay** — `Medium`
- **Intégrer le paiement directement dans l'application** — `Medium`
- **Déléguer la gestion des paiements à MangoPay** — `Medium`
- **Vérifier la gestion des transferts entre utilisateurs** — `Medium`
- **Vérifier les obligations liées aux paiements entre particuliers** — `Medium`
- **Définir les frais éventuels** — `Medium` _(Validation client)_ **[DÉCISION CLIENT]**
- **Définir le fonctionnement du paiement après achat** — `Medium`

## 15 — Remboursements & litiges

- **Étudier la gestion des remboursements via MangoPay** — `Medium` _(Validation client)_ **[DÉCISION CLIENT]**
  - _PRINCIPE : le client ne veut pas gérer manuellement les remboursements et litiges. Déléguer autant que possible._
- **Étudier la délégation des remboursements** — `Medium`
- **Étudier la gestion des litiges** — `Medium`
- **Déléguer autant que possible la gestion des litiges à un prestataire** — `Medium`
- **Définir les responsabilités de la plateforme** — `Medium` _(Validation client)_ **[DÉCISION CLIENT]**
- **Définir les cas nécessitant une intervention de l'administrateur** — `Medium`
- **Définir les conditions de remboursement** — `Medium` _(Validation client)_ **[DÉCISION CLIENT]**

## 16 — Livraison & remise en main propre

- **Livraison (expédition)** — `Medium` _(Validation client)_ **[DÉCISION CLIENT]**
  - _PRINCIPE VALIDÉ : l'acheteur choisit entre livraison ET remise en main propre. Les deux options doivent être disponibles — ne pas redemander au client. Déléguer autant que possible livraison et retours à un prestataire._
  - [ ] Permettre de choisir la livraison
  - [ ] Étudier les solutions de livraison disponibles
  - [ ] Étudier l'intégration d'un prestataire
  - [ ] Gestion du suivi de livraison
  - [ ] Affichage du statut de l'envoi
  - [ ] Étudier la gestion des retours
  - [ ] Déléguer autant que possible la gestion des retours à un prestataire
- **Remise en main propre (retrait)** — `Medium`
  - [ ] Permettre de choisir la remise en main propre
  - [ ] Permettre aux utilisateurs de convenir des modalités
  - [ ] Marquer la transaction comme remise
  - [ ] Finaliser la transaction

## 17 — UX / UI

- **Définir les principes UX** — `High`
  - _Principes fondamentaux : interface moderne ; UX simple ; navigation intuitive ; interface rapide ; minimiser la saisie manuelle ; prioriser le scan ; recherche rapide ; interface visuelle ; pas de publicité ; pas d'interface surchargée ; mobile-first ; dressing privé par défaut ; partage simple._
- **Définir l'architecture de navigation** — `High`
- **Définir les écrans principaux** — `High`
- **Concevoir le parcours d'ajout d'un objet** — `High`
- **Concevoir le parcours de recherche d'un objet** — `High`
- **Concevoir le parcours de partage** — `High`
- **Concevoir le parcours de prêt** — `Medium`
- **Concevoir le parcours de vente** — `Medium`
- **Concevoir le parcours dressing** — `Medium`
- **Concevoir le parcours de suggestion de tenue** — `Medium`
- **Concevoir le parcours de scan** — `High`
- **Tester la simplicité des parcours** — `High`

## 18 — Benchmark & inspirations

- **Vinted** — `Medium`
  - _Référence : création d'annonces, parcours d'achat, transactions._
  - [ ] Étudier la création d'annonces
  - [ ] Étudier le parcours d'achat
  - [ ] Étudier la simplicité UX
  - [ ] Étudier les transactions
- **Yuka** — `Medium`
  - _Référence : scan, rapidité d'ajout, récupération automatique des informations._
  - [ ] Étudier le scan
  - [ ] Étudier la rapidité d'ajout
  - [ ] Étudier la récupération automatique des informations
- **Notion** — `Medium`
  - _Référence : organisation des données, catégories personnalisables, flexibilité, collections._
  - [ ] Étudier l'organisation des données
  - [ ] Étudier les catégories personnalisables
  - [ ] Étudier la flexibilité
  - [ ] Étudier les collections
- **Pinterest** — `Medium`
  - _Référence : présentation visuelle, collections, planches, personnalisation._
  - [ ] Étudier la présentation visuelle
  - [ ] Étudier les collections
  - [ ] Étudier les planches
  - [ ] Étudier la personnalisation
- **Définir ce que l'application doit reprendre de chaque référence** — `Medium`
  - _Objectif : reprendre les meilleurs principes UX de Vinted, Yuka, Notion et Pinterest sans copier leurs interfaces._

## 19 — Parcours utilisateurs

- **Parcours 1 — Ajouter un objet** — `High`
  - _Parcours prioritaire._
  - [ ] Ouvrir l'application
  - [ ] Scanner l'objet
  - [ ] Reconnaître l'objet
  - [ ] Vérifier les informations
  - [ ] Ajouter une photo
  - [ ] Choisir la catégorie
  - [ ] Choisir l'emplacement
  - [ ] Ajouter éventuellement une note
  - [ ] Enregistrer
- **Parcours 2 — Retrouver un objet** — `High`
  - _Parcours prioritaire._
  - [ ] Ouvrir la recherche
  - [ ] Rechercher l'objet
  - [ ] Afficher le résultat
  - [ ] Afficher son emplacement
  - [ ] Afficher la pièce
  - [ ] Afficher le carton si nécessaire
  - [ ] Afficher l'objet
- **Parcours 3 — Partager un objet** — `High`
  - _Parcours prioritaire._
  - [ ] Sélectionner l'objet
  - [ ] Cliquer sur partager
  - [ ] Sélectionner un ami
  - [ ] Générer un lien / QR code
  - [ ] Permettre la consultation
  - [ ] Permettre éventuellement les commentaires
- **Parcours 4 — Choisir une tenue** — `Medium`
  - [ ] Ouvrir l'application
  - [ ] Consulter la météo
  - [ ] Prendre en compte l'historique récent
  - [ ] Générer une tenue
  - [ ] Accepter / refuser
  - [ ] Modifier les préférences
  - [ ] Enregistrer la tenue portée
- **Parcours 5 — Vendre un objet** — `Medium`
  - [ ] Sélectionner l'objet
  - [ ] Cliquer sur « Vendre »
  - [ ] Vérifier les informations
  - [ ] Définir le prix
  - [ ] Publier
  - [ ] Notification aux amis
  - [ ] Achat
  - [ ] Paiement
  - [ ] Livraison ou remise en main propre
  - [ ] Transaction terminée

## 20 — Sécurité, confidentialité & RGPD

- **Dressing privé par défaut** — `High` _(MVP)_
  - _Règle structurante de l'application._
- **Gestion précise des permissions** — `High` _(MVP)_
- **Gestion des liens de partage** — `High` _(MVP)_
- **Possibilité de révoquer un lien** — `High` _(MVP)_
- **Gestion des accès amis** — `High` _(MVP)_
- **Gestion des accès abonnés** — `Low` _(V2)_
- **Protection des données personnelles** — `High`
- **Sécurisation des données** — `High`
- **Gestion des comptes enfants** — `Medium`
- **Étudier les contraintes RGPD** — `High`
- **Identifier les données sensibles** — `High`
- **Définir les règles de conservation des données** — `Medium` _(Validation client)_ **[DÉCISION CLIENT]**

## 21 — Administration / Back-office

- **Gestion des utilisateurs** — `Medium`
- **Gestion des comptes** — `Medium`
- **Gestion des catégories** — `Medium`
- **Gestion des catégories de vêtements** — `Low`
- **Gestion des signalements** — `Medium`
- **Gestion des contenus problématiques** — `Medium`
- **Gestion des transactions** — `Low`
- **Gestion des éventuels litiges nécessitant une intervention** — `Low`
- **Gestion des utilisateurs bloqués** — `Medium`
- **Statistiques générales** — `Low`
- **Gestion des paramètres de l'application** — `Medium`
- **Gestion des préférences liées aux suggestions de tenues** — `Low`

## 22 — MVP / Priorisation

- **MVP — Indispensable** — `High` _(MVP,Validation client)_ **[DÉCISION CLIENT]**
  - _À confirmer avec le client. Ne pas considérer automatiquement toutes les fonctionnalités comme MVP._
  - [ ] Création de compte
  - [ ] Création du logement
  - [ ] Création des pièces
  - [ ] Ajout d'objets
  - [ ] Scan
  - [ ] Ajout manuel
  - [ ] Catégories
  - [ ] Emplacement
  - [ ] Photos
  - [ ] Notes
  - [ ] Recherche
  - [ ] Gestion des cartons
  - [ ] Partage privé
  - [ ] Gestion des amis
- **À évaluer pour le MVP** — `High` _(Validation client)_ **[DÉCISION CLIENT]**
  - _À trancher avec le client._
  - [ ] Gestion des prêts
  - [ ] Dressing
  - [ ] Suggestions de tenues
  - [ ] Vente
  - [ ] Paiement
  - [ ] Livraison
  - [ ] Remise en main propre
  - [ ] Comptes multiples
  - [ ] Compte enfant
  - [ ] Abonnés
  - [ ] Commentaires
- **V2 / plus tard** — `Low` _(V2)_
  - [ ] Fonctionnalités sociales avancées
  - [ ] Système d'abonnés complet
  - [ ] Suggestions de tenues avancées
  - [ ] Automatisations supplémentaires
  - [ ] Fonctionnalités avancées de marketplace
  - [ ] Fonctionnalités supplémentaires autour des collections

## 23 — Questions & validations client

- **Valider le nom de l'application** — `High` _(Validation client)_ **[DÉCISION CLIENT]**
  - _DÉJÀ DÉCIDÉ (ne pas redemander au client) : seuls les amis peuvent acheter ; livraison ET remise en main propre sont toutes deux disponibles._
- **Valider le concept** — `High` _(Validation client)_ **[DÉCISION CLIENT]**
- **Valider la proposition de valeur** — `High` _(Validation client)_ **[DÉCISION CLIENT]**
- **Valider les cibles** — `High` _(Validation client)_ **[DÉCISION CLIENT]**
- **Valider le MVP** — `High` _(Validation client)_ **[DÉCISION CLIENT]**
- **Valider la fonctionnalité de scan** — `High` _(Validation client)_ **[DÉCISION CLIENT]**
- **Valider les comptes multiples** — `High` _(Validation client)_ **[DÉCISION CLIENT]**
- **Valider le compte enfant** — `High` _(Validation client)_ **[DÉCISION CLIENT]**
- **Valider le système d'amis** — `High` _(Validation client)_ **[DÉCISION CLIENT]**
- **Valider le système d'abonnés** — `High` _(Validation client)_ **[DÉCISION CLIENT]**
- **Valider les permissions de partage** — `High` _(Validation client)_ **[DÉCISION CLIENT]**
- **Valider les commentaires** — `High` _(Validation client)_ **[DÉCISION CLIENT]**
- **Valider les suggestions de tenues** — `High` _(Validation client)_ **[DÉCISION CLIENT]**
- **Valider la vente entre amis** — `High` _(Validation client)_ **[DÉCISION CLIENT]**
- **Valider l'intégration MangoPay** — `High` _(Validation client)_ **[DÉCISION CLIENT]**
- **Valider la délégation des remboursements** — `High` _(Validation client)_ **[DÉCISION CLIENT]**
- **Valider la délégation des litiges** — `High` _(Validation client)_ **[DÉCISION CLIENT]**
- **Valider la livraison** — `High` _(Validation client)_ **[DÉCISION CLIENT]**
- **Valider la remise en main propre** — `High` _(Validation client)_ **[DÉCISION CLIENT]**
- **Valider la gestion des retours** — `High` _(Validation client)_ **[DÉCISION CLIENT]**
- **Valider les fonctionnalités à retirer du MVP** — `High` _(Validation client)_ **[DÉCISION CLIENT]**

## 24 — Prototype concret

- **Définir les écrans prioritaires** — `High` _(Prototype)_
  - _Contrainte : le client veut voir vite quelque chose de concret, pas seulement des maquettes / dessins._
- **Définir l'architecture de navigation** — `High` _(Prototype)_
- **Créer une première version concrète de l'application** — `High` _(Prototype)_
- **Prototyper l'accueil** — `High` _(Prototype)_
- **Prototyper le scan** — `High` _(Prototype)_
- **Prototyper l'ajout d'un objet** — `High` _(Prototype)_
- **Prototyper la recherche** — `High` _(Prototype)_
- **Prototyper le logement** — `High` _(Prototype)_
- **Prototyper les pièces** — `High` _(Prototype)_
- **Prototyper les cartons** — `High` _(Prototype)_
- **Prototyper le dressing** — `Medium` _(Prototype)_
- **Prototyper le partage** — `High` _(Prototype)_
- **Prototyper les amis** — `Medium` _(Prototype)_
- **Prototyper la vente** — `Medium` _(Prototype)_
- **Prototyper le paiement** — `Medium` _(Prototype)_
- **Prototyper la livraison** — `Medium` _(Prototype)_
- **Tester le prototype** — `High` _(Prototype)_
- **Faire tester le prototype au client** — `High` _(Prototype,Validation client)_ **[DÉCISION CLIENT]**
- **Recueillir les retours** — `High` _(Prototype)_
- **Prioriser les corrections** — `High` _(Prototype)_
- **VALIDATION CLIENT — Valider la direction UX/UI** — `High` _(Validation client)_ **[DÉCISION CLIENT]**

## 25 — Contraintes du projet

- **Contraintes du projet (référence)** — `Medium` _(Référence)_
  - _Checklist à respecter en permanence :_

## 26 — Validation finale du périmètre

- **Valider la liste définitive des fonctionnalités** — `High` _(Validation client)_ **[DÉCISION CLIENT]**
- **Valider les fonctionnalités MVP** — `High` _(Validation client)_ **[DÉCISION CLIENT]**
- **Valider les fonctionnalités V2** — `High` _(Validation client)_ **[DÉCISION CLIENT]**
- **Identifier les fonctionnalités supprimées** — `High`
- **Valider les parcours utilisateurs** — `High` _(Validation client)_ **[DÉCISION CLIENT]**
- **Valider l'architecture de l'application** — `High` _(Validation client)_ **[DÉCISION CLIENT]**
- **Valider l'UX** — `High` _(Validation client)_ **[DÉCISION CLIENT]**
- **Valider l'UI** — `High` _(Validation client)_ **[DÉCISION CLIENT]**
- **Identifier les contraintes techniques** — `High`
- **Identifier les contraintes liées au paiement** — `High`
- **Identifier les contraintes liées à la livraison** — `High`
- **Identifier les contraintes RGPD** — `High`
- **VALIDATION CLIENT — Valider le périmètre final** — `High` _(Validation client)_ **[DÉCISION CLIENT]**
- **VALIDATION CLIENT — Valider le lancement du développement** — `High` _(Validation client)_ **[DÉCISION CLIENT]**
  - _Décision bloquante : ne pas démarrer le développement complet avant cette validation._

