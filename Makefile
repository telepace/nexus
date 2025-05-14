################################################################################
# NEXUS - Core Makefile
# Copyright 2023 nexus. All rights reserved.
# Use of this source code is governed by a MIT style
# license that can be found in the LICENSE file.
################################################################################

# ==============================================================================
# VARIABLES AND SETTINGS
# ==============================================================================

# Default goal
.DEFAULT_GOAL := help

# Shell settings
SHELL := /bin/bash
ROOT_DIR := $(shell pwd)

# Output directories
OUTPUT_DIR := $(ROOT_DIR)/_output
$(shell mkdir -p $(OUTPUT_DIR))
BIN_DIR := $(OUTPUT_DIR)/bin
$(shell mkdir -p $(BIN_DIR))
TOOLS_DIR := $(OUTPUT_DIR)/tools
$(shell mkdir -p $(TOOLS_DIR))
TMP_DIR := $(OUTPUT_DIR)/tmp
$(shell mkdir -p $(TMP_DIR))

# Version and Git information
VERSION ?= $(shell git describe --tags --always --match="v*" --dirty | sed 's/-/./g' 2>/dev/null || echo "v0.0.0-dev")
GIT_TREE_STATE := "dirty"
ifeq (, $(shell git status --porcelain 2>/dev/null))
	GIT_TREE_STATE = "clean"
endif
GIT_COMMIT := $(shell git rev-parse HEAD 2>/dev/null || echo "unknown")

# Docker images
BACKEND_IMG ?= nexus/backend:$(VERSION)
FRONTEND_IMG ?= nexus/frontend:$(VERSION)
WEBSITE_IMG ?= nexus/website:$(VERSION)

# Tool settings
PYTHON := python
PIP := pip
PYTEST := pytest
PYTEST_ARGS := -v
NPM := npm
YARN := yarn
NPM_REGISTRY := https://registry.npmjs.org/

# Component directories
BACKEND_DIR := $(ROOT_DIR)/backend
FRONTEND_DIR := $(ROOT_DIR)/frontend
WEBSITE_DIR := $(ROOT_DIR)/website
DOCS_DIR := $(ROOT_DIR)/docs

# ==============================================================================
# PRIMARY TARGETS
# ==============================================================================

## all: Build all components
.PHONY: all
all: backend-build frontend-build website-build

## dev: Start development environment
.PHONY: dev
dev:
	@echo "===========> Starting development environment"
	docker-compose up -d

## lint: Run linters on all components
.PHONY: lint
lint: backend-lint frontend-lint

## test: Run tests for all components
.PHONY: test
test: backend-test frontend-test website-test

## format: Format code in all components
.PHONY: format
format: backend-format
	@echo "===========> Formatting frontend code"
	@cd $(FRONTEND_DIR) && $(NPM) run format

## clean: Clean build artifacts
.PHONY: clean
clean:
	@echo "===========> Cleaning build artifacts"
	@rm -rf $(OUTPUT_DIR)
	@cd $(FRONTEND_DIR) && $(NPM) run clean || true
	@cd $(WEBSITE_DIR) && $(NPM) run clean || true
	@find . -name "*.pyc" -delete
	@find . -name "__pycache__" -delete
	@find . -name ".pytest_cache" -delete
	@find . -name ".coverage" -delete

# ==============================================================================
# HELP INFORMATION
# ==============================================================================

