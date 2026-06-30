#!/usr/bin/env bash

set -euo pipefail

APP_NAME="iso-management-system"
ARCHIVE_PATH="/tmp/${APP_NAME}.tgz"
REMOTE_HOST="${REMOTE_HOST:-root@72.60.121.98}"
REMOTE_DIR="${REMOTE_DIR:-/opt/${APP_NAME}}"
SSH_KEY_PATH="${SSH_KEY_PATH:-$HOME/.ssh/id_ed25519_iso_hostinger}"

echo "Packaging project..."
tar czf "${ARCHIVE_PATH}" \
  --exclude=.git \
  --exclude=node_modules \
  --exclude=dist \
  --exclude=.vercel \
  --exclude=.env \
  --exclude=.agents \
  --exclude=.codex \
  .

echo "Copying bundle to ${REMOTE_HOST}..."
scp -i "${SSH_KEY_PATH}" -o StrictHostKeyChecking=accept-new "${ARCHIVE_PATH}" "${REMOTE_HOST}:/root/"

echo "Deploying on ${REMOTE_HOST}..."
ssh -i "${SSH_KEY_PATH}" -o StrictHostKeyChecking=accept-new "${REMOTE_HOST}" "
  set -euo pipefail
  mkdir -p '${REMOTE_DIR}'
  cd '${REMOTE_DIR}'
  tar xzf '/root/${APP_NAME}.tgz'
  if [ ! -f '.env.production' ]; then
    echo 'Missing .env.production in ${REMOTE_DIR}. Copy .env.production.example and fill production secrets before deploying.' >&2
    exit 1
  fi
  docker compose --env-file .env.production -f docker-compose.api.yml up -d --build
  docker compose --env-file .env.production -f docker-compose.api.yml ps
"

echo "Deployment complete."
