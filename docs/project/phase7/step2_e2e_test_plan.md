# Phase 7 Step 2 E2E Test Plan

## Objective
Verify the implementation of the Experiment Flow (Capture -> Plan -> Breakdown), specifically focusing on the new metrics recording (LLM Prompt, Render Duration) and the normalized data structure (`experiment_generations`).

## Test Environment
- **Frontend**: `http://localhost:5173`
- **Backend**: `http://localhost:8000`
- **Database**: PostgreSQL (via Docker)

## Test Cases

### 1. Technical Mode (Auto-Run)
**Goal**: Verify the automated flow works and records data without user intervention.
**Steps**:
1.  Navigate to `/research-experiment/execute/case_01`.
2.  **Configuration**:
    -   Select "Technical" from the "Experiment Type" dropdown (default is Expert).
    -   Click "Start Execution".
3.  **Execution**:
    -   Wait for the flow to auto-complete (Capture -> Plan -> Breakdown).
    -   The system should automatically proceed through all stages.
4.  **Verification**:
    -   Check `experiment_sessions` table for the session.
    -   Check `experiment_generations` table:
        -   Should have records for each Plan stage.
        -   `prompt` column should be populated (server-side).
        -   `render_duration` column should be populated (client-side).
        -   `generated_dsl` should be valid JSON.

### 2. User Mode (Manual Flow)
**Goal**: Verify the manual user interaction flow.
**Steps**:
1.  Navigate to `/research/experiments/execution/test-session-user` (or create a new session with `mode=user`).
2.  **Capture Phase**: Enter concern text manually. Click "Next".
3.  **Plan Phase**:
    -   Click "Generate UI" for Diverge stage.
    -   Wait for generation.
    -   Verify UI renders.
    -   Click "Next" to proceed through Organize, Converge, Summary.
4.  **Breakdown Phase**:
    -   Verify tasks are generated.
    -   Click "Complete".
5.  **Verification**:
    -   Ensure smooth transitions between phases.
    -   Verify data persistence in DB.

### 3. Metrics Verification
**Goal**: Confirm specific metrics are recorded correctly.
**Steps**:
1.  Inspect the database after a run.
2.  **Prompt Logging**: Confirm `prompt` field in `experiment_generations` contains the actual prompt text sent to Gemini.
3.  **Render Duration**: Confirm `render_duration` is a reasonable positive integer (ms).

### 4. Bug Verification (Session ID)
**Goal**: Ensure the `:sessionId` literal bug is resolved.
**Steps**:
1.  Monitor backend logs during execution.
2.  Ensure no `invalid input syntax for type uuid: ":sessionId"` errors appear.
3.  Verify API requests use valid UUIDs.

## Execution Plan
1.  Start Backend Server (`bun run dev` in `server/`).
2.  Start Frontend Server (`bun run dev` in `concern-app/`).
3.  Use Browser Subagent to execute "Technical Mode" test case.
4.  Check Database records to verify metrics.
