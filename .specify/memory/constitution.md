<!--
Version change: 1.0.0 -> 1.1.0
List of modified principles: II. Workflow-Driven Automation replaced by II. TypeScript Programmatic Bot Architecture
Added sections: None
Removed sections: n8n specific references
Templates requiring updates: None
Follow-up TODOs: None
-->

# NaiaAtendimento Constitution

## Core Principles

### I. Container-First Architecture
The entire service mesh must run in Docker container environments. The `docker-compose.yaml` file is the source of truth for all service configurations, ports, volumes, and networks. No service should be run bare-metal unless strictly necessary for debugging.

### II. TypeScript Programmatic Bot Architecture
A hardcore TypeScript application (using Fastify and Drizzle ORM) is the primary execution and orchestration engine for handling conversational flows, database logging/persistence, and Evolution API webhook events. Custom business rules, AI prompts, and integration logic must be implemented in clean, type-safe TypeScript files.

### III. Evolution API WhatsApp Integration
All communication with WhatsApp clients must go through the Evolution API. Operations should strictly use the apiKey authentication mechanism and must specify standard messaging guidelines (e.g. link previews, delay queues, and read-receipt markers).

### IV. Redis-Based Memory & State
Redis must be used as the central memory and state storage for conversational workflows, session management, and chat history. Memory keys must have an explicit TTL configuration (e.g., 3600 seconds) and support standard keyspaces.

### V. Security & Secrets Isolation
Sensitive credentials, including Postgres passwords, Redis passwords, and external API keys, must never be hardcoded in any configuration, compose file, or workflow. They must be loaded dynamically using environment variables (`.env` files or host environment variables).

## Technical Constraints

- **Database**: PostgreSQL 16 is the primary relational store. The database schema is managed via Drizzle ORM.
- **Port Mapping**:
  - Evolution API: 8080
  - Postgres: 5432
  - pgAdmin: 5433 (mapping to internal port 80)
  - Bot Webhook & API: 3000
  - Redis: 6379 (DB 1 for Bot memory, DB 2 for Evolution cache)
- **Network**: All containers must communicate over the `rede_geral` docker network.

## Development & Deploy Workflow

1. **Prerequisites**:
   - A Docker network named `rede_geral` must exist before starting the containers. If it does not, create it using:
     ```bash
     docker network create rede_geral
     ```
   - Copy `.env.example` to `.env` and fill in the required postgres credentials, pgAdmin email, and Gemini API key.
2. **Startup**: Start the services directly using Docker Compose:
   ```bash
   docker compose up -d --build
   ```
3. **Validation**: Check that all 5 core containers (`redis_service`, `postgres_db`, `pgadmin`, `evolution_v2`, `bot_service`) are healthy and running.

## Governance

- Any modification to `docker-compose.yaml` or startup scripts must be validated for backward compatibility.
- Sensitive environment variables must be documented in `.env.example` template files.
- Code modifications, schemas, and migrations must be fully committed under version control in the project repository.

**Version**: 1.1.0 | **Ratified**: 2026-05-22 | **Last Amended**: 2026-05-22

