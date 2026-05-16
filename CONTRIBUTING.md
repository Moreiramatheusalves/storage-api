# Contributing

Thank you for your interest in contributing to Storage API.

This project provides a self-hosted storage service for internal applications using Docker, application tokens, an admin panel and SQLite persistence.

Contributions are welcome.

## Before contributing

Do not commit secrets, private files or runtime data.

Never commit:

```txt
.env
.env.local
.env.production
storage/
data/
db/
tmp/
.local-storage/
*.sqlite
*.sqlite-wal
*.sqlite-shm
_backup-*/
_dbeaver/
node_modules/
dist/

Do not include:

JWT_SECRET
ADMIN_PASSWORD
application tokens
real uploaded files
real SQLite databases
production logs
private backups
Development setup

Clone the repository:

git clone https://github.com/YOUR_USERNAME/storage-api.git
cd storage-api

Install dependencies:

npm install

Create your environment file:

cp .env.example .env

Edit .env and set local values.

Run in development mode:

npm run dev

Build the project:

npm run build

Run with Docker:

docker compose up -d --build
Recommended Docker setup

Use a named Docker volume for persistent data:

volumes:
  storage_api_data:
    name: storage_api_data

The container should store data in:

/var/lib/storage-api

Expected internal paths:

/var/lib/storage-api/storage/apps
/var/lib/storage-api/db/store.sqlite
/var/lib/storage-api/data
/var/lib/storage-api/tmp

Do not use project folders as production bind mounts unless you intentionally want files written to the host project directory.

Code guidelines

Keep changes small and focused.

Prefer clear errors over generic internal errors.

Do not expose secrets in logs.

Do not change public API behavior without documenting it.

Keep the application API stricter than the admin API.

Keep storage paths safe and normalized.

Preserve backward compatibility when possible.

Useful areas for contribution
Tests
Documentation improvements
Docker examples
Reverse proxy examples
Security hardening
CI pipeline
Admin UI improvements
Backup and restore tooling
Support for more file types
SQLite maintenance tools
Better error messages
Migration scripts
Pull request process
Fork the repository.
Create a branch:
git checkout -b feature/my-change
Make your changes.
Run the build:
npm run build
Test with Docker:
docker compose up -d --build
Confirm the health endpoint works:
http://127.0.0.1:3999/health
Confirm the admin panel works:
http://127.0.0.1:3999/admin
Confirm the documentation page works:
http://127.0.0.1:3999/docs
Open a pull request with a clear description.
Pull request checklist
 The project builds with npm run build
 Docker setup still works
 No secrets were committed
 No .env file was committed
 No SQLite database was committed
 No uploaded files were committed
 No backups were committed
 Documentation was updated if behavior changed
 Admin panel still works
 API endpoints still work
Commit messages

Use clear commit messages.

Examples:

fix: prevent storage root deletion
docs: document docker volume persistence
feat: add diagnostics page
refactor: move admin html out of public directory
Reporting bugs

When reporting a bug, include:

Operating system
Docker version
Node.js version, if running without Docker
Steps to reproduce
Expected behavior
Actual behavior
Relevant logs

Do not include secrets, real tokens or private files.

Feature requests

Feature requests are welcome.

Please explain:

What problem you are solving
Why the current behavior is not enough
How you expect the feature to work
Whether it affects the public API, admin panel or Docker setup
Security issues

Do not report security vulnerabilities with full exploit details in a public issue.

Please read:

SECURITY.md