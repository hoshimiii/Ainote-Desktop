import test from 'node:test'
import assert from 'node:assert/strict'
import { assistantTools } from '../src/main/services/tools'
import { assistantWorkflows } from '../src/main/services/workflows'

test('assistant registries expose separated tool and workflow descriptors', () => {
  assert.ok(assistantTools.some((tool) => tool.id === 'workspace-read'))
  assert.ok(assistantTools.every((tool) => tool.kind === 'tool'))
  assert.ok(assistantWorkflows.some((workflow) => workflow.id === 'learning-note-workflow'))
  assert.ok(assistantWorkflows.some((workflow) => workflow.id === 'wrong-answer-workflow'))
  assert.ok(assistantWorkflows.every((workflow) => workflow.kind === 'workflow'))
})
