#!/usr/bin/env bash
#
# End-to-end test: runs the built node inside a real n8n container and asserts what
# it sends. api.lusha.com is DNS-aliased on the container network to a local capture
# server, so no request reaches Lusha and no credits are spent.
#
# Requires docker (Rancher Desktop works) and a prior `npm run build`.
#
#   ./test/e2e/run.sh
#
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
NETWORK=lusha-e2e
MOCK=lusha-e2e-mock
N8N=lusha-e2e-n8n
IMAGE=n8n-nodes-lusha-e2e:local
N8N_PORT="${N8N_PORT:-5699}"
MOCK_PORT="${MOCK_PORT:-5443}"
CERT_DIR="$(mktemp -d)"

cleanup() {
  docker rm -f "$N8N" "$MOCK" >/dev/null 2>&1 || true
  docker network rm "$NETWORK" >/dev/null 2>&1 || true
  rm -rf "$CERT_DIR"
}
trap cleanup EXIT

if [ ! -d "$ROOT/dist" ]; then
  echo "dist/ not found - run 'npm run build' first" >&2
  exit 1
fi

echo "==> generating a throwaway certificate for the api.lusha.com stand-in"
openssl req -x509 -newkey rsa:2048 -nodes \
  -keyout "$CERT_DIR/mock-key.pem" -out "$CERT_DIR/mock-cert.pem" \
  -days 1 -subj "/CN=api.lusha.com" -addext "subjectAltName=DNS:api.lusha.com" >/dev/null 2>&1

echo "==> building the n8n image with the node installed"
docker build -q -t "$IMAGE" "$ROOT" >/dev/null


docker network create "$NETWORK" >/dev/null 2>&1 || true

echo "==> starting the capture server as api.lusha.com"
docker run -d --name "$MOCK" --network "$NETWORK" --network-alias api.lusha.com \
  -p "127.0.0.1:$MOCK_PORT:443" \
  -v "$HERE:/app:ro" -v "$CERT_DIR:/certs:ro" \
  node:20-alpine node /app/mock-lusha-api.js >/dev/null

echo "==> starting n8n"
# NODE_TLS_REJECT_UNAUTHORIZED is required only because the stand-in uses a
# self-signed certificate; it is scoped to this throwaway container.
docker run -d --name "$N8N" --network "$NETWORK" \
  -p "$N8N_PORT:5678" \
  -e N8N_SECURE_COOKIE=false \
  -e N8N_DIAGNOSTICS_ENABLED=false \
  -e N8N_CUSTOM_EXTENSIONS=/home/node/.n8n/custom \
  -e NODE_TLS_REJECT_UNAUTHORIZED=0 \
  "$IMAGE" >/dev/null

# n8n answers 200 with "n8n is starting up. Please wait" well before it can serve
# the REST API, so a plain status check is not a readiness signal.
echo -n "==> waiting for n8n to finish starting"
ready=""
for _ in $(seq 1 120); do
  body="$(curl -s "http://localhost:$N8N_PORT/rest/settings" 2>/dev/null || true)"
  if [ -n "$body" ] && [ "${body#*starting up}" = "$body" ] && [ "${body#*\"data\"}" != "$body" ]; then
    ready=1
    echo " ready"
    break
  fi
  echo -n "."
  sleep 2
done
if [ -z "$ready" ]; then
  echo " timed out" >&2
  docker logs "$N8N" 2>&1 | tail -30 >&2
  exit 1
fi

echo "==> driving every operation through n8n"
N8N_URL="http://localhost:$N8N_PORT" MOCK_PORT="$MOCK_PORT" MOCK_CA="$CERT_DIR/mock-cert.pem" \
  node "$HERE/run-in-n8n.js"
