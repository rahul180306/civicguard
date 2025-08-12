# Infra

Placeholder for Docker, DB, Redis, and deployment config.

# Infra: Docker Compose

Services:
- PostgreSQL 16 (port 5432)
- Redis 7 (port 6379)
- MinIO (S3 API on 9000, console on 9001) with an auto-created bucket

## Usage

1) Copy env
- PowerShell: Copy-Item .env.example .env

2) Start stack
- docker compose --env-file .env -f docker-compose.yml up -d

3) Stop
- docker compose -f docker-compose.yml down

4) URLs
- MinIO console: http://localhost:9001 (user/pass from .env)
- S3 endpoint: http://localhost:9000

Data persists under `infra/data`.
