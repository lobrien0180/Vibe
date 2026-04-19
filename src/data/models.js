const DAY_IN_MS = 24 * 60 * 60 * 1000

export function createInitialAppState(program) {
  const normalizedProgram = normalizeProgram(program)

  return {
    program: normalizedProgram,
    workoutDrafts: {},
    savedWorkouts: {},
    storage: {
      mode: 'local-first storage',
      lastSavedAt: null,
    },
  }
}

export function normalizeProgram(program) {
  const phases = (program.phases ?? []).map((phase, phaseIndex) => normalizePhase(phase, phaseIndex))
  const activePhaseId = program.activePhaseId ?? phases[0]?.id ?? null

  return {
    id: program.id ?? slugify(program.name ?? 'program'),
    name: program.name ?? 'Uploaded Program',
    activePhaseId,
    phases,
  }
}

export function getActivePhase(appState) {
  return (
    appState.program.phases.find((phase) => phase.id === appState.program.activePhaseId) ??
    appState.program.phases[0] ??
    null
  )
}

export function getCurrentWeek(appState, referenceDate = new Date()) {
  const activePhase = getActivePhase(appState)

  if (!activePhase) {
    return null
  }

  return getCurrentWeekForPhase(activePhase, referenceDate)
}

export function getProgramSummary(appState, referenceDate = new Date()) {
  const activePhase = getActivePhase(appState)
  const currentWeek = getCurrentWeek(appState, referenceDate)

  return {
    activePhase,
    currentWeek,
    phaseLabel: activePhase?.name ?? 'No phase',
    weekLabel: currentWeek?.label ?? 'No week',
  }
}

export function getWorkoutById(week, workoutId) {
  return week?.workouts.find((workout) => workout.id === workoutId) ?? null
}

export function buildEmptyMovementEntry(movement) {
  return {
    setWeights: Array.from({ length: movement.prescription.sets }, () => ''),
    setReps: Array.from({ length: movement.prescription.sets }, () => ''),
    notes: '',
  }
}

export function updateWorkoutStatus(state, workoutId, status) {
  const nextProgram = {
    ...state.program,
    phases: state.program.phases.map((phase) => ({
      ...phase,
      weeks: phase.weeks.map((week) => ({
        ...week,
        workouts: week.workouts.map((workout) =>
          workout.id === workoutId ? { ...workout, status } : workout,
        ),
      })),
    })),
  }

  return {
    ...state,
    program: nextProgram,
  }
}

export function replaceProgram(state, nextProgramInput) {
  const nextProgram = applySavedWorkoutStatuses(
    normalizeProgram(nextProgramInput),
    state.savedWorkouts ?? {},
  )

  return {
    ...state,
    program: nextProgram,
    workoutDrafts: {},
  }
}

function normalizePhase(phase, phaseIndex) {
  const weeks = (phase.weeks ?? []).map((week, weekIndex) =>
    normalizeWeek(week, weekIndex, phase.id ?? `phase-${phaseIndex + 1}`),
  )

  return {
    id: phase.id ?? `phase-${phaseIndex + 1}`,
    name: phase.name ?? `Phase ${phaseIndex + 1}`,
    startDate: phase.startDate ?? weeks[0]?.startDate ?? null,
    weeks,
  }
}

function normalizeWeek(week, weekIndex, phaseId) {
  return {
    id: week.id ?? `${phaseId}-week-${weekIndex + 1}`,
    label: week.label ?? `Week ${weekIndex + 1}`,
    startDate: week.startDate ?? null,
    workouts: (week.workouts ?? []).map((workout, workoutIndex) =>
      normalizeWorkout(workout, workoutIndex, phaseId, weekIndex),
    ),
  }
}

function normalizeWorkout(workout, workoutIndex, phaseId, weekIndex) {
  return {
    id: workout.id ?? `${phaseId}-week-${weekIndex + 1}-workout-${workoutIndex + 1}`,
    dayLabel: workout.dayLabel ?? '',
    title: workout.title ?? `Workout ${workoutIndex + 1}`,
    status: workout.status ?? 'not started',
    durationEstimate: workout.durationEstimate ?? '',
    movements: (workout.movements ?? []).map((movement, movementIndex) =>
      normalizeMovement(movement, movementIndex, workout.id ?? workout.title ?? 'movement'),
    ),
  }
}

function normalizeMovement(movement, movementIndex, workoutKey) {
  return {
    id: movement.id ?? `${slugify(workoutKey)}-movement-${movementIndex + 1}`,
    block: movement.block ?? '',
    title: movement.title ?? `Movement ${movementIndex + 1}`,
    category: movement.category ?? 'Movement',
    coachNote: movement.coachNote ?? '',
    prescription: {
      sets: Number(movement.prescription?.sets ?? 1),
      reps: String(movement.prescription?.reps ?? ''),
      tempo: movement.prescription?.tempo ?? '',
      rest: movement.prescription?.rest ?? '',
    },
    previousPerformance: movement.previousPerformance ?? [],
  }
}

function getCurrentWeekForPhase(phase, referenceDate) {
  if (!phase.weeks.length) {
    return null
  }

  const datedWeeks = phase.weeks.filter((week) => week.startDate)

  if (datedWeeks.length === phase.weeks.length) {
    const currentTime = startOfDay(referenceDate).getTime()
    let selectedWeek = phase.weeks[0]

    for (const week of phase.weeks) {
      const weekTime = startOfDay(week.startDate).getTime()

      if (currentTime >= weekTime) {
        selectedWeek = week
      }
    }

    return selectedWeek
  }

  if (!phase.startDate && !phase.weeks[0]?.startDate) {
    return phase.weeks[0]
  }

  const anchor = startOfDay(phase.startDate ?? phase.weeks[0].startDate)
  const current = startOfDay(referenceDate)
  const elapsedDays = Math.max(0, Math.floor((current.getTime() - anchor.getTime()) / DAY_IN_MS))
  const weekIndex = Math.min(Math.floor(elapsedDays / 7), phase.weeks.length - 1)

  return phase.weeks[weekIndex]
}

function applySavedWorkoutStatuses(program, savedWorkouts) {
  return {
    ...program,
    phases: program.phases.map((phase) => ({
      ...phase,
      weeks: phase.weeks.map((week) => ({
        ...week,
        workouts: week.workouts.map((workout) => ({
          ...workout,
          status: savedWorkouts[workout.id] ? 'complete' : workout.status,
        })),
      })),
    })),
  }
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function startOfDay(value) {
  const date = value instanceof Date ? new Date(value) : new Date(`${value}T00:00:00`)

  date.setHours(0, 0, 0, 0)
  return date
}
