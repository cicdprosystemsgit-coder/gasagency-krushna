#!/bin/bash
# ─── Gasagency Docker Deployment Script ──────────────────────────────────────
# Run on your Hostinger VPS: bash scripts/docker-deploy.sh
set -e

APP_DIR="/opt/gasagency"
COMPOSE_FILE="$APP_DIR/docker-compose.yml"

echo "🚀 Starting Gasagency Docker Deployment..."
echo "============================================"

# ─── 1. Pull latest code ──────────────────────────────────────────────────────
echo "📦 Pulling latest code from GitHub..."
cd "$APP_DIR"
git pull origin main

# ─── 2. Build new Docker image ────────────────────────────────────────────────
echo "🐳 Building Docker image (this may take 3-5 minutes)..."
docker compose -f "$COMPOSE_FILE" build --no-cache app

# ─── 3. Start Postgres first (if not running) ────────────────────────────────
echo "🗄️  Ensuring database is running..."
docker compose -f "$COMPOSE_FILE" up -d postgres
echo "   Waiting for Postgres to be healthy..."
sleep 5

# ─── 4. Run Prisma migrations ────────────────────────────────────────────────
echo "🔄 Running database migrations..."
docker compose -f "$COMPOSE_FILE" run --rm app \
  sh -c "npx prisma migrate deploy"

# ─── 5. Restart app container ────────────────────────────────────────────────
echo "♻️  Restarting application container..."
docker compose -f "$COMPOSE_FILE" up -d --force-recreate app

# ─── 6. Restart nginx ────────────────────────────────────────────────────────
echo "🌐 Restarting Nginx..."
docker compose -f "$COMPOSE_FILE" up -d nginx

# ─── 7. Cleanup old images ────────────────────────────────────────────────────
echo "🧹 Cleaning up dangling images..."
docker image prune -f

# ─── 8. Status check ─────────────────────────────────────────────────────────
echo ""
echo "✅ Deployment complete! Container status:"
echo "============================================"
docker compose -f "$COMPOSE_FILE" ps
echo ""
echo "📋 App logs (last 20 lines):"
docker compose -f "$COMPOSE_FILE" logs --tail=20 app
