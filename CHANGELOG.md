# Changelog

All notable changes to this project will be documented in this file.

This project follows a simple changelog format. Versioning can follow semantic versioning when formal releases are published.

## [1.0.0] - Initial public release

### Added

- Self-hosted Storage API
- Docker-first setup
- Named Docker volume storage
- Application token authentication
- Admin login
- Admin panel
- Application management
- Token generation
- Token rotation
- Enable and disable applications
- File upload endpoint
- File listing endpoint
- File read endpoint
- File delete endpoint
- Operation history
- SQLite persistence
- SQLite WAL mode
- Runtime path configuration through environment variables
- Runtime path logging on startup
- Runtime diagnostics endpoint
- Runtime diagnostics admin page
- Admin file browser
- Friendly application names in admin storage listing
- Application filter in admin storage browser
- Recursive admin directory deletion with confirmation
- Admin delete history event
- Protected admin HTML pages served from `views/admin`
- Public static assets limited to CSS and JavaScript
- Internal documentation page
- File signature validation for PNG, JPEG, WEBP and PDF
- Safe path normalization
- Docker Compose example
- Environment example

### Changed

- SQLite is now the official data store
- Legacy JSON store is disabled
- Runtime storage paths are configurable
- Production Docker storage uses `/var/lib/storage-api`
- Application files are stored under `/var/lib/storage-api/storage/apps`
- SQLite database is stored under `/var/lib/storage-api/db/store.sqlite`
- Admin HTML files are no longer served directly from `/public`
- Docker image name is now neutral: `storage-api:latest`
- Docker volume name is now neutral: `storage_api_data`

### Security

- Application file API requires `X-Storage-Token`
- Admin routes require an authenticated admin session
- Admin pages are no longer directly accessible as static public HTML
- Path traversal is blocked
- Storage root deletion is blocked
- Empty path deletion is blocked
- Recursive deletion is restricted to the admin panel
- Public application API remains stricter than admin file management
- Secrets are expected to be configured through environment variables
- Runtime diagnostics avoid exposing tokens, passwords or secrets

### Notes

- Requires Node.js 24+ because the project uses `node:sqlite`
- The upload response `fileUrl` points to a protected endpoint and should not be treated as a public URL
- Do not expose application tokens in frontend code
- Do not commit `.env`, SQLite files, uploaded files or Docker volume data