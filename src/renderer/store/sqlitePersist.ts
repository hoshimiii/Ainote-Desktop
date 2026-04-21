import type { StoreApi } from 'zustand'

type SqlitePersistOptions<T extends object> = {
  name: string
  debounceMs?: number
  serialize?: (state: T) => unknown
  restore?: (persisted: unknown, currentState: T) => Partial<T>
  shouldPersist?: (state: T) => boolean
  onError?: (store: StoreApi<T>, error: unknown, phase: 'hydrate' | 'rehydrate') => void
}

const hydrationPromises = new Map<string, Promise<void>>()

export function registerHydration(name: string, promise: Promise<void>) {
  hydrationPromises.set(name, promise)
}

export function waitForHydration(name: string): Promise<void> {
  return hydrationPromises.get(name) ?? Promise.resolve()
}

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

const persistedStores = new Map<string, { store: StoreApi<any>; config: SqlitePersistOptions<any> }>()
const pendingTimers = new Map<string, ReturnType<typeof setTimeout>>()
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

export function attachSqlitePersist<T extends object>(
  store: StoreApi<T>,
  config: SqlitePersistOptions<T>,
) {
  const debounceMs = config.debounceMs ?? 500
  let hydrated = false

  persistedStores.set(config.name, { store, config })

  const hydrationPromise = window.electronAPI.store
    .get(config.name)
    .then((persisted: unknown) => {
      applyPersistedState(store, config, persisted)
      hydrated = true
    })
    .catch((err) => {
      console.error(err)
      config.onError?.(store, err, 'hydrate')
      hydrated = true
    })

  registerHydration(config.name, hydrationPromise)

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

let rehydrateListenerAttached = false

export function setupRehydrateListener(): void {
  if (rehydrateListenerAttached) return
  rehydrateListenerAttached = true

  window.electronAPI.store.onRehydrate(() => {
    console.log('[sqlitePersist] Rehydrating all stores after cloud pull')
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
