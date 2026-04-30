import type { Mission, Note } from '@shared/types'

export interface LinkedNoteTarget {
  missionId: string
  noteId: string
  blockId?: string
}

export function resolveLinkedNoteMissionId(
  noteId: string | undefined,
  currentMissionId: string | null,
  missions: Record<string, Mission>,
  notes: Record<string, Note>,
): string | null {
  if (!noteId || !notes[noteId]) return null

  if (currentMissionId) {
    const currentMission = missions[currentMissionId]
    if (currentMission?.noteIds.includes(noteId)) {
      return currentMissionId
    }
  }

  for (const mission of Object.values(missions)) {
    if (mission.noteIds.includes(noteId)) {
      return mission.id
    }
  }

  return null
}

export function getLinkedNoteTitle(noteId: string | undefined, notes: Record<string, Note>): string | null {
  if (!noteId) return null
  const note = notes[noteId]
  if (!note) return null
  return note.title || '无标题笔记'
}

export function resolveLinkedNoteTarget(
  noteId: string | undefined,
  blockId: string | undefined,
  currentMissionId: string | null,
  missions: Record<string, Mission>,
  notes: Record<string, Note>,
): LinkedNoteTarget | null {
  if (!noteId || !notes[noteId]) return null

  const missionId = resolveLinkedNoteMissionId(noteId, currentMissionId, missions, notes)
  if (!missionId) return null

  const resolvedBlockId = blockId && notes[noteId].blocks.some((block) => block.id === blockId)
    ? blockId
    : undefined

  return {
    missionId,
    noteId,
    blockId: resolvedBlockId,
  }
}

export function isModifierNoteNavigation(event: { ctrlKey?: boolean; metaKey?: boolean }): boolean {
  return Boolean(event.ctrlKey || event.metaKey)
}
