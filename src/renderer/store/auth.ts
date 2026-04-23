import { create } from 'zustand'
import { registerHydration } from './sqlitePersist'

export interface AuthUser {
  id: string
  username: string
  displayName: string | null
}

export interface AuthStore {
  user: AuthUser | null
  isAuthenticated: boolean
  error: string | null
  cloudConnected: boolean
  cloudEmail: string | null

  login: (username: string, password: string) => Promise<void>
  register: (username: string, password: string) => Promise<void>
  logout: () => void
  checkSession: () => Promise<void>
  clearError: () => void
  cloudLogin: (email: string, password: string, baseUrl: string) => Promise<void>
  cloudLogout: () => void
  checkCloudStatus: () => Promise<void>
}

export const useAuthStore = create<AuthStore>()(
  (set) => ({
    user: null,
    isAuthenticated: false,
    error: null,
    cloudConnected: false,
    cloudEmail: null,

    login: async (username, password) => {
      try {
        set({ error: null })
        const user = await window.electronAPI.auth.login(username, password)
        // Persist user ID for auto-login
        await window.electronAPI.store.set('auth', { userId: user.id })
        set({
          user: { id: user.id, username: user.username, displayName: user.displayName },
          isAuthenticated: true,
        })
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        set({ error: msg })
      }
    },

    register: async (username, password) => {
      try {
        set({ error: null })
        const user = await window.electronAPI.auth.register(username, password)
        await window.electronAPI.store.set('auth', { userId: user.id })
        set({
          user: { id: user.id, username: user.username, displayName: user.displayName },
          isAuthenticated: true,
        })
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        set({ error: msg })
      }
    },

    logout: () => {
      window.electronAPI.store.set('auth', { userId: null })
      set({ user: null, isAuthenticated: false, error: null })
    },

    checkSession: async () => {
      try {
        const authData = await window.electronAPI.store.get('auth')
        if (authData?.userId) {
          const user = await window.electronAPI.auth.currentUser(authData.userId)
          if (user) {
            set({
              user: { id: user.id, username: user.username, displayName: user.displayName },
              isAuthenticated: true,
            })
            return
          }
        }
      } catch {
        // ignore
      }
      set({ user: null, isAuthenticated: false })
    },

    clearError: () => set({ error: null }),

    cloudLogin: async (email, password, baseUrl) => {
      try {
        set({ error: null })
        const result = await window.electronAPI.sync.cloudLogin(email, password, baseUrl)
        if (result.success) {
          set({ cloudConnected: true, cloudEmail: email })
        } else {
          set({ error: result.error ?? '云端登录失败' })
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        set({ error: msg })
      }
    },

    cloudLogout: () => {
      window.electronAPI.sync.cloudLogout()
      set({ cloudConnected: false, cloudEmail: null })
    },

    checkCloudStatus: async () => {
      try {
        const status = await window.electronAPI.sync.cloudStatus()
        set({
          cloudConnected: status.connected,
          cloudEmail: status.email ?? null,
        })
      } catch {
        set({ cloudConnected: false, cloudEmail: null })
      }
    },
  }),
)

// Register auth session restore as a hydration promise
registerHydration('auth', useAuthStore.getState().checkSession())

// Prevent Vite HMR from triggering a full page reload when this module changes
if (import.meta.hot) import.meta.hot.accept()
