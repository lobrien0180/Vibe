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

      if (!record.phase || !record['phase weeks'] || !record['workout name'] || !record['movement/ exercise']) {
        throw new Error(`CSV row ${rowIndex + 2} is missing a required value.`)
      }

      return record
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
        weeks: new Map(),
      })
    }

    const phase = phaseMap.get(phaseKey)
    const weekNumber = entry['phase weeks']
    const weekKey = `${phaseKey}-week-${weekNumber}`

    if (!phase.weeks.has(weekKey)) {
      phase.weeks.set(weekKey, {
        id: weekKey,
        label: `Week ${weekNumber}`,
        workouts: new Map(),
      })
    }

    const week = phase.weeks.get(weekKey)
    const workoutName = entry['workout name']
    const workoutKey = `${weekKey}-${slugify(workoutName)}`

    if (!week.workouts.has(workoutKey)) {
      week.workouts.set(workoutKey, {
        id: workoutKey,
        dayLabel: '',
        title: workoutName,
        status: 'not started',
        durationEstimate: '',
        movements: [],
      })
    }

    const workout = week.workouts.get(workoutKey)

    workout.movements.push({
      id: `${workoutKey}-${slugify(entry['movement/ exercise'])}`,
      block: entry.block || '',
      title: entry['movement/ exercise'],
      category: '',
      coachNote: '',
      prescription: {
        sets: Number(entry.sets || 1),
        reps: String(entry.reps || ''),
        tempo: entry.tempo || '',
        rest: entry.rest || '',
      },
      previousPerformance: [],
    })
  }

  const phases = Array.from(phaseMap.values())
    .sort((left, right) => Number(left.phaseNumber) - Number(right.phaseNumber))
    .map((phase) => ({
      id: phase.id,
      name: phase.name,
      startDate: null,
      weeks: Array.from(phase.weeks.values()).map((week) => ({
        id: week.id,
        label: week.label,
        startDate: null,
        workouts: Array.from(week.workouts.values()),
      })),
    }))

  const targetPhaseNumber = String(options.activePhaseNumber ?? phases[0]?.name.replace('Phase ', '') ?? '1')
  const activePhaseId =
    phases.find((phase) => phase.name === `Phase ${targetPhaseNumber}`)?.id ?? phases[0]?.id ?? null

  return {
    id: slugify(options.programName ?? options.fileName ?? 'workout-program'),
    name: options.programName ?? stripExtension(options.fileName ?? 'Workout Program'),
    activePhaseId,
    phases,
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
