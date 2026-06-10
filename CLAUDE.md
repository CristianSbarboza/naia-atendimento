# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Naia-Atendimento** is a WhatsApp AI chatbot service that integrates with [Evolution API](https://github.com/EvolutionAPI/evolution-api) to receive messages and responds using Google Gemini. It is the MVP foundation for a planned omnichannel SaaS platform with multitenancy, human handoff, and Web Chat support.

The active bot code lives in `whatsapp/naia-atendimento/`. The root-level `naia-atendimento/` directory contains deleted/staged files (see git status) and should be ignored.

## Commands

All commands run from `whatsapp/naia-atendimento/`:

```bash
npm run dev          # Run in watch mode with tsx (development)
npm run build        # Compile TypeScript → dist/
npm run start        # Run compiled output (production)
npm run db:generate  # Generate Drizzle migrations from schema changes
npm run db:migrate   # Apply pending migrations to the database
```

There are no tests configured yet.

## Required Environment Variables

The app validates all env vars at startup via Zod and exits if any are missing:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `EVOLUTION_API_URL` | Base URL of the Evolution API instance |
| `EVOLUTION_API_KEY` | API key for Evolution API auth |
| `GEMINI_API_KEY` | Google Gemini API key |
| `PORT` | HTTP server port (default: 3000) |

## Architecture

### Request Flow

```
Evolution API → POST /webhook → WebhookController
  → mark message as read (EvolutionService)
  → upsert conversation + log user message (ConversationService → Postgres)
  → fetch recent chat history (MemoryService → Redis)
  → generate AI reply (AIService → Gemini)
  → save user+bot turns to Redis history (MemoryService)
  → log bot message to Postgres (ConversationService)
  → send reply (EvolutionService → Evolution API)
```

The webhook handler returns `{ status: "received" }` immediately and processes asynchronously to avoid Evolution API retry timeouts (must respond within 200ms).

### Key Design Decisions

- **Dual persistence**: Redis stores a sliding window of the last 10 messages (1-hour TTL) for low-latency Gemini context. Postgres stores the full audit log via Drizzle ORM.
- **Gemini chat format**: Redis history uses `{ role: "user"|"model", parts: [{ text }] }` — Gemini's native `Content[]` shape. Note the `messages` table uses `"assistant"` for the role column, which differs from the Redis/Gemini `"model"` role.
- **AI resilience**: `AIService` retries the primary model (`gemini-2.5-flash`) up to 3 times with progressive backoff, then falls back to a secondary model. 400/401/403 errors are not retried.
- **PDF knowledge base**: Place PDF files in the `data/` directory. `PDFService` reads them all, concatenates their text, caches the result in memory (invalidated by file mtime), and injects the content into the Gemini system prompt.
- **Message filtering**: Only `messages.upsert` events from private chats (`@s.whatsapp.net`) are processed. Group chats, broadcast lists, and self-sent messages are silently dropped.
- **Database auto-creation**: On startup, `ensureDatabaseExists()` connects to the `postgres` control database and creates the target DB if it doesn't exist — useful for fresh Docker environments.

### Database Schema (`src/db/schema.ts`)

- `conversations`: one row per WhatsApp JID (phone number), keyed by `jid`, tracks `pushName`, `instance`, timestamps.
- `messages`: append-only log of all turns, foreign-keyed to `conversations.jid` with cascade delete.

### Service Responsibilities

| Service | Responsibility |
|---|---|
| `WebhookController` | Orchestrates the full message processing pipeline |
| `AIService` | Calls Gemini with system prompt + history, handles retries/fallback |
| `MemoryService` | Redis get/set for sliding chat history (Gemini `Content[]` format) |
| `ConversationService` | Postgres upserts for conversations and message audit log |
| `EvolutionService` | HTTP calls to Evolution API (send text, mark as read) |
| `PDFService` | Reads/caches PDF files from `data/` for knowledge base injection |

## Planned Evolution (from `docs/`)

The requirements docs (`docs/regras-de-negocio/`) describe the full SaaS vision: multitenancy with RBAC, Web Chat via WebSockets, BullMQ-based async message queues, human handoff (bot_active ↔ human_agent status), and a NestJS rewrite. The current codebase is the single-tenant MVP that proves the core AI loop before the full architecture is built.
