# aug-road-trip-plan — dev tasks (Node via nvm, see .nvmrc / web/.nvmrc)
.DEFAULT_GOAL := help

ROOT_DIR    := $(abspath $(dir $(lastword $(MAKEFILE_LIST))))
WEB_DIR     := $(ROOT_DIR)/web
WITH_NODE   := $(WEB_DIR)/scripts/with-node.sh
ENSURE_NVM  := $(ROOT_DIR)/scripts/ensure-nvm.sh

.PHONY: help bootstrap ensure-nvm install-node install build-route start build test verify-photos clean deploy

help: ## Show available targets
	@printf "\nUsage: make <target>   (from repo root or web/)\n\n"
	@grep -E '^[a-zA-Z0-9_-]+:.*##' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'
	@printf "\n"

ensure-nvm: ## Install nvm if missing (~/.nvm)
	@chmod +x "$(ENSURE_NVM)" "$(WITH_NODE)"
	@"$(ENSURE_NVM)"

bootstrap: ensure-nvm install-node install ## First-time setup: nvm + Node + npm dependencies
	@printf "\nBootstrap complete. Run \`make start\` → http://localhost:4200\n"

install-node: ensure-nvm ## Install Node from web/.nvmrc (requires network)
	@printf "Installing Node from web/.nvmrc …\n"
	@cd "$(WEB_DIR)" && $(WITH_NODE) node -v && $(WITH_NODE) npm -v

install: install-node ## Install npm packages in web/
	cd "$(WEB_DIR)" && $(WITH_NODE) npm ci

build-route: ensure-nvm ## Rebuild route.en/ru.json from OSRM (requires network)
	cd "$(WEB_DIR)" && $(WITH_NODE) npm run build:route

start: ensure-nvm ## Start Angular dev server
	cd "$(WEB_DIR)" && $(WITH_NODE) npm start

build: ensure-nvm ## Production build → web/dist/web/browser/
	cd "$(WEB_DIR)" && $(WITH_NODE) npm run build

deploy: build ## Build and deploy to Firebase Hosting (requires firebase login)
	cd "$(WEB_DIR)" && $(WITH_NODE) npx firebase-tools deploy --only hosting

test: ensure-nvm ## Run unit tests
	cd "$(WEB_DIR)" && $(WITH_NODE) npm test

verify-photos: ensure-nvm ## Verify Wikimedia Commons filenames in build-route.mjs
	cd "$(WEB_DIR)" && $(WITH_NODE) npm run verify:photos

clean: ## Remove node_modules and build artifacts
	rm -rf "$(WEB_DIR)/node_modules" "$(WEB_DIR)/dist" "$(WEB_DIR)/.angular"
