import type { StoreApi } from 'zustand'

type SqlitePersistOptions<T extends object> = {
  name: string
  debounceMs?: number
  serialize?: (state: T) => unknown
  restore?: (persisted: unknown, currentState: T) => Partial<T>
  shouldPersist?: (state: T) => boolean
  onError?: (store: StoreApi<T>, error: unknown, phase: 'hydrate' | 'rehydrate') => void
}

/* ── Hydration Promise Registry ── */

const hydrationPromises = new Map<string, Promise<void>>()

/** Register an arbitrary hydration promise (e.g. auth session check). */
export function registerHydration(name: string, promise: Promise<void>) {
  hydrationPromises.set(name, promise)
}

/** Wait for a single named store to finish hydrating. */
export function waitForHydration(name: string): Promise<void> {
  return hydrationPromises.get(name) ?? Promise.resolve()
}

/** Wait for ALL registered stores to hydrate, with a 5 s timeout fallback. */
export function waitForAllHydration(): Promise<void> {
  const timeout = new Promise<void>((resolve) => {
    setTimeout(() => {
      console.warn('[sqlitePersist] Hydration timeout (5 s) — forcing render')
      resolve()
    }, 5000)
  })
  return Promise.race([
    Promise.all([...hydrationPromises.values()]).then(() => {}),
    timeout,
  ])
}

/* ── Persistence helper ── */

// Registry of persisted stores for rehydration after cloud pull
const persistedStores = new Map<string, { store: StoreApi<any>; config: SqlitePersistOptions<any> }>()

// Registry of pending debounce timers keyed by store name
const pendingTimers = new Map<string, ReturnType<typeof setTimeout>>()

// Registry of stores currently applying hydrated data so subscriptions can ignore self-caused writes
const restoringStores = new Set<string>()

export function cancelPendingWrites(name?: string): void {
  if (name) {
    const timer = pendingTimers.get(name)
    if (timer) clearTimeout(timer)
    pendingTimers.delete(name)
    return
  }

  for (const [, timer] of pendingTimers) clearTimeout(timer)
  pendingTimers.clear()
}

function applyPersistedState<T extends object>(
  store: StoreApi<T>,
  config: SqlitePersistOptions<T>,
  persisted: unknown,
): void {
  if (!persisted || typeof persisted !== 'object') return

  restoringStores.add(config.name)
  try {
    const currentState = store.getState()
    const restored = config.restore
      ? config.restore(persisted, currentState)
      : (persisted as Partial<T>)
    store.setState(restored)
  } finally {
    restoringStores.delete(config.name)
  }
}

/**
 * Attach SQLite persistence to a Zustand store after creation.
 * Call this once after `create()` to enable write-through persistence.
 */
export function attachSqlitePersist<T extends object>(
  store: StoreApi<T>,
  config: SqlitePersistOptions<T>,
) {
  const debounceMs = config.debounceMs ?? 500
  let hydrated = false

  // Register store for rehydration
  persistedStores.set(config.name, { store, config })

  // Hydrate from SQLite & register as a hydration promise
  const hydrationPromise = window.electronAPI.store
    .get(config.name)
    .then((persisted: unknown) => {
      applyPersistedState(store, config, persisted)
      hydrated = true
    })
    .catch((err) => {
      console.error(err)
      config.onError?.(store, err, 'hydrate')
      hydrated = true // still mark hydrated so we don't block forever
    })

  registerHydration(config.name, hydrationPromise)

  // Subscribe to changes and debounce writes
  store.subscribe(() => {
    if (!hydrated) return
    if (restoringStores.has(config.name)) return
    const state = store.getState()
    if (config.shouldPersist && !config.shouldPersist(state)) {
      cancelPendingWrites(config.name)
      return
    }
    const existing = pendingTimers.get(config.name)
    if (existing) clearTimeout(existing)
    const timer = setTimeout(() => {
      pendingTimers.delete(config.name)
      const latestState = store.getState()
      if (config.shouldPersist && !config.shouldPersist(latestState)) return
      const persisted = config.serialize ? config.serialize(latestState) : latestState
      window.electronAPI.store.set(config.name, persisted).catch(console.error)
    }, debounceMs)
    pendingTimers.set(config.name, timer)
  })
}

/* ── Rehydrate listener (triggered after cloud pull) ── */

let rehydrateListenerAttached = false

/** Listen for main-process rehydrate signal and refresh all persisted stores. */
export function setupRehydrateListener(): void {
  if (rehydrateListenerAttached) return
  rehydrateListenerAttached = true

  window.electronAPI.store.onRehydrate(() => {
    console.log('[sqlitePersist] Rehydrating all stores after cloud pull')
    // Cancel all pending debounce writes to prevent stale state overwriting fresh data
    cancelPendingWrites()
    for (const [name, entry] of persistedStores) {
      window.electronAPI.store.get(name).then((data: unknown) => {
        applyPersistedState(entry.store, entry.config, data)
      }).catch((err) => {
        console.error(err)
        entry.config.onError?.(entry.store, err, 'rehydrate')
      })
    }
  })
}
