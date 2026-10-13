# Penderie — API

Back-end de Penderie : **Symfony 7.4 LTS + API Platform 5 + PostgreSQL 17**, lancé dans Docker.
Les choix techniques et leurs raisons sont détaillés dans `docs/PENDERIE_STACK_TECHNIQUE.html`, le modèle de données dans `docs/PENDERIE_MODELE_DONNEES_V2.html`.

## Prérequis

- Docker Desktop (avec Docker Compose v2).
- C'est tout : PHP, Composer et PostgreSQL tournent dans les conteneurs. Un PHP installé sur le poste n'est pas utilisé.

## Démarrer

```bash
cd api
docker compose up -d --build
```

Au premier lancement, le conteneur installe les dépendances Composer : compter une à deux minutes avant que l'API réponde. Suivre l'avancement avec `docker compose logs -f php`.

| Adresse | Contenu |
|---|---|
| http://localhost:8080/api | Documentation interactive (Swagger UI) |
| http://localhost:8080/api/docs.jsonopenapi | Contrat OpenAPI, source des types côté app |
| `localhost:5432` | PostgreSQL — base, utilisateur et mot de passe : `penderie` |

Depuis un téléphone sur le même Wi-Fi (app Expo), l'API se joint par l'IP du poste : `http://<IP-du-poste>:8080/api`.

Le port 8080 est modifiable si un autre projet l'occupe : `API_HTTP_PORT=8090 docker compose up -d`.

## Commandes courantes

Toutes les commandes Symfony et Composer se lancent **dans le conteneur** :

```bash
docker compose exec php php bin/console <commande>
docker compose exec php composer require <paquet>

docker compose down        # arrête les conteneurs, garde les données
docker compose down -v     # arrête et EFFACE la base et vendor/
```

## Organisation Docker

| Service | Image | Rôle |
|---|---|---|
| `php` | `dunglas/frankenphp:1-php8.4` + extensions | PHP 8.4 et serveur web dans un seul conteneur |
| `database` | `postgres:17-alpine` | Base de données |

Le code du dossier `api/` est monté dans le conteneur : une modification est prise en compte immédiatement.
En revanche, `vendor/` et `var/` vivent dans des volumes Docker. Sous Windows, lire des milliers de petits fichiers à travers le montage rend chaque page trop lente : plus de 30 s, jusqu'à dépasser le délai d'exécution de PHP. Conséquence pratique : après un `git pull` qui modifie `composer.lock`, un simple `docker compose restart php` resynchronise `vendor/`.

Les services ajoutés par les prochaines fonctionnalités (stockage des photos, e-mails) viendront compléter `compose.yaml` avec leur feature.

## Base de données

Les entités suivent le modèle de données V2 (`docs/PENDERIE_MODELE_DONNEES_V2.html`). Chaque domaine arrive avec sa migration :

```bash
docker compose exec php php bin/console doctrine:migrations:migrate
```

Les contraintes `CHECK` (listes de valeurs des énumérations, règles de tutelle) sont écrites à la main dans les migrations : Doctrine ne sait pas les générer. Après avoir modifié une entité, `doctrine:migrations:diff` produit le SQL des tables, et il faut y ajouter les `CHECK` correspondants.

Les référentiels (catégories système, échelles de tailles, marques de la liste prédéfinie, couleurs, styles) ne sont pas dans les migrations : ils se chargent avec une commande **idempotente**, qui crée ce qui manque, met à jour ce qui existe et ne supprime jamais rien. À lancer après les migrations, et à relancer sans risque après avoir complété une liste de `src/ReferenceData/` :

```bash
docker compose exec php php bin/console app:reference-data:load
```

Une base de test, `penderie_test`, se crée et se migre avec `APP_ENV=test` :

```bash
docker compose exec -e APP_ENV=test php php bin/console doctrine:database:create --if-not-exists
docker compose exec -e APP_ENV=test php php bin/console doctrine:migrations:migrate -n
```

## Authentification

JWT (LexikJWTAuthenticationBundle) : un jeton d'accès de 15 minutes, gardé en mémoire par l'application, et un jeton de rafraîchissement (gesdinet/jwt-refresh-token-bundle, 30 jours, à usage unique) rangé dans le coffre sécurisé du téléphone.

