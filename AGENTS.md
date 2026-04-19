# App Rules

## Purpose

This file is the product rule reference for the fitness tracking app. Future implementation should follow these rules unless they are explicitly changed.

## Current Scope

- The app currently has:
  - A homepage
  - A workout detail page
  - A separate upload program page
- The app is mobile-first.
- CSV is the intended upload format.

## Program Hierarchy

The hierarchy is:

- Program
- Phase
- Week
- Workout Name
- Movement

Interpretation:

- A program can have 1 or more phases.
- A phase can run for 1 or more weeks.
- A week can have 1 or more workout names.
- A workout name can have 1 or more movements.

Examples:

- `Phase 1`
- `Week 2`
- `Upper 2`
- `DB One Arm Row`

## Scheduling Rules

- Each week starts on Monday.
- Each week ends on Sunday.
- When a new program is uploaded:
  - If uploaded on a Monday, week 1 starts that day.
  - Otherwise, week 1 starts on the first Monday after upload.
- Each week is successive with no gap or pause.
- Each phase is successive with no gap or pause.
- The current phase and week are determined by calculating the date offset from the start of the program.
- The app must move to the subsequent week every Monday, even if all workouts from the previous week are still incomplete.

## Phase Rules

- `Phase` indicates the phase number.
  - Example: `1` becomes `Phase 1`
- `Phase weeks` indicates how many weeks that phase runs for.
  - Example: `4` means the phase runs for 4 weeks.
- `Phase weeks` is not the current active week number.
- A phase repeats the same set of workout names and movements for its configured number of weeks.

## Workout Status Rules

These are the workout statuses currently in use:

- `not started`
- `in progress`
- `complete`

Status behavior:

- A workout starts as `not started`.
- Simply opening a workout does not change its status.
- The first edit to any workout field changes the workout to `in progress`.
- Saving a workout changes the workout to `complete`.
- Workout status belongs to each workout name.

Important rule:

- Uploading a new program must not restore `complete` status just because workout IDs happen to match.

## Draft and Save Rules

- Draft edits are stored locally per workout.
- Saved workouts are stored separately from drafts.
- Uploading a new program replaces the active program.
- Uploading a new program clears drafts.
- Uploading a new program should not wipe saved workout history.
- Saved workout history should remain available for historical review, but should not automatically mark matching workouts as complete in a newly uploaded program.

## Exercise History Rules

- Any time an exercise is shown, the user should be able to see all history for that exercise within the current phase of the current program.
- Exercise history should be phase-specific, not global across unrelated programs/phases unless that rule is explicitly changed later.

## Upload Status Rules

These are separate from workout statuses and only apply to the upload screen:

- `idle`
- `success`
- `error`

## CSV Mapping Rules

The upload format is based on the structure in [Workout_Test_2.csv](/Users/laurenobrien/Documents/Vibe/Workout_Test_2.csv:1).

CSV headers currently expected:

- `Phase`
- `Phase weeks`
- `Workout Name`
- `Block`
- `Movement/ Exercise`
- `Sets`
- `Reps`
- `Tempo`
- `Rest`

## UI Mapping Rules

Homepage:

- Main heading: `Workout Plan`
- Subtitle: dynamic phase and week labels
- Workout card label: `Workout Name`
- Secondary action: `Upload new program`

Workout page:

- Workout heading: `Workout Name`
- Week heading: current week label
- Movement heading format: `Block) Movement/ Exercise`
  - Example: `A) BB Low Bar Squat`
- Sets badge/pill: `Sets`
- Tempo label: `Tempo`
- Rest field: `Rest`
- Weight field: user-entered only
- Reps field: user-entered only
- Movement notes: user-entered only

## Reps and Weight Input Rules

- `Weight` is blank by default.
- `Weight` accepts numeric input only.
- `Weight` should trigger the decimal keyboard on iOS.
- `Reps` should show the programmed reps as placeholder text.
- `Reps` should validate user input as numeric only.
- Programmed reps from CSV may contain non-numeric guidance such as:
  - `5,4,3`
  - `6-8`
  - `MAX`
  - `30sec`
- Those CSV values are guidance/display values, not strict user-entered values.

## Movement Display Rules

- Do not show `primary` / `accessory` headings in the workout UI.
- Use the CSV `Block` value instead.
- The movement title should wrap if long.
- The sets pill should keep a consistent shape and not stretch because of long headings.

## Upload Screen Rules

- The homepage should not contain the full upload form.
- The homepage should only have an `Upload new program` button.
- That button should navigate to a separate upload page.
- The upload page contains the upload form and sample CSV link.
- The upload button on the homepage should be visually secondary, not a primary CTA.

## Source of Truth Notes

- If future implementation and this file disagree, prefer this file until the product rule is explicitly changed.
- If CSV structure changes, update this file alongside the parser and UI mapping.
- If scheduling logic changes, update this file alongside the date-calculation logic.
