# Fitness Tracking App Implementation Plan

## Goal

Align the app with the product rules in `AGENTS.md`, with the highest priority on correct program scheduling, reliable workout state, and phase-specific exercise history.

## Source of Truth

- `AGENTS.md` is the product source of truth.
- This plan replaces the earlier roadmap in this file where it conflicts with `AGENTS.md`.

## Current State Summary

The app already has a strong UI foundation:

- A homepage
- A workout detail page
- A separate upload program page
- Local draft and saved workout persistence
- CSV upload support
- Mobile-friendly workout inputs

The biggest implementation gaps are in the data model and rule handling:

- `Phase weeks` is currently interpreted incorrectly
- Monday-based scheduling is not implemented
- Phase progression is not derived from date offset across the full program
- Uploading a new program can incorrectly restore `complete` status from matching workout IDs
- Exercise history is not derived from saved workouts
- Saved workout history is not modeled as true historical sessions

## Principles

- Fix rule correctness before adding polish
- Treat scheduling and state modeling as the foundation for the rest of the app
- Keep upload behavior simple and predictable
- Preserve saved history across uploads
- Keep drafts local to the active scheduled workout
- Add tests around every rule-heavy behavior

## Phase 1: Rebuild Program and Scheduling Model

### Objective

Create a program model that matches the `Program -> Phase -> Week -> Workout Name -> Movement` hierarchy and supports calendar-driven progression.

### Scope

- Add program instance metadata for uploaded programs:
  - `uploadedAt`
  - `programStartDate`
- Implement the scheduling rules:
  - Each week starts on Monday
  - Each week ends on Sunday
  - If upload happens on Monday, week 1 starts that day
  - Otherwise, week 1 starts on the next Monday
  - Weeks advance every Monday even if workouts are incomplete
  - Phases advance successively with no gaps
- Derive the current phase and current week from date offset across the entire program, not from a fixed `activePhaseId`
- Make the program model resilient to repeated workout names across multiple weeks and phases

### Deliverables

- Updated program state shape
- Date utilities for Monday-based scheduling
- Derived selectors for:
  - current phase
  - current week
  - homepage subtitle labels
  - scheduled workout occurrence identity

## Phase 2: Fix CSV Parsing and Program Construction

### Objective

Make CSV upload behavior match the format and interpretation rules in `AGENTS.md`.

### Scope

- Parse `Phase` as the phase number
- Parse `Phase weeks` as the duration of that phase
- Build one phase template per phase number
- Group workouts by `Workout Name` within each phase
- Group movements under each workout using `Block` and `Movement/ Exercise`
- Generate scheduled weeks by repeating the same workout structure for the configured number of weeks in that phase
- Preserve the expected headers:
  - `Phase`
  - `Phase weeks`
  - `Workout Name`
  - `Block`
  - `Movement/ Exercise`
  - `Sets`
  - `Reps`
  - `Tempo`
  - `Rest`
- Strengthen upload validation and user-facing errors

### Deliverables

- Correct CSV parser behavior
- Program builder that produces phase templates plus scheduled week instances
- Better upload validation messages

## Phase 3: Separate Drafts, Active State, and Saved History

### Objective

Make workout status and persistence behavior match the product rules exactly.

### Scope

- Keep drafts stored locally per scheduled workout occurrence
- Keep saved workouts separate from drafts
- Model saved workouts as append-only historical sessions, not a single record keyed only by `workout.id`
- Ensure the first edit to any workout field changes status to `in progress`
- Ensure saving a workout changes status to `complete`
- Ensure simply opening a workout does not change status
- Ensure uploading a new program:
  - replaces the active program
  - clears drafts
  - does not wipe saved workout history
  - does not automatically mark matching workouts as complete
- Remove any status restoration logic that depends only on matching workout IDs

### Deliverables

- Revised draft storage model
- Revised saved history model
- Correct workout status transitions
- Correct upload replacement behavior

## Phase 4: Implement Phase-Specific Exercise History

### Objective

Show real movement history based on saved workouts, scoped to the current phase of the current program.

### Scope

- Derive movement history from saved workout sessions rather than embedded program data
- Match movements by phase-aware workout context plus movement identity
- Filter history to:
  - the current program instance
  - the current phase
- Show all available history for an exercise whenever that exercise is displayed
- Keep the current expandable history UI, but back it with derived data
- Make sure new uploads preserve old history for historical review without contaminating the active program state

### Deliverables

- History selectors/utilities
- Workout screen connected to real saved history
- Clear handling of empty history states

## Phase 5: Update UI Labels and State Mapping

### Objective

Make sure the interface reflects the corrected data model and `AGENTS.md` labels consistently.

### Scope

- Keep homepage heading as `Workout Plan`
- Keep the homepage subtitle as dynamic phase and week labels
- Keep workout cards centered on `Workout Name`
- Keep upload action visually secondary
- Keep workout page heading as `Workout Name`
- Keep week heading as the current week label
- Keep movement heading format as `Block) Movement/ Exercise`
- Keep weight and reps as user-entered only
- Keep programmed reps as placeholder guidance
- Preserve movement title wrapping and stable sets pill layout
- Update any UI text that still reflects old scheduling assumptions

### Deliverables

- UI aligned with corrected scheduling and status data
- No label mismatches against `AGENTS.md`

## Phase 6: Storage Migration and Hardening

### Objective

Prevent existing local data from breaking once the model changes.

### Scope

- Version the stored app state
- Add migration or safe reset behavior for outdated local data
- Ensure old draft/status structures do not corrupt the new scheduling model
- Confirm saved historical sessions remain readable after migration where feasible

### Deliverables

- Updated storage versioning
- Migration or fallback reset strategy
- Safer local persistence behavior

## Phase 7: Test Coverage for Product Rules

### Objective

Add automated confidence around the rules most likely to regress.

### Scope

- CSV parsing tests
- Scheduling tests:
  - upload on Monday
  - upload on non-Monday
  - Monday rollover
  - phase rollover after configured week counts
- Workout status tests:
  - open does not change status
  - first edit sets `in progress`
  - save sets `complete`
- Upload replacement tests:
  - clears drafts
  - preserves saved history
  - does not restore `complete` based on matching IDs
- Exercise history tests:
  - history is phase-specific
  - history is program-instance aware

### Deliverables

- Automated coverage for the core rule set
- Safer refactoring path for future changes

## Recommended Delivery Order

1. Rebuild the scheduling model
2. Fix CSV parsing and program construction
3. Separate drafts, status, and saved history
4. Implement derived phase-specific exercise history
5. Update UI bindings and labels
6. Add storage migration handling
7. Add automated tests and final cleanup

## Acceptance Criteria

The implementation is ready when all of the following are true:

- Uploading a CSV creates a program whose weeks begin on the correct Monday
- The app automatically advances to the next week every Monday
- The app automatically advances phases after the configured number of weeks
- `Phase weeks` controls phase duration rather than the current week label
- A phase repeats the same workouts for its configured week count
- Opening a workout leaves it as `not started`
- Editing any field changes it to `in progress`
- Saving a workout changes it to `complete`
- Uploading a new program clears drafts but preserves saved history
- Uploading a new program does not mark workouts complete because IDs match
- Exercise history shown in the workout screen comes from saved sessions in the current phase of the current program

## Out of Scope for This Plan

- Backend sync
- User accounts
- Export features
- PWA/offline packaging
- Broader analytics and progress dashboards

These can be planned after the rules in `AGENTS.md` are fully implemented and stable.
