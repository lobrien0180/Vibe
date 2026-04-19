const DAY_IN_MS = 24 * 60 * 60 * 1000
const DAYS_IN_WEEK = 7

export function createInitialAppState(program) {
  const normalizedProgram = normalizeProgram(program)

  return {
    program: normalizedProgram,
    workoutDrafts: {},
    savedWorkoutSessions: [],
    activeWorkoutStatuses: {},
    storage: {
      mode: 'local-first storage',
      lastSavedAt: null,
    },
  }
}

export function hydrateAppState(appState, fallbackState) {
  if (!appState || typeof appState !== 'object') {
    return fallbackState
  }

  const normalizedProgram = normalizeProgram(appState.program ?? fallbackState.program)

  return {
    ...fallbackState,
    ...appState,
    program: normalizedProgram,
    workoutDrafts: appState.workoutDrafts ?? fallbackState.workoutDrafts ?? {},
    savedWorkoutSessions: normalizeSavedWorkoutSessions(
      appState.savedWorkoutSessions,
      appState.savedWorkouts,
      normalizedProgram,
    ),
    activeWorkoutStatuses: normalizeActiveWorkoutStatuses(
      appState.activeWorkoutStatuses,
      normalizedProgram,
    ),
    storage: {
      ...fallbackState.storage,
      ...appState.storage,
    },
  }
}

export function normalizeProgram(program) {
  const uploadedAt = program.uploadedAt ?? new Date().toISOString()
  const phases = (program.phases ?? []).map((phase, phaseIndex) =>
    normalizePhase(phase, phaseIndex),
  )
  const programId = program.id ?? slugify(program.name ?? 'program')

  return {
    id: programId,
    name: program.name ?? 'Uploaded Program',
    instanceId: program.instanceId ?? createProgramInstanceId(programId, uploadedAt),
    activePhaseId: program.activePhaseId ?? phases[0]?.id ?? null,
    uploadedAt,
    programStartDate: program.programStartDate ?? getProgramStartDate(uploadedAt),
    phases,
  }
}

export function getActivePhase(appState, referenceDate = new Date()) {
  return getCurrentPhase(appState, referenceDate)
}

export function getCurrentPhase(appState, referenceDate = new Date()) {
  return getCurrentScheduleEntry(appState, referenceDate)?.phase ?? null
}

export function getCurrentWeek(appState, referenceDate = new Date()) {
  return getCurrentScheduleEntry(appState, referenceDate)?.week ?? null
}

export function getScheduledWeeksThroughCurrentWeek(appState, referenceDate = new Date()) {
  const schedule = buildProgramSchedule(appState.program, appState.activeWorkoutStatuses)

  if (!schedule.length) {
    return []
  }

  const weekIndex = getElapsedProgramWeekIndex(
    appState.program.programStartDate,
    referenceDate,
    schedule.length,
  )

  return schedule.slice(0, weekIndex + 1)
}

