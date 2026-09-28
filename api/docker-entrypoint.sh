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

# Lance ensuite la commande normale de l'image (FrankenPHP).
exec docker-php-entrypoint "$@"
