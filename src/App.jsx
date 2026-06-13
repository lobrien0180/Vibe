import { useEffect, useState } from 'react'
import './App.css'
import { Badge } from './components/Badge'
import { Button } from './components/Button'
import { Card } from './components/Card'
import { ScreenHeader } from './components/ScreenHeader'
import {
  buildEmptyMovementEntry,
  createInitialAppState,
  getCurrentWeek,
  getMovementHistory,
  getScheduledWeeksThroughCurrentWeek,
  hydrateAppState,
  getProgramSummary,
  getWorkoutById,
  replaceProgram,
  updateWorkoutStatus,
} from './data/models'
import { sampleProgram } from './data/sampleProgram'
import { parseWorkoutCsv } from './data/workoutCsv'
import { loadAppState, saveAppState } from './lib/storage'

const initialState = createInitialAppState(sampleProgram)

function App() {
  const [appState, setAppState] = useState(() =>
    hydrateAppState(loadAppState(initialState), initialState),
  )
  const [currentScreen, setCurrentScreen] = useState('home')
  const [selectedWorkoutId, setSelectedWorkoutId] = useState(null)
  const [uploadState, setUploadState] = useState({
    status: 'idle',
    message: 'Upload a CSV program file to replace the active plan.',
  })

  useEffect(() => {
    saveAppState(appState)
  }, [appState])

  const referenceDate = new Date()
  const { activePhase, phaseLabel, weekLabel } = getProgramSummary(appState, referenceDate)
  const currentWeek = getCurrentWeek(appState, referenceDate)
  const selectedWorkout =
    getWorkoutById(currentWeek, selectedWorkoutId) ?? currentWeek?.workouts[0] ?? null

  function handleOpenWorkout(workoutId) {
    setSelectedWorkoutId(workoutId)
    setCurrentScreen('workout')
  }

  async function handleProgramUpload(event) {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    try {
      const raw = await file.text()
      const parsed = parseWorkoutCsv(raw, { fileName: file.name })

      validateProgramUpload(parsed)

      setAppState((current) => replaceProgram(current, parsed))
      setSelectedWorkoutId(null)
      setCurrentScreen('home')
      setUploadState({
        status: 'success',
        message: `Loaded ${parsed.name ?? 'new program'} from ${file.name}.`,
      })
    } catch (error) {
      setUploadState({
        status: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Unable to read that program file. Please upload valid CSV.',
      })
    } finally {
      event.target.value = ''
    }
  }

  return (
    <div className="app-shell">
      <div className="app-chrome" aria-hidden="true" />

      <main className="app-frame">
        {currentScreen === 'home' ? (
          <HomeScreen
            appState={appState}
            currentWeek={currentWeek}
            phaseLabel={phaseLabel}
            weekLabel={weekLabel}
            referenceDate={referenceDate}
            onOpenWorkout={handleOpenWorkout}
            onOpenUpload={() => setCurrentScreen('upload')}
            onExportWorkouts={() => handleExportWorkouts(appState, referenceDate)}
          />
        ) : currentScreen === 'upload' ? (
          <UploadProgramScreen
            uploadState={uploadState}
            onBack={() => setCurrentScreen('home')}
            onUploadProgram={handleProgramUpload}
          />
        ) : (
          <WorkoutScreen
            key={selectedWorkout?.id ?? 'no-workout'}
            appState={appState}
            activePhase={activePhase}
            currentWeek={currentWeek}
            workout={selectedWorkout}
            onChangeMovementEntry={(movementId, nextEntry) =>
              setAppState((current) =>
                updateMovementEntry(current, selectedWorkout, movementId, nextEntry),
              )
            }
            onSaveWorkout={() => {
              setAppState((current) =>
                saveWorkout(current, selectedWorkout, activePhase, currentWeek),
              )
              setCurrentScreen('home')
            }}
            onBack={() => setCurrentScreen('home')}
          />
        )}
      </main>
    </div>
  )
}

