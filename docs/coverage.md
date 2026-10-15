# Couverture des tests — Penderie

> Séance 16. Résultats du 14/10/2026, branche `feat/test`. Comme le demande le sujet, cette branche n'est **pas fusionnée dans develop** (la fusion du 14/10 a été annulée le 15/10).
> Synthèse de la chaîne complète (qualité, tests, bout en bout, CI) et captures : [ci.md](ci.md).

## En bref

| Mesure | Résultat |
|---|---|
| Tests PHPUnit (API) | **279 tests, 1 659 assertions, 0 échec** (au départ : 216) |
| Code **métier** couvert | **1 656 / 1 656 lignes, 100 %**, vérifié par `bin/coverage-check`, exigé en CI |
| Tout `src/` couvert | 3 828 / 4 372 lignes, 87,6 % (au départ : 82,3 %) |
| Tests de bout en bout (Cypress) | **11 scénarios, 5 parcours, 11/11** (deux campagnes de suite) |
| Analyse statique | PHPStan niveau 6 : 0 erreur ; ESLint et TypeScript : 0 erreur |

```bash
make coverage        # la suite avec couverture, puis le contrôle du 100 % métier
make coverage-html   # le rapport HTML détaillé, dans api/coverage/index.html
make e2e             # la campagne Cypress
```

## 1. Ce que « partie métier » veut dire ici

Exiger 100 % de **tout** le code n'aurait pas de sens : on écrirait des tests pour des getters ou des listes de valeurs, sans rien prouver. Ce qui doit être prouvé, ce sont **les règles** : ce que l'application accepte, refuse, calcule, et qui y a droit.

Le périmètre exigé à 100 % est écrit dans `api/bin/coverage-check`, le même sur le poste et en CI :

| Dossier de `src/` | Contenu | Exigé |
|---|---|---|
| `Service/` | les cas d'usage : déplacer un objet, quitter une colocation, voter une décision, supprimer un profil enfant, relire une proposition, analyser un scan | **100 %** |
| `Security/` | qui lit, modifie, commente quoi (`ResourceAccess`, voters, profil courant) | **100 %** |
| `Validator/` | les contraintes maison (tutelle, taille dans l'échelle, emplacement cohérent, arbre des catégories, droit d'acheter ou de vendre) | **100 %** |
| `State/`, `Doctrine/`, `Serializer/` | suppression d'un logement, filtrage des listes par propriétaire, champs privés | **100 %** |
| `Enum/`, `Util/` | règles portées par les énumérations, calcul monétaire | **100 %** |
| `Entity/`, **méthodes qui décident** | toute méthode de complexité cyclomatique ≥ 2 (un `if`, un `match`, une exception) : transitions d'état, refus, invariants | **100 %** |
| `Entity/`, accesseurs sans branche | `getName()`, `setNotes()`… | mesuré, pas exigé |
| `Controller/` | la couche HTTP : lire la requête, appeler le métier, répondre | mesuré (89 %) |
| `Repository/`, `ReferenceData/`, `Command/`, `DataFixtures/`, `Kernel` | requêtes générées, listes de valeurs, outillage | mesuré |

**Pourquoi la complexité ≥ 2 pour les entités.** Une méthode sans branche ne prend aucune décision : si elle est fausse, un test qui l'utilise tombe déjà. Une méthode avec une branche porte une règle, et chaque branche doit être prouvée, y compris le refus. Le critère est objectif : il vient du rapport Clover de PHPUnit, pas d'une liste tenue à la main. Une nouvelle règle ajoutée sans test fait donc échouer la CI.

**Pourquoi pas les contrôleurs.** Ils sont testés par les tests fonctionnels (`tests/Api`, 89 %). Les lignes restantes sont surtout des réponses d'erreur de format (400) sur des routes déjà couvertes par ailleurs. Les règles qu'ils appellent sont, elles, à 100 % dans `Service/` et `Security/`.

## 2. La stratégie : chaque règle testée au niveau le moins cher qui la prouve

| Niveau | Où | Combien | Ce qu'il prouve | Pourquoi ce niveau |
|---|---|---|---|---|
| Unitaire | `tests/Unit` | 68 tests, < 1 s | les règles des entités et énumérations : un vendeur ne confirme pas à la place de l'acheteur, un look se pose en 12 points au plus, une proposition ne vise que ce que le droit couvre… | pas de base : rapide, et l'échec désigne la règle exacte |
| Intégration | `tests/Integration` | vraie base PostgreSQL | services, droits, validateurs, **contraintes SQL** (CHECK, cascades) | une partie des règles est dans la base : un test sans base ne les verrait pas |
| Fonctionnel (HTTP) | `tests/Api` | requêtes à travers tout le noyau Symfony | pare-feu JWT, voters, sérialisation, codes HTTP (403, 404, 409, 422) | prouve que l'API expose bien la règle, pas seulement qu'elle existe |
| Bout en bout | `app/cypress` | 11 scénarios | l'app réelle (export web) contre une vraie API : connexion, inscription, inventaire, fil, création d'un logement | prouve que le tout tient ensemble, du point de vue de l'utilisateur |

Choix qui rendent la campagne **pertinente** (et pas seulement couvrante) :