| Route | Rôle |
|---|---|
| `POST /api/auth/register` | Crée le compte et son premier profil (adulte, par défaut). |
| `POST /api/auth/login` | `{email, password}` → `{token, refreshToken}`. |
| `POST /api/auth/refresh` | `{refreshToken}` → une nouvelle paire ; l'ancien jeton de rafraîchissement ne sert plus. |
| `GET /api/me` | Le compte, ses profils, et le profil actif. |

Toutes les autres routes `/api` exigent l'en-tête `Authorization: Bearer <token>`. Le jeton identifie un **compte** ; le **profil** qui agit se choisit par l'en-tête `X-Profile: <id du profil>` (sans en-tête : le profil par défaut). Un profil d'un autre compte, ou suspendu, est refusé (403).

Les clés et la passphrase ne sont jamais commitées : `docker-entrypoint.sh` génère la passphrase dans `.env.local` et les paires de clés dans `config/jwt/` (dev) et `config/jwt/test/` (tests) au démarrage du conteneur.

## Emplacement d'un objet

Un objet ou un vêtement est rangé dans une cascade **pièce › rangement › conteneur** : la pièce est obligatoire, le reste facultatif.

- À la **création** (`POST /api/items`, `POST /api/garments`), on peut donner `room`, `storage` et `box`. Le conteneur impose sa pièce et son rangement ; un rangement d'une autre pièce est refusé (422, `ValidLocation`) ; ranger dans la pièce de quelqu'un d'autre est refusé (403).
- **Ensuite**, l'emplacement ne change que par un déplacement (`LocationMover`, qui écrit l'historique) : un `PATCH` ne le modifie pas.

## Photos

Une photo appartient à un objet ou à un vêtement (galerie : `ItemMedia`, `GarmentMedia`).

| Route | Qui | Ce que ça fait |
|---|---|---|
| `POST /api/items/{id}/photos`, `POST /api/garments/{id}/photos` | qui peut **modifier** le bien (propriétaire, tuteur) | multipart, champ `image` : JPEG, PNG ou WebP, 8 Mo au plus, 12 photos par bien. Le type est lu dans les octets. La première photo devient la principale. |
| `GET /api/media/{id}` | qui peut **voir** un bien qui l'utilise | le fichier, en cache **privé** (jamais sur un proxy). Pour les autres : 404, on ne révèle pas qu'une photo existe. |

Chaque bien renvoie `photos` : les URL de `GET /api/media/{id}`, la principale d'abord. Le champ est absent pour un lien public sans compte, puisque la lecture exige un jeton.

Les fichiers sont sur le disque, dans `MEDIA_DIR` (`var/media` en dev, `var/test-media` en test), un dossier par mois. La base ne garde que le chemin : passer à un stockage objet (S3, MinIO) ne touchera que `MediaStorage`.

## Marques

La liste des marques est prédéfinie et vérifiée (`app:reference-data:load`), mais on peut ajouter la sienne :

- `POST /api/brands` `{ "name": "Trapstar" }` : **trouver ou créer**. Si une marque de même slug existe (« TRAPSTAR », « Trap Star »), elle est renvoyée (200). Sinon, elle est créée **non vérifiée** et rattachée au profil actif (201). Nom vide, sans lettre ni chiffre, ou de plus de 80 caractères : 422.
- `GET /api/brands` : la liste vérifiée, plus les marques que le profil actif a ajoutées. Celles des autres n'y figurent pas tant que l'admin ne les a pas validées, mais elles restent lisibles par leur IRI sur un vêtement.

## Partage et visibilité

Tout est **privé par défaut**. Un partage ouvre l'accès, à trois niveaux : rien < **Lire** (`READ`) < **Modifier** (`EDIT`). Les règles sont dans `ResourceAccess` (décisions du 30/09, section « Qui voit quoi » du MDD) :

- **Lire** : voir l'objet, et commenter entre amis. Abonnés et lien : lecture seule, sans commentaires.
- **Modifier** : seulement pour des amis **nommés**. On ne modifie jamais directement : on **propose** (déposer un objet dans la pièce, ajouter au moodboard, corriger le nom ou la description), et le propriétaire valide. On peut repartager, en lecture seule ; l'objet reste celui du propriétaire (« repartagé par… »).
- **Personnel** (`personal: true`) : jamais visible par un autre, jamais partageable, caché même dans une pièce ou par un lien partagés.
- Qui n'est pas propriétaire (ou tuteur) ne reçoit **jamais** les champs privés : notes, date et valeur d'achat, provenance, adresse du logement. L'emplacement (pièce / rangement / conteneur) n'est montré qu'au foyer et aux colocs qui voient la pièce — jamais à un ami, un abonné ou un lien (`PrivateFieldsNormalizer`).
- Chaque ressource renvoie un champ `access` (`ADMIN`, `EDIT`, `VIEW`) : la case du tableau des droits pour celui qui regarde, pour n'afficher que les gestes permis.
- L'amitié et l'abonnement sont vérifiés **à chaque requête** : retirer un ami coupe l'accès tout de suite.

