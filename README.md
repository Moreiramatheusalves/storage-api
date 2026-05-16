# Storage API

Self-hosted Storage API for internal applications.

This project provides a small storage service that can be used by other applications to upload, read, list and delete files through an HTTP API. It includes application tokens, an admin panel, operation history, SQLite persistence and Docker volume based storage.

The main goal is to make it easy to run a private storage service inside Docker and let multiple internal applications store files in a centralized place.

## Features

- File upload API
- File read/download API
- File listing API
- File deletion API
- Application token authentication
- Admin panel
- Application/token management
- Operation history
- SQLite persistence
- Docker volume storage
- Runtime diagnostics page
- Admin file browser
- Admin recursive directory deletion with confirmation
- Safe path normalization
- Basic file signature validation
- Docker-first setup

## Use cases

This project is useful when you need a simple internal storage service for:

- SaaS applications
- internal dashboards
- local Docker environments
- media uploads
- product images
- tenant assets
- PDFs and image files
- applications that should not store files directly in their own containers

## Supported file types

The API validates the binary signature of uploaded files.

Currently accepted types:

- PNG: `image/png`
- JPEG/JPG: `image/jpeg`
- WEBP: `image/webp`
- PDF: `application/pdf`

## Requirements

- Docker and Docker Compose
- Node.js 24+ if running outside Docker

This project uses `node:sqlite`, so Node.js 24+ is required.

## Quick start with Docker

Copy the environment file:

```bash
cp .env.example .env