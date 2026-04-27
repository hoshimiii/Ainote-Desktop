import { useKanbanStore } from '../../store'
import { Button } from '../ui'
import { DeleteDialog } from '../items/DeleteDialog'
import { RenameDialog } from '../items/RenameDialog'
import { MarkdownBlock } from './MarkdownBlock'
import { CodeBlockEditor } from './CodeBlockEditor'
import { InsertBlockHandle } from './InsertBlockHandle'
import { LinkBlockDialog } from '../items/LinkBlockDialog'
import type { Block } from '@shared/types'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { SortableItem, DragHandle } from '../dnd/SortableItem'
import { useState } from 'react'
import { cn } from '../ui'

export function NoteView() {
  const currentMissionId = useKanbanStore((s) => s.currentMissionId)
  const currentNoteId = useKanbanStore((s) => s.currentNoteId)
  const notes = useKanbanStore((s) => s.notes)
  const boards = useKanbanStore((s) => s.boards)
  const tasks = useKanbanStore((s) => s.tasks)
  const setActiveNote = useKanbanStore((s) => s.setActiveNote)
  const setActiveBoard = useKanbanStore((s) => s.setActiveBoard)
  const deleteNote = useKanbanStore((s) => s.deleteNote)
  const renameNote = useKanbanStore((s) => s.renameNote)
  const updateNoteBlocks = useKanbanStore((s) => s.updateNoteBlocks)
  const insertBlock = useKanbanStore((s) => s.insertBlock)
  const setCenterTab = useKanbanStore((s) => s.setCenterTab)

  const [linkingBlockId, setLinkingBlockId] = useState<string | null>(null)
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)

  if (!currentMissionId || !currentNoteId) return null
  const note = notes[currentNoteId]
  if (!note) return null

  const handleBlockChange = (index: number, updated: Block) => {
    const newBlocks = [...note.blocks]
    newBlocks[index] = updated
    updateNoteBlocks(currentNoteId, newBlocks)
  }

  const handleBlockDelete = (blockId: string) => {
    updateNoteBlocks(
      currentNoteId,
      note.blocks.filter((b) => b.id !== blockId),
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Note header */}
      <div className="border-b border-outline-variant bg-surface-container-low/80 backdrop-blur-sm">
        <div className="page-chrome-shell flex items-center gap-3 py-4">
          <Button
            variant="ghost"
            size="icon"
            className="flex-shrink-0 rounded-xl"
            onClick={() => setActiveNote(currentMissionId, null)}
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
          </Button>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] uppercase tracking-[0.18em] text-on-surface-variant/80">Note</p>
            <h2 className="mt-1 text-xl font-semibold font-display text-on-surface truncate">
              {note.title || '无标题'}
            </h2>
          </div>
          <div className="flex items-center gap-1.5">
            <RenameDialog
              initialName={note.title}
              onConfirm={(newName) => renameNote(currentMissionId, currentNoteId, newName)}
            />
            <DeleteDialog
              title="删除笔记"
              description={`确定删除 "${note.title}" 吗？`}
              onConfirm={() => {
                deleteNote(currentMissionId, currentNoteId)
              }}
            />
          </div>
        </div>
      </div>

      {/* Block editor */}
      <div className="flex-1 overflow-y-auto">
        <div className="note-content-shell py-8 space-y-4">
          {/* Insert handle before first block */}
          <InsertBlockHandle onInsert={(type) => insertBlock(currentNoteId, -1, type)} />

          <SortableContext items={note.blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
              {note.blocks.map((block, index) => {
                const isSelected = selectedBlockId === block.id
                const hasLink = !!(block.linkedBoardId || block.linkedTaskId)
                const linkLabel = block.linkedTaskId
                  ? tasks[block.linkedTaskId]?.title
                  : block.linkedBoardId
                    ? boards[block.linkedBoardId]?.title
                    : null

                return (
                  <SortableItem key={block.id} id={block.id} data={{ type: 'block' }} dragHandle>
                    <div
                      className={cn(
                        'relative group/block rounded-2xl transition-all',
                        isSelected && 'bg-surface-container-low/70 shadow-[inset_0_0_0_1px_rgba(114,125,128,0.16)]',
                      )}
                      onPointerDownCapture={() => setSelectedBlockId(block.id)}
                    >
                      {/* Drag handle + link indicator */}
                      <div
                        className={cn(
                          'absolute -left-10 top-3 z-10 flex flex-col gap-1 rounded-xl bg-surface-container-low/95 p-1 shadow-sm ring-1 ring-outline-variant/50 transition-opacity',
                          isSelected ? 'opacity-100' : 'opacity-0 group-hover/block:opacity-100 group-focus-within/block:opacity-100',
                        )}
                      >
                        <DragHandle className="cursor-grab active:cursor-grabbing p-0.5 rounded hover:bg-surface-container-high">
                          <span className="material-symbols-outlined text-xs text-on-surface-variant">drag_indicator</span>
                        </DragHandle>
                        <button
                          className="p-0.5 rounded hover:bg-surface-container-high"
                          title="关联任务"
                          onClick={() => setLinkingBlockId(block.id)}
                        >
                          <span className={`material-symbols-outlined text-xs ${hasLink ? 'text-primary' : 'text-on-surface-variant'}`}>link</span>
                        </button>
                      </div>
                      {hasLink && linkLabel && (
                        <button
                          className="text-[10px] text-primary hover:underline mb-1 flex items-center gap-1"
                          onClick={() => {
                            if (block.linkedBoardId) {
                              setActiveBoard(block.linkedBoardId)
                              setCenterTab('boards')
                            }
                          }}
                        >
                          <span className="material-symbols-outlined text-[10px]">link</span>
                          {linkLabel}
                        </button>
                      )}
                      {block.type === 'code' ? (
                        <CodeBlockEditor
                          block={block}
                          onChange={(updated) => handleBlockChange(index, updated)}
                          onDelete={() => handleBlockDelete(block.id)}
                        />
                      ) : (
                        <MarkdownBlock
                          block={block}
                          onChange={(updated) => handleBlockChange(index, updated)}
                          onDelete={() => handleBlockDelete(block.id)}
                          selected={selectedBlockId === block.id}
                          onSelect={() => setSelectedBlockId(block.id)}
                        />
                      )}
                    </div>
                    {/* Insert handle after each block */}
                    <InsertBlockHandle onInsert={(type) => insertBlock(currentNoteId, index, type)} />
                  </SortableItem>
                )
              })}
          </SortableContext>

          {/* Add block buttons */}
          <div className="flex gap-2 pt-4">
            <button
              className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm text-on-surface-variant hover:bg-surface-container-high transition-colors"
              onClick={() => {
                const newBlock: Block = {
                  id: crypto.randomUUID(),
                  type: 'markdown',
                  content: '',
                }
                updateNoteBlocks(currentNoteId, [...note.blocks, newBlock])
              }}
            >
              <span className="material-symbols-outlined text-sm">add</span>
              文本块
            </button>
            <button
              className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm text-on-surface-variant hover:bg-surface-container-high transition-colors"
              onClick={() => {
                const newBlock: Block = {
                  id: crypto.randomUUID(),
                  type: 'code',
                  content: '',
                  language: 'javascript',
                }
                updateNoteBlocks(currentNoteId, [...note.blocks, newBlock])
              }}
            >
              <span className="material-symbols-outlined text-sm">code</span>
              代码块
            </button>
          </div>
        </div>
      </div>

      {/* Link dialog */}
      {linkingBlockId && currentNoteId && (() => {
        const block = note.blocks.find((b) => b.id === linkingBlockId)
        return (
          <LinkBlockDialog
            noteId={currentNoteId}
            blockId={linkingBlockId}
            currentBoardId={block?.linkedBoardId}
            currentTaskId={block?.linkedTaskId}
            currentSubTaskId={block?.linkedSubTaskId}
            onClose={() => setLinkingBlockId(null)}
          />
        )
      })()}
    </div>
  )
}
