#!/bin/bash
# =============================================================================
#  Gasagency — Docker VPS Deployment Script
#  Domain: https://dev.agency.cicdprosystems.com
#  Place at: /home/deploy/gasagency-krushna/deploy.sh
#  Usage:    bash /home/deploy/gasagency-krushna/deploy.sh
# =============================================================================
set -euo pipefail

APP_DIR="/home/deploy/gasagency/"
BRANCH="new-client-requirement"
DOMAIN="dev.agency.cicdprosystems.com"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
log()  { echo -e "${GREEN}[✔] $1${NC}"; }
warn() { echo -e "${YELLOW}[!] $1${NC}"; }
fail() { echo -e "${RED}[✘] $1${NC}"; exit 1; }

echo ""
echo "=================================================="
echo "  🚀  Gasagency Docker Deployment"
echo "  🌐  ${DOMAIN}"
echo "  📅  $(date '+%Y-%m-%d %H:%M:%S')"
echo "=================================================="
echo ""

# ── Pre-flight checks ──────────────────────────────────────────────────────
cd "$APP_DIR" || fail "Cannot cd to $APP_DIR"

[ -f ".env.production" ]         || fail ".env.production missing — create it on the VPS first (never commit it)."
[ -f "nginx/dhparam.pem" ]       || fail "nginx/dhparam.pem missing — run: openssl dhparam -out nginx/dhparam.pem 2048"
[ -d "/etc/letsencrypt/live/${DOMAIN}" ] || fail "SSL certs missing — run certbot first (see deployment plan)."

log "Pre-flight checks passed"

# ── Install logrotate config (idempotent) ─────────────────────────────────
if [ ! -f "/etc/logrotate.d/gasagency-nginx" ]; then
    warn "Installing logrotate config for Nginx logs..."
    sudo cp "$APP_DIR/nginx/logrotate-nginx.conf" /etc/logrotate.d/gasagency-nginx
    log "Logrotate config installed"
fi

# ── Pull latest code ──────────────────────────────────────────────────────
warn "Pulling latest code from branch: $BRANCH..."
git fetch origin
git checkout "$BRANCH"
git pull origin "$BRANCH"
log "Code updated"

# ── Build Docker image ────────────────────────────────────────────────────
warn "Building Docker image (no-cache)..."
docker compose build --no-cache app
log "Image built"

# ── Run DB migrations ─────────────────────────────────────────────────────
warn "Running DB migrations..."
docker compose run --rm app \
    sh -c "npx prisma migrate deploy"
log "DB migrations applied"

# ── Start / restart containers ────────────────────────────────────────────
warn "Starting containers..."
docker compose up -d --remove-orphans
log "Containers started"

# ── Health check ──────────────────────────────────────────────────────────
warn "Waiting 15s for app to initialise..."
sleep 15

if curl -sf --max-time 10 "https://${DOMAIN}/api/health" > /dev/null; then
    log "Health check passed ✅"
else
    warn "HTTPS health check failed — trying internal..."
    docker compose exec app curl -sf http://localhost:3000/api/health \
        && log "Internal health check passed (SSL may still be starting)" \
        || fail "Health check failed — check: docker compose logs app"
fi

# ── Cleanup ───────────────────────────────────────────────────────────────
docker image prune -f > /dev/null
log "Old images pruned"

# ── Certbot auto-renew cron (installs once) ───────────────────────────────
CRON_ENTRY="0 3 1 */2 * certbot renew --quiet && docker compose -f ${APP_DIR}/docker-compose.yml restart nginx"
if ! crontab -l 2>/dev/null | grep -qF "certbot renew"; then
    (crontab -l 2>/dev/null; echo "$CRON_ENTRY") | crontab -
    log "Certbot auto-renew cron installed"
fi

echo ""
echo "=================================================="
echo "  ✅  Deployment Complete!"
echo "  🌐  https://${DOMAIN}"
echo ""
docker compose ps
echo "=================================================="
echo ""