## help: Show this help information
.PHONY: help
help: Makefile
	@printf "\n\033[1;36m┌─────────────────────────────────────────────────────────────────────┐\033[0m\n"
	@printf "\033[1;36m│ \033[1;37mNEXUS MAKEFILE COMMANDS                                              \033[1;36m│\033[0m\n"
	@printf "\033[1;36m└─────────────────────────────────────────────────────────────────────┘\033[0m\n\n"
	@printf "\033[1mUsage: \033[0mmake \033[1;37m<TARGETS>\033[0m\n\n"
	
	@printf "\033[1;34m┌─ PRIMARY COMMANDS ───────────────────────────────────────────────────┐\033[0m\n"
	@grep -E '^## (all:|dev:|lint:|test:|format:|clean:)' $(MAKEFILE_LIST) | awk -F':' '{printf "  \033[1;37m%-25s\033[0m %s\n", $$1, $$2}' | sed -e 's/^##//'
	
	@printf "\n\033[1;34m┌─ BACKEND COMMANDS ──────────────────────────────────────────────────┐\033[0m\n"
	@grep -E '^## backend' $(MAKEFILE_LIST) | awk -F':' '{printf "  \033[1;37m%-25s\033[0m %s\n", $$1, $$2}' | sed -e 's/^##//'
	
	@printf "\n\033[1;34m┌─ FRONTEND COMMANDS ─────────────────────────────────────────────────┐\033[0m\n"
	@grep -E '^## frontend' $(MAKEFILE_LIST) | awk -F':' '{printf "  \033[1;37m%-25s\033[0m %s\n", $$1, $$2}' | sed -e 's/^##//'
	
	@printf "\n\033[1;34m┌─ WEBSITE COMMANDS ──────────────────────────────────────────────────┐\033[0m\n"
	@grep -E '^## (website|docs)' $(MAKEFILE_LIST) | awk -F':' '{printf "  \033[1;37m%-25s\033[0m %s\n", $$1, $$2}' | sed -e 's/^##//'
	
	@printf "\n\033[1;34m┌─ DOCKER COMMANDS ───────────────────────────────────────────────────┐\033[0m\n"
	@grep -E '^## docker' $(MAKEFILE_LIST) | awk -F':' '{printf "  \033[1;37m%-25s\033[0m %s\n", $$1, $$2}' | sed -e 's/^##//'
	
	@printf "\n\033[1;34m┌─ KUBERNETES/HELM COMMANDS ───────────────────────────────────────────┐\033[0m\n"
	@grep -E '^## helm' $(MAKEFILE_LIST) | awk -F':' '{printf "  \033[1;37m%-25s\033[0m %s\n", $$1, $$2}' | sed -e 's/^##//'
	
	@printf "\n\033[1;34m┌─ EXTENSION COMMANDS ────────────────────────────────────────────────┐\033[0m\n"
	@grep -E '^## extension' $(MAKEFILE_LIST) | awk -F':' '{printf "  \033[1;37m%-25s\033[0m %s\n", $$1, $$2}' | sed -e 's/^##//'
	
	@printf "\n\033[1;34m┌─ DEVELOPMENT TOOL COMMANDS ─────────────────────────────────────────┐\033[0m\n"
	@grep -E '^## (install|setup|generate)' $(MAKEFILE_LIST) | awk -F':' '{printf "  \033[1;37m%-25s\033[0m %s\n", $$1, $$2}' | sed -e 's/^##//'
	
	@printf "\n"

# ==============================================================================
# BACKEND TARGETS
# ==============================================================================

## backend-install: Install backend dependencies
.PHONY: backend-install
backend-install:
	@echo "===========> Installing backend dependencies"
	@cd $(BACKEND_DIR) && uv sync

## backend: Build backend
.PHONY: backend
backend:
	@echo "===========> Building backend"
	@source backend/.venv/bin/activate && \
	cd $(BACKEND_DIR) && fastapi dev app/main.py

## backend-test: Run backend tests with coverage
.PHONY: backend-test
backend-test: backend-install
	@echo "===========> Running backend tests with coverage"
	@source $(BACKEND_DIR)/.venv/bin/activate && \
	cd $(BACKEND_DIR) && \
	bash scripts/test.sh

## backend-test-specific: Run specific backend test
.PHONY: backend-test-specific
backend-test-specific: backend-install
	@echo "===========> Running specific backend test"
	@read -p "Test path (e.g., app/tests/api/test_users.py): " test_path; \
	cd $(BACKEND_DIR) && $(PYTEST) "$$test_path" -v

## backend-lint: Run backend linters
.PHONY: backend-lint
backend-lint: backend-install
	@echo "===========> Running backend linters"
	@source $(BACKEND_DIR)/.venv/bin/activate && \
	cd $(BACKEND_DIR) && \
	bash scripts/lint.sh

## backend-run: Run backend locally
.PHONY: backend-run
backend-run: backend-install
	@echo "===========> Running backend"
	@echo "===========> Starting backend server with auto-reload"
	@source $(BACKEND_DIR)/.venv/bin/activate && \
	cd $(BACKEND_DIR) && \
	uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

## backend-prestart: Run backend prestart initialization
.PHONY: backend-prestart
backend-prestart:
	@echo "===========> Running backend prestart initialization"
	@source $(BACKEND_DIR)/.venv/bin/activate && $(BACKEND_DIR)/scripts/prestart.sh

## backend-coverage-report: Open backend coverage report
.PHONY: backend-coverage-report
backend-coverage-report:
	@echo "===========> Opening backend coverage report"
	@open $(BACKEND_DIR)/htmlcov/index.html 2>/dev/null || xdg-open $(BACKEND_DIR)/htmlcov/index.html 2>/dev/null || echo "Could not open coverage report automatically. Please open $(BACKEND_DIR)/htmlcov/index.html in a browser."

