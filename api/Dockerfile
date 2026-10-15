# Image PHP de l'API Penderie.
#
# FrankenPHP = PHP 8.4 + serveur web (Caddy) dans un seul conteneur : pas de
# couple nginx + php-fpm à maintenir. C'est aussi la base de la distribution
# officielle d'API Platform, dont la documentation s'applique donc telle quelle.
#
# PHP 8.4 plutôt que 8.2 : Symfony 7.4 le supporte, et le passage à Symfony 8
# (PHP 8.4 minimum) n'exigera pas de changer d'image.
FROM dunglas/frankenphp:1-php8.4

WORKDIR /app

# Extensions nécessaires à l'API :
#  - pdo_pgsql : Doctrine → PostgreSQL
#  - intl      : validation et formatage localisés (Symfony, API Platform)
#  - opcache, apcu : performances (cache d'opcodes et cache applicatif)
#  - zip       : utilisé par Composer pour décompresser les paquets
#  - @composer : installe le binaire Composer dans l'image
RUN install-php-extensions \
        @composer \
        apcu \
        intl \
        opcache \
        pdo_pgsql \
        zip

# Composer tourne en root dans le conteneur : on assume, c'est un conteneur de dev.
ENV COMPOSER_ALLOW_SUPERUSER=1

# « :80 » = HTTP simple, sans le certificat HTTPS automatique de Caddy. Le
# téléphone de test (Expo) appelle l'API par l'IP du poste sur le réseau local :
# un certificat auto-signé y serait refusé.
ENV SERVER_NAME=:80

# Le Caddyfile par défaut de l'image sert déjà /app/public via PHP : rien à ajouter.

# Synchronise vendor/ avec composer.lock à chaque démarrage (voir le script).
# Copié hors de /app : le montage du code ne doit pas pouvoir le masquer.
COPY --chmod=755 docker-entrypoint.sh /usr/local/bin/penderie-entrypoint
ENTRYPOINT ["penderie-entrypoint"]
# Mêmes arguments que l'image de base, transmis tels quels à docker-php-entrypoint.
CMD ["--config", "/etc/frankenphp/Caddyfile", "--adapter", "caddyfile"]
