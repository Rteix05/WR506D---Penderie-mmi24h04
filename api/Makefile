# Commandes de l'API Penderie (séance 15 : code quality).
#
# Sur le poste, tout passe par le conteneur PHP (docker compose) :
#     make quality      analyse statique, linters, audit des dépendances
#     make test         la suite PHPUnit
# En CI (GitHub Actions), PHP tourne directement sur la machine :
#     make ci EXEC=
#
# Sous Windows, make s'installe avec : winget install GnuWin32.Make

EXEC    ?= docker compose exec -T php
PHP      = $(EXEC) php
CONSOLE  = $(PHP) bin/console
COMPOSER = $(EXEC) composer

.DEFAULT_GOAL := help
.PHONY: help up down install migrate test phpstan lint lint-container lint-yaml lint-twig lint-schema audit quality ci

help: ## Affiche cette aide
	@grep -E '^[a-z-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'

up: ## Démarre l'API et la base (Docker)
	docker compose up -d --wait

down: ## Arrête les conteneurs
	docker compose down

install: ## Installe les dépendances Composer
	$(COMPOSER) install --no-interaction --no-progress --prefer-dist

migrate: ## Joue les migrations (dev et test)
	$(CONSOLE) doctrine:migrations:migrate --no-interaction
	$(CONSOLE) doctrine:migrations:migrate --no-interaction --env=test

test: ## Lance la suite PHPUnit
	$(PHP) bin/phpunit

phpstan: ## Analyse statique PHPStan (niveau 6, voir phpstan.dist.neon)
	$(CONSOLE) cache:warmup --env=test --quiet
	$(PHP) vendor/bin/phpstan analyse --no-progress --memory-limit=1G

lint: lint-container lint-yaml lint-twig lint-schema ## Tous les linters Symfony

lint-container: ## Le conteneur de services : types des arguments injectés
	$(CONSOLE) lint:container

lint-yaml: ## La configuration YAML
	$(CONSOLE) lint:yaml config --parse-tags

lint-twig: ## Les gabarits Twig
	$(CONSOLE) lint:twig templates

lint-schema: ## Le mapping Doctrine (sans comparer à une base)
	$(CONSOLE) doctrine:schema:validate --skip-sync

audit: ## composer.json valide, et aucune faille connue dans les dépendances
	$(COMPOSER) validate --strict
	$(COMPOSER) audit

quality: lint phpstan audit ## Toute la qualité du code : linters, PHPStan, audit

ci: quality test ## Ce que lance la CI : qualité puis tests
