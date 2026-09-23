# Penderie — Questions à valider avant les migrations

Mise à jour du 21 septembre 2026. Les huit questions client sont **tranchées**, et la vente est arbitrée (section 4). Restent les trois validations de l'encadrant et la technologie de scan, imposée par le module et toujours pas communiquée.

---

## 1. À faire valider par l'encadrant — TOUJOURS EN ATTENTE

1. **Passage d'une web app à une application mobile.**
   Le cadrage annonçait une web app. Nous proposons une application mobile React Native / Expo, avec le même back-end (Symfony 7.4 + API Platform + PostgreSQL). Ce changement de forme du livrable est-il accepté ?
   *Ce choix a des conséquences sur la navigation, les permissions, la caméra et le scan, les notifications push, le stockage local, l'accessibilité, le déploiement et la façon dont le jury installe l'app. Le modèle de données, lui, ne change presque pas.*

2. **Référentiel d'accessibilité.**
   Pour l'application mobile, nous passons au RAAM. Le RGAA reste appliqué au back-office s'il est livré en web. Cette répartition vous convient-elle ?

3. **Format de démonstration attendu pour le jury.**
   Le jury doit-il pouvoir installer l'app sur son propre téléphone, ou une démonstration sur nos appareils suffit-elle ?
   *Le choix entre Expo Go, development build et EAS Build en découle. Cette décision technique reste de notre côté.*

**Et une demande qui bloque, côté module :** la technologie de scan est annoncée comme imposée, mais elle ne nous a jamais été communiquée. Elle décide à la fois de l'implémentation du scan et du mode de distribution de l'app — un module natif interdit Expo Go et oblige à passer par un development build.

---

## 2. Réponses du client — 21 septembre 2026

### 2.1 Dressing — vêtements **et** suggestions dans le MVP

Le dressing n'est pas réduit au rangement des vêtements : les suggestions automatiques de tenues font partie du MVP. « L'app m'habille » devient donc un livrable, pas une promesse de V2.

Conséquence sur le modèle : sept entités passent en MVP — `Outfit`, `OutfitSuggestion`, `WearLog`, `GarmentExclusion`, `ColorPreference`, `StylePreference`, `GarmentVisibilityPreference` — et avec elles `Garment`, les systèmes de tailles (`SizeSystem`, `SizeValue`) et les référentiels mode (`Brand`, `Color`, `Style`). Il faut aussi livrer le moteur de suggestion : météo, historique de port, exclusions, goûts couleur et style.

*C'est, de loin, la réponse la plus coûteuse des huit. Elle mérite d'être pesée au moment de planifier : le dressing complet double à peu près la charge du MVP par rapport au scénario « vêtements seuls ».*

### 2.2 Prêt — pas de date de retour obligatoire

`Loan.dueDate` reste facultative : l'interface affiche « Retour prévu : non défini ». Aucune contrainte `NOT NULL` n'est posée.

Le client ne s'est pas prononcé sur la confirmation de réception ; nous conservons donc notre position, qui n'a pas été contestée : le cycle reste **demande → acceptation → réception → prêt actif → retour → confirmation**, porté par `LoanEvent`. `Loan` et `LoanEvent` sont traités comme MVP, le prêt étant le cœur d'usage de l'application.

### 2.3 Suppression d'un profil enfant — tout est rattaché au tuteur

Objets, vêtements, médias, lieux, collections, tenues et souvenirs sont réécrits vers le profil du tuteur. Pas de suppression, pas de choix au cas par cas : le parcours informe, il ne pose plus de question par catégorie.

Le reste du traitement ne change pas : un prêt actif bloque la suppression, les prêts terminés et les commandes sont conservés avec un profil anonymisé, les partages sont révoqués, les commentaires restent avec leur auteur anonymisé, les relations sociales et les notifications sont supprimées.

### 2.4 Majorité — le tuteur valide le détachement

Rien n'est automatique au 18ᵉ anniversaire. Le tuteur décide si le profil se détache. S'il valide, le profil passe en `ADULT`, la tutelle se clôt et les permissions parentales deviennent sans objet. S'il ne valide pas, la tutelle se poursuit.

Le parcours reste prévu après le MVP ; le schéma le permet déjà.

### 2.5 Commentaires sur les ventes — oui

Les annonces entre amis acceptent les commentaires. Le sous-type `ListingComment` est confirmé et le niveau d'accès `VIEW_COMMENTS` le gouverne comme partout ailleurs.

### 2.6 Frais de plateforme — aucun

