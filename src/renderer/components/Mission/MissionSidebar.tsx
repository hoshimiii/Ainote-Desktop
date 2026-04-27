import { useState } from 'react'
import { useKanbanStore } from '../../store'
import { orderOwnedIds } from '@shared/orderedIds'
import { CreateDialog } from '../items/CreateDialog'
import { DeleteDialog } from '../items/DeleteDialog'
import { RenameDialog } from '../items/RenameDialog'
import { Button, ScrollArea, cn, useContextMenu } from '../ui'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { SortableItem } from '../dnd/SortableItem'

export function MissionSidebar() {
  const activeWorkSpaceId = useKanbanStore((s) => s.activeWorkSpaceId)
  const workspace = useKanbanStore((s) => s.workspaces.find((w) => w.id === activeWorkSpaceId))
  const missions = useKanbanStore((s) => s.missions)
  const missionOrder = useKanbanStore((s) => s.missionOrder)
  const currentMissionId = useKanbanStore((s) => s.currentMissionId)
  const setMission = useKanbanStore((s) => s.setMission)
  const createMission = useKanbanStore((s) => s.createMission)
  const deleteMission = useKanbanStore((s) => s.deleteMission)
  const renameMission = useKanbanStore((s) => s.renameMission)
  const collapsed = useKanbanStore((s) => s.missionPanelCollapsed)
  const toggleMissionPanel = useKanbanStore((s) => s.toggleMissionPanel)
  const { show: showContextMenu } = useContextMenu()

  // Controlled dialog state for context menu actions
  const [ctxRenameId, setCtxRenameId] = useState<string | null>(null)
  const [ctxDeleteId, setCtxDeleteId] = useState<string | null>(null)

  if (!activeWorkSpaceId || !workspace) return null

  // Get ordered mission list
  const ownedMissionIds = workspace.missionIds.filter((id) => missions[id])
  const displayIds = orderOwnedIds(ownedMissionIds, missionOrder[activeWorkSpaceId] ?? [])

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 flex items-center justify-between">
        {!collapsed && <h3 className="text-sm font-semibold text-on-surface">任务列表</h3>}
        <div className="flex items-center gap-0.5">
          {!collapsed && (
            <CreateDialog
              title="新建任务"
              onConfirm={(name) => {
                createMission({
                  id: crypto.randomUUID(),
                  title: name,
                  boardIds: [],
                  noteIds: [],
                })
              }}
              trigger={
                <Button variant="ghost" size="icon">
                  <span className="material-symbols-outlined text-sm">add</span>
                </Button>
              }
            />
          )}
          <Button variant="ghost" size="icon" onClick={toggleMissionPanel}>
            <span className="material-symbols-outlined text-sm">
              {collapsed ? 'chevron_right' : 'chevron_left'}
            </span>
          </Button>
        </div>
      </div>

      {!collapsed && (
        <ScrollArea className="flex-1 px-2 pb-2">
          <SortableContext items={displayIds} strategy={verticalListSortingStrategy}>
            {displayIds.map((id) => {
              const mission = missions[id]
              if (!mission) return null
              const isActive = currentMissionId === id

              return (
                <SortableItem key={id} id={id} data={{ type: 'mission' }}>
                  <div
                    className={cn(
                      'group flex items-center gap-2 rounded-lg px-3 py-2 mb-0.5 cursor-pointer transition-colors',
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-on-surface-variant hover:bg-surface-container-high',
                    )}
                    onClick={() => setMission(id)}
                    onContextMenu={(e) => showContextMenu(e, [
                      { label: '重命名', icon: 'edit', onClick: () => setCtxRenameId(id) },
                      { label: '删除', icon: 'delete', onClick: () => setCtxDeleteId(id) },
                    ])}
                  >
                    <span className="material-symbols-outlined text-sm">
                      {isActive ? 'folder_open' : 'folder'}
                    </span>
                    <span className="flex-1 text-sm truncate">{mission.title}</span>
                    <div
                      className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <RenameDialog
                        initialName={mission.title}
                        onConfirm={(newName) => renameMission(id, newName)}
                        trigger={
                          <button className="p-0.5 rounded hover:bg-surface-container-highest">
                            <span className="material-symbols-outlined text-xs">edit</span>
                          </button>
                        }
                      />
                      <DeleteDialog
                        title="删除任务"
                        description={`确定删除 "${mission.title}" 及其所有看板吗？`}
                        onConfirm={() => deleteMission(id)}
                        trigger={
                          <button className="p-0.5 rounded hover:bg-surface-container-highest">
                            <span className="material-symbols-outlined text-xs">delete</span>
                          </button>
                        }
                      />
                    </div>
                  </div>
                </SortableItem>
              )
            })}
          </SortableContext>

        {displayIds.length === 0 && (
          <div className="text-center py-8 text-on-surface-variant text-xs">
            暂无任务
          </div>
        )}
      </ScrollArea>
      )}

      {/* Context-menu triggered dialogs */}
      {ctxRenameId && missions[ctxRenameId] && (
        <RenameDialog
          initialName={missions[ctxRenameId].title}
          title="重命名任务"
          onConfirm={(newName) => { renameMission(ctxRenameId, newName); setCtxRenameId(null) }}
          open
          onOpenChange={(v) => { if (!v) setCtxRenameId(null) }}
        />
      )}
      {ctxDeleteId && missions[ctxDeleteId] && (
        <DeleteDialog
          title="删除任务"
          description={`确定删除 "${missions[ctxDeleteId].title}" 及其所有看板吗？`}
          onConfirm={() => { deleteMission(ctxDeleteId); setCtxDeleteId(null) }}
          open
          onOpenChange={(v) => { if (!v) setCtxDeleteId(null) }}
        />
      )}
    </div>
  )
}