function HomeScreen({
  appState,
  currentWeek,
  phaseLabel,
  weekLabel,
  referenceDate,
  onOpenWorkout,
  onOpenUpload,
  onExportWorkouts,
}) {
  const hasWeeksToExport =
    getScheduledWeeksThroughCurrentWeek(appState, referenceDate).length > 0 &&
    Boolean(currentWeek?.workouts?.length)

  return (
    <>
      <ScreenHeader title="Workout Plan" subtitle={`${phaseLabel} · ${weekLabel}`} />

      <section className="stack">
        <Card title="This Week's Workouts">
          {currentWeek?.workouts?.length ? (
            <div className="workout-list" role="list">
              {currentWeek.workouts.map((workout) => (
                <article className="workout-row" key={workout.id} role="listitem">
                  <div>
                    <h3>{workout.title}</h3>
                  </div>

                  <div className="workout-actions">
                    <Badge variant={getWorkoutStatusVariant(workout.status)}>{workout.status}</Badge>
                    <Button onClick={() => onOpenWorkout(workout.id)}>Open</Button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p>No workouts found for the current week. Upload a program to get started.</p>
            </div>
          )}
        </Card>

        <Button
          className="full-width-button"
          disabled={!hasWeeksToExport}
          variant="slate"
          onClick={onExportWorkouts}
        >
          Export workouts
        </Button>

        <Button className="full-width-button" variant="ghost" onClick={onOpenUpload}>
          Upload new program
        </Button>
      </section>
    </>
  )
}

function UploadProgramScreen({ uploadState, onBack, onUploadProgram }) {
  const sampleUploadUrl = `${import.meta.env.BASE_URL}sample-program-upload.csv`

  return (
    <>
      <ScreenHeader title="Upload Program" subtitle="Replace the active plan with a CSV file" />

      <section className="stack">
        <Card subtitle="Uploading a new file replaces the active program while keeping saved workout history">
          <div className="upload-stack">
            <label className="upload-field">
              <span>Select program file</span>
              <input accept=".csv,text/csv" type="file" onChange={onUploadProgram} />
            </label>
            <p className="upload-helper">
              Need a template? Use{' '}
              <a href={sampleUploadUrl} target="_blank" rel="noreferrer">
                the sample upload file
              </a>
              .
            </p>
            <p className={`upload-message upload-message-${uploadState.status}`}>
              {uploadState.message}
            </p>
          </div>
        </Card>
      </section>

      <div className="sticky-footer sticky-footer-single">
        <Button variant="ghost" onClick={onBack}>
          Back to Home
        </Button>
      </div>
    </>
  )
}

function WorkoutScreen({
  appState,
  activePhase,
  currentWeek,
  workout,
  onBack,
  onChangeMovementEntry,
  onSaveWorkout,
}) {
  const [openHistoryByMovement, setOpenHistoryByMovement] = useState({})

  if (!workout || !currentWeek) {
    return (
      <>
        <ScreenHeader
          eyebrow="Current Workout"
          title="No workout selected"
          subtitle="Pick a workout from the homepage."
        />
        <div className="sticky-footer">
          <Button onClick={onBack}>Back to Home</Button>
        </div>
      </>
    )
  }

  return (
    <>
      <ScreenHeader
        title={workout.title}
        subtitle={currentWeek.label}
        actions={<Badge variant={getWorkoutStatusVariant(workout.status)}>{workout.status}</Badge>}
      />

      <section className="stack">
        <div className="movement-list">
          {workout.movements.map((movement) => {
            const showHistory = Boolean(openHistoryByMovement[movement.id])
            const movementEntry = getMovementEntry(appState, workout, movement)
            const movementHistory = getMovementHistory(appState, movement, activePhase?.id)

            return (
              <Card key={movement.id}>
                <div className="movement-detail">
                  <div className="movement-heading">
                    <div>
                      <h3>
                        {movement.block ? `${movement.block}) ` : ''}
                        {movement.title}
                      </h3>
                      <p className="movement-tempo">Tempo {movement.prescription.tempo}</p>
                    </div>
                    <Badge>Sets {movement.prescription.sets}</Badge>
                  </div>

                  <div className="set-list">
                    {movementEntry.setWeights.map((weight, index) => (
                      <div className="set-row" key={`${movement.id}-set-${index + 1}`}>
                        <div className="set-row-header">
                          <span>Set {index + 1}</span>
                        </div>

                        <div className="set-row-grid">
                          <label className="set-field">
                            <span>Weight</span>
                            <input
                              autoComplete="off"
                              inputMode="decimal"
                              pattern="[0-9]*[.,]?[0-9]*"
                              placeholder="kg"
                              type="text"
                              value={weight}
                              onChange={(event) =>
                                onChangeMovementEntry(movement.id, {
                                  ...movementEntry,
                                  setWeights: movementEntry.setWeights.map(
                                    (currentWeight, setIndex) =>
                                      setIndex === index
                                        ? sanitizeDecimalInput(event.target.value)
                                        : currentWeight,
                                  ),
                                })
                              }
                            />
                          </label>

                          <label className="set-field">
                            <span>Reps</span>
                            <input
                              autoComplete="off"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              placeholder={movement.prescription.reps}
                              type="text"
                              value={movementEntry.setReps[index] ?? ''}
                              onChange={(event) =>
                                onChangeMovementEntry(movement.id, {
                                  ...movementEntry,
                                  setReps: movementEntry.setReps.map((currentReps, setIndex) =>
                                    setIndex === index
                                      ? sanitizeIntegerInput(event.target.value)
                                      : currentReps,
                                  ),
                                })
                              }
                            />
                          </label>

                          <label className="set-field">
                            <span>Rest</span>
                            <RestTimerButton
                              key={movement.prescription.rest}
                              restValue={movement.prescription.rest}
                            />
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>

                  <label className="notes-field">
                    <span>Movement notes</span>
                    <textarea
                      placeholder="How did this movement feel?"
                      rows="3"
                      value={movementEntry.notes}
                      onChange={(event) =>
                        onChangeMovementEntry(movement.id, {
                          ...movementEntry,
                          notes: event.target.value,
                        })
                      }
                    />
                  </label>

                  <button
                    aria-expanded={showHistory}
                    className="history-accordion"
                    type="button"
                    onClick={() =>
                      setOpenHistoryByMovement((current) => ({
                        ...current,
                        [movement.id]: !current[movement.id],
                      }))
                    }
                  >
                    <span>{showHistory ? 'Hide history' : 'Show history'}</span>
                    <span className="history-accordion-icon" aria-hidden="true">
                      {showHistory ? '−' : '+'}
                    </span>
                  </button>

                  {showHistory ? (
                    movementHistory.length ? (
                      <div className="history-list">
                        {movementHistory.map((entry) => (
                          <article className="history-card" key={entry.id}>
                            <div className="history-card-header">
                              <div>
                                <p className="history-date">{entry.sessionLabel}</p>
                                <strong>{entry.summary}</strong>
                              </div>
                              <Badge variant="muted">{entry.source}</Badge>
                            </div>
                            <p className="history-weights">{entry.setSummaries.join('  ')}</p>
                            <p className="history-notes">{entry.notes}</p>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <div className="history-empty">
                        <p>
                          No previous weights or notes yet for this movement in the current
                          phase.
                        </p>
                      </div>
                    )
                  ) : null}
                </div>
              </Card>
            )
          })}
        </div>
      </section>

      <div className="sticky-footer">
        <Button variant="ghost" onClick={onBack}>
          Back to Home
        </Button>
        <Button onClick={onSaveWorkout}>Save Workout</Button>
      </div>
    </>
  )
}

function RestTimerButton({ restValue }) {
  const initialSeconds = parseRestDurationSeconds(restValue)
  const [timer, setTimer] = useState({
    status: 'idle',
    remainingSeconds: initialSeconds ?? 0,
  })
  const canRunTimer = initialSeconds !== null

  useEffect(() => {
    if (timer.status !== 'running') {
      return undefined
    }

    const timeoutId = window.setTimeout(() => {
      setTimer((currentTimer) => {
        if (currentTimer.status !== 'running') {
          return currentTimer
        }

        const nextRemainingSeconds = Math.max(currentTimer.remainingSeconds - 1, 0)

        return {
          status: nextRemainingSeconds === 0 ? 'done' : 'running',
          remainingSeconds: nextRemainingSeconds,
        }
      })
    }, 1000)

    return () => window.clearTimeout(timeoutId)
  }, [timer.status, timer.remainingSeconds])

  function handleTimerClick() {
    if (!canRunTimer) {
      return
    }

    if (timer.status === 'running' || timer.status === 'done') {
      setTimer({
        status: 'idle',
        remainingSeconds: initialSeconds,
      })
      return
    }

    setTimer({
      status: 'running',
      remainingSeconds: initialSeconds,
    })
  }

  const timerLabel =
    timer.status === 'running' || timer.status === 'done'
      ? formatRestDuration(timer.remainingSeconds)
      : String(restValue || 'Rest')

  return (
    <button
      aria-label={`Rest timer ${timerLabel}`}
      className={`rest-timer-button rest-timer-button-${timer.status}`}
      disabled={!canRunTimer}
      type="button"
      onClick={handleTimerClick}
    >
      {timerLabel}
    </button>
  )
}

function getMovementEntry(appState, workout, movement) {
  const draftEntry = appState.workoutDrafts?.[workout.id]?.movementEntries?.[movement.id]
  const savedEntry =
    getLatestSavedWorkoutSession(appState, workout)?.movementEntries?.[movement.id]
  const fallbackEntry = buildEmptyMovementEntry(movement)
  const sourceEntry = draftEntry ?? savedEntry

  if (!sourceEntry) {
    return fallbackEntry
  }

  return {
    ...fallbackEntry,
    ...sourceEntry,
    setWeights: sourceEntry.setWeights ?? fallbackEntry.setWeights,
    setReps: sourceEntry.setReps ?? fallbackEntry.setReps,
  }
}

function updateMovementEntry(state, workout, movementId, nextEntry) {
  const currentDraft = state.workoutDrafts?.[workout.id] ?? {
    workoutId: workout.id,
    movementEntries: {},
  }

  const nextDraft = {
    ...currentDraft,
    updatedAt: new Date().toISOString(),
    movementEntries: {
      ...currentDraft.movementEntries,
      [movementId]: nextEntry,
    },
  }

  return updateWorkoutStatus(
    {
      ...state,
      workoutDrafts: {
        ...state.workoutDrafts,
        [workout.id]: nextDraft,
      },
    },
    workout.id,
    'in progress',
  )
}

function saveWorkout(state, workout, activePhase, currentWeek) {
  const movementEntries = Object.fromEntries(
    workout.movements.map((movement) => [
      movement.id,
      getMovementEntry(state, workout, movement),
    ]),
  )

  const completedAt = new Date().toISOString()
  const savedWorkoutSession = {
    id: createSavedWorkoutSessionId(workout.id, completedAt),
    programId: state.program.id,
    programInstanceId: state.program.instanceId,
    phaseId: activePhase?.id ?? null,
    phaseName: activePhase?.name ?? null,
    weekId: currentWeek?.id ?? null,
    weekLabel: currentWeek?.label ?? null,
    workoutId: workout.id,
    workoutTitle: workout.title,
    completedAt,
    movementEntries,
    movementSnapshots: Object.fromEntries(
      workout.movements.map((movement) => [
        movement.id,
        {
          movementId: movement.id,
          title: movement.title,
          block: movement.block ?? '',
          historyKey: createMovementHistoryKey(movement),
        },
      ]),
    ),
  }

  const nextState = {
    ...state,
    workoutDrafts: Object.fromEntries(
      Object.entries(state.workoutDrafts ?? {}).filter(([workoutId]) => workoutId !== workout.id),
    ),
    savedWorkoutSessions: [...(state.savedWorkoutSessions ?? []), savedWorkoutSession],
  }

  return updateWorkoutStatus(nextState, workout.id, 'complete')
}

function getLatestSavedWorkoutSession(appState, workout) {
  const savedSessions = (appState.savedWorkoutSessions ?? []).filter(
    (session) =>
      session.programInstanceId === appState.program.instanceId && session.workoutId === workout.id,
  )

  if (!savedSessions.length) {
    return null
  }

  return savedSessions.reduce((latestSession, currentSession) =>
    new Date(currentSession.completedAt).getTime() > new Date(latestSession.completedAt).getTime()
      ? currentSession
      : latestSession,
  )
}

function createSavedWorkoutSessionId(workoutId, completedAt) {
  const safeWorkoutId = String(workoutId)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  const safeTimestamp = completedAt.replace(/[^0-9]/g, '')

  return `${safeWorkoutId || 'workout'}-${safeTimestamp}-${Date.now()}`
}

function createMovementHistoryKey(movement) {
  return String(movement?.title ?? '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function sanitizeDecimalInput(value) {
  const normalized = value.replace(',', '.').replace(/[^0-9.]/g, '')
  const [whole = '', ...rest] = normalized.split('.')

  return rest.length ? `${whole}.${rest.join('')}` : whole
}

function sanitizeIntegerInput(value) {
  return value.replace(/\D/g, '')
}

function parseRestDurationSeconds(value) {
  const restValue = String(value ?? '').trim().toLowerCase()

  if (!restValue) {
    return null
  }

  const clockMatch = restValue.match(/^(\d+):([0-5]?\d)$/)

  if (clockMatch) {
    return Number(clockMatch[1]) * 60 + Number(clockMatch[2])
  }

  const minutesMatch = restValue.match(/^(\d+(?:\.\d+)?)\s*(m|min|mins|minute|minutes)$/)

  if (minutesMatch) {
    return Math.round(Number(minutesMatch[1]) * 60)
  }

  const secondsMatch = restValue.match(/^(\d+(?:\.\d+)?)\s*(s|sec|secs|second|seconds)$/)

  if (secondsMatch) {
    return Math.round(Number(secondsMatch[1]))
  }

  const numericSeconds = Number(restValue)

  return Number.isFinite(numericSeconds) && numericSeconds >= 0 ? Math.round(numericSeconds) : null
}

function formatRestDuration(totalSeconds) {
  const safeSeconds = Math.max(0, Number(totalSeconds) || 0)
  const minutes = Math.floor(safeSeconds / 60)
  const seconds = String(safeSeconds % 60).padStart(2, '0')

  return `${minutes}:${seconds}`
}

function getWorkoutStatusVariant(status) {
  if (status === 'complete') {
    return 'success'
  }

  if (status === 'in progress') {
    return 'default'
  }

  return 'muted'
}

function handleExportWorkouts(appState, referenceDate) {
  const rows = buildWorkoutExportRows(appState, referenceDate)

  if (!rows.length || typeof window === 'undefined') {
    return
  }

  const csv = toCsv([
    [
      'Program',
      'Phase',
      'Week',
      'Workout Name',
      'Workout Status',
      'Completed At',
      'Block',
      'Movement/ Exercise',
      'Sets',
      'Programmed Reps',
      'Tempo',
      'Rest',
      'Logged Weights',
      'Logged Reps',
      'Movement Notes',
    ],
    ...rows,
  ])

  const fileName = createWorkoutExportFileName(appState.program.name, referenceDate)
  downloadCsvFile(csv, fileName)
}

function buildWorkoutExportRows(appState, referenceDate) {
  return getScheduledWeeksThroughCurrentWeek(appState, referenceDate).flatMap(({ phase, week }) =>
    week.workouts.flatMap((workout) => {
      const savedSession = getLatestSavedWorkoutSession(appState, workout)

      return workout.movements.map((movement) => {
        const movementEntry = savedSession?.movementEntries?.[movement.id]

        return [
          appState.program.name,
          phase.name,
          week.label,
          workout.title,
          workout.status,
          savedSession?.completedAt ?? '',
          movement.block ?? '',
          movement.title,
          String(movement.prescription.sets),
          movement.prescription.reps,
          movement.prescription.tempo,
          movement.prescription.rest,
          formatExportSetValues(movementEntry?.setWeights),
          formatExportSetValues(movementEntry?.setReps),
          String(movementEntry?.notes ?? '').trim(),
        ]
      })
    }),
  )
}

function formatExportSetValues(values) {
  return (values ?? [])
    .map((value) => String(value ?? '').trim())
    .filter(Boolean)
    .join(' | ')
}

function toCsv(rows) {
  return rows
    .map((row) =>
      row
        .map((value) => {
          const normalized = String(value ?? '')
          const escaped = normalized.replace(/"/g, '""')
          return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped
        })
        .join(','),
    )
    .join('\n')
}

function createWorkoutExportFileName(programName, referenceDate) {
  const safeProgramName = String(programName ?? 'workouts')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  const date = new Date(referenceDate)
  const formattedDate = Number.isNaN(date.getTime())
    ? new Date().toISOString().slice(0, 10)
    : date.toISOString().slice(0, 10)

  return `${safeProgramName || 'workouts'}-through-${formattedDate}.csv`
}

function downloadCsvFile(csv, fileName) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = window.URL.createObjectURL(blob)
  const link = window.document.createElement('a')

  link.href = url
  link.download = fileName
  link.style.display = 'none'
  window.document.body.append(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

function validateProgramUpload(program) {
  if (!program || typeof program !== 'object') {
    throw new Error('That file does not contain a valid program object.')
  }

  if (!Array.isArray(program.phases) || program.phases.length === 0) {
    throw new Error('Uploaded program must include at least one phase.')
  }

  const hasAtLeastOneWeek = program.phases.some(
    (phase) => Array.isArray(phase.weeks) && phase.weeks.length > 0,
  )

  if (!hasAtLeastOneWeek) {
    throw new Error('Uploaded program must include at least one week.')
  }
}

export default App
