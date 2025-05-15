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
ADMIN_IMG ?= nexus/admin:$(VERSION)

# Tool settings
PYTHON := python
UV := uv
PYTEST := pytest
PYTEST_ARGS := -v
PNPM := pnpm
NPM_REGISTRY := https://registry.npmjs.org/

# Component directories
BACKEND_DIR := $(ROOT_DIR)/backend
FRONTEND_DIR := $(ROOT_DIR)/frontend
WEBSITE_DIR := $(ROOT_DIR)/website
ADMIN_DIR := $(ROOT_DIR)/admin
DOCS_DIR := $(ROOT_DIR)/docs
EXTENSION_DIR := $(ROOT_DIR)/extension

# Check if tools are installed
PNPM_EXISTS := $(shell command -v pnpm 2> /dev/null)
UV_EXISTS := $(shell command -v uv 2> /dev/null)

# ==============================================================================
# PRIMARY TARGETS
# ==============================================================================

## all: Run all tests, linting, formatting and build all components
.PHONY: all
all: format lint test backend frontend admin
	@echo "===========> All checks and builds completed successfully"

## dev: Start development environment
.PHONY: dev
dev:
	@echo "===========> Starting development environment"
	docker-compose up -d

## lint: Run linters on all components
.PHONY: lint
lint: backend-lint frontend-lint admin-lint

## test: Run tests for all components
.PHONY: test
test: backend-test frontend-test website-test admin-test

## format: Format code in all components
.PHONY: format
format: backend-format frontend-format admin-format

## clean: Clean build artifacts
.PHONY: clean
clean:
	@echo "===========> Cleaning build artifacts"
	@rm -rf $(OUTPUT_DIR)
	@cd $(FRONTEND_DIR) && $(PNPM) run clean || true
	@cd $(WEBSITE_DIR) && $(PNPM) run clean || true
	@cd $(ADMIN_DIR) && $(PNPM) run clean || true
	@find . -name "*.pyc" -delete
	@find . -name "__pycache__" -delete
	@find . -name ".pytest_cache" -delete
	@find . -name ".coverage" -delete

# ==============================================================================
# CHECK AND INSTALL TOOLS
# ==============================================================================

.PHONY: check-pnpm
check-pnpm:
ifndef PNPM_EXISTS
	@echo "===========> Installing pnpm"
	@npm install -g pnpm
endif

.PHONY: check-uv
check-uv:
ifndef UV_EXISTS
	@echo "===========> Installing uv"
	@curl -sSf https://astral.sh/uv/install.sh | sh
endif

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
	
	@printf "\n\033[1;34m┌─ ADMIN COMMANDS ────────────────────────────────────────────────────┐\033[0m\n"
	@grep -E '^## admin' $(MAKEFILE_LIST) | awk -F':' '{printf "  \033[1;37m%-25s\033[0m %s\n", $$1, $$2}' | sed -e 's/^##//'
	
	@printf "\n\033[1;34m┌─ WEBSITE COMMANDS ──────────────────────────────────────────────────┐\033[0m\n"
	@grep -E '^## (website|docs)' $(MAKEFILE_LIST) | awk -F':' '{printf "  \033[1;37m%-25s\033[0m %s\n", $$1, $$2}' | sed -e 's/^##//'
	
	@printf "\n\033[1;34m┌─ DOCKER COMMANDS ───────────────────────────────────────────────────┐\033[0m\n"
	@grep -E '^## docker' $(MAKEFILE_LIST) | awk -F':' '{printf "  \033[1;37m%-25s\033[0m %s\n", $$1, $$2}' | sed -e 's/^##//'
	
	@printf "\n\033[1;34m┌─ EXTENSION COMMANDS ────────────────────────────────────────────────┐\033[0m\n"
	@grep -E '^## extension' $(MAKEFILE_LIST) | awk -F':' '{printf "  \033[1;37m%-25s\033[0m %s\n", $$1, $$2}' | sed -e 's/^##//'
	
	@printf "\n\033[1;34m┌─ DEPLOYMENT COMMANDS ────────────────────────────────────────────────┐\033[0m\n"
	@grep -E '^## (helm|deploy)' $(MAKEFILE_LIST) | awk -F':' '{printf "  \033[1;37m%-25s\033[0m %s\n", $$1, $$2}' | sed -e 's/^##//'
	
	@printf "\n\033[1;34m┌─ DEVELOPMENT TOOLS ───────────────────────────────────────────────────┐\033[0m\n"
	@grep -E '^## (install|setup|generate)' $(MAKEFILE_LIST) | awk -F':' '{printf "  \033[1;37m%-25s\033[0m %s\n", $$1, $$2}' | sed -e 's/^##//'
	
	@printf "\n"

