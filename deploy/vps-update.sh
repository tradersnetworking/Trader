#!/bin/sh
# Pull latest from GitHub and rebuild Docker (run from API container with /host-repo mounted).
set -euo pipefail

REPO="${HOST_REPO_PATH:-/host-repo}"
BRANCH="${PLATFORM_DEPLOY_BRANCH:-main}"
REMOTE="${PLATFORM_DEPLOY_REMOTE:-origin}"
COMPOSE_FILE="${PLATFORM_DEPLOY_COMPOSE:-deploy/docker-compose.yml}"

echo "[platform-update] repo=$REPO branch=$BRANCH"
cd "$REPO"

if ! command -v git >/dev/null 2>&1; then
  echo "[platform-update] ERROR: git not installed in container"
  exit 1
fi

git fetch "$REMOTE" --prune
BEFORE="$(git rev-parse HEAD 2>/dev/null || echo unknown)"
git pull "$REMOTE" "$BRANCH"
AFTER="$(git rev-parse HEAD)"
echo "[platform-update] git $BEFORE -> $AFTER ($(git log -1 --oneline))"

COMPOSE_PATH="$REPO/$COMPOSE_FILE"
if [ ! -f "$COMPOSE_PATH" ]; then
  echo "[platform-update] ERROR: compose file not found: $COMPOSE_PATH"
  exit 1
fi

if command -v docker >/dev/null 2>&1; then
  if docker compose version >/dev/null 2>&1; then
    docker compose -f "$COMPOSE_PATH" --project-directory "$REPO/deploy" up -d --build
  elif command -v docker-compose >/dev/null 2>&1; then
    docker-compose -f "$COMPOSE_PATH" --project-directory "$REPO/deploy" up -d --build
  else
    echo "[platform-update] ERROR: docker compose plugin not found"
    exit 1
  fi
  docker compose -f "$COMPOSE_PATH" --project-directory "$REPO/deploy" ps 2>/dev/null || true
else
  echo "[platform-update] ERROR: docker CLI not available (mount /var/run/docker.sock)"
  exit 1
fi

echo "[platform-update] done"