- **On teste le refus, avec son message exact.** `assertRefused('Seul le vendeur peut faire ce geste.', …)` : un test qui vérifierait seulement « ça lève une exception » passerait même pour une autre raison.
- **On passe par les vrais gestes, jamais par la réflexion sur une méthode privée.** `Order::assertSeller()` est prouvée en appelant `ship()` par l'acheteur. Une seule exception, documentée dans le test : simuler la disparition d'une ligne en base (`ON DELETE SET NULL`), impossible sans base.
- **Isolation totale.** Chaque test tourne dans une transaction annulée (dama/doctrine-test-bundle). L'ordre des tests n'a pas d'importance, et aucun ne voit les données d'un autre.
- **Les dépendances externes sont simulées, pas l'application.** OpenRouter (scan par IA) répond via `MockHttpClient`. La base et le noyau Symfony sont les vrais.
- **Cypress cible des sélecteurs dédiés aux tests** (le `data-cy` du cours). Sous React Native, c'est la prop `testID`, que `react-native-web` rend en `data-testid` : `cy.testId('login-submit')`. Un libellé, une traduction ou un changement de design ne cassent donc pas la campagne. L'accessibilité reste vérifiée, mais comme une **assertion** sur l'élément trouvé (`role="alert"`, `aria-label="Inventaire, 3 objets"`, `aria-checked`), plus comme le moyen de le trouver. Les listes sont comptées (`garment-card` × 9), et un texte n'est cherché qu'à l'intérieur de la carte qui doit le contenir.

## 3. Les fixtures : deux besoins, deux outils

| Besoin | Outil | Pourquoi |
|---|---|---|
| Données d'**un** test PHPUnit | fabriques dans `DatabaseTestCase` / `ApiTestBase` (`profile()`, `room()`, `signUp()`…) | chaque test montre, dans son propre code, les données dont il dépend ; rien de partagé ni de caché |
| Jeu de données **connu d'avance**, pour Cypress et la démonstration | `api/src/DataFixtures` (DoctrineFixturesBundle) | l'app a besoin de quelque chose à montrer : un dressing, un logement, un ami, un look publié |

Le jeu de démonstration (`make e2e-api`) contient :

- **Camille** : 9 vêtements et 3 objets rangés dans un appartement (chambre, armoire, commode, carton à la cave), un box de stockage vide, un enfant (Léo), une amitié avec Thomas, un abonnement à Julie ;
- **Thomas** : son look du jour, publié pour ses amis (photo, 2 vêtements pointés) ;
- **Julie** ;
- **Nina** : un compte vide.

Mot de passe commun : `penderie-demo-42` (base jetable). Identifiants centralisés dans `DemoAccounts`.

Il est chargé dans une **base à part** (`penderie_e2e`, API sur le port 8090, `api/compose.e2e.yaml`), remise à zéro à chaque campagne. La base de développement n'est jamais purgée.

`tests/Integration/FixturesTest.php` charge ces fixtures dans la base de test et passe **chaque entité au validateur**. Une règle ajoutée plus tard qui rendrait le jeu de démonstration invalide fait échouer la CI.

## 4. Ce que la campagne a trouvé

Une campagne de tests sert d'abord à trouver des problèmes. Celle-ci en a trouvé, et ils sont corrigés :

| Constat | Trouvé par | Suite donnée |
|---|---|---|
| Sur la version web, **aucun état accessible** (case cochée, onglet sélectionné, bouton désactivé) n'atteignait le lecteur d'écran : `react-native-web` ignore `accessibilityState` | Cypress, en cherchant les pièces cochées par `aria-checked` | corrigé dans 12 composants (props `aria-*`) |
| `ScanAnalyzer::photoSuggestion()` et `AbstractCategory::transferTo()` : **code mort**, jamais appelé | la couverture, ligne par ligne | supprimé (on ne teste pas du code qui ne sert pas) |
| Le serveur web d'Expo plantait (pré-rendu statique cassé par Expo 57.0.28) | le lancement de Cypress | correctif de la PR #54, fusionné dans `feat/test` |
| En mode debug sous Windows, l'API mettait 15 à 30 s par requête : les tests expiraient au hasard | des échecs Cypress qui changeaient d'un passage à l'autre | API e2e en `APP_DEBUG=0` : 0,5 à 3 s |
| Le scénario « refuse un mot de passe trop court » **ne prouvait rien** : il cherchait « 10 caractères », texte que l'aide affiche en permanence sous le champ (« Au moins 10 caractères. »), erreur ou pas | le passage aux `testID` (l'aide et l'erreur ont des identifiants distincts) | le test vérifie maintenant que l'aide est là avant l'envoi, puis qu'**elle laisse place à l'erreur** (`signup-password-error`) |
| NativeWind lève une erreur au chargement sur le web (mode sombre « media ») | Cypress (« uncaught exception ») | erreur tierce sans effet visible : tolérée **nommément** dans `cypress/support/e2e.ts`, toute autre erreur fait échouer |

## 5. Limites, dites franchement

- **100 % de couverture ne prouve pas l'absence de bug.** Une ligne exécutée n'est pas forcément vérifiée. C'est pourquoi chaque test affirme un résultat (statut obtenu, message exact), et pas seulement « rien ne plante ». L'étape suivante serait le *mutation testing* (Infection), qui modifie le code pour vérifier que des tests échouent.
- **Les domaines Vente, Prêt et Modération** sont modélisés et testés au niveau des entités et de la base, mais n'ont pas encore de routes API : ils ne sont donc ni dans les tests HTTP ni dans Cypress.
- **Cypress tourne sur la version web.** Les comportements propres à iOS et Android (caméra, trousseau) ne sont pas couverts par la campagne de bout en bout.

## 6. Usage de l'IA

Une première version des tests unitaires d'entités a été confiée à un agent gratuit (OpenCode). Elle a été **refusée** à la relecture : imports inexistants, méthodes privées appelées par réflexion, lot incomplet. Les tests ont été réécrits. Détail dans `docs/JOURNAL_IA.md`.
