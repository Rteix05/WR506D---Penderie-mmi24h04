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

## Tests

La suite PHPUnit tourne sur la base de test `penderie_test`, migrée et chargée de ses référentiels (voir « Base de données ») :

```bash
docker compose exec php php bin/phpunit                    # toute la suite
docker compose exec php php bin/phpunit tests/Unit         # sans base de données
docker compose exec php php bin/phpunit --filter SaleTest  # un domaine
```

- `tests/Unit/` : règles pures (calculs de montants, permissions par défaut, énumérations, slugs de marque).
- `tests/Integration/` : un fichier par domaine du MDD, sur un vrai PostgreSQL. Chaque test tourne dans une transaction annulée à la fin (`dama/doctrine-test-bundle`) ; `assertDbRejects()` vérifie qu'une contrainte en base refuse bien une donnée interdite.

La CI GitHub Actions (`.github/workflows/api.yml`) rejoue tout sur chaque push et chaque PR qui touche `api/` : migrations (et leur retour à zéro), référentiels, validation du schéma, PHPUnit.

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
│   ├── Enum/          énumérations métier (backed enums PHP)
│   ├── ReferenceData/ contenu des référentiels et son chargeur
│   ├── Repository/    requêtes Doctrine, même découpage que Entity/
│   ├── Security/      résolution des permissions de profil
│   └── Validator/     contraintes métier qui lisent plusieurs lignes
├── tests/             Unit/ (sans base) et Integration/ (un fichier par domaine)
├── compose.yaml       environnement Docker
├── Dockerfile         image PHP
└── docker-entrypoint.sh
```
