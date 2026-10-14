# Commandes de l'API Penderie (séance 15 : code quality ; séance 16 : tests).
#
# Sur le poste, tout passe par le conteneur PHP (docker compose) :
#     make quality      analyse statique, linters, audit des dépendances
#     make test         la suite PHPUnit
#     make coverage     la suite, avec couverture, puis le contrôle du 100 % métier
#     make e2e-db       la base des tests de bout en bout, remplie par les fixtures
# En CI (GitHub Actions), PHP tourne directement sur la machine :
#     make ci EXEC=
#
# Sous Windows, make s'installe avec : winget install GnuWin32.Make

EXEC    ?= docker compose exec -T php
PHP      = $(EXEC) php
CONSOLE  = $(PHP) bin/console
COMPOSER = $(EXEC) composer

.DEFAULT_GOAL := help
.PHONY: help up down install migrate test test-unit test-integration test-api coverage coverage-check coverage-html e2e-up e2e-db e2e-down phpstan lint lint-container lint-yaml lint-twig lint-schema audit quality ci

help: ## Affiche cette aide
	@grep -E '^[a-z0-9-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'

up: ## Démarre l'API et la base (Docker)
	docker compose up -d --wait

down: ## Arrête les conteneurs
	docker compose down

install: ## Installe les dépendances Composer
	$(COMPOSER) install --no-interaction --no-progress --prefer-dist

migrate: ## Joue les migrations (dev et test)
	$(CONSOLE) doctrine:migrations:migrate --no-interaction
	$(CONSOLE) doctrine:migrations:migrate --no-interaction --env=test

test: ## Lance toute la suite PHPUnit
	$(PHP) bin/phpunit

test-unit: ## Tests unitaires : règles pures, sans base (tests/Unit)
	$(PHP) bin/phpunit tests/Unit

test-integration: ## Tests d'intégration : vraie base PostgreSQL (tests/Integration)
	$(PHP) bin/phpunit tests/Integration

test-api: ## Tests fonctionnels : vraies requêtes HTTP (tests/Api)
	$(PHP) bin/phpunit tests/Api

coverage: ## Suite complète avec couverture (pcov), puis contrôle du 100 % métier
	$(PHP) -d pcov.enabled=1 bin/phpunit --coverage-clover var/coverage/clover.xml --coverage-html var/coverage/html --coverage-text=var/coverage/coverage.txt
	$(MAKE) coverage-check

coverage-check: ## Contrôle du 100 % métier sur le dernier rapport (bin/coverage-check)
	$(PHP) bin/coverage-check var/coverage/clover.xml

coverage-html: ## Copie le rapport HTML sur le poste : api/coverage/index.html
	docker compose cp php:/app/var/coverage/html coverage

# --- Bout en bout (Cypress) : une seconde API sur la base penderie_e2e -----------
# compose.override.yaml est repris explicitement : sans lui, docker compose
# recréerait la base de développement avec une autre configuration.
E2E = docker compose -f compose.yaml -f compose.override.yaml -f compose.e2e.yaml

e2e-up: ## Démarre l'API des tests de bout en bout (http://localhost:8090)
	$(E2E) up -d --wait --wait-timeout 600 --no-deps php-e2e

e2e-db: e2e-up ## Remet la base penderie_e2e à zéro et la remplit (référentiels + fixtures)
	$(E2E) exec -T php-e2e php bin/console cache:clear
	$(E2E) exec -T php-e2e php bin/console doctrine:database:drop --force --if-exists --no-interaction
	$(E2E) exec -T php-e2e php bin/console doctrine:database:create --no-interaction
	$(E2E) exec -T php-e2e php bin/console doctrine:migrations:migrate --no-interaction
	$(E2E) exec -T php-e2e php bin/console app:reference-data:load
	$(E2E) exec -T php-e2e php bin/console doctrine:fixtures:load --append --no-interaction

e2e-down: ## Arrête l'API des tests de bout en bout
	$(E2E) stop php-e2e

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
