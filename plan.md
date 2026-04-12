# Fitness Tracking App Implementation Plan

## Goal

Build a simple fitness tracking app focused on completing the current week's workouts, recording weights and notes during a session, and managing a rolling weekly program with a lightweight mobile-friendly UI.

## Guiding Principles

- Start with the smallest usable workflow: view this week's workouts, open a workout, record results, and save it.
- Keep the initial product to 2 screens: `Homepage` and `Current Workout`.
- Prioritize large tap targets, basic cards, and the requested light grey / bright pink visual style.
- Treat program uploads as a full replacement of the active program data.
- Design the data model early so weekly rollover, history, and future export work can be added without rework.

## Phase 1: Foundations and App Skeleton

### Objective

Create the app shell, navigation model, and base data structures needed for all later phases.

### Scope

- Define the core entities:
  - Program
  - Program phase
  - Week
  - Workout
  - Movement
  - Movement prescription details: sets, reps, tempo
  - Logged set: weight and notes
  - Saved workout session
- Set up the 2-screen structure:
  - Homepage showing current week workouts
  - Current Workout screen for viewing and logging a selected workout
- Create a simple design system:
  - Light grey background
  - Bright pink accent color
  - Card-based layout
  - Large buttons and touch-friendly spacing
- Decide storage approach for MVP:
  - Local persistence first is fastest for MVP
  - Keep the data layer abstract so a backend can be added later

### Deliverables

- Working app shell
- Reusable UI components
- Data schema / TypeScript interfaces or equivalent models
- Persistence strategy selected and wired in

## Phase 2: MVP Workout Viewing

### Objective

Enable users to see the current week's workouts and inspect workout structure without starting the workout flow.

### Scope

- Homepage shows all workouts for the current week
- Each workout shows its completion status
- Users can open a workout and review all movements
- Movement list shows titles only on the main workout overview
- Users can exit a workout and return to the homepage without saving progress
- Add support for viewing detailed movement info when selected:
  - Number of sets
  - Number of reps
  - Tempo
- Previous weights and notes for the current program phase are available on demand and hidden by default until selected

### Deliverables

- Current week homepage
- Workout detail screen
- Expandable or selectable movement detail view
- Completion status display

## Phase 3: MVP Workout Logging

### Objective

Allow users to complete a workout and save results.

### Scope

- Add weight entry for each set of a movement
- Add notes entry for each movement
- Save the workout when finished
- Mark workout status as complete once saved
- Preserve saved workout results for later viewing
- Handle partial progress safely during an in-progress workout session

### Deliverables

- Full workout logging flow
- Saved workout records
- Complete / incomplete workout states

## Phase 4: Program Upload and Weekly Scheduling

### Objective

Support loading a training program and generating the active training week structure.

### Scope

- Build file upload flow for program / program phase data
- Uploaded program replaces all previous active program data
- Generate workouts for the current week from the uploaded program
- Implement week rollover logic so each week's workouts roll into the next week
- Ensure saved workouts remain historically accessible even if active program data changes

### Deliverables

- Program upload feature
- Program replacement logic
- Weekly workout generation
- Automatic week rollover rules

## Phase 5: History and Progress Context

### Objective

Make the app more useful for repeat training by surfacing prior performance context.

### Scope

- Show previous weights and notes for the current program phase in a cleaner history view
- Add saved workout review flow from earlier sessions
- Improve progression context for each movement so users can compare current and prior performance
- Add filters or grouping by week / workout if needed

### Deliverables

- Workout history access
- Previous performance context
- Better review experience for saved sessions

## Phase 6: Nice-to-Haves and Hardening

### Objective

Finish lower-priority features and prepare the app for broader use.

### Scope

- Export saved workouts
- Improve validation and empty states
- Add loading, error, and success feedback
- Improve accessibility:
  - Button size
  - Contrast
  - Screen reader labels
- Add tests for critical flows:
  - Upload program
  - View current week
  - Log workout
  - Save workout
  - Week rollover

### Deliverables

- Export capability
- Stronger UX polish
- Basic automated test coverage

## Suggested Delivery Order

1. Phase 1: foundations
2. Phase 2: workout viewing MVP
3. Phase 3: workout logging MVP
4. Phase 4: program upload and weekly generation
5. Phase 5: history and progress context
6. Phase 6: export and hardening

## MVP Definition

The MVP should include:

- Homepage with all workouts for the current week
- Workout titles and completion status
- Ability to open and review a workout
- Movement detail view with sets, reps, and tempo
- Weight logging per set
- Notes per movement
- Save completed workout
- Program upload that replaces existing program data
- Program-generated workouts for the current week
- Weekly rollover to the next week

## Risks and Decisions to Confirm Later

- File format for uploaded programs: CSV, JSON, or spreadsheet import
- Whether workout progress should autosave before final completion
- Whether history should be stored locally or synced to a backend
- How to define weekly rollover timing: calendar week, training week, or user-controlled reset
- Whether workout edits are allowed after a workout is marked complete
