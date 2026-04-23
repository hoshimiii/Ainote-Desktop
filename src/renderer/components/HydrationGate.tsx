import { useState, useEffect } from 'react'
import { waitForAllHydration } from '../store/sqlitePersist'

interface HydrationGateProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

/**
 * Wait for all Zustand stores to hydrate from SQLite before rendering children.
 * Uses promise-based signaling instead of a fixed timeout.
 */
export function HydrationGate({ children, fallback }: HydrationGateProps) {
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    let cancelled = false
    waitForAllHydration().then(() => {
      if (!cancelled) setHydrated(true)
    })
    return () => { cancelled = true }
  }, [])

  if (!hydrated) {
    return fallback ?? (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-on-surface-variant text-sm">Loading...</span>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
