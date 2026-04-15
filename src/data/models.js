/**
 * Create the app state from a program seed.
 */
export function createInitialAppState(program) {
  const activePhase = program.phases.find((phase) => phase.id === program.activePhaseId)
  const currentWeek = activePhase?.weeks[0]

  return {
    program,
    activePhase,
    currentWeek,
    workoutDrafts: {},
    savedWorkouts: {},
    storage: {
      mode: 'local-first storage',
      lastSavedAt: null,
    },
  }
}

export function getCurrentWeek(appState) {
  return appState.currentWeek
}

export function getWorkoutById(week, workoutId) {
  return week.workouts.find((workout) => workout.id === workoutId)
}

export function buildEmptyMovementEntry(movement) {
  return {
    setWeights: Array.from({ length: movement.prescription.sets }, () => ''),
    setReps: Array.from({ length: movement.prescription.sets }, () => movement.prescription.reps),
    notes: '',
  }
}

export function updateWorkoutStatus(state, workoutId, status) {
  const updateWorkout = (workout) =>
    workout.id === workoutId ? { ...workout, status } : workout

  const nextCurrentWeek = {
    ...state.currentWeek,
    workouts: state.currentWeek.workouts.map(updateWorkout),
  }

  const nextActivePhase = {
    ...state.activePhase,
    weeks: state.activePhase.weeks.map((week) =>
      week.id === nextCurrentWeek.id
        ? { ...week, workouts: week.workouts.map(updateWorkout) }
        : week,
    ),
  }

  const nextProgram = {
    ...state.program,
    phases: state.program.phases.map((phase) =>
      phase.id === nextActivePhase.id ? nextActivePhase : phase,
    ),
  }

  return {
    ...state,
    program: nextProgram,
    activePhase: nextActivePhase,
    currentWeek: nextCurrentWeek,
  }
}
