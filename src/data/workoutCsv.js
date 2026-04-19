export function parseWorkoutCsv(raw, options = {}) {
  const rows = parseCsvRows(raw)

  if (rows.length < 2) {
    throw new Error('CSV file must include a header row and at least one data row.')
  }

  const headers = rows[0].map((header) => normalizeHeader(header))
  const requiredHeaders = [
    'phase',
    'phase weeks',
    'workout name',
    'block',
    'movement/ exercise',
    'sets',
    'reps',
    'tempo',
    'rest',
  ]

  for (const header of requiredHeaders) {
    if (!headers.includes(header)) {
      throw new Error(`CSV file is missing required column: ${header}`)
    }
  }

  const entries = rows
    .slice(1)
    .filter((row) => row.some((cell) => cell.trim() !== ''))
    .map((row, rowIndex) => {
      const record = Object.fromEntries(
        headers.map((header, index) => [header, row[index]?.trim() ?? '']),
      )

      if (
        !record.phase ||
        !record['phase weeks'] ||
        !record['workout name'] ||
        !record['movement/ exercise']
      ) {
        throw new Error(`CSV row ${rowIndex + 2} is missing a required value.`)
      }

      const durationWeeks = parsePositiveInteger(record['phase weeks'])

      if (!durationWeeks) {
        throw new Error(`CSV row ${rowIndex + 2} has an invalid Phase weeks value.`)
      }

      const sets = parsePositiveInteger(record.sets)

      if (!sets) {
        throw new Error(`CSV row ${rowIndex + 2} has an invalid Sets value.`)
      }

      return {
        ...record,
        durationWeeks,
        sets,
        sourceRow: rowIndex + 2,
      }
    })

  if (!entries.length) {
    throw new Error('CSV file does not contain any workout rows.')
  }

  const phaseMap = new Map()

  for (const entry of entries) {
    const phaseNumber = entry.phase
    const phaseKey = `phase-${phaseNumber}`

    if (!phaseMap.has(phaseKey)) {
      phaseMap.set(phaseKey, {
        id: phaseKey,
        phaseNumber,
        name: `Phase ${phaseNumber}`,
        durationWeeks: entry.durationWeeks,
        workouts: new Map(),
      })
    }

    const phase = phaseMap.get(phaseKey)

    if (phase.durationWeeks !== entry.durationWeeks) {
      throw new Error(
        `Phase ${phaseNumber} has inconsistent Phase weeks values. Check row ${entry.sourceRow}.`,
      )
    }

    const workoutName = entry['workout name']
    const workoutKey = `${phaseKey}-${slugify(workoutName)}`

    if (!phase.workouts.has(workoutKey)) {
      phase.workouts.set(workoutKey, {
        templateKey: workoutKey,
        dayLabel: '',
        title: workoutName,
        status: 'not started',
        durationEstimate: '',
        movements: [],
      })
    }

    const workout = phase.workouts.get(workoutKey)

    workout.movements.push({
      templateKey: `${workoutKey}-movement-${workout.movements.length + 1}`,
      block: entry.block || '',
      title: entry['movement/ exercise'],
      category: '',
      coachNote: '',
      prescription: {
        sets: entry.sets,
        reps: String(entry.reps || ''),
        tempo: entry.tempo || '',
        rest: entry.rest || '',
      },
      previousPerformance: [],
    })
  }

  const phases = Array.from(phaseMap.values())
    .sort((left, right) => comparePhaseNumbers(left.phaseNumber, right.phaseNumber))
    .map((phase) => buildPhase(phase))

  const targetPhaseNumber = String(
    options.activePhaseNumber ?? phases[0]?.name.replace('Phase ', '') ?? '1',
  )
  const activePhaseId =
    phases.find((phase) => phase.name === `Phase ${targetPhaseNumber}`)?.id ?? phases[0]?.id ?? null

  return {
    id: slugify(options.programName ?? options.fileName ?? 'workout-program'),
    name: options.programName ?? stripExtension(options.fileName ?? 'Workout Program'),
    activePhaseId,
    phases,
  }
}

function buildPhase(phase) {
  const workoutTemplates = Array.from(phase.workouts.values())

  return {
    id: phase.id,
    name: phase.name,
    durationWeeks: phase.durationWeeks,
    startDate: null,
    weeks: Array.from({ length: phase.durationWeeks }, (_, weekIndex) =>
      buildWeek(phase, workoutTemplates, weekIndex),
    ),
  }
}

function buildWeek(phase, workoutTemplates, weekIndex) {
  return {
    id: `${phase.id}-week-${weekIndex + 1}`,
    label: `Week ${weekIndex + 1}`,
    startDate: null,
    workouts: workoutTemplates.map((workout, workoutIndex) =>
      buildWorkout(phase, weekIndex, workout, workoutIndex),
    ),
  }
}

function buildWorkout(phase, weekIndex, workout, workoutIndex) {
  const workoutSlug = slugify(workout.title) || `workout-${workoutIndex + 1}`
  const workoutId = `${phase.id}-week-${weekIndex + 1}-${workoutSlug}-${workoutIndex + 1}`

  return {
    id: workoutId,
    dayLabel: workout.dayLabel ?? '',
    title: workout.title,
    status: 'not started',
    durationEstimate: workout.durationEstimate ?? '',
    movements: workout.movements.map((movement, movementIndex) =>
      buildMovement(workoutId, movement, movementIndex),
    ),
  }
}

function buildMovement(workoutId, movement, movementIndex) {
  const movementSlug = slugify(movement.title) || `movement-${movementIndex + 1}`

  return {
    id: `${workoutId}-${movementSlug}-${movementIndex + 1}`,
    block: movement.block || '',
    title: movement.title,
    category: movement.category ?? '',
    coachNote: movement.coachNote ?? '',
    prescription: {
      sets: movement.prescription.sets,
      reps: String(movement.prescription.reps || ''),
      tempo: movement.prescription.tempo || '',
      rest: movement.prescription.rest || '',
    },
    previousPerformance: [],
  }
}

function parseCsvRows(raw) {
  const rows = []
  let currentRow = []
  let currentCell = ''
  let insideQuotes = false

  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index]
    const nextChar = raw[index + 1]

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentCell += '"'
        index += 1
      } else {
        insideQuotes = !insideQuotes
      }
      continue
    }

    if (char === ',' && !insideQuotes) {
      currentRow.push(currentCell)
      currentCell = ''
      continue
    }

    if ((char === '\n' || char === '\r') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        index += 1
      }
      currentRow.push(currentCell)
      rows.push(currentRow)
      currentRow = []
      currentCell = ''
      continue
    }

    currentCell += char
  }

  if (currentCell || currentRow.length) {
    currentRow.push(currentCell)
    rows.push(currentRow)
  }

  return rows
}

function normalizeHeader(value) {
  return String(value).replace(/^\uFEFF/, '').trim().toLowerCase()
}

function parsePositiveInteger(value) {
  const parsed = Number.parseInt(String(value).trim(), 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function comparePhaseNumbers(left, right) {
  return String(left).localeCompare(String(right), undefined, { numeric: true })
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function stripExtension(value) {
  return String(value).replace(/\.[^/.]+$/, '')
}
