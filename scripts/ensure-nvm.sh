#!/usr/bin/env bash
# Install nvm into $NVM_DIR if missing. Safe to run repeatedly.
set -euo pipefail

export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
NVM_VERSION="${NVM_VERSION:-v0.40.3}"

if [[ -s "$NVM_DIR/nvm.sh" ]]; then
  exit 0
fi

printf "nvm not found — installing %s into %s …\n" "$NVM_VERSION" "$NVM_DIR"

if ! command -v curl >/dev/null 2>&1; then
  printf "curl is required to install nvm.\n" >&2
  exit 1
fi

curl -fsSL "https://raw.githubusercontent.com/nvm-sh/nvm/${NVM_VERSION}/install.sh" | bash

if [[ ! -s "$NVM_DIR/nvm.sh" ]]; then
  printf "nvm install finished but %s/nvm.sh is missing.\n" "$NVM_DIR" >&2
  exit 1
fi

printf "nvm installed.\n"
printf "Tip: open a new terminal (or run \`source ~/.zshrc\`) to use the \`nvm\` command directly.\n"
printf "      \`make start\` works immediately — it loads nvm via scripts/with-node.sh.\n"
