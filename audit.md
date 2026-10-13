# Audit qualité — Penderie

Séance 15 : linter, PHPStan, qualité du code. Audit du 13/10/2026, sur `develop` après le merge du fil d'actualité et du look du jour sans IA.

Penderie, c'est une API Symfony 7.4 / API Platform 4 (PHP 8.4, PostgreSQL 17) et une application mobile Expo SDK 57 (React Native, TypeScript, NativeWind).

## En bref

| Outil | Ce qu'il observe | Avant | Après |
| --- | --- | --- | --- |
| **PHPStan niveau 6** (+ Symfony, Doctrine, PHPUnit) | types, appels invalides, incohérences | 163 erreurs | **0** (1 règle ignorée, justifiée) |
| `lint:container` | arguments injectés compatibles avec leurs types | OK | OK |
| `lint:yaml` / `lint:twig` | syntaxe de la configuration et des gabarits | OK (20 YAML, 1 Twig) | OK |
| `doctrine:schema:validate` | mapping Doctrine, et base synchronisée | OK | OK |
| `composer validate --strict` | `composer.json` | 2 erreurs (nom, description) | **OK** |
| `composer audit` | failles connues des dépendances PHP | 0 | 0 |
| `npm audit` (app) | failles connues des dépendances JS | 39 (1 critique, 23 hautes) | **36 (0 critique, 21 hautes)** |
| ESLint + `tsc` (app) | règles Expo / React, typage | OK | OK, et maintenant en CI |
| PHPUnit | 216 tests | ~1 lancement sur 3 en échec au hasard | **stable** (3 causes corrigées) |
| Snyk | failles (base plus large) | — | **0** : 110 dépendances PHP testées, aucun chemin vulnérable |

## Outils mis en place

**Makefile** (`api/Makefile`) : les mêmes commandes sur le poste (dans le conteneur PHP) et en CI.

```
make help        la liste des commandes
make quality     linters Symfony, PHPStan, audit Composer
make test        PHPUnit
make ci EXEC=    ce que lance la CI (sans Docker)
```

Le conteneur PHP contient déjà `make` : sous Windows, `docker compose exec php make quality EXEC=` suffit.

**Intégration continue** (GitHub Actions) :

| Workflow | Job | Contenu |
| --- | --- | --- |
| `api.yml` | Migrations et tests | PostgreSQL 17 réel, migrations jouées puis rejouées dans les deux sens, référentiels, schéma, PHPUnit (existant) |
| `api.yml` | **Qualité** | `make lint`, `make phpstan`, `make audit` (nouveau, en parallèle des tests) |
| `api.yml` | **Sécurité (Snyk)** | `snyk test` sur `composer.lock`, seuil « haute » ; actif (secret `SNYK_TOKEN` ajouté le 13/10) |
| `app.yml` | **ESLint et TypeScript** | `npm ci`, `expo lint`, `tsc --noEmit`, `npm audit` bloquant si critique (nouveau) |

Snyk est activé : compte snyk.io, jeton (Account settings › Auth Token) enregistré dans GitHub comme secret `SNYK_TOKEN`. Premier passage : 110 dépendances PHP testées, aucun chemin vulnérable.

## 1. Qualité du code PHP

### PHPStan niveau 6 : de 163 erreurs à 0

Configuration : `api/phpstan.dist.neon`. `src/` et `tests/` sont analysés avec le conteneur Symfony de test et l'EntityManager (`tests/object-manager.php`), pour que PHPStan connaisse les services et le mapping Doctrine.