# ==============================================================================
# BACKEND TARGETS
# ==============================================================================

## backend: Build backend
.PHONY: backend
backend: check-uv backend-install
	@echo "===========> Building backend"
	@source backend/.venv/bin/activate && \
	cd $(BACKEND_DIR) && fastapi dev app/main.py

## backend-install: Install backend dependencies
.PHONY: backend-install
backend-install: check-uv
	@echo "===========> Installing backend dependencies"
	@cd $(BACKEND_DIR) && $(UV) sync

## backend-test: Run backend tests with coverage
.PHONY: backend-test
backend-test: backend-install
	@echo "===========> Running backend tests with coverage"
	@source $(BACKEND_DIR)/.venv/bin/activate && \
	cd $(BACKEND_DIR) && \
	bash scripts/test.sh

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
	@source $(BACKEND_DIR)/.venv/bin/activate && \
	cd $(BACKEND_DIR) && \
	uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

## backend-format: Format backend code
.PHONY: backend-format
backend-format:
	@echo "===========> Formatting backend code"
	@source $(BACKEND_DIR)/.venv/bin/activate && $(BACKEND_DIR)/scripts/format.sh

## backend-migrate: Run database migrations
.PHONY: backend-migrate
backend-migrate:
	@echo "===========> Running database migrations"
	@cd $(BACKEND_DIR) && alembic upgrade head

## backend-migration: Create a new database migration
.PHONY: backend-migration
backend-migration:
	@echo "===========> Creating new database migration"
	@read -p "Migration name: " name; \
	cd $(BACKEND_DIR) && alembic revision --autogenerate -m "$$name"

## backend-db-shell: Connect to database with psql
.PHONY: backend-db-shell
backend-db-shell:
	@echo "===========> Connecting to database"
	@docker-compose exec db psql -U postgres -d app || \
	 psql "$(shell cd $(BACKEND_DIR) && python -c "from app.core.config import settings; print(settings.SQLALCHEMY_DATABASE_URI)")"

# ==============================================================================
# FRONTEND TARGETS
# ==============================================================================

## frontend: Build frontend
.PHONY: frontend
frontend: check-pnpm frontend-install
	@echo "===========> Building frontend"
	@if [ -d "$(FRONTEND_DIR)" ] && [ -f "$(FRONTEND_DIR)/package.json" ]; then \
		cd $(FRONTEND_DIR) && $(PNPM) run build; \
	else \
		echo "Warning: Frontend directory or package.json not found at $(FRONTEND_DIR)"; \
	fi

## frontend-install: Install frontend dependencies
.PHONY: frontend-install
frontend-install: check-pnpm
	@echo "===========> Installing frontend dependencies"
	@if [ -d "$(FRONTEND_DIR)" ] && [ -f "$(FRONTEND_DIR)/package.json" ]; then \
		cd $(FRONTEND_DIR) && $(PNPM) install; \
	else \
		echo "Warning: Frontend directory or package.json not found at $(FRONTEND_DIR)"; \
	fi