export function getProgramSummary(appState, referenceDate = new Date()) {
  const activePhase = getCurrentPhase(appState, referenceDate)
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

export function getMovementHistory(appState, movement, phaseId) {
  if (!movement || !phaseId) {
    return []
  }

  const historyKey = buildMovementHistoryKey(movement)

  return (appState.savedWorkoutSessions ?? [])
    .filter(
      (session) =>
        session.programInstanceId === appState.program.instanceId &&
        resolveSessionPhaseId(appState.program, session) === phaseId,
    )
    .flatMap((session) => buildMovementHistoryEntries(appState.program, session, historyKey))
    .sort((left, right) => new Date(right.completedAt).getTime() - new Date(left.completedAt).getTime())
}

export function updateWorkoutStatus(state, workoutId, status) {
  const nextStatuses = { ...(state.activeWorkoutStatuses ?? {}) }

  if (status === 'not started') {
    delete nextStatuses[workoutId]
  } else {
    nextStatuses[workoutId] = status
  }

  return {
    ...state,
    activeWorkoutStatuses: nextStatuses,
  }
}

export function replaceProgram(state, nextProgramInput) {
  return {
    ...state,
    program: normalizeProgram(nextProgramInput),
    workoutDrafts: {},
    activeWorkoutStatuses: {},
  }
}

function normalizePhase(phase, phaseIndex) {
  const phaseId = phase.id ?? `phase-${phaseIndex + 1}`
  const weeks = (phase.weeks ?? []).map((week, weekIndex) =>
    normalizeWeek(week, weekIndex, phaseId),
  )

  return {
    id: phaseId,
    name: phase.name ?? `Phase ${phaseIndex + 1}`,
    durationWeeks: getPhaseDurationWeeks(phase, weeks),
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

function getCurrentScheduleEntry(appState, referenceDate) {
  const schedule = buildProgramSchedule(appState.program, appState.activeWorkoutStatuses)

  if (!schedule.length) {
    return null
  }

  const weekIndex = getElapsedProgramWeekIndex(
    appState.program.programStartDate,
    referenceDate,
    schedule.length,
  )

  return schedule[weekIndex] ?? schedule[0]
}

function buildProgramSchedule(program, activeWorkoutStatuses = {}) {
  if (!program?.phases?.length) {
    return []
  }

  const programStartDate = program.programStartDate ?? getProgramStartDate(program.uploadedAt)
  let elapsedWeeks = 0

  return program.phases.flatMap((phase) => {
    const phaseDurationWeeks = getPhaseDurationWeeks(phase, phase.weeks)
    const phaseSchedule = Array.from({ length: phaseDurationWeeks }, (_, phaseWeekIndex) => {
      const templateWeek = getPhaseWeekTemplate(phase, phaseWeekIndex)
      const startDate = formatDateOnly(
        addDays(programStartDate, elapsedWeeks * DAYS_IN_WEEK + phaseWeekIndex * DAYS_IN_WEEK),
      )

      return {
        phase,
        week: {
          ...templateWeek,
          label: `Week ${phaseWeekIndex + 1}`,
          phaseWeekNumber: phaseWeekIndex + 1,
          programWeekNumber: elapsedWeeks + phaseWeekIndex + 1,
          startDate,
          workouts: templateWeek.workouts.map((workout) => ({
            ...workout,
            status: activeWorkoutStatuses[workout.id] ?? workout.status ?? 'not started',
          })),
        },
      }
    })

    elapsedWeeks += phaseDurationWeeks
    return phaseSchedule
  })
}

function getElapsedProgramWeekIndex(programStartDate, referenceDate, totalWeeks) {
  if (!programStartDate) {
    return 0
  }

  const current = startOfDay(referenceDate)
  const start = startOfDay(programStartDate)

  if (current.getTime() <= start.getTime()) {
    return 0
  }

  const elapsedDays = Math.floor((current.getTime() - start.getTime()) / DAY_IN_MS)
  return Math.min(Math.floor(elapsedDays / DAYS_IN_WEEK), totalWeeks - 1)
}

function getProgramStartDate(uploadedAt) {
  const uploadDate = startOfDay(uploadedAt ?? new Date())
  const dayOfWeek = uploadDate.getDay()

  if (dayOfWeek === 1) {
    return formatDateOnly(uploadDate)
  }

  const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek
  return formatDateOnly(addDays(uploadDate, daysUntilMonday))
}

function getPhaseDurationWeeks(phase, weeks = phase.weeks ?? []) {
  const phaseDuration = toPositiveInteger(phase.durationWeeks ?? phase.phaseWeeks)

  if (phaseDuration) {
    return phaseDuration
  }

  const legacyWeekDuration = inferLegacyPhaseDurationWeeks(weeks)

  if (legacyWeekDuration) {
    return legacyWeekDuration
  }

  return Math.max(weeks.length, 1)
}

function getPhaseWeekTemplate(phase, phaseWeekIndex) {
  if (!phase.weeks.length) {
    return normalizeWeek({}, phaseWeekIndex, phase.id)
  }

  return (
    phase.weeks[phaseWeekIndex] ??
    phase.weeks[Math.min(phaseWeekIndex, phase.weeks.length - 1)] ??
    phase.weeks[0]
  )
}

function toPositiveInteger(value) {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function inferLegacyPhaseDurationWeeks(weeks) {
  if (weeks.length !== 1) {
    return null
  }

  return parseWeekNumber(weeks[0]?.label)
}

function parseWeekNumber(value) {
  const match = String(value ?? '').match(/week\s+(\d+)/i)
  return match ? toPositiveInteger(match[1]) : null
}

function normalizeSavedWorkoutSessions(sessions, legacySavedWorkouts, program) {
  if (Array.isArray(sessions)) {
    return sessions.map((session, index) => normalizeSavedWorkoutSession(session, program, index))
  }

  if (!legacySavedWorkouts || typeof legacySavedWorkouts !== 'object') {
    return []
  }

  return Object.values(legacySavedWorkouts).map((session, index) =>
    normalizeSavedWorkoutSession(session, program, index),
  )
}

function normalizeSavedWorkoutSession(session, program, index) {
  const completedAt = session?.completedAt ?? new Date().toISOString()
  const workoutId = session?.workoutId ?? `legacy-workout-${index + 1}`

  return {
    id: session?.id ?? createSavedWorkoutSessionId(workoutId, completedAt, index),
    programId: session?.programId ?? program.id,
    programInstanceId: session?.programInstanceId ?? program.instanceId,
    phaseId: session?.phaseId ?? null,
    phaseName: session?.phaseName ?? null,
    weekId: session?.weekId ?? null,
    weekLabel: session?.weekLabel ?? null,
    workoutId,
    workoutTitle: session?.workoutTitle ?? `Workout ${index + 1}`,
    completedAt,
    movementEntries: session?.movementEntries ?? {},
    movementSnapshots: normalizeMovementSnapshots(session?.movementSnapshots),
  }
}

function normalizeActiveWorkoutStatuses(activeWorkoutStatuses, program) {
  if (activeWorkoutStatuses && typeof activeWorkoutStatuses === 'object') {
    return Object.fromEntries(
      Object.entries(activeWorkoutStatuses).filter(([, status]) => isValidWorkoutStatus(status)),
    )
  }

  return collectLegacyWorkoutStatuses(program)
}

function collectLegacyWorkoutStatuses(program) {
  const statuses = {}

  for (const phase of program.phases ?? []) {
    for (const week of phase.weeks ?? []) {
      for (const workout of week.workouts ?? []) {
        if (isValidWorkoutStatus(workout.status) && workout.status !== 'not started') {
          statuses[workout.id] = workout.status
        }
      }
    }
  }

  return statuses
}

function isValidWorkoutStatus(status) {
  return status === 'not started' || status === 'in progress' || status === 'complete'
}

function createProgramInstanceId(programId, uploadedAt) {
  const safeProgramId = slugify(programId) || 'program'
  const safeTimestamp = String(uploadedAt).replace(/[^0-9]/g, '').slice(0, 14) || Date.now()

  return `${safeProgramId}-${safeTimestamp}`
}

function createSavedWorkoutSessionId(workoutId, completedAt, index = 0) {
  const safeWorkoutId = slugify(workoutId) || `workout-${index + 1}`
  const safeTimestamp = String(completedAt).replace(/[^0-9]/g, '') || Date.now()

  return `${safeWorkoutId}-${safeTimestamp}-${index + 1}`
}

function buildMovementHistoryEntries(program, session, historyKey) {
  const movementRecords = getSessionMovementRecords(program, session)

  return movementRecords
    .filter((record) => record.historyKey === historyKey)
    .map((record, index) => ({
      id: `${session.id}-${record.movementId}-${index + 1}`,
      completedAt: session.completedAt,
      sessionLabel: formatHistorySessionLabel(session),
      summary: session.workoutTitle,
      source: session.phaseName ?? 'Saved workout',
      setSummaries: formatHistorySetSummaries(
        record.entry?.setWeights,
        record.entry?.setReps,
      ),
      notes: formatHistoryNotes(record.entry?.notes),
    }))
}

function getSessionMovementRecords(program, session) {
  const snapshotRecords = Object.entries(session.movementSnapshots ?? {}).map(
    ([movementId, snapshot]) => ({
      movementId,
      historyKey: snapshot.historyKey ?? buildMovementHistoryKey(snapshot),
      entry: session.movementEntries?.[movementId] ?? null,
    }),
  )

  if (snapshotRecords.length) {
    return snapshotRecords
  }

  const workoutContext = findWorkoutContextById(program, session.workoutId)

  if (!workoutContext) {
    return []
  }

  return Object.entries(session.movementEntries ?? {}).map(([movementId, entry]) => {
    const movement = workoutContext.workout.movements.find(
      (candidateMovement) => candidateMovement.id === movementId,
    )

    return {
      movementId,
      historyKey: movement ? buildMovementHistoryKey(movement) : null,
      entry,
    }
  })
}

function resolveSessionPhaseId(program, session) {
  if (session.phaseId) {
    return session.phaseId
  }

  return findWorkoutContextById(program, session.workoutId)?.phase?.id ?? null
}

function findWorkoutContextById(program, workoutId) {
  for (const phase of program.phases ?? []) {
    for (const week of phase.weeks ?? []) {
      const workout = week.workouts.find((candidateWorkout) => candidateWorkout.id === workoutId)

      if (workout) {
        return { phase, week, workout }
      }
    }
  }

  return null
}

function normalizeMovementSnapshots(movementSnapshots) {
  if (!movementSnapshots || typeof movementSnapshots !== 'object') {
    return {}
  }

  return Object.fromEntries(
    Object.entries(movementSnapshots).map(([movementId, snapshot]) => [
      movementId,
      {
        movementId,
        title: snapshot?.title ?? '',
        block: snapshot?.block ?? '',
        historyKey: snapshot?.historyKey ?? buildMovementHistoryKey(snapshot ?? {}),
      },
    ]),
  )
}

function buildMovementHistoryKey(movement) {
  return slugify(movement?.title ?? '')
}

function formatHistorySessionLabel(session) {
  const completedAt = new Date(session.completedAt)
  const formattedDate = Number.isNaN(completedAt.getTime())
    ? 'Saved workout'
    : completedAt.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })

  return session.weekLabel ? `${formattedDate} · ${session.weekLabel}` : formattedDate
}

function formatHistorySetSummaries(weights, reps) {
  const totalSets = Math.max(weights?.length ?? 0, reps?.length ?? 0)
  const setSummaries = []

  for (let index = 0; index < totalSets; index += 1) {
    const weight = String(weights?.[index] ?? '').trim()
    const repCount = String(reps?.[index] ?? '').trim()

    if (weight && repCount) {
      setSummaries.push(`${weight}x${repCount}`)
      continue
    }

    if (weight) {
      setSummaries.push(weight)
      continue
    }

    if (repCount) {
      setSummaries.push(`x${repCount}`)
    }
  }

  return setSummaries.length ? setSummaries : ['No sets logged']
}

function formatHistoryNotes(notes) {
  const normalizedNotes = String(notes ?? '').trim()
  return normalizedNotes || 'No notes recorded.'
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function startOfDay(value) {
  const date =
    value instanceof Date
      ? new Date(value)
      : typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
        ? new Date(`${value}T00:00:00`)
        : new Date(value)

  date.setHours(0, 0, 0, 0)
  return date
}

function addDays(value, days) {
  const date = startOfDay(value)
  date.setDate(date.getDate() + days)
  return date
}

function formatDateOnly(value) {
  const date = startOfDay(value)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}
