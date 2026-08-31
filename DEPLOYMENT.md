# Deployment & Git Workflow Guide

This document describes the git-flow and deployment process for the To-Day application.

## Branch Strategy

- **`develop`**: Main development branch. Receives all feature commits and pulls. CI builds & validates code (no deploy to VPS).
- **`main`**: Production release branch. Only receives commits via merge from `develop`. Deploys to VPS via GitHub Actions **on git tags only**.

## Typical Development Workflow

### 1. Development Phase (on `develop`)

```bash
# Make sure you're on develop
git checkout develop
git pull origin develop

# Make your changes (e.g., Facebook Login, Messenger webhook, etc.)
# Edit files, test locally

# Stage and commit
git add .
git commit -m "feat: your feature description"

# Push to develop
git push origin develop
```

**What happens**: GitHub Actions CI (`.github/workflows/develop.yml`) automatically:
- Builds Docker images for client and server
- Pushes images to GHCR as `ghcr.io/elspoka/today-client:develop` and `ghcr.io/elspoka/today-server:develop`
- Does **NOT** deploy to VPS

### 2. Prepare for Release (create a release commit on `develop`)

When ready to release a new version:

```bash
# On develop, update version numbers in:
# - today/package.json
# - today/client/package.json
# - today/server/package.json
# - today/README.md (in the "Version:" line and CHANGELOG section)

# Example: bump from 1.0.7 to 1.0.8
# Edit each file and change "version": "1.0.7" to "version": "1.0.8"

# Commit the version bump
git add package.json client/package.json server/package.json README.md
git commit -m "chore: bump version to 1.0.8"

# Push to develop
git push origin develop
```

### 3. Release & Deploy to VPS (from `develop` → `main` → tag)

```bash
# Make sure everything is pushed to develop
git pull origin develop

# Switch to main branch
git checkout main

# Ensure main is up to date with origin
git pull origin main

# Merge develop into main
git merge develop

# Create a git tag with the version (must match package.json version)
git tag v1.0.8

# Push main branch AND the tag to trigger GitHub Actions deploy
git push origin main --tags

# (Optional) Switch back to develop for next cycle
git checkout develop
```

**What happens**: GitHub Actions CI (`.github/workflows/main.yml`) automatically:
- Builds Docker images for client and server
- Pushes images to GHCR as `ghcr.io/elspoka/today-client:latest` and `ghcr.io/elspoka/today-client:v1.0.8` (and server equivalents)
- **Deploys to VPS** via SSH:
  - Copies `docker-compose.yml` to `~/today-prod` on VPS
  - Logs into GHCR (using GitHub token)
  - Pulls latest images
  - Runs `docker compose up -d --remove-orphans`
  - Cleans up old images with `docker image prune -f`

## GitHub Secrets Required

For CI/CD to work, these secrets must be configured in **GitHub → Settings → Secrets and variables → Actions**:

### For all workflows:
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Supabase anonymous key

### For deploy (main.yml only, triggered by tags):
- `VPS_HOST` — Your VPS hostname/IP
- `VPS_USER` — SSH user on VPS
- `VPS_SSH_KEY` — Private SSH key (newline-escaped, or GitHub-pasted multi-line secret)
- `VPS_PORT` — SSH port (optional, defaults to 22)

### For Messenger webhook (if configuring):
- `MESSENGER_VERIFY_TOKEN` — Token you choose (used in webhook handshake)
- `MESSENGER_APP_SECRET` — Meta app secret (used to verify webhook signatures)
- `MESSENGER_PAGE_ACCESS_TOKEN` — Meta page access token (used to send messages back)

(These are optional until Messenger integration is fully deployed. Add them to VPS `.env` when ready.)

## File Structure for Deployment

```
today/
├── .github/workflows/
│   ├── develop.yml        # Triggered: push to develop branch → build only
│   └── main.yml           # Triggered: git tag v*.*.* pushed → build + deploy to VPS
├── docker-compose.yml     # Local dev compose (ports 3000/3150)
├── docker-compose.prod.yml # (Not used; kept for reference)
├── client/
│   ├── Dockerfile
│   └── package.json       # version field must match git tag
├── server/
│   ├── Dockerfile
│   ├── .env.example       # Template for VPS secrets
│   └── package.json       # version field must match git tag
└── README.md              # Document version here too
```

## Troubleshooting

### Deploy fails on main workflow
- Check GitHub Actions logs: **Settings → Actions → All workflows → (failed run)**
- Common issues:
  - VPS SSH key missing or malformed
  - Image pull fails (credentials/GHCR access)
  - `docker compose` not installed on VPS

### Develop build fails
- Check GitHub Actions logs same way
- Usually a code/linting issue — fix locally and re-push to develop

### Tags not triggering deploy
- Verify the tag name matches `v*.*.*` pattern (e.g., `v1.0.8`, not `1.0.8`)
- Confirm `git push origin main --tags` was run (not just `git push`)

### How to undo a release
If you accidentally released the wrong code:

```bash
# On your local machine
git tag -d v1.0.8              # Delete local tag
git push origin :refs/tags/v1.0.8  # Delete remote tag

# Then re-merge/re-tag the correct commit
git checkout main
git reset --hard <correct-commit-hash>
git tag v1.0.8
git push origin main --tags
```

## Example: Complete Release Cycle

```bash
# 1. Work on develop
git checkout develop
git pull origin develop
# ... make changes (e.g., add Facebook Login)
git add .
git commit -m "feat: Facebook Login via Supabase OAuth"
git push origin develop
# → CI builds and pushes to GHCR:develop

# 2. When ready, bump version on develop
git add package.json client/package.json server/package.json README.md
git commit -m "chore: bump version to 1.0.8"
git push origin develop

# 3. Merge to main and release
git checkout main
git pull origin main
git merge develop
git tag v1.0.8
git push origin main --tags
# → CI builds, pushes to GHCR:latest + GHCR:v1.0.8, and deploys to VPS

# 4. Back to develop for next cycle
git checkout develop
```

## VPS Deployment Details

On the VPS (`~/today-prod`):
- `.env` file contains secrets (never committed to git)
- `docker-compose.yml` is automatically synced by GitHub Actions on every tag push
- Logs can be viewed with: `docker compose logs -f server` or `docker compose logs -f client`
- Restart manually if needed: `docker compose down && docker compose up -d`

## Notes

- **Never push directly to `main`** — always use the merge-from-develop + tag workflow.
- **Develop is the "real" branch** — merge to main only when releasing.
- **VPS deploys only on tags** — pushing to main without a tag does nothing.
- **Version numbers must match** — keep `package.json` versions in sync with git tags for clarity.
