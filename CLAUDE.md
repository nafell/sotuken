# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Japanese research project called "頭の棚卸しノート" (Mental Inventory Note), a CBT-based iOS app for externalizing concerns and worries. The system uses LLM-generated dynamic UIs with a React PWA frontend and Bun/Hono backend.

### Key Technical Components
- **Frontend**: React + TypeScript + Capacitor (PWA → Native iOS)
- **Backend**: Bun + Hono + Drizzle ORM + SQLite
- **LLM Integration**: Google Gemini 2.5 mini for dynamic UI generation
- **Database**: Local IndexedDB (client) + SQLite (server)
- **DSL System**: Dual DSL architecture (DataSchema + UISpec) based on Jelly framework

## Common Development Commands

### Frontend (concern-app/)
```bash
cd concern-app
bun run dev          # Start development server
bun run build        # Build for production
bun run lint         # Run ESLint
```

### Backend (server/)
```bash
cd server
bun run dev          # Start development server with watch
bun run start        # Start production server
bun run build        # Build for production
bun run test         # Run tests

# Database operations
bun run db:generate  # Generate Drizzle migrations
bun run db:migrate   # Run migrations
bun run db:push      # Push schema to database
bun run db:studio    # Open Drizzle Studio
bun run db:reset     # Reset database (generate + migrate)
```

### Full-stack Development
```bash
./tmux-fullstack.sh  # Start both frontend and backend in tmux session
```

### Testing
```bash
# Run all tests
node tests/run_all_tests.js

# Test options
node tests/run_all_tests.js --parallel      # Run tests in parallel
node tests/run_all_tests.js --category=unit # Run only unit tests
node tests/run_all_tests.js --priority=high # Run only high priority tests
node tests/run_all_tests.js --fail-fast     # Stop on first failure
```

## Architecture Overview

### Monorepo Structure
- `concern-app/` - React PWA frontend with Capacitor for mobile
- `server/` - Bun backend with Hono framework
- `specs/` - Research documentation and DSL specifications
- `tests/` - Comprehensive test suite
- `config/` - Configuration files

### Key Services

#### Frontend Services (`concern-app/src/services/`)
- **ApiService** - Server API communication
- **ContextService** - Context factors collection and management
- **SessionManager** - User session and state management
- **localDB** - IndexedDB operations for offline storage

#### Backend Services (`server/src/`)
- **routes.ts** - API route definitions (config, ui, events)
- **database/schema.ts** - Drizzle ORM schema definitions
- **database/migrate.ts** - Database migration utilities

### DSL System
The project implements a dual DSL approach:
1. **DataSchemaDSL** - Structured data representation
2. **UISpecDSL** - Dynamic UI component specifications

Both DSLs work together to generate context-aware interfaces using Gemini 2.5 mini.

### Database Schema
- **Events** table - User interaction tracking
- **Sessions** table - User session management
- **Configs** table - Experiment configuration versioning
- **ExperimentSessions** table - Research experiment session data (Phase 6)
- **WidgetStates** table - Widget state snapshots for replay (Phase 6)

## Development Workflow

1. **Local Development**: Use `./tmux-fullstack.sh` to run both services
2. **Testing**: Run comprehensive test suite with `node tests/run_all_tests.js`
3. **Database Changes**: 
   - Modify `server/src/database/schema.ts`
   - Run `bun run db:generate` to create migration
   - Run `bun run db:migrate` to apply changes
4. **API Changes**: Update both API service and backend routes together

## Key Files to Understand

- `concern-app/src/services/api/ApiService.ts` - Frontend API client
- `server/src/routes.ts` - Backend API endpoints
- `server/src/database/schema.ts` - Database schema definition
- `specs/dsl-design/` - DSL specifications and examples
- `config/config.v1.json` - System configuration template

## Research Context

This is an academic research project focused on:
- Dynamic UI effectiveness measurement
- CBT-based cognitive load reduction
- LLM-generated interface adaptation
- Privacy-first data collection

The system uses anonymous cloud storage with deterministic LLM modes for reproducibility in research experiments.

## Experiment System (Phase 6)

### Overview
The experiment system enables controlled evaluation of dynamic UI generation with:
- **Technical Evaluation**: LLM generation quality and latency measurement
- **Expert Evaluation**: 10 pre-defined test cases with/without Reactivity
- **User Validation**: Real-world concern resolution testing

### Experiment API Endpoints
```
POST   /api/experiment/sessions              # Create experiment session
GET    /api/experiment/sessions              # List sessions (with filters)
GET    /api/experiment/sessions/:id          # Get session details
PATCH  /api/experiment/sessions/:id          # Update session (results/metrics)
POST   /api/experiment/sessions/:id/widget-states  # Save widget state
GET    /api/experiment/sessions/:id/widget-states  # Get widget states (replay)
GET    /api/experiment/cases                 # List test cases
GET    /api/experiment/cases/:caseId         # Get test case details
GET    /api/experiment/settings              # Get experiment settings
GET    /api/experiment/health                # Health check
```

### Experiment Commands
```bash
# Run experiment API tests
cd server && bun test/experiment_api.test.ts

# Run integration tests
cd server && bun test/experiment_integration.test.ts

# Access experiment admin UI (frontend)
# Navigate to: http://localhost:5173/research-experiment
```

### Key Configuration Files
- `config/experiment-settings.json` - Widget count/model conditions
- `config/test-cases/*.json` - 10 expert evaluation test cases

### Admin UI Routes
- `/research-experiment` - Dashboard
- `/research-experiment/cases` - Test case selection
- `/research-experiment/execute/:caseId` - Run experiment
- `/research-experiment/sessions` - Session list
- `/research-experiment/sessions/:sessionId` - Session details
- `/research-experiment/replay/:sessionId` - Replay view