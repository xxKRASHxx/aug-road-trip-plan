# Delegate all targets to the repo-root Makefile (safe to run from web/).
WEB_MAKEFILE_DIR := $(dir $(lastword $(MAKEFILE_LIST)))
ROOT_DIR := $(abspath $(WEB_MAKEFILE_DIR)/..)

.PHONY: %
%:
	@$(MAKE) -C $(ROOT_DIR) $(MAKECMDGOALS)