## frontend-dev: Run frontend development server
.PHONY: frontend-dev
frontend-dev: frontend-install
	@echo "===========> Running frontend development server"
	@if [ -d "$(FRONTEND_DIR)" ] && [ -f "$(FRONTEND_DIR)/package.json" ]; then \
		cd $(FRONTEND_DIR) && $(PNPM) run dev; \
	else \
		echo "Warning: Frontend directory or package.json not found at $(FRONTEND_DIR)"; \
	fi

## frontend-test: Run frontend tests
.PHONY: frontend-test
frontend-test: frontend-install
	@echo "===========> Running frontend tests"
	@if [ -d "$(FRONTEND_DIR)" ] && [ -f "$(FRONTEND_DIR)/package.json" ]; then \
		cd $(FRONTEND_DIR) && $(PNPM) test; \
	else \
		echo "Warning: Frontend directory or package.json not found at $(FRONTEND_DIR)"; \
	fi

## frontend-lint: Run frontend linters
.PHONY: frontend-lint
frontend-lint: frontend-install
	@echo "===========> Running frontend linters"
	@if [ -d "$(FRONTEND_DIR)" ] && [ -f "$(FRONTEND_DIR)/package.json" ]; then \
		cd $(FRONTEND_DIR) && $(PNPM) run lint; \
	else \
		echo "Warning: Frontend directory or package.json not found at $(FRONTEND_DIR)"; \
	fi

## frontend-format: Format frontend code
.PHONY: frontend-format
frontend-format: frontend-install
	@echo "===========> Formatting frontend code"
	@if [ -d "$(FRONTEND_DIR)" ] && [ -f "$(FRONTEND_DIR)/package.json" ]; then \
		cd $(FRONTEND_DIR) && $(PNPM) run format || true; \
	else \
		echo "Warning: Frontend directory or package.json not found at $(FRONTEND_DIR)"; \
	fi

# ==============================================================================
# ADMIN TARGETS
# ==============================================================================

## admin: Build admin panel
.PHONY: admin
admin: check-pnpm admin-install
	@echo "===========> Building admin panel"
	@cd $(ADMIN_DIR) && $(PNPM) exec vite build

## admin-install: Install admin dependencies
.PHONY: admin-install
admin-install: check-pnpm
	@echo "===========> Installing admin dependencies"
	@cd $(ADMIN_DIR) && $(PNPM) install

## admin-dev: Run admin development server
.PHONY: admin-dev
admin-dev: admin-install
	@echo "===========> Running admin development server"
	@cd $(ADMIN_DIR) && $(PNPM) run dev

## admin-preview: Preview production build
.PHONY: admin-preview
admin-preview: admin
	@echo "===========> Previewing admin production build"
	@cd $(ADMIN_DIR) && $(PNPM) exec vite preview

## admin-test: Run admin tests
.PHONY: admin-test
admin-test: admin-install
	@echo "===========> Running admin tests"
	@cd $(ADMIN_DIR) && $(PNPM) run test || true

## admin-lint: Run admin linters
.PHONY: admin-lint
admin-lint: admin-install
	@echo "===========> Running admin linters"
	@cd $(ADMIN_DIR) && $(PNPM) run lint || true

## admin-format: Format admin code
.PHONY: admin-format
admin-format: admin-install
	@echo "===========> Formatting admin code"
	@cd $(ADMIN_DIR) && $(PNPM) run format || true

# ==============================================================================
# WEBSITE TARGETS
# ==============================================================================

## website: Build website
.PHONY: website
website: check-pnpm website-install
	@echo "===========> Building website"
	@cd $(WEBSITE_DIR) && $(PNPM) run build

## website-install: Install website dependencies
.PHONY: website-install
website-install: check-pnpm
	@echo "===========> Installing website dependencies"
	@cd $(WEBSITE_DIR) && $(PNPM) install

## website-dev: Run website development server
.PHONY: website-dev
website-dev: website-install
	@echo "===========> Running website development server"
	@cd $(WEBSITE_DIR) && $(PNPM) run dev