| Erreurs | Cause | Correction |
| --- | --- | --- |
| 86 | `createdAt` / `updatedAt` typés `?DateTimeImmutable` sur des colonnes non nulles | Propriétés non nulles, non initialisées jusqu'au premier enregistrement. Les getters renvoient toujours `null` avant (`ValidGuardianship` s'en sert pour reconnaître une entité nouvelle) |
| 44 | Tests : tableaux sans forme décrite (`array $user`) | Type `TestUser` (`array{token, profileId, email}`) défini dans `ApiTestBase` et importé par les tests ; `array<string, mixed>` pour les corps JSON |
| 13 | Héritage à table unique (`Share`, `Comment`) : la colonne de la cible est nulle en base pour les autres sous-classes | **Ignorée, justifiée** dans la config : c'est le compromis de ce mapping, chaque sous-classe a toujours sa cible |
| 3 | `assert($data instanceof …)` toujours vrais dans les processeurs API Platform | Supprimés : le type générique du processeur le garantit déjà |
| 2 | Code mort dans `OwnedByCurrentProfileExtension` (table de chemins vide, boucle jamais exécutée) | Simplifiée : filtre propriétaire + suppression douce |
| 2 | `getParent(): ?static` qui renvoie le type de la classe | `?self` dans la classe abstraite, covariant dans les sous-classes |
| 1 | `match` incomplet sur les types de partage (`Contribution::targetClass`) | `default` qui lève une exception explicite |
| 1 | `editFields()` typé `array<string, string>` alors qu'il reçoit le corps de la requête | Typé `array<mixed>`, et ne garde que les champs vérifiés |
| 1 | `PlaceLeaver` passait un `AbstractPossession` là où `Item|Garment` est attendu | Types précisés (`list<Item|Garment>`) |
| reste | `??` sur un résultat non nul, fermeture générique non résolue, tableaux de retour | Corrigés un par un |

Aucune correction n'a changé le comportement : les 216 tests passent avant et après.

### Inspection manuelle : responsabilités, duplication, lisibilité

Points forts :
- **Règles d'accès centralisées** : `ResourceAccess` est le seul endroit qui décide qui voit et qui modifie quoi (tableau des droits du 30/09), et les voters s'y appuient.
- **Services métier dédiés** aux procédures longues (`ProfileDeleter`, `LocationMover`, `PlaceLeaver`, `PlaceDecisions`), testés en intégration.
- **Entités qui gardent leurs invariants** (exceptions de domaine, mappées en 422 par `ControllerErrorSubscriber`).
- Code et commentaires en français, cohérents avec le MDD.

Dette technique relevée :

| Constat | Où | Proposition |
| --- | --- | --- |
| **Duplication** : vérification d'une image envoyée (taille max 8 Mo, type lu dans les octets, JPEG/PNG/WebP) | `PhotoController`, `LookController`, `ScanController` | Un service `UploadedImageReader` partagé |
| **Fichiers longs** | `Order` (497 lignes), `ResourceAccess` (491), `Contribution` (475), `Loan` (454) | Acceptable pour des entités riches ; `ResourceAccess` pourrait se découper par famille de ressources |
| **Beaucoup de contrôleurs « à la main »** (look, fil, profils, partages, colocation, scan) | `src/Controller/*` | Choix assumé (multipart, actions métier), mais chaque préfixe de route doit être déclaré dans `ControllerErrorSubscriber`, sinon un 500 : à remplacer par un attribut ou une interface |
| **Fichier non suivi** | `api/config/reference.php` modifié localement, `api/nul` | À nettoyer (le second est un artefact Windows) |

## 2. Qualité technique Symfony et dépendances

- `lint:container`, `lint:yaml` (20 fichiers), `lint:twig` et `doctrine:schema:validate` : OK.
- `composer validate --strict` : le nom et la description manquaient ; ajoutés (`penderie/api`).
- `composer audit` : aucune faille connue.
- **Application (`npm audit`)** : 39 failles au départ.
  - `npm audit fix` (sans `--force`) corrige la faille critique (`shell-quote`) et deux hautes, sans changer `package.json`. Vérifié ensuite : bundle iOS complet, ESLint et TypeScript OK.
  - Les 21 hautes restantes sont dans l'outillage de build (Metro, CLI Expo, Tailwind / NativeWind). npm ne propose que des retours en arrière absurdes (`expo@44`) ; la vraie correction viendra avec la prochaine version majeure d'Expo.
  - La CI bloque donc sur une faille **critique** et affiche le reste.
- **Piège relevé** : `npm audit fix --omit=dev` retire aussi les dépendances de développement de `node_modules` (ESLint disparaît). À ne pas utiliser sur le poste.

