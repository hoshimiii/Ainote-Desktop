import { useState } from 'react'
import { useKanbanStore, useAuthStore } from '../../store'
import { CreateDialog } from '../items/CreateDialog'
import { DeleteDialog } from '../items/DeleteDialog'
import { RenameDialog } from '../items/RenameDialog'
import { Button, Card } from '../ui'
import { WindowTitlebar } from '../layout/WindowTitlebar'
import { CloudSyncPanel } from '../settings/CloudSyncPanel'

export function WorkspacesPage() {
  const workspaces = useKanbanStore((s) => s.workspaces)
  const createWorkSpace = useKanbanStore((s) => s.createWorkSpace)
  const setWorkSpace = useKanbanStore((s) => s.setWorkSpace)
  const deleteWorkSpace = useKanbanStore((s) => s.deleteWorkSpace)
  const renameWorkSpace = useKanbanStore((s) => s.renameWorkSpace)
  const rehydrationError = useKanbanStore((s) => s.rehydrationError)
  const clearRehydrationError = useKanbanStore((s) => s.clearRehydrationError)
  const transientRecoveryMessage = useKanbanStore((s) => s.transientRecoveryMessage)
  const dismissTransientRecovery = useKanbanStore((s) => s.dismissTransientRecovery)
  const logout = useAuthStore((s) => s.logout)
  const user = useAuthStore((s) => s.user)
  const cloudConnected = useAuthStore((s) => s.cloudConnected)

  const [syncPanelOpen, setSyncPanelOpen] = useState(false)

  return (
    <div className="flex flex-col h-full bg-background">
      <WindowTitlebar />
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-4xl mx-auto">
          {rehydrationError && (
            <div className="mb-4 flex items-start justify-between gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-red-700">
              <div>
                <p className="text-sm font-semibold">工作区数据同步异常</p>
                <p className="mt-1 text-xs leading-5">{rehydrationError}</p>
              </div>
              <button className="flex-shrink-0 rounded-lg px-2 py-1 text-xs text-red-700 hover:bg-red-500/10" onClick={clearRehydrationError}>
                关闭
              </button>
            </div>
          )}

          {transientRecoveryMessage && (
            <div className="mb-4 flex items-start justify-between gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-amber-800">
              <div>
                <p className="text-sm font-semibold">云端数据已按临时模式恢复</p>
                <p className="mt-1 text-xs leading-5">{transientRecoveryMessage}</p>
              </div>
              <button className="flex-shrink-0 rounded-lg px-2 py-1 text-xs text-amber-800 hover:bg-amber-500/10" onClick={dismissTransientRecovery}>
                知道了
              </button>
            </div>
          )}

          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-on-surface">工作区</h1>
              <p className="text-sm text-on-surface-variant mt-1">选择一个工作区继续</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-on-surface-variant hover:bg-surface-container-high transition-colors relative"
                onClick={() => setSyncPanelOpen(true)}
                title="云端同步"
              >
                <span className="material-symbols-outlined text-sm">cloud_sync</span>
                云端同步
                {cloudConnected && <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-green-500" />}
              </button>
              <DeleteDialog
                title="重置所有数据"
                description="确定要清除所有本地看板数据吗？此操作不可撤销。清除后可从云端重新拉取数据。"
                onConfirm={() => {
                  window.electronAPI.store.reset('kanban')
                }}
                trigger={
                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-red-500 hover:bg-red-500/10 transition-colors" title="重置本地数据">
                    <span className="material-symbols-outlined text-sm">delete_forever</span>
                    重置数据
                  </button>
                }
              />
              <CreateDialog
                title="新建工作区"
                onConfirm={(name) => {
                  createWorkSpace({ id: crypto.randomUUID(), name, missionIds: [] })
                }}
                trigger={
                  <Button>
                    <span className="material-symbols-outlined text-sm">add</span>
                    新建工作区
                  </Button>
                }
              />
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-on-surface-variant hover:bg-surface-container-high transition-colors" onClick={logout} title="登出">
                <span className="material-symbols-outlined text-sm">logout</span>
                {user?.displayName ?? user?.username ?? '登出'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {workspaces.map((ws) => (
              <Card key={ws.id} className="cursor-pointer group hover:bg-surface-container-high transition-colors" onClick={() => setWorkSpace(ws.id)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-primary">folder</span>
                    </div>
                    <h3 className="font-semibold text-on-surface truncate">{ws.name}</h3>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    <RenameDialog initialName={ws.name} onConfirm={(newName) => renameWorkSpace(ws.id, newName)} />
                    <DeleteDialog title="删除工作区" description={`确定要删除 "${ws.name}" 吗？`} onConfirm={() => deleteWorkSpace(ws.id)} />
                  </div>
                </div>
              </Card>
            ))}

            {workspaces.length === 0 && (
              <div className="col-span-full text-center py-16 text-on-surface-variant">
                <span className="material-symbols-outlined text-4xl mb-2 block">folder_open</span>
                <p>暂无工作区，创建一个开始使用吧。</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <CloudSyncPanel open={syncPanelOpen} onClose={() => setSyncPanelOpen(false)} />
    </div>
  )
}
