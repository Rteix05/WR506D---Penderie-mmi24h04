# Penderie : tous les scripts et outils de test, depuis la racine du dépôt
# (séance 16). Le détail de chaque commande de l'API est dans api/Makefile.
#
#     make test        les tests de l'API : unitaires, intégration, HTTP
#     make coverage    la même suite avec couverture, et le contrôle 100 % métier
#     make quality     qualité du code : PHPStan, linters Symfony, audits, ESLint, TypeScript
#     make e2e         la campagne de bout en bout (Cypress), sans fenêtre
#     make cypress     l'interface de Cypress, pour une démonstration
#     make all         tout, dans l'ordre où la CI le fera
#
# Prérequis : Docker (l'API et PostgreSQL tournent en conteneurs), Node 22
# (l'app Expo et Cypress), GNU Make. Sous Windows : winget install ezwinports.make,
# puis lancer make depuis Git Bash. Choix et résultats : docs/coverage.md, docs/ci.md.

API = $(MAKE) -C api

.DEFAULT_GOAL := help
.PHONY: help up down install test test-unit test-integration test-api coverage coverage-html \
        quality quality-api quality-app e2e-api e2e cypress e2e-down all

help: ## Affiche cette aide
	@grep -E '^[a-z0-9-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

# --- Environnement -----------------------------------------------------------

up: ## Démarre l'API et PostgreSQL (http://localhost:8080/api)
	$(API) up

down: ## Arrête tous les conteneurs (API de dev et API e2e)
	$(API) down

install: ## Installe les dépendances : Composer (conteneur) et npm (app, Cypress compris)
	$(API) install
	cd app && npm ci

# --- Tests de l'API (PHPUnit) ------------------------------------------------

test: ## Toute la suite PHPUnit de l'API
	$(API) test

test-unit: ## Tests unitaires : règles des entités, énumérations, fonctions pures
	$(API) test-unit

test-integration: ## Tests d'intégration : services, droits, validateurs, sur PostgreSQL
	$(API) test-integration

test-api: ## Tests fonctionnels : requêtes HTTP de bout en bout dans le noyau Symfony
	$(API) test-api

coverage: ## Couverture (pcov) + contrôle : 100 % du code métier exigé
	$(API) coverage

coverage-html: ## Rapport de couverture HTML copié dans api/coverage/
	$(API) coverage-html

# --- Qualité du code ---------------------------------------------------------

quality-api: ## API : linters Symfony, PHPStan niveau 6, audit Composer
	$(API) quality

quality-app: ## App : ESLint, TypeScript, audit npm (bloquant si critique)
	cd app && npx expo lint
	cd app && npx tsc --noEmit
	cd app && npm audit --audit-level=critical

quality: quality-api quality-app ## Toute la qualité du code (API et app)

# --- Bout en bout (Cypress) --------------------------------------------------

e2e-api: ## API des tests e2e sur :8090, base penderie_e2e remise à zéro + fixtures
	$(API) e2e-db

e2e: e2e-api ## Campagne Cypress complète, sans fenêtre (rapport dans le terminal)
	cd app && npm run e2e

cypress: e2e-api ## Interface de Cypress, pour la démonstration
	cd app && npm run e2e:open

e2e-down: ## Arrête l'API des tests e2e
	$(API) e2e-down

# --- Tout --------------------------------------------------------------------

all: quality coverage e2e ## Qualité, tests avec couverture, puis bout en bout