## 3. Accessibilité (A11Y)

L'application est native (iOS / Android). Les critères web (focus visible, navigation clavier) se traduisent en lecteur d'écran (VoiceOver, TalkBack) et en cibles tactiles.

Points forts :
- **103 rôles** (`accessibilityRole`), 47 libellés, 14 états (`selected`, `disabled`), 20 annonces (`alert`, régions live) sur 111 fichiers. Les titres d'écran ont le rôle `header`, les messages d'erreur le rôle `alert`.
- **Police Luciole**, conçue pour les personnes malvoyantes, pour tout le texte courant.
- **Cibles tactiles** : boutons de 52 px de haut ; zones élargies (`hitSlop`) sur 19 petits éléments (retour, liens, points du look) pour atteindre 44 px.
- **Contrastes** (jetons du design system, calculés selon la formule WCAG sur le fond réel `#F8FAFC`) :

  | Couleur | Fond | Ratio | Niveau |
  | --- | --- | --- | --- |
  | texte `#1A1E24` | fond clair | 15,99:1 | AAA |
  | texte secondaire `#475569` | fond clair | 7,24:1 | AAA |
  | rose primaire `#D31D66` | fond clair | 4,85:1 | AA |
  | blanc sur bouton `#D31D66` | — | 5,08:1 | AA |
  | texte secondaire (mode sombre) `#9BA7B8` | `#12151A` | 7,50:1 | AAA |
  | rose (mode sombre) `#FF6098` | `#12151A` | 6,43:1 | AA |
- **Images** : les illustrations décoratives sont masquées au lecteur (`accessible={false}`) ; une photo d'objet est annoncée par le nom de la carte.
- Pas de texte figé : la taille système (Dynamic Type) est respectée.

À corriger :
- **Texte de 12 px** (légendes, badges) : lisible, mais à vérifier à 200 % de taille système (hauteurs de ligne fixées en pixels, risque de texte coupé).
- **Points du look** : 28 px, hitSlop compris ; à tester au doigt sur une photo chargée.
- **Pas de test VoiceOver de bout en bout** : à faire sur les parcours ajout, look du jour et fil (voir § 6).
- Version web : l'export statique échoue (§ 5) ; la navigation clavier n'y a pas été vérifiée.

## 4. Écoconception

