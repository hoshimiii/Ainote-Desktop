import test from 'node:test'
import assert from 'node:assert/strict'
import { createStore } from 'zustand/vanilla'
import {
  attachSqlitePersist,
  setupRehydrateListener,
  waitForHydration,
} from '../src/renderer/store/sqlitePersist'

type TestState = {
  count: number
  inc: () => void
}

function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 5))
}

test('attachSqlitePersist preserves action functions across hydration and rehydrate', async () => {
  let rehydrateCallback: (() => void) | undefined
  const persistedValues: Record<string, unknown> = {
    'kanban-test': { count: 41 },
  }

  ;(globalThis as { window?: unknown }).window = {
    electronAPI: ({
      store: {
        get: async (name: string) => persistedValues[name],
        set: async (name: string, value: unknown) => {
          persistedValues[name] = value
        },
        reset: async (name: string) => {
          delete persistedValues[name]
        },
        onRehydrate: (callback: () => void) => {
          rehydrateCallback = callback
          return () => {
            rehydrateCallback = undefined
          }
        },
      },
    } as unknown as Window['electronAPI']),
  }

  const store = createStore<TestState>()((set) => ({
    count: 0,
    inc: () => set((state) => ({ count: state.count + 1 })),
  }))

  attachSqlitePersist(store, {
    name: 'kanban-test',
    debounceMs: 1,
    serialize: (state) => ({ count: state.count }),
    restore: (persisted) => ({ count: (persisted as { count?: number }).count ?? 0 }),
  })

  await waitForHydration('kanban-test')
  assert.equal(store.getState().count, 41)
  assert.equal(typeof store.getState().inc, 'function')

  store.getState().inc()
  await flush()
  assert.equal(store.getState().count, 42)
  assert.deepEqual(persistedValues['kanban-test'], { count: 42 })

  persistedValues['kanban-test'] = { count: 7 }
  setupRehydrateListener()
  rehydrateCallback?.()
  await flush()

  assert.equal(store.getState().count, 7)
  assert.equal(typeof store.getState().inc, 'function')

  store.getState().inc()
  await flush()
  assert.equal(store.getState().count, 8)
  assert.deepEqual(persistedValues['kanban-test'], { count: 8 })
})

test('attachSqlitePersist skips writes when shouldPersist returns false', async () => {
  const persistedValues: Record<string, unknown> = {
    transient: { count: 1 },
  }

  ;(globalThis as { window?: unknown }).window = {
    electronAPI: ({
      store: {
        get: async (name: string) => persistedValues[name],
        set: async (name: string, value: unknown) => {
          persistedValues[name] = value
        },
        reset: async (name: string) => {
          delete persistedValues[name]
        },
        onRehydrate: () => () => {},
      },
    } as unknown as Window['electronAPI']),
  }

  const store = createStore<{ count: number; transient: boolean; inc: () => void; setTransient: (value: boolean) => void }>()((set) => ({
    count: 0,
    transient: false,
    inc: () => set((state) => ({ count: state.count + 1 })),
    setTransient: (value) => set({ transient: value }),
  }))

  attachSqlitePersist(store, {
    name: 'transient',
    debounceMs: 1,
    serialize: (state) => ({ count: state.count }),
    restore: (persisted) => ({ count: (persisted as { count?: number }).count ?? 0 }),
    shouldPersist: (state) => !state.transient,
  })

  await waitForHydration('transient')
  store.getState().setTransient(true)
  store.getState().inc()
  await flush()

  assert.deepEqual(persistedValues.transient, { count: 1 })
})
