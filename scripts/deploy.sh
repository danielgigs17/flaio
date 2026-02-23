#!/bin/bash
# FLAIO Manual Deploy Script
# Syncs code to flaio-prod, builds, and restarts

set -e

LOCAL_PATH="/Users/daniel_allen/Desktop/Local/flaio-new"
REMOTE_HOST="flaio-prod"
REMOTE_PATH="/root/flaio"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_step() { echo -e "${BLUE}[STEP]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

log_step "Syncing files to $REMOTE_HOST..."
rsync -avz --progress \
    --exclude '.git' \
    --exclude 'node_modules' \
    --exclude '.next' \
    --exclude '.DS_Store' \
    --exclude '.env.local' \
    "$LOCAL_PATH/" "$REMOTE_HOST:$REMOTE_PATH/"

log_info "Sync complete!"

log_step "Installing dependencies and building on server..."
ssh "$REMOTE_HOST" bash << 'REMOTE_SCRIPT'
set -e
cd /root/flaio

echo "=== Installing dependencies ==="
npm install 2>&1 | tail -3

echo "=== Building Next.js ==="
npm run build 2>&1 | tail -10

echo "=== Restarting service ==="
systemctl restart flaio
sleep 2
systemctl status flaio --no-pager | head -8

echo "=== Deploy complete ==="
REMOTE_SCRIPT

log_info "Deployment complete!"
echo ""
echo "Site: https://flaio.com"
echo "Status: ssh flaio-prod 'systemctl status flaio'"