| Constat | Mesure | Commentaire |
| --- | --- | --- |
| Bundle de l'application | 4,4 Mo (bytecode Hermes), 1 820 modules | Raisonnable pour une app Expo ; Hermes évite de parser le JS au démarrage |
| Polices embarquées | 521 Ko (3 TTF) | Variante Bold et Regular seulement |
| Photos envoyées | JPEG qualité 0,7, 1 280 px de large au plus | Réduites sur le téléphone avant l'envoi |
| Photos servies | `Cache-Control: private, max-age=86400` | Gardées un jour en cache sur le téléphone |
| Cache des données | React Query, `staleTime` de 30 s | Évite les requêtes répétées en naviguant |
| **Look du jour** | avant : jusqu'à 4 appels à un modèle d'IA par point (gros plan d'environ 640 px envoyé) ; après : 1 requête JSON de quelques octets | Le retrait de l'IA (PR #46, #48) est aussi le plus gros gain d'écoconception du projet |
| Listes | inventaire chargé en entier (toutes les pages de 30) ; fil paginé par 20 (FlatList) | Suffisant pour quelques centaines d'objets ; au-delà, recherche et pagination côté API |

Pistes :
- **Miniatures côté API** : aujourd'hui, une carte de 56 px télécharge la photo complète. Il faudrait l'extension GD ou Imagick dans l'image Docker.
- **WebP** pour les photos envoyées.
- Ne pas charger tout l'inventaire pour l'accueil (des compteurs côté API).

## 5. Expérience utilisateur (UX)

Ce qui marche :
- Les écrans suivent la maquette Figma (design system v2).
- Chaque action longue a un état de chargement, chaque erreur un message lisible : les erreurs de l'API sont traduites, et une page HTML d'erreur ne s'affiche plus en « JSON Parse error » (PR #40).
- Les actions destructrices demandent une confirmation.

Problèmes rencontrés en conditions réelles, et ce qui a été fait :

| Problème | Effet pour l'utilisateur | État |
| --- | --- | --- |
| IA gratuite saturée ou lente sur le look du jour | erreurs, attentes de 30 s | **Corrigé** : choix manuel, titre pour un vêtement nouveau (#46, #48) |
| Délai de PHP dépassé pendant l'analyse IA | « JSON Parse error » | **Corrigé** (#39, #40) |
| Jeton refusé au hasard (horloge Docker) | « Session expirée » inattendue | **Corrigé** (#47) |
| Entrées de menu « Bientôt » (Déplacer, Prêter, Vendre…) | fonctionnalités annoncées mais absentes | routes d'API manquantes, prochains lots |
| Autorisations des profils enfants enregistrées mais pas encore appliquées | un enfant n'est pas encore bloqué | lot 25 |
| Export web statique en échec (`nouveau-logement/pieces`, `Platform` indéfini au pré-rendu) | pas de version web | à corriger, ou passer le web en `output: single` |
| Configuration réseau du poste de développement (eduroam, pare-feu) | l'app ne joint pas l'API | documenté dans le README de l'app |

## 6. Testabilité et fiabilité

État :
- **API : 216 tests**. Unitaires (règles des énumérations, IA de vision simulée), d'intégration (services métier, base réelle) et fonctionnels (vraies requêtes HTTP, droits, visibilité, fil, look). Chaque test tourne dans une transaction annulée.
- **Dépendances externes simulées** : OpenRouter (`OpenRouterMock`, avec quota dépassé et panne), stockage des photos sur disque temporaire.
- **Données nécessaires** : référentiels chargés par commande (`app:reference-data:load`), clés JWT de test générées en CI.
- **Migrations testées dans les deux sens** en CI.

Fiabilisation faite pendant cet audit (la suite échouait au hasard environ 1 fois sur 3) :
1. **401 « Invalid JWT Token »** : l'horloge du conteneur recule parfois de quelques millisecondes → tolérance `clock_skew: 5` (#47).
2. **« Secret » retrouvé dans un UUID** : un UUID v7 commence par l'heure ; « 350 » y apparaissait selon l'heure de la journée → valeurs recherchées non ambiguës (#49).
3. **Ordre de deux UUID** créés dans la même milliseconde → le test vérifie tout l'historique (#49).
4. **Budget de l'IA** sur une machine chargée → assertion « au plus un appel » (#49).

Manques et scénarios à automatiser :
- **L'application n'a aucun test automatisé.** Priorité aux parcours critiques, en tests de bout en bout (Maestro, sur simulateur) :
  1. connexion, puis changement de profil ;
  2. ajout d'un vêtement (catégorie, taille, emplacement) ;
  3. look du jour : photo, point sur un vêtement du dressing, point avec un titre, « Compléter » ;
  4. publication dans le fil, et mention vue par un ami ;
  5. suppression d'un logement non vide (refus attendu).
- **Tests unitaires de la logique pure de l'app** (`lib/places.ts`, `lib/feed.ts`, `lib/api.ts`) avec Jest.
- **Couverture de code** de l'API à mesurer en CI (pcov), pour repérer les contrôleurs peu testés.

## Plan d'action

| Priorité | Action |
| --- | --- |
| Haute | Ajouter des tests de bout en bout pour l'app (5 parcours ci-dessus) ; étendre Snyk à l'app (`package-lock.json`) |
| Haute | Appliquer les autorisations des profils enfants (lot 25) |
| Moyenne | Factoriser la vérification d'image (3 contrôleurs) ; déclarer les routes à la main sans liste manuelle |
| Moyenne | Monter Expo / React Native à la prochaine version majeure (21 failles hautes de l'outillage) |
| Moyenne | Miniatures côté API (GD ou Imagick) ; export web réparé |
| Basse | Vérifier les textes de 12 px à 200 % ; campagne VoiceOver sur les parcours principaux |
| Basse | Monter PHPStan au niveau 7 puis 8 (nullabilité stricte) |
