#!/bin/bash
# =============================================================================
#  Gasagency — VPS Deployment Script
#  Place this at: /home/deploy/deploy.sh on your VPS
#  Usage: bash /home/deploy/deploy.sh
# =============================================================================

set -e  # Exit immediately on any error

# ─── Config ───────────────────────────────────────────────────────────────────
APP_DIR="/home/deploy/gasagency/gasagency"
BRANCH="my-idea"       # <-- your branch name
PM2_APP_NAME="gasagency"

# ─── Colors ───────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

log()  { echo -e "${GREEN}[✔] $1${NC}"; }
warn() { echo -e "${YELLOW}[!] $1${NC}"; }
fail() { echo -e "${RED}[✘] $1${NC}"; exit 1; }

# ─── Start ────────────────────────────────────────────────────────────────────
echo ""
echo "================================================="
echo "  🚀  Gasagency — Deployment Started"
echo "  📅  $(date '+%Y-%m-%d %H:%M:%S')"
echo "================================================="
echo ""

# Step 1: Navigate to app directory
cd "$APP_DIR" || fail "Could not navigate to $APP_DIR"
log "Changed to app directory: $APP_DIR"

# Step 2: Pull latest code
warn "Pulling latest code from branch: $BRANCH..."
git fetch origin
git checkout "$BRANCH"
git pull origin "$BRANCH"
log "Code updated successfully"

# Step 3: Install / update dependencies
warn "Installing dependencies..."
npm install --production=false
log "Dependencies installed"

# Step 4: Generate Prisma client
warn "Generating Prisma client..."
npm run db:generate
log "Prisma client generated"

# Step 5: Run database migrations (safe — only applies new ones)
warn "Running database migrations..."
npx prisma migrate deploy
log "Database migrations applied"

# Step 6: Build Next.js app
warn "Building Next.js application..."
npm run build
log "Build completed successfully"

# Step 7: Create logs directory if missing
mkdir -p logs
log "Logs directory ready"

# Step 8: Restart or start app with PM2
if pm2 describe "$PM2_APP_NAME" > /dev/null 2>&1; then
  warn "Restarting PM2 process: $PM2_APP_NAME..."
  pm2 restart "$PM2_APP_NAME" --update-env
  log "PM2 process restarted"
else
  warn "Starting PM2 process for the first time..."
  pm2 start ecosystem.config.js --env production
  log "PM2 process started"
fi

# Step 9: Save PM2 process list
pm2 save
log "PM2 process list saved"

# ─── Done ─────────────────────────────────────────────────────────────────────
echo ""
echo "================================================="
echo "  ✅  Deployment Complete!"
echo "  🌐  App running at: https://yourdomain.com"
echo "  📊  PM2 Status:"
echo "================================================="
pm2 status
echo ""
