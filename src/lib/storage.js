const STORAGE_KEY = 'fitness-tracker-app-state-v2'

export function loadAppState(fallbackState) {
  if (typeof window === 'undefined') {
    return fallbackState
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)

    if (!raw) {
      return fallbackState
    }

    return JSON.parse(raw)
  } catch {
    return fallbackState
  }
}

export function saveAppState(appState) {
  if (typeof window === 'undefined') {
    return
  }

  const nextState = {
    ...appState,
    storage: {
      ...appState.storage,
      lastSavedAt: new Date().toISOString(),
    },
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState))
}