La plateforme ne prélève ni frais ni commission. `Order.feeAmount` disparaît, `totalAmount` égale `itemAmount`, et le vendeur reçoit l'intégralité du montant.

*À dire tel quel à l'oral : Stripe retient ses propres frais de traitement sur le versement. Ce ne sont pas des frais de plateforme et ils n'apparaissent pas dans notre modèle.*

### 2.7 Notifications — la vente est obligatoire, le reste suit

Les notifications liées à la vente (`LISTING_SOLD`, `ORDER_PAID`, `ORDER_SHIPPED`, `REFUND_ISSUED`) doivent être livrées. Les autres types — prêts, demandes d'amis, partages — sont livrés si le temps le permet.

Le schéma ne bouge pas : `Notification`, `NotificationPreference` et `DeviceToken` étaient déjà en MVP. La réponse fixe un ordre d'implémentation, pas une structure.

### 2.8 Scan — quatre modes

Code-barres, QR code, reconnaissance photo et OCR d'étiquette textile. `Scan` gagne deux attributs : `kind` (`BARCODE` · `QRCODE` · `PHOTO` · `LABEL_OCR`) et `code` (la valeur lue, nullable).

`provider` et `rawData` restent en place précisément pour ne pas figer la technologie dans le schéma — puisqu'elle est imposée et encore inconnue.

---

## 3. Décisions techniques — actées par l'équipe le 18/09

| Sujet | Décision |
|---|---|
| Héritage `Share` / `Comment` | `SINGLE_TABLE` |
| Identifiants | UUID v7 |
| Énumérations | colonnes `varchar` avec contrainte `CHECK`, et *backed enums* PHP |
| Première migration | `LocationHistory` incluse (elle sert au prêt : « Chez Thomas », puis retour à l'emplacement d'origine). `Memory` est décalée |
| Permissions par défaut | matrice type de profil × permission dans un *backed enum* PHP. `ProfilePermission` ne stocke que les exceptions posées par le tuteur |
| Authentification | JWT (LexikJWTAuthenticationBundle) : jeton d'accès de 15 min gardé en mémoire, jeton de rafraîchissement dans `expo-secure-store` |
| Hors ligne | niveau 2 : inventaire et lieux consultables en cache, modifications uniquement en ligne |
| Organisation du code | un seul dépôt : `/api` (Symfony) et `/app` (Expo), un seul `docker-compose` |
| Profil enfant qui devient autonome | après le MVP. Le schéma le permet, le parcours n'est pas conçu |

**Conséquence des réponses du 21/09 sur la première migration :** tout le domaine mode entre dans le périmètre initial (`Garment`, `GarmentCategory`, `SizeSystem`, `SizeValue`, `Brand`, `Color`, `Style`), ainsi que les sept entités du dressing et des suggestions. La migration est nettement plus large que ce qui était envisagé le 18.

**Ne peuvent toujours pas être tranchés :**

| Sujet | Dépend de |
|---|---|
| Technologie du scan | la technologie imposée, jamais communiquée. Les quatre modes sont connus, pas le moteur |
| Distribution de l'app (Expo Go, development build ou EAS Build) | la question 1.3 et la techno du scan : un module natif oblige à passer par un development build |
| Tests automatisés et intégration continue | à définir au démarrage du dépôt |

---

## 4. Vente — tranchée le 21/09 : dans le MVP, avec deux parcours

La contradiction est levée. Le modèle étiquetait la vente en V2 alors que Stripe est imposé par le module et que les notifications de vente venaient de devenir obligatoires. **La vente entre dans le MVP, détaillée, sur deux chemins distincts.**

| Étape | Parcours A — paiement en ligne | Parcours B — espèces en main propre |
|---|---|---|
| Commande | `paymentMethod = ONLINE`, livraison au choix | `paymentMethod = CASH`, `deliveryMethod = HANDOVER` obligatoire |
| Argent | `Payment` `CHARGE` autorisé puis capturé | **aucun `Payment`** — rien ne transite par la plateforme |
| Statut atteint | `PAID` | `AWAITING_HANDOVER` |
| Remise | expédition (`Shipment`, `SHIPPED`, `DELIVERED`) ou rendez-vous | rendez-vous uniquement |
| Preuve | l'acheteur confirme la réception | **double confirmation** : le vendeur déclare avoir été payé, l'acheteur avoir reçu l'objet |
| Clôture | `COMPLETED` puis `PAYOUT` au vendeur | `COMPLETED`, sans mouvement d'argent |
| Remboursement | `Refund` possible | **impossible** — seul un `Dispute` peut être ouvert |

