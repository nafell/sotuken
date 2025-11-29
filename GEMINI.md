# GEMINI.md

This file provides a comprehensive overview of the "頭の棚卸しノート" (Mental Inventory Note) project for AI agents.

## 1. Project Overview

**Project Name**: 頭の棚卸しノート (Mental Inventory Note)
**Purpose**: A CBT-based research application to help users externalize concerns and reduce cognitive load ("brain fog").
**Core Concept**:
- **Externalization**: Write down abstract concerns.
- **Dynamic UI**: LLM-generated UIs adapted to user context (time, location, etc.) to encourage action.
- **Dual DSL**: Uses a custom DSL system (DataSchema + UISpec) to generate interfaces.
- **Research**: Measures the effectiveness of dynamic UIs vs. static UIs.

## 2. Technology Stack

The project uses **Bun** as the primary runtime and package manager. **Do not use npm.**

- **Frontend**:
    - **Framework**: React + TypeScript + Vite
    - **Platform**: Capacitor (PWA -> Native iOS)
    - **State/Storage**: Dexie.js (IndexedDB)
    - **Styling**: Tailwind CSS
- **Backend**:
    - **Runtime**: Bun
    - **Framework**: Hono
    - **Database**: SQLite (Dev) / PostgreSQL (Prod)
    - **ORM**: Drizzle ORM
- **AI/LLM**:
    - **Model**: Google Gemini 2.5 mini / Flash
    - **Role**: Dynamic UI generation, Data Schema generation
- **Infrastructure**:
    - **Container**: Docker, Docker Compose

## 3. Architecture

The system follows a client-server architecture with a strong focus on local-first data for privacy, syncing anonymized data to the server for research.

### 3.1. Dual DSL System (Jelly-based)
The core innovation is the 2-layer DSL for UI generation:
1.  **DataSchemaDSL**: Defines the structure of the data (what to ask/display).
2.  **UISpecDSL**: Defines the visual presentation (how to display it).

### 3.2. Data Flow
1.  **User Input**: User enters a concern.
2.  **Context Collection**: App collects "factors" (time, location, etc.).
3.  **LLM Processing**: Server receives input + factors, generates DSLs.
4.  **Rendering**: Client renders the DSLs into React components.
5.  **Action & Logging**: User interacts; events are logged locally and synced to server.

### 3.3. Directory Structure
- `concern-app/`: Frontend (React PWA)
- `server/`: Backend (Bun + Hono)
- `specs/`: Documentation & Specifications
    - `dsl-design/`: DSL definitions
    - `system-design/`: Architecture docs
- `tests/`: Integration tests
- `config/`: Configuration files
- `scripts/`: Utility scripts

## 4. Development Workflow

### 4.1. Commands (Run from project root)

- **Full Stack Dev**: `./tmux-fullstack.sh` (Requires tmux)
- **Frontend Dev**: `cd concern-app && bun run dev`
- **Backend Dev**: `cd server && bun run dev`
- **Testing**: `node tests/run_all_tests.js`

### 4.2. Database Operations (in `server/`)
- **Generate Migrations**: `bun run db:generate`
- **Run Migrations**: `bun run db:migrate`
- **Studio (GUI)**: `bun run db:studio`

### 4.3. Rules
- **Package Manager**: ALWAYS use `bun`.
- **Formatting**: Follow existing patterns (Prettier/ESLint).
- **Privacy**:
    - Personal data (raw text, location) -> Local Storage (IndexedDB).
    - Research data (anonymized factors, logs) -> Server (SQLite/Postgres).

## 5. Key Features & Status

- **Concern Organization**: Capture -> Plan -> Breakdown flow.
- **Dynamic UI**: Context-aware task recommendations and input forms.
- **Experiment System**:
    - **Phase 6**: Controlled evaluation with "Expert Evaluation" cases.
    - **Replay**: Ability to replay user sessions and UI states.
- **Metrics**: "Time to Start", "Clarity" (Sukkiri-do), "Brain Fog" reduction.

## 6. Important Files

- `concern-app/src/services/ui-generation/`: UI Rendering logic.
- `server/src/routes.ts`: API Endpoints.
- `server/src/database/schema.ts`: DB Schema.
- `specs/dsl-design/v3/`: Current DSL Specification.

## 7. Context for AI

- **User**: `tk220307` (Research Student/Developer)
- **Environment**: Linux (WSL2), Bun, Docker.
- **Goal**: Complete the research prototype, ensure stability of dynamic UI, and run experiments.
