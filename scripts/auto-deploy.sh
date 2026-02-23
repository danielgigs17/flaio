#!/bin/bash
# FLAIO Auto-Deploy Watcher
# Polls GitHub every 10 seconds, builds and restarts on new commits

REPO_PATH="/root/flaio"
BRANCH="main"
POLL_INTERVAL=10

# Cloudflare cache purge
CF_API_TOKEN="4VHDFMzFeA9pfXBdZtxrH1XxFFlbV1q-KRhwc91D"
CF_ZONE_ID="363137458b855507cb0da74e40b2c24c"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[$(date '+%H:%M:%S')]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[$(date '+%H:%M:%S')]${NC} $1"; }
log_step() { echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} $1"; }
log_error() { echo -e "${RED}[$(date '+%H:%M:%S')]${NC} $1"; }

get_current_commit() {
    cd "$REPO_PATH"
    git rev-parse HEAD 2>/dev/null
}

check_for_updates() {
    cd "$REPO_PATH"
    git fetch origin "$BRANCH" --quiet 2>/dev/null

    local local_commit=$(git rev-parse HEAD)
    local remote_commit=$(git rev-parse "origin/$BRANCH")

    if [ "$local_commit" != "$remote_commit" ]; then
        echo "$remote_commit"
        return 0
    fi
    return 1
}

pull_changes() {
    cd "$REPO_PATH"
    log_step "Pulling latest changes from $BRANCH..."
    git reset --hard "origin/$BRANCH"
    git clean -fd -e "node_modules" -e ".next"
    log_info "Pull complete: $(git log -1 --oneline)"
}

build_app() {
    cd "$REPO_PATH"
    log_step "Installing dependencies..."
    npm install 2>&1 | tail -5

    log_step "Building Next.js..."
    npm run build 2>&1 | tail -10

    if [ $? -eq 0 ]; then
        log_info "Build successful!"
        return 0
    else
        log_error "Build failed!"
        return 1
    fi
}

restart_app() {
    log_step "Restarting flaio service..."
    systemctl restart flaio 2>/dev/null || log_warn "Service restart requested"
    sleep 2
    log_info "flaio service restarted"
}

purge_cloudflare_cache() {
    if [ -z "$CF_API_TOKEN" ] || [ -z "$CF_ZONE_ID" ]; then
        log_warn "Cloudflare credentials not configured, skipping cache purge"
        return 0
    fi

    log_step "Purging Cloudflare cache for flaio.com..."
    local response
    response=$(curl -s -X POST "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/purge_cache" \
        -H "Authorization: Bearer ${CF_API_TOKEN}" \
        -H "Content-Type: application/json" \
        -d '{"purge_everything":true}' 2>&1)

    if echo "$response" | grep -q '"success": *true'; then
        log_info "Cloudflare cache purged successfully"
    else
        log_warn "Cloudflare cache purge may have failed: $response"
    fi
}

do_deploy() {
    local new_commit=$1

    log_info "=========================================="
    log_info "New commit detected: ${new_commit:0:8}"
    log_info "=========================================="

    pull_changes

    if ! build_app; then
        log_error "Build failed, skipping deployment"
        return 1
    fi

    restart_app
    purge_cloudflare_cache

    log_info "=========================================="
    log_info "Deployment complete!"
    log_info "=========================================="
}

main() {
    echo "=========================================="
    echo "  FLAIO Auto-Deploy Watcher"
    echo "=========================================="
    echo "Repository: $REPO_PATH"
    echo "Branch: $BRANCH"
    echo "Poll interval: ${POLL_INTERVAL}s"
    echo ""

    cd "$REPO_PATH"
    git checkout "$BRANCH" 2>/dev/null || true

    local last_commit=$(get_current_commit)
    log_info "Starting with commit: ${last_commit:0:8}"
    log_info "Watching for changes..."
    echo ""

    while true; do
        if new_commit=$(check_for_updates); then
            do_deploy "$new_commit"
            last_commit="$new_commit"
        fi

        sleep "$POLL_INTERVAL"
    done
}

trap 'log_warn "Shutting down..."; exit 0' SIGINT SIGTERM

main