**Ce que ça ajoute au modèle :**

- `Order.paymentMethod` (`ONLINE` · `CASH`), indépendant de `deliveryMethod` — le cas « je paie en ligne mais je viens chercher » existe déjà dans la maquette et devait rester possible ;
- un statut `AWAITING_HANDOVER` et un statut `DELIVERED` explicites ;
- `Order.handoverConfirmedBySellerAt` et `handoverConfirmedByBuyerAt` en remplacement du `handoverConfirmedAt` unique ;
- une entité nouvelle, **`OrderEvent`**, calquée sur `LoanEvent` : c'est la seule preuve disponible quand l'argent passe de la main à la main ;
- `Payment` passe de `1,n` à `0,n` sur `Order` ;
- trois contraintes : `CASH` impose `HANDOVER` (en base), `COMPLETED` exige les deux confirmations, un `Refund` exige un `Payment`.

**Ce qui bascule en MVP :** `Listing`, `Order`, `OrderEvent`, `OrderAddress`, `Address`, `Payment`, `Refund`, `Dispute`, `Shipment`.

**Trou de maquette — comblé par le lot 29 (écrit, pas encore exécuté dans Figma).** Le paiement en espèces n'était dessiné nulle part : le lot 09 ne connaît que la carte bancaire, et l'écran `Livraison — Remise en main propre` affiche « Thomas est payé à ce moment-là », donc un paiement en ligne suivi d'un retrait.

Trois écrans ajoutés dans la section `11 — PAIEMENT / LIVRAISON` :

| Écran | Rôle |
|---|---|
| `Paiement — Mode de paiement` | le choix en ligne / espèces, posé **avant** la commande puisqu'il la contraint, avec ce que l'espèce coûte en garanties |
| `Livraison — Remise · Paiement en espèces` | le rendez-vous, le montant à prévoir, et les **deux** confirmations — celle de Thomas et la tienne |
| `Paiement — Remise confirmée · Espèces` | la clôture sans versement ni remboursement possible |

Le troisième écran n'était pas prévu au départ : `Vente — État · Commande terminée` annonce « Thomas a reçu les 45 € » et « Versement : effectué », ce qui est vrai du parcours en ligne et faux de l'espèce. Le parcours B avait besoin de sa propre fin.

Prototype : le récapitulatif mène désormais au choix du mode de paiement, qui ouvre l'un ou l'autre parcours. Nouveau flow `33 · Acheter en espèces`.

---

## Effet des réponses sur le modèle de données V2

Toutes les modifications ci-dessous sont **déjà appliquées** dans `PENDERIE_MODELE_DONNEES_V2.html` (révision du 21 septembre).

| Réponse | Élément du MDD | État |
|---|---|---|
| 2.1 Dressing + suggestions en MVP | `Outfit`, `OutfitSuggestion`, `WearLog`, `GarmentExclusion`, `ColorPreference`, `StylePreference`, `GarmentVisibilityPreference`, `Garment`, `SizeSystem`, `SizeValue`, `Brand`, `Color`, `Style` | pastilles passées en MVP |
| 2.2 Date de retour facultative | `Loan.dueDate` nullable, `LoanEvent.RECEIVED` conservé | inchangé, confirmé |
| 2.2 Prêt en MVP | `Loan`, `LoanEvent` | pastilles passées en MVP |
| 2.3 Rattachement au tuteur | section « Supprimer un profil enfant » | `Collection`, `Outfit`, `Memory` transférées sans question |
| 2.4 Majorité | tutelle close sur décision du tuteur | point ouvert tranché |
| 2.5 Commentaires sur les ventes | sous-type `ListingComment`, niveau `VIEW_COMMENTS` | `Comment` passée en MVP |
| 2.6 Aucun frais | `Order.feeAmount` | attribut retiré, note ajoutée sur les frais Stripe |
| 2.7 Notifications | `Notification`, `NotificationPreference`, `DeviceToken` | périmètre MVP précisé |
| 2.8 Scan à quatre modes | `Scan.kind`, `Scan.code` | attributs ajoutés |

| 4. Vente en MVP, deux parcours | `Listing`, `Order`, `OrderEvent`, `OrderAddress`, `Address`, `Payment`, `Refund`, `Dispute`, `Shipment` | pastilles en MVP, `Order` enrichi, `OrderEvent` créée |

Le modèle compte désormais **36 cartes d'entité en MVP**, contre 15 avant ces réponses, et **53 entités** au total.