## backend-format: Format backend code
.PHONY: backend-format
backend-format:
	@echo "===========> Formatting backend code"
	@source $(BACKEND_DIR)/.venv/bin/activate && $(BACKEND_DIR)/scripts/format.sh

## backend-migration: Create a new database migration
.PHONY: backend-migration
backend-migration:
	@echo "===========> Creating new database migration"
	@read -p "Migration name: " name; \
	cd $(BACKEND_DIR) && alembic revision --autogenerate -m "$$name"

## backend-migrate: Run database migrations
.PHONY: backend-migrate
backend-migrate:
	@echo "===========> Running database migrations"
	@cd $(BACKEND_DIR) && alembic upgrade head

## backend-downgrade: Downgrade database to previous migration
.PHONY: backend-downgrade
backend-downgrade:
	@echo "===========> Downgrading database to previous migration"
	@cd $(BACKEND_DIR) && alembic downgrade -1

## backend-shell: Start a Python shell with app context
.PHONY: backend-shell
backend-shell: backend-install
	@echo "===========> Starting Python shell with app context"
	@cd $(BACKEND_DIR) && python -c "import app; print('App context loaded. Available modules: app')" && python

## backend-db-shell: Connect to database with psql
.PHONY: backend-db-shell
backend-db-shell:
	@echo "===========> Connecting to database"
	@docker-compose exec db psql -U postgres -d app || \
	 psql "$(shell cd $(BACKEND_DIR) && python -c "from app.core.config import settings; print(settings.SQLALCHEMY_DATABASE_URI)")"

# ==============================================================================
# FRONTEND TARGETS
# ==============================================================================

## frontend-install: Install frontend dependencies
.PHONY: frontend-install
frontend-install:
	@echo "===========> Installing frontend dependencies"
	@cd $(FRONTEND_DIR) && $(NPM) install

## frontend: Build frontend
.PHONY: frontend
frontend:
	@echo "===========> Building frontend"
	@cd $(FRONTEND_DIR) && $(NPM) run build

## frontend-dev: Run frontend development server
.PHONY: frontend-dev
frontend-dev: frontend-install
	@echo "===========> Running frontend development server"
	@cd $(FRONTEND_DIR) && $(NPM) run dev

## frontend-test: Run frontend tests
.PHONY: frontend-test
frontend-test: frontend-install
	@echo "===========> Running frontend tests"
	@cd $(FRONTEND_DIR) && $(NPM) test

## frontend-lint: Run frontend linters
.PHONY: frontend-lint
frontend-lint: frontend-install
	@echo "===========> Running frontend linters"
	@cd $(FRONTEND_DIR) && $(NPM) run lint

# ==============================================================================
# WEBSITE TARGETS
# ==============================================================================

## website-install: Install website dependencies
.PHONY: website-install
website-install:
	@echo "===========> Installing website dependencies"
	@cd $(WEBSITE_DIR) && $(NPM) install

## website-build: Build website
.PHONY: website-build
website-build: website-install
	@echo "===========> Building website"
	@cd $(WEBSITE_DIR) && $(NPM) run build

## website-dev: Run website development server
.PHONY: website-dev
website-dev: website-install
	@echo "===========> Running website development server"
	@cd $(WEBSITE_DIR) && $(NPM) run dev

## website-test: Run website tests
.PHONY: website-test
website-test: website-install
	@echo "===========> Running website tests"
	@cd $(WEBSITE_DIR) && $(NPM) test

## docs: Build documentation
.PHONY: docs
docs:
	@echo "===========> Building documentation"
	@cd $(WEBSITE_DIR) && pnpm run dev

# ==============================================================================
# DOCKER TARGETS
# ==============================================================================

## docker-build: Build all Docker images
.PHONY: docker-build
docker-build: docker-build-backend docker-build-frontend docker-build-website

## docker-build-backend: Build backend Docker image
.PHONY: docker-build-backend
docker-build-backend:
	@echo "===========> Building backend Docker image: $(BACKEND_IMG)"
	@docker build -t $(BACKEND_IMG) -f $(BACKEND_DIR)/Dockerfile $(BACKEND_DIR)

## docker-build-frontend: Build frontend Docker image
.PHONY: docker-build-frontend
docker-build-frontend:
	@echo "===========> Building frontend Docker image: $(FRONTEND_IMG)"
	@docker build -t $(FRONTEND_IMG) -f $(FRONTEND_DIR)/Dockerfile $(FRONTEND_DIR)

## docker-build-website: Build website Docker image
.PHONY: docker-build-website
docker-build-website:
	@echo "===========> Building website Docker image: $(WEBSITE_IMG)"
	@docker build -t $(WEBSITE_IMG) -f $(WEBSITE_DIR)/Dockerfile $(WEBSITE_DIR)

