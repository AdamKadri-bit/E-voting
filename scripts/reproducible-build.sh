#!/usr/bin/env bash
# Rebuilds the frontend from the lock file and prints the SHA-256 of the client
# crypto bundle (the Web Worker that encrypts ballots). Compare it with the hash
# on any election's bulletin board: equal hashes mean the code you can read here
# is the code voters ran.
#
#   scripts/reproducible-build.sh            build + print + record for the backend
#   scripts/reproducible-build.sh <sha256>   build and compare against a published hash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/frontend"

# Same toolchain, same inputs: clean install from package-lock.json, fixed epoch.
export SOURCE_DATE_EPOCH=0
export TZ=UTC
npm ci --no-audit --no-fund --loglevel=error
npm run build --silent

MANIFEST="$ROOT/frontend/dist/crypto-bundle.json"
HASH="$(node -e "console.log(require('$MANIFEST').sha256)")"
FILE="$(node -e "console.log(require('$MANIFEST').file)")"
echo "Client crypto bundle: $FILE"
echo "SHA-256:              $HASH"

if [[ $# -ge 1 ]]; then
  if [[ "$1" == "$HASH" ]]; then
    echo "MATCH — this build is byte-identical to the published bundle."
    exit 0
  fi
  echo "MISMATCH — published $1" >&2
  exit 1
fi

# Record it where the bulletin board reads it (backend config: evoting.client_bundle_manifest).
cp "$MANIFEST" "$ROOT/backend/resources/data/client-crypto-bundle.json"
echo "Recorded in backend/resources/data/client-crypto-bundle.json"
