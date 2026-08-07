#!/usr/bin/env bash
# Run a command under the Node version pinned in web/.nvmrc
set -euo pipefail

WEB_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"

if [[ ! -s "$NVM_DIR/nvm.sh" ]]; then
  echo "nvm not found at $NVM_DIR — run: make ensure-nvm" >&2
  exit 1
fi

# nvm.sh reads $@ on source and runs `nvm auto use`, which fails before Node
# is installed. Stash args and tolerate that auto-use failure.
__WITH_NODE_ARGS=("$@")
set --
set +e
# shellcheck source=/dev/null
. "$NVM_DIR/nvm.sh"
set -e
set -- "${__WITH_NODE_ARGS[@]}"

cd "$WEB_ROOT"

NODE_VERSION="$(tr -d '[:space:]' < .nvmrc)"

if ! nvm install "$NODE_VERSION"; then
  cat >&2 <<EOF
Failed to install Node ${NODE_VERSION}.

Common fixes:
  • Check your internet connection (nvm downloads Node binaries)
  • Run manually:  cd ${WEB_ROOT} && nvm install ${NODE_VERSION}
  • Or install Node 22 from https://nodejs.org and skip nvm
EOF
  exit 1
fi

nvm use "$NODE_VERSION"

exec "$@"
