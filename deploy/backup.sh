#!/usr/bin/env bash
# Backup SQLite DBs + uploads from Docker api container
set -euo pipefail
OUT="${1:-./backups/akshaya-$(date +%F-%H%M)}.tar.gz"
mkdir -p "$(dirname "$OUT")"
docker compose -f deploy/docker-compose.yml exec -T api tar czf - /app/server/prisma/*.db /app/server/uploads 2>/dev/null > "$OUT"
echo "Backup saved: $OUT"