| Route | Rôle |
|---|---|
| `POST /api/shares` | `{targetType: ITEM\|GARMENT\|ROOM\|STORAGE\|BOX\|PLACE\|OUTFIT\|COLLECTION, targetId, audience: SPECIFIC\|FRIENDS\|FOLLOWERS\|LINK, accessLevel?, recipients?: [profileId], expiresAt?}` |
| `GET /api/shares` | Mes partages (de mes affaires, ou faits par moi), avec le jeton des liens. |
| `GET /api/shares/received` | Ce qu'on me partage et que je peux voir maintenant. |
| `DELETE /api/shares/{id}` | Révoquer (le propriétaire, son tuteur, ou l'auteur du partage). |
| `GET /api/links/{token}` | **Sans compte** : ce que montre un lien actif (nom, description, état ; rien de privé). 404 si révoqué ou expiré. |
| `POST /api/contributions` | Proposer : `PLACE_POSSESSION`, `ADD_COLLECTION_ENTRY` ou `EDIT_FIELDS` (voir `ContributionController`). |
| `GET /api/contributions` | `{toReview, mine}` : à valider, et mes propositions. |
| `POST /api/contributions/{id}/accept` · `/reject` · `/withdraw` | Le propriétaire (ou son tuteur) accepte ou refuse ; l'auteur retire. |

Codes : 403 sans droit, 404 introuvable, 422 règle refusée (objet personnel, `EDIT` à une audience ouverte…), 400 valeur inconnue.

## Colocation et foyer

Le tableau des droits complet (propriétaire, coloc, profil +18 / −18 du même compte, amis, abonnés, public) est dans `docs/PENDERIE_DROITS_v2.xlsx` et dans la section « Colocation et foyer » du MDD. `ResourceAccess::level()` le traduit en code ; `RightsTableTest` le vérifie case par case.

**Colocation** : un logement a des **membres**, tous admins (son créateur est le premier). Être membre ne donne aucun droit sur les affaires des autres.

- Une pièce est **commune** par défaut : chaque coloc la voit, la modifie directement (nom, type, rangements) et y range ses affaires, sans toucher à celles des autres.
- Son créateur peut la **fermer** : seuls lui et les colocs qu'il autorise la voient. Il la rouvre ; s'il a quitté le logement, n'importe quel membre le peut.
- **Unanimité** pour inviter quelqu'un, supprimer le logement ou une pièce commune. Le demandeur vote oui d'office, l'invité vote aussi, un seul « non » rejette, le dernier « oui » applique la décision.
- On ne supprime qu'un logement ou une pièce **vide** (409 sinon). En coloc, un `DELETE` direct sur le logement ou une pièce commune répond 409 : passer par une décision.
- **Partir** : ses affaires partent avec soi (`TAKE`, déplacement tracé) ou passent à un coloc (`TRANSFER`, jamais un objet personnel, prêté ou en vente).

| Route | Rôle |
|---|---|
| `GET /api/places/{id}/members` | Les membres du logement. |
| `GET /api/places/{id}/decisions` | Les décisions du logement. |
| `POST /api/places/{id}/decisions` | `{kind: INVITE_MEMBER, inviteeId}` \| `{kind: DELETE_PLACE}` \| `{kind: DELETE_ROOM, roomId}` |
| `GET /api/place_decisions/awaiting` | Les décisions qui attendent mon vote (dont les invitations reçues). |
| `POST /api/place_decisions/{id}/approve` · `/reject` · `/cancel` | Voter oui, non ; le demandeur annule. |
| `POST /api/places/{id}/leave` | `{mode: TAKE, roomId}` (une de mes pièces, ailleurs) \| `{mode: TRANSFER, heirId}` (un coloc). |
| `POST /api/rooms/{id}/close` · `/open` | Fermer / rouvrir une pièce. |
| `POST /api/rooms/{id}/allowed` · `DELETE /api/rooms/{id}/allowed/{profileId}` | `{profileId}` : autoriser / retirer un coloc dans sa pièce fermée. |

**Foyer** (profils d'un même compte) : ils voient tout ce qui appartient aux autres, sauf le personnel. Un adulte **propose** des modifications (`POST /api/contributions`, sans partage) sur les objets, pièces, rangements et catégories ; un mineur sur les rangements et catégories. Le propriétaire valide.

Codes : 409 « Situation bloquante » (pas vide, décision requise), 422 règle refusée, 403 sans droit.

## Profils du compte

Un compte, c'est une connexion et plusieurs identités (MDD). Il y a l'adulte qui s'est inscrit, ses enfants (`CHILD`, sous tutelle) et les proches qu'il gère (`RELATIVE`, majeurs). Chaque profil a sa propre penderie, et l'app choisit le profil actif par l'en-tête `X-Profile`.

| Route | Qui | Rôle |
| --- | --- | --- |
| `GET /api/account/profiles` | tout profil du compte | les profils du compte : identité, tuteur, compteurs (objets, vêtements, prêts en cours), et `canManage` / `canDelete` pour le profil actif |
| `POST /api/account/profiles` | un adulte | `{type: CHILD \| RELATIVE, firstName, dateOfBirth, lastName?, displayName?, username?}`. Le créateur devient le tuteur. Sans nom, le profil prend celui du tuteur ; sans identifiant, l'API en propose un libre (`noe.4821`). Un enfant est mineur, un proche est majeur |
| `PATCH /api/account/profiles/{id}` | un adulte du compte ; le profil lui-même pour `displayName` et `bio` | identité. `type` : seul un enfant devenu majeur passe proche |
| `GET /api/account/profiles/{id}/permissions` | tout profil du compte | le mode de chaque permission, sa valeur par défaut, et `custom` s'il s'agit d'une exception |
| `PUT /api/account/profiles/{id}/permissions` | un adulte du compte, jamais le profil lui-même | `{modes: {SELL: "DENIED", …}}`. Une permission remise à la valeur par défaut de son type perd son exception |

« Un adulte du compte » vient du MDD : les permissions se règlent par « le tuteur du profil, ou un profil ADULT du même compte ». Les deux parents gèrent donc l'enfant. Un autre compte reçoit 404.

## Supprimer un profil

`DELETE /api/profiles/{id}` : le tuteur supprime le profil d'un enfant ou d'un proche géré par le compte (`ProfileDeleter`, procédure du MDD).

- **Au tuteur** : objets, vêtements, médias, logements, collections, tenues, catégories personnelles (fusionnées si le tuteur en a une de même nom).
- **Au profil fantôme** : ce qui concerne des tiers — prêts terminés, commandes, commentaires, publications, annonces, et leurs journaux.
- **Supprimé avec le profil** : relations, préférences, suggestions, notifications.
- **Bloqué (409)** tant qu'un prêt est en cours ou qu'une commande n'est pas terminée ; les prêts pas encore remis sont annulés.
- La suppression d'un profil **adulte** n'est pas encore définie (422).

## Scan par IA (OpenRouter)

`POST /api/scans/analyze` (multipart : `kind` = `PHOTO` ou `LABEL_OCR`, `image` = JPEG/PNG/WebP ≤ 8 Mo) envoie la photo à un modèle de vision via [OpenRouter](https://openrouter.ai) et renvoie de quoi pré-remplir la fiche. Chaque scan, réussi ou non, est tracé dans `Scan`.

**Clé API** (gratuite, aucune carte bancaire) :

1. Créer un compte sur https://openrouter.ai, puis **Settings → Keys** (https://openrouter.ai/settings/keys) → *Create key*.
2. Dans **Settings → Privacy** (https://openrouter.ai/settings/privacy), autoriser les fournisseurs des modèles gratuits (*free endpoints that may train on inputs*). Sinon tous les modèles `:free` répondent 404 et le scan échoue.
3. La mettre dans `api/.env.local` (jamais commité) : `OPENROUTER_API_KEY=sk-or-v1-...`

Les modèles sont essayés dans l'ordre de `OPENROUTER_SCAN_MODELS` (`.env`) : quota dépassé, modèle retiré, panne ou réponse illisible → modèle suivant. Limites des modèles gratuits : ~20 requêtes/minute et 50/jour (1 000/jour une fois 10 $ de crédits achetés sur le compte).

Pour tester depuis le téléphone : écran **Tester le scan** de l'app (`app/src/app/scan.tsx`).

## Look du jour

Une photo de soi (`DailyLook`, une par profil et par jour), et sur cette photo un point par vêtement porté (`LookTag`). Chaque point désigne un vêtement du dressing, choisi par l'utilisateur ; il n'y a pas d'IA. Les modèles gratuits étaient trop lents et trop souvent saturés pour un geste aussi fréquent.

Un vêtement porté qui n'est pas encore dans le dressing s'ajoute d'un simple titre : il est créé « à compléter » (`Garment::sketch`, `incomplete: true`), sans catégorie ni pièce, et se termine plus tard (voir ci-dessous). Un point est confirmé (`CONFIRMED`) dès sa création ; les états `MATCHED`, `NEW` et `UNKNOWN` ne servent plus qu'aux points des anciens looks.

**Vêtement à compléter.** C'est la seule exception à la règle « une catégorie et une pièce » : la création par `POST /api/garments` les exige toujours. Il apparaît dans `GET /api/garments` avec `incomplete: true`, `category` et `room` nuls. `POST /api/garments/{id}/complete {category, room, storage?, box?}` lui donne sa catégorie et le range : ce sont les deux informations qu'un `PATCH` n'écrit pas. Le reste (taille, couleurs, marque…) passe ensuite par le `PATCH` habituel. Il ne se déplace pas avant d'être rangé, et un vêtement déjà complet ne se « complète » pas (422).


Le look est destiné à un post Instagram en deux images (la photo avec ses points, puis les vêtements). L'API ne publie rien : elle tient l'état du look, `TAGGING` › `READY` › `POSTED`. Pour passer à `READY`, chaque point doit désigner un vêtement. Le passage à `READY` note aussi le port de chaque vêtement ce jour-là (`WearLog`), ce que le moteur de suggestion utilise. Un look `POSTED` ne se modifie plus.

| Route | Rôle |
| --- | --- |
| `GET /api/looks/today` | `{look}` : le look du jour du profil, ou `null` |
| `GET /api/looks` | ses looks, du plus récent au plus ancien |
| `POST /api/looks` | multipart, champ `image` : crée le look du jour. Répond 409 s'il en existe déjà un |
| `GET`, `PATCH`, `DELETE /api/looks/{id}` | `PATCH {status?, caption?}` change l'état ou la légende (2 200 caractères au plus). `DELETE` supprime aussi la photo |
| `POST /api/looks/{id}/tags` | `{x, y, garment}` (de 0 à 1 depuis le coin haut gauche ; un vêtement visible, même emprunté) ou `{x, y, name}` (crée un vêtement à compléter). 12 points au plus |
| `PATCH /api/looks/{id}/tags/{tagId}` | `{garment: "/api/garments/{id}"}` : le vêtement du point. Il peut être emprunté, il suffit de pouvoir le voir |
| `DELETE /api/looks/{id}/tags/{tagId}` | retire le point |

Un look n'est visible que par son propriétaire et son tuteur : les autres reçoivent 404, sa photo comprise, sauf s'il est publié dans le fil (ci-dessous). Un point ne se modifie que lorsque le look est en préparation (`TAGGING`).

## Fil d'actualité

Le fil de Penderie (maquette, section « 16 — Fil d'actualité »), commencé par le look du jour. Une publication (`Post`) s'adresse à des amis (`FRIENDS`) ou à des abonnés, amis compris (`FOLLOWERS`). Les abonnés ne commentent pas (MDD).

**Publier un look.** Comme le prévoit le MDD, une publication met en avant une ressource et crée le partage qui y donne accès. Pour un look, cette ressource est une tenue (`Outfit`) faite de ses vêtements. Ses vêtements deviennent donc visibles, en lecture, par l'audience de la publication (`ResourceAccess` : « un look partagé qui le porte »), et seulement par elle. Supprimer la publication révoque ce partage : les vêtements redeviennent privés.

**Les points sont des mentions.** Comme sur Instagram, chaque point donne le nom du vêtement ; `canView` dit si on peut ouvrir sa fiche. Les détails (marque, taille, couleurs, photo) ne sont envoyés qu'à ceux qui peuvent l'ouvrir.

| Route | Rôle |
| --- | --- |
| `POST /api/looks/{id}/publish` | `{audience: FRIENDS \| FOLLOWERS, body?}` : publie un look prêt (`READY` ou `POSTED`), une seule fois. Le texte reprend la légende du look par défaut |
| `GET /api/feed?before=` | `{posts, next}` : les publications que je peux voir (les miennes, celles de mon foyer, de mes amis, des comptes que je suis), 20 par page. `next` se passe en `before` pour la page suivante |
| `GET`, `DELETE /api/posts/{id}` | une publication ; seul son auteur la supprime (le texte reste en base, la publication disparaît du fil) |
| `GET /api/profiles/{id}/page` | la page d'un profil vue par moi : `relation` (moi, foyer, ami, abonné), ses publications visibles, et les vêtements qu'elles me montrent |

L'audience est vérifiée à chaque lecture : retirer un ami lui cache aussitôt les publications et les vêtements. La photo d'un look publié se lit par l'audience de la publication (`GET /api/media/{id}`). Un look publié ne repasse plus en préparation ; un look qui a été publié ne se supprime plus (sa photo est celle de la publication).

## Tests

La suite PHPUnit tourne sur la base de test `penderie_test`, migrée et chargée de ses référentiels (voir « Base de données ») :

```bash
docker compose exec php php bin/phpunit                    # toute la suite
docker compose exec php php bin/phpunit tests/Unit         # sans base de données
docker compose exec php php bin/phpunit --filter SaleTest  # un domaine
```

- `tests/Unit/` : règles pures (calculs de montants, permissions par défaut, énumérations, slugs de marque).
- `tests/Api/` : de vraies requêtes HTTP (inscription, connexion, rafraîchissement, profil actif, droits sur l'inventaire, partage et visibilité — dont « voler les affaires du voisin »).
- `tests/Integration/` : un fichier par domaine du MDD, sur un vrai PostgreSQL. Chaque test tourne dans une transaction annulée à la fin (`dama/doctrine-test-bundle`) ; `assertDbRejects()` vérifie qu'une contrainte en base refuse bien une donnée interdite.

La CI GitHub Actions (`.github/workflows/api.yml`) rejoue tout sur chaque push et chaque PR qui touche `api/` : migrations (et leur retour à zéro), référentiels, validation du schéma, PHPUnit.

## Qualité du code

Un `Makefile` réunit les commandes. Sur le poste, elles passent par le conteneur PHP, qui contient `make` (pas besoin de l'installer sous Windows) :

```bash
docker compose exec php make help          # la liste
docker compose exec php make quality EXEC= # linters, PHPStan, audit
docker compose exec php make ci EXEC=      # qualité puis tests, comme la CI
```

| Commande | Contenu |
| --- | --- |
| `make lint` | `lint:container`, `lint:yaml`, `lint:twig`, `doctrine:schema:validate --skip-sync` |
| `make phpstan` | PHPStan **niveau 6** sur `src/` et `tests/`, avec les extensions Symfony, Doctrine et PHPUnit (`phpstan.dist.neon`) |
| `make audit` | `composer validate --strict` et `composer audit` |

La CI les lance dans un job « Qualité », en parallèle des tests. Un job « Sécurité (Snyk) » s'active quand le secret `SNYK_TOKEN` existe dans le dépôt. Le bilan complet est dans `audit.md`, à la racine du dépôt.

## Structure

```
api/
├── config/            configuration Symfony (packages/, routes/)
├── migrations/        migrations Doctrine, une par domaine du MDD
├── public/            point d'entrée HTTP (index.php)
├── src/
│   ├── ApiResource/   ressources API qui ne sont pas des entités
│   ├── Entity/        entités Doctrine, un dossier par domaine du MDD
│   │   └── Trait/     comportements partagés (createdAt / updatedAt)
│   ├── Command/       commandes console (app:reference-data:load)
│   ├── Controller/    inscription, /api/me
│   ├── Doctrine/      filtrage des listes par profil actif
│   ├── Enum/          énumérations métier (backed enums PHP)
│   ├── ReferenceData/ contenu des référentiels et son chargeur
│   ├── Repository/    requêtes Doctrine, même découpage que Entity/
│   ├── Security/      profil actif, voters, résolution des permissions
│   ├── Serializer/    propriétaire injecté côté serveur à la création
│   ├── State/         suppression douce
│   └── Validator/     contraintes métier qui lisent plusieurs lignes
├── tests/             Unit/ (sans base) et Integration/ (un fichier par domaine)
├── compose.yaml       environnement Docker
├── Dockerfile         image PHP
└── docker-entrypoint.sh
```
