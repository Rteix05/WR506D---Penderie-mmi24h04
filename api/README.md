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

## Structure

```
api/
├── config/            configuration Symfony (packages/, routes/)
├── migrations/        migrations Doctrine (aucune pour l'instant)
├── public/            point d'entrée HTTP (index.php)
├── src/
│   ├── ApiResource/   ressources API qui ne sont pas des entités
│   ├── Entity/        entités Doctrine
│   └── Repository/    requêtes Doctrine
├── compose.yaml       environnement Docker
├── Dockerfile         image PHP
└── docker-entrypoint.sh
```
