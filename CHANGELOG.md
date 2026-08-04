# Changelog

## v1.0.2 — 2026-05-26

### Infrastructure
- Migrated Docker image registry from **Docker Hub** to **GitHub Container Registry (GHCR)**
  - Images: `ghcr.io/elspoka/today-client` and `ghcr.io/elspoka/today-server`
  - Updated `docker-compose.yml`, `main.yml`, and `develop.yml` workflows
  - GitHub Actions now use built-in `GITHUB_TOKEN` for GHCR login (no more `DOCKERHUB_*` secrets)
  - VPS deploy scripts use `GHCR_TOKEN` secret (PAT with `read:packages`) to pull images

### Internationalisation (i18n)
- Installed and configured **vue-i18n v11**
- Auto-detects browser language on load, falls back to English
- Full translation coverage across the entire app (auth, todos, notifications, share panel, profile)
- **6 languages supported:**
  | Code | Language |
  |------|----------|
  | `en` | English |
  | `de` | Deutsch |
  | `fr` | Français |
  | `es` | Español |
  | `nl` | Nederlands |
  | `el` | Ελληνικά |

### Login Page
- Added **app branding** (icon + "To-Day" title) inside the auth card
- Improved copy: "Welcome back / Sign in to continue" and "Create an account / Start organizing your tasks"
- Removed internal Supabase subtitle visible to users
- Auth card is now **vertically centered** on the page
- Added `ui5-label` above Email and Password inputs (SAP Fiori form pattern)
- Added **language selector** at the bottom of the card with a globe icon (SAP Fiori style)
- Switching language updates the full UI instantly

### Bug Fixes
- Fixed `apiClient.js` crashing on empty server responses (`Unexpected end of JSON input`)
  - Reads response as text first, parses only if non-empty, falls back to `null`
- Fixed vue-i18n compilation error caused by `@` in email placeholder strings (escaped as `{'@'}`)