## website-test: Run website tests
.PHONY: website-test
website-test: website-install
	@echo "===========> Running website tests"
	@cd $(WEBSITE_DIR) && $(PNPM) test || true

## docs: Build documentation
.PHONY: docs
docs:
	@echo "===========> Building documentation"
	@cd $(WEBSITE_DIR) && $(PNPM) run dev

# ==============================================================================
# DOCKER TARGETS
# ==============================================================================

## docker-build: Build all Docker images
.PHONY: docker-build
docker-build:
	@echo "===========> Building all Docker images"
	@TAG=$(VERSION) bash $(ROOT_DIR)/scripts/build.sh

## docker-push: Build and push Docker images
.PHONY: docker-push
docker-push:
	@echo "===========> Building and pushing all Docker images"
	@TAG=$(VERSION) bash $(ROOT_DIR)/scripts/build-push.sh

## docker-test: Run tests in Docker
.PHONY: docker-test
docker-test:
	@echo "===========> Running tests in Docker"
	@bash $(ROOT_DIR)/scripts/test.sh

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
# EXTENSION TARGETS
# ==============================================================================

## extension: Build browser extension for production
.PHONY: extension
extension: check-pnpm
	@echo "===========> Building browser extension for production"
	@cd $(EXTENSION_DIR) && $(PNPM) run build

## extension-dev: Run browser extension in development mode
.PHONY: extension-dev
extension-dev: check-pnpm
	@echo "===========> Running browser extension in development mode"
	@cd $(EXTENSION_DIR) && $(PNPM) run dev

## extension-package: Package browser extension for distribution
.PHONY: extension-package
extension-package: check-pnpm
	@echo "===========> Packaging browser extension for distribution"
	@cd $(EXTENSION_DIR) && $(PNPM) run package

# ==============================================================================
# DEPLOYMENT TARGETS
# ==============================================================================

## deploy: Deploy all components
.PHONY: deploy
deploy: docker-push docker-deploy

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

# ==============================================================================
# DEVELOPMENT TOOLS
# ==============================================================================

## install-tools: Install development tools
.PHONY: install-tools
install-tools: install-python-tools install-js-tools

## install-python-tools: Install Python development tools
.PHONY: install-python-tools
install-python-tools: check-uv
	@echo "===========> Installing Python development tools"
	@$(UV) pip install ruff mypy pytest pytest-cov black isort

## install-js-tools: Install JavaScript development tools
.PHONY: install-js-tools
install-js-tools: check-pnpm
	@echo "===========> Installing JavaScript development tools"
	@$(PNPM) install -g prettier eslint typescript

## setup-git-hooks: Set up Git hooks
.PHONY: setup-git-hooks
setup-git-hooks:
	@echo "===========> Setting up Git hooks"
	@cp -f $(ROOT_DIR)/hooks/* $(ROOT_DIR)/.git/hooks/ 2>/dev/null || true
	@chmod +x $(ROOT_DIR)/.git/hooks/*

## generate-client: Generate OpenAPI clients for both frontend and admin
.PHONY: generate-client
generate-client: generate-frontend-client generate-admin-client
	@echo "===========> All OpenAPI clients generated successfully"

## generate-frontend-client: Generate OpenAPI client for frontend
.PHONY: generate-frontend-client
generate-frontend-client:
	@echo "===========> Generating OpenAPI client for frontend"
	@source $(BACKEND_DIR)/.venv/bin/activate && $(ROOT_DIR)/scripts/generate-client.sh

## generate-admin-client: Generate OpenAPI client for admin panel
.PHONY: generate-admin-client
generate-admin-client:
	@echo "===========> Generating OpenAPI client for admin panel"
	@source $(BACKEND_DIR)/.venv/bin/activate && $(ROOT_DIR)/scripts/generate-admin-client.sh

# For backward compatibility
.PHONY: generate-all-clients
generate-all-clients: generate-client