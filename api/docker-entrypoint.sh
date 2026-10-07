#!/bin/sh
# Point d'entrée du conteneur « php ».
#
# vendor/ vit dans un volume Docker (voir compose.yaml), pas dans le dossier du
# poste : au premier démarrage il est vide, et après une modification de
# composer.lock (git pull, nouveau paquet) il est en retard. On le synchronise
# donc à chaque démarrage ; quand rien n'a changé, Composer rend la main en
# quelques secondes.
set -e

composer install --prefer-dist --no-progress --no-interaction

# APP_SECRET n'est jamais commité : chaque poste génère le sien au premier
# démarrage, dans .env.local (ignoré par git). Une valeur aléatoire dans un
# fichier commité, même de dev, est un secret qui fuit avec le dépôt.
if ! grep -qs '^APP_SECRET=.\+' .env.local; then
    echo "APP_SECRET=$(php -r 'echo bin2hex(random_bytes(16));')" >> .env.local
    echo "APP_SECRET généré dans .env.local"
fi

# Même principe pour la passphrase des clés JWT, puis les clés elles-mêmes
# (config/jwt/*.pem, ignorées par git). --skip-if-exists : on ne régénère
# jamais une paire existante, sinon tous les jetons en cours deviendraient
# invalides. Les tests ont leur propre paire jetable (config/jwt/test/).
if ! grep -qs '^JWT_PASSPHRASE=.\+' .env.local; then
    echo "JWT_PASSPHRASE=$(php -r 'echo bin2hex(random_bytes(32));')" >> .env.local
    echo "JWT_PASSPHRASE générée dans .env.local"
fi
php bin/console lexik:jwt:generate-keypair --skip-if-exists --no-interaction
APP_ENV=test php bin/console lexik:jwt:generate-keypair --skip-if-exists --no-interaction

# Lance ensuite la commande normale de l'image (FrankenPHP).
exec docker-php-entrypoint "$@"
