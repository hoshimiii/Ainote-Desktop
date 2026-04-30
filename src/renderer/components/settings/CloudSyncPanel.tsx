import React, { useState, useEffect } from 'react'
import { useAuthStore, useKanbanStore } from '../../store'
import { Button } from '../ui'

interface CloudSyncPanelProps {
  open: boolean
  onClose: () => void
}

export function CloudSyncPanel({ open, onClose }: CloudSyncPanelProps) {
  const cloudConnected = useAuthStore((s) => s.cloudConnected)
  const cloudEmail = useAuthStore((s) => s.cloudEmail)
  const cloudLogout = useAuthStore((s) => s.cloudLogout)
  const checkCloudStatus = useAuthStore((s) => s.checkCloudStatus)
  const transientRecoveryMessage = useKanbanStore((s) => s.transientRecoveryMessage)
  const dismissTransientRecovery = useKanbanStore((s) => s.dismissTransientRecovery)

  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<string | null>(null)
  const [syncStatus, setSyncStatus] = useState<{ pendingCount: number; lastSyncTime: number | null } | null>(null)
  const [confirmAction, setConfirmAction] = useState<'push' | 'pull' | null>(null)

  useEffect(() => {
    if (open) {
      checkCloudStatus()
      window.electronAPI.sync.status().then(setSyncStatus).catch(() => {})
      setSyncResult(null)
    }
  }, [open, checkCloudStatus])

  if (!open) return null

  const handlePush = async () => {
    setSyncing(true)
    setSyncResult(null)
    setConfirmAction(null)
    try {
      const result = await window.electronAPI.sync.push()
      if (result.errors.length > 0) {
        setSyncResult(`✗ ${result.errors.join(', ')}`)
      } else if (result.warnings.length > 0) {
        setSyncResult(`⚠ ${result.warnings.join('，')}`)
      } else {
        setSyncResult(`✓ 已推送数据到云端`)
      }
    } catch (err: unknown) {
      setSyncResult(`✗ ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setSyncing(false)
      window.electronAPI.sync.status().then(setSyncStatus).catch(() => {})
    }
  }

  const handlePull = async () => {
    setSyncing(true)
    setSyncResult(null)
    setConfirmAction(null)
    try {
      const result = await window.electronAPI.sync.pull()
      if (result.errors.length > 0) {
        setSyncResult(`✗ ${result.errors.join(', ')}`)
      } else if (result.warnings.length > 0) {
        setSyncResult(`⚠ ${result.warnings.join('，')}`)
      } else if (result.recordsSynced > 0) {
        setSyncResult('✓ 已从云端拉取最新数据')
      } else {
        setSyncResult('✓ 本地数据已是最新')
      }
    } catch (err: unknown) {
      setSyncResult(`✗ ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setSyncing(false)
      window.electronAPI.sync.status().then(setSyncStatus).catch(() => {})
    }
  }

  /** Check for conflicts before push/pull and show confirmation if needed */
  const requestSync = (direction: 'push' | 'pull') => {
    if (direction === 'pull' && syncStatus && syncStatus.pendingCount > 0) {
      setConfirmAction('pull')
      return
    }
    if (direction === 'push') {
      // Push is safe (LWW), but confirm anyway for user awareness
      handlePush()
      return
    }
    handlePull()
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30" onClick={onClose}>
      <div
        className="w-[380px] bg-surface rounded-2xl shadow-2xl border border-outline-variant overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-outline-variant">
          <h3 className="text-sm font-semibold text-on-surface">云端同步</h3>
          <button className="p-1 rounded hover:bg-surface-container-high" onClick={onClose}>
            <span className="material-symbols-outlined text-sm text-on-surface-variant">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {/* Connection status */}
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${cloudConnected ? 'bg-green-500' : 'bg-on-surface-variant/30'}`}
            />
            <span className="text-xs text-on-surface-variant">
              {cloudConnected ? `已连接: ${cloudEmail}` : '未连接云端'}
            </span>
          </div>

          {!cloudConnected && (
            <p className="text-xs text-on-surface-variant">
              请先在登录页面使用"云端"选项登录，然后即可同步数据。
            </p>
          )}

          {cloudConnected && (
            <>
              {transientRecoveryMessage && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-3 text-amber-800">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold">云端数据已按临时模式恢复</p>
                      <p className="mt-1 text-xs leading-5">{transientRecoveryMessage}</p>
                    </div>
                    <button
                      className="flex-shrink-0 rounded-lg px-2 py-1 text-xs text-amber-800 hover:bg-amber-500/10"
                      onClick={dismissTransientRecovery}
                    >
                      知道了
                    </button>
                  </div>
                </div>
              )}

              {/* Sync status */}
              {syncStatus && (
                <div className="text-xs text-on-surface-variant space-y-1">
                  <p>待同步记录: {syncStatus.pendingCount}</p>
                  {syncStatus.lastSyncTime && (
                    <p>上次同步: {new Date(syncStatus.lastSyncTime).toLocaleString()}</p>
                  )}
                </div>
              )}

              {/* Sync buttons */}
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex-1"
                  onClick={() => requestSync('push')}
                  disabled={syncing}
                >
                  <span className="material-symbols-outlined text-sm mr-1">cloud_upload</span>
                  {syncing ? '同步中...' : '推送到云端'}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex-1"
                  onClick={() => requestSync('pull')}
                  disabled={syncing}
                >
                  <span className="material-symbols-outlined text-sm mr-1">cloud_download</span>
                  {syncing ? '同步中...' : '从云端拉取'}
                </Button>
              </div>

              {/* Conflict confirmation */}
              {confirmAction === 'pull' && (
                <div className="p-3 bg-error-container rounded-xl space-y-2">
                  <p className="text-xs text-on-error-container font-medium">
                    本地有未推送的修改，拉取云端数据将覆盖本地更改。
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" className="flex-1" onClick={() => setConfirmAction(null)}>
                      取消
                    </Button>
                    <Button size="sm" variant="primary" className="flex-1" onClick={handlePull}>
                      强制拉取
                    </Button>
                  </div>
                </div>
              )}

              {/* Disconnect */}
              <button
                className="text-xs text-on-surface-variant hover:text-error transition-colors"
                onClick={() => {
                  cloudLogout()
                  setSyncResult('已断开云端连接')
                }}
              >
                断开云端连接
              </button>
            </>
          )}

          {/* Sync result */}
          {syncResult && (
            <p className={`text-xs ${syncResult.startsWith('✓') ? 'text-green-600' : syncResult.startsWith('⚠') ? 'text-amber-600' : 'text-error'}`}>
              {syncResult}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