## docker-push: Push all Docker images
.PHONY: docker-push
docker-push: docker-build
	@echo "===========> Pushing Docker images"
	@docker push $(BACKEND_IMG)
	@docker push $(FRONTEND_IMG)
	@docker push $(WEBSITE_IMG)

## docker-test: Run tests in Docker
.PHONY: docker-test
docker-test:
	@echo "===========> Run tests in Docker"
	@bash $(ROOT_DIR)/scripts/test.sh

## docker-test-local: Run tests in local Docker
.PHONY: docker-test-local
docker-test-local:
	@echo "===========> Run tests in local Docker"
	@bash $(ROOT_DIR)/scripts/test-local.sh

## docker-build-all: Build all Docker images
.PHONY: docker-build-all
docker-build-all:
	@echo "===========> Build all Docker images"
	@TAG=$(VERSION) bash $(ROOT_DIR)/scripts/build.sh

## docker-push-all: Build and push Docker images
.PHONY: docker-push-all
docker-push-all:
	@echo "===========> Build and push all Docker images"
	@TAG=$(VERSION) bash $(ROOT_DIR)/scripts/build-push.sh

## docker-deploy: Deploy to Docker Swarm
.PHONY: docker-deploy
docker-deploy:
	@echo "===========> Deploy to Docker Swarm"
	@if [ -z "$(DOMAIN)" ] || [ -z "$(STACK_NAME)" ]; then \
		echo "Error: Please set DOMAIN and STACK_NAME environment variables"; \
		echo "Example: make docker-deploy DOMAIN=example.com STACK_NAME=myapp"; \
		exit 1; \
	fi
	@DOMAIN=$(DOMAIN) STACK_NAME=$(STACK_NAME) TAG=$(VERSION) bash $(ROOT_DIR)/scripts/deploy.sh

# ==============================================================================
# KUBERNETES/HELM TARGETS
# ==============================================================================

## helm-install: Install Helm chart
.PHONY: helm-install
helm-install:
	@echo "===========> Installing Helm chart"
	@helm install nexus $(ROOT_DIR)/helm-charts/nexus

## helm-upgrade: Upgrade Helm chart
.PHONY: helm-upgrade
helm-upgrade:
	@echo "===========> Upgrading Helm chart"
	@helm upgrade nexus $(ROOT_DIR)/helm-charts/nexus

## helm-uninstall: Uninstall Helm chart
.PHONY: helm-uninstall
helm-uninstall:
	@echo "===========> Uninstalling Helm chart"
	@helm uninstall nexus

# ==============================================================================
# EXTENSION TARGETS
# ==============================================================================

## extension-dev: Run the browser extension in development mode
.PHONY: extension-dev
extension-dev:
	@echo "===========> Running browser extension in development mode"
	@cd extension && npm run dev

## extension-build: Build the browser extension for production
.PHONY: extension-build
extension-build:
	@echo "===========> Building browser extension for production"
	@cd extension && npm run build

## extension-package: Package the browser extension for distribution
.PHONY: extension-package
extension-package:
	@echo "===========> Packaging browser extension for distribution"
	@cd extension && npm run package

# ==============================================================================
# DEVELOPMENT TOOL TARGETS
# ==============================================================================

## install-tools: Install development tools
.PHONY: install-tools
install-tools: install-python-tools install-js-tools

## install-python-tools: Install Python development tools
.PHONY: install-python-tools
install-python-tools:
	@echo "===========> Installing Python development tools"
	@$(PIP) install ruff mypy pytest pytest-cov black isort

## install-js-tools: Install JavaScript development tools
.PHONY: install-js-tools
install-js-tools:
	@echo "===========> Installing JavaScript development tools"
	@$(NPM) install -g prettier eslint typescript

## setup-git-hooks: Set up Git hooks
.PHONY: setup-git-hooks
setup-git-hooks:
	@echo "===========> Setting up Git hooks"
	@cp -f $(ROOT_DIR)/hooks/* $(ROOT_DIR)/.git/hooks/ 2>/dev/null || true
	@chmod +x $(ROOT_DIR)/.git/hooks/*

## install-pre-commit: Install pre-commit
.PHONY: install-pre-commit
install-pre-commit:
	@echo "===========> Installing pre-commit"
	@$(PIP) install pre-commit
	@pre-commit install

## generate-client: Generate OpenAPI client
.PHONY: generate-client
generate-client:
	@echo "===========> Generate OpenAPI client"
	@source $(BACKEND_DIR)/.venv/bin/activate && $(ROOT_DIR)/scripts/generate-client.sh 