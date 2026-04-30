import test from 'node:test'
import assert from 'node:assert/strict'
import { getBlockDragOverlayMeta } from '../src/renderer/components/dnd/dragOverlayMeta'

test('getBlockDragOverlayMeta describes markdown blocks with readable preview text', () => {
  const meta = getBlockDragOverlayMeta({
    id: 'block-1',
    type: 'markdown',
    content: '## 标题\n\n这是一段 markdown 内容',
  })

  assert.equal(meta.icon, 'notes')
  assert.equal(meta.label, 'Markdown 块')
  assert.match(meta.detail ?? '', /标题 这是一段 markdown 内容/)
})

test('getBlockDragOverlayMeta includes language context for code blocks', () => {
  const meta = getBlockDragOverlayMeta({
    id: 'block-2',
    type: 'code',
    language: 'typescript',
    content: 'const answer = 42',
  })

  assert.equal(meta.icon, 'code')
  assert.equal(meta.label, 'Typescript 代码块')
  assert.match(meta.detail ?? '', /const answer = 42/)
})

test('getBlockDragOverlayMeta falls back safely for empty or unknown block preview', () => {
  const emptyMarkdown = getBlockDragOverlayMeta({
    id: 'block-3',
    type: 'markdown',
    content: '   ',
  })
  const fallback = getBlockDragOverlayMeta()

  assert.equal(emptyMarkdown.detail, '空文本块')
  assert.equal(fallback.label, '内容块')
  assert.equal(fallback.detail, '拖拽以重新排序')
})
