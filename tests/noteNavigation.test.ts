import test from 'node:test'
import assert from 'node:assert/strict'
import {
  getLinkedNoteTitle,
  isModifierNoteNavigation,
  resolveLinkedNoteMissionId,
  resolveLinkedNoteTarget,
} from '../src/renderer/components/Board/noteNavigation'

test('resolveLinkedNoteMissionId prefers the current mission when it owns the note', () => {
  const missionId = resolveLinkedNoteMissionId(
    'note-1',
    'mission-a',
    {
      'mission-a': { id: 'mission-a', title: 'A', boardIds: [], noteIds: ['note-1'] },
      'mission-b': { id: 'mission-b', title: 'B', boardIds: [], noteIds: ['note-2'] },
    },
    {
      'note-1': { id: 'note-1', title: '笔记 A', blocks: [] },
      'note-2': { id: 'note-2', title: '笔记 B', blocks: [] },
    },
  )

  assert.equal(missionId, 'mission-a')
})

test('resolveLinkedNoteMissionId finds the owning mission outside the current mission', () => {
  const missionId = resolveLinkedNoteMissionId(
    'note-2',
    'mission-a',
    {
      'mission-a': { id: 'mission-a', title: 'A', boardIds: [], noteIds: ['note-1'] },
      'mission-b': { id: 'mission-b', title: 'B', boardIds: [], noteIds: ['note-2'] },
    },
    {
      'note-1': { id: 'note-1', title: '笔记 A', blocks: [] },
      'note-2': { id: 'note-2', title: '笔记 B', blocks: [] },
    },
  )

  assert.equal(missionId, 'mission-b')
})

test('resolveLinkedNoteMissionId returns null for missing notes', () => {
  const missionId = resolveLinkedNoteMissionId(
    'ghost-note',
    'mission-a',
    {
      'mission-a': { id: 'mission-a', title: 'A', boardIds: [], noteIds: ['ghost-note'] },
    },
    {},
  )

  assert.equal(missionId, null)
})

test('resolveLinkedNoteTarget keeps a valid blockId for deep linking', () => {
  const target = resolveLinkedNoteTarget(
    'note-1',
    'block-2',
    'mission-a',
    {
      'mission-a': { id: 'mission-a', title: 'A', boardIds: [], noteIds: ['note-1'] },
    },
    {
      'note-1': {
        id: 'note-1',
        title: '笔记 A',
        blocks: [
          { id: 'block-1', type: 'markdown', content: 'hello' },
          { id: 'block-2', type: 'code', content: 'const answer = 42', language: 'typescript' },
        ],
      },
    },
  )

  assert.deepEqual(target, {
    missionId: 'mission-a',
    noteId: 'note-1',
    blockId: 'block-2',
  })
})

test('resolveLinkedNoteTarget falls back to note-level navigation when blockId is stale', () => {
  const target = resolveLinkedNoteTarget(
    'note-1',
    'ghost-block',
    'mission-a',
    {
      'mission-a': { id: 'mission-a', title: 'A', boardIds: [], noteIds: ['note-1'] },
    },
    {
      'note-1': {
        id: 'note-1',
        title: '笔记 A',
        blocks: [{ id: 'block-1', type: 'markdown', content: 'hello' }],
      },
    },
  )

  assert.deepEqual(target, {
    missionId: 'mission-a',
    noteId: 'note-1',
    blockId: undefined,
  })
})

test('getLinkedNoteTitle normalizes untitled notes and hides missing ones', () => {
  assert.equal(
    getLinkedNoteTitle('note-1', {
      'note-1': { id: 'note-1', title: '', blocks: [] },
    }),
    '无标题笔记',
  )
  assert.equal(getLinkedNoteTitle('ghost-note', {}), null)
})

test('isModifierNoteNavigation matches ctrl/cmd clicks only', () => {
  assert.equal(isModifierNoteNavigation({ ctrlKey: true, metaKey: false }), true)
  assert.equal(isModifierNoteNavigation({ ctrlKey: false, metaKey: true }), true)
  assert.equal(isModifierNoteNavigation({ ctrlKey: false, metaKey: false }), false)
})
