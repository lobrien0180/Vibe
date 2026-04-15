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
  getWorkoutById,
  updateWorkoutStatus,
} from './data/models'
import { sampleProgram } from './data/sampleProgram'
import { loadAppState, saveAppState } from './lib/storage'

const initialState = createInitialAppState(sampleProgram)

function App() {
  const [appState, setAppState] = useState(() => loadAppState(initialState))
  const [currentScreen, setCurrentScreen] = useState('home')
  const [selectedWorkoutId, setSelectedWorkoutId] = useState(null)

  useEffect(() => {
    saveAppState(appState)
  }, [appState])

  const currentWeek = getCurrentWeek(appState)
  const selectedWorkout =
    getWorkoutById(currentWeek, selectedWorkoutId) ?? currentWeek.workouts[0] ?? null

  function handleOpenWorkout(workoutId) {
    setSelectedWorkoutId(workoutId)
    setCurrentScreen('workout')
  }

  return (
    <div className="app-shell">
      <div className="app-chrome" aria-hidden="true" />

      <main className="app-frame">
        {currentScreen === 'home' ? (
          <HomeScreen currentWeek={currentWeek} onOpenWorkout={handleOpenWorkout} />
        ) : (
          <WorkoutScreen
            key={selectedWorkout?.id ?? 'no-workout'}
            appState={appState}
            currentWeek={currentWeek}
            workout={selectedWorkout}
            onChangeMovementEntry={(movementId, nextEntry) =>
              setAppState((current) =>
                updateMovementEntry(current, selectedWorkout, movementId, nextEntry),
              )
            }
            onSaveWorkout={() => {
              setAppState((current) => saveWorkout(current, selectedWorkout))
              setCurrentScreen('home')
            }}
            onBack={() => setCurrentScreen('home')}
          />
        )}
      </main>
    </div>
  )
}

function HomeScreen({ currentWeek, onOpenWorkout }) {
  return (
    <>
      <ScreenHeader title="Workout Plan" subtitle="Phase 3 · Week 3" />

      <section className="stack">
        <Card title="This Week's Workouts">
          <div className="workout-list" role="list">
            {currentWeek.workouts.map((workout) => (
              <article className="workout-row" key={workout.id} role="listitem">
                <div>
                  <h3>{workout.title}</h3>
                </div>

                <div className="workout-actions">
                  <Badge variant={workout.status === 'complete' ? 'success' : 'muted'}>
                    {workout.status}
                  </Badge>
                  <Button onClick={() => onOpenWorkout(workout.id)}>
                    {workout.status === 'complete' ? 'Review' : 'Open'}
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </Card>
      </section>
    </>
  )
}

function WorkoutScreen({
  appState,
  currentWeek,
  workout,
  onBack,
  onChangeMovementEntry,
  onSaveWorkout,
}) {
  const [openHistoryByMovement, setOpenHistoryByMovement] = useState({})

  if (!workout) {
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
        eyebrow={currentWeek.label}
        title={workout.title}
        actions={<Badge variant="muted">{workout.status}</Badge>}
      />

      <section className="stack">
        <div className="movement-list">
          {workout.movements.map((movement) => {
            const showHistory = Boolean(openHistoryByMovement[movement.id])
            const movementEntry = getMovementEntry(appState, workout, movement)

            return (
              <Card key={movement.id}>
                <div className="movement-detail">
                  <div className="movement-heading">
                    <div>
                      <p className="movement-category">{movement.category}</p>
                      <h3>{movement.title}</h3>
                      <p className="movement-tempo">Tempo {movement.prescription.tempo}</p>
                    </div>
                    <Badge>{movement.prescription.sets} sets</Badge>
                  </div>

                  <div className="set-list">
                    {movementEntry.setWeights.map((weight, index) => (
                      <div className="set-row" key={`${movement.id}-set-${index + 1}`}>
                        <div className="set-row-header">
                          <span>Set {index + 1}</span>
                        </div>

                        <div className="set-row-grid">
                          <label className="set-field">
                            <span>Rest</span>
                            <input readOnly type="text" value={movement.prescription.rest} />
                          </label>

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
                              type="text"
                              value={movementEntry.setReps[index] ?? movement.prescription.reps}
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
                    movement.previousPerformance?.length ? (
                      <div className="history-list">
                        {movement.previousPerformance.map((entry) => (
                          <article className="history-card" key={entry.id}>
                            <div className="history-card-header">
                              <div>
                                <p className="history-date">{entry.sessionLabel}</p>
                                <strong>{entry.summary}</strong>
                              </div>
                              <Badge variant="muted">{entry.source}</Badge>
                            </div>
                            <p className="history-weights">{entry.weights.join(' · ')}</p>
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

function getMovementEntry(appState, workout, movement) {
  const draftEntry = appState.workoutDrafts?.[workout.id]?.movementEntries?.[movement.id]
  const savedEntry = appState.savedWorkouts?.[workout.id]?.movementEntries?.[movement.id]
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

function saveWorkout(state, workout) {
  const movementEntries = Object.fromEntries(
    workout.movements.map((movement) => [
      movement.id,
      getMovementEntry(state, workout, movement),
    ]),
  )

  const completedAt = new Date().toISOString()
  const savedWorkout = {
    workoutId: workout.id,
    workoutTitle: workout.title,
    completedAt,
    movementEntries,
  }

  const nextState = {
    ...state,
    workoutDrafts: Object.fromEntries(
      Object.entries(state.workoutDrafts ?? {}).filter(([workoutId]) => workoutId !== workout.id),
    ),
    savedWorkouts: {
      ...state.savedWorkouts,
      [workout.id]: savedWorkout,
    },
  }

  return updateWorkoutStatus(nextState, workout.id, 'complete')
}

function sanitizeDecimalInput(value) {
  const normalized = value.replace(',', '.').replace(/[^0-9.]/g, '')
  const [whole = '', ...rest] = normalized.split('.')

  return rest.length ? `${whole}.${rest.join('')}` : whole
}

function sanitizeIntegerInput(value) {
  return value.replace(/\D/g, '')
}

export default App
