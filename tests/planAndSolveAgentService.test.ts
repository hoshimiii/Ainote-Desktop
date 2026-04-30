import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizePersistedKanbanState } from '../src/shared/kanbanPersistence'
import { DEFAULT_LLM_CONFIG } from '../src/shared/assistantConfig'
import { runPlanAndSolveAgent } from '../src/main/services/PlanAndSolveAgentService'

test('runPlanAndSolveAgent persists successful structured mutations through saveSnapshot', async () => {
  const emptySnapshot = normalizePersistedKanbanState(null)
  let savedSnapshot = emptySnapshot

  const result = await runPlanAndSolveAgent(
    '创建工作区“Demo”',
    { ...DEFAULT_LLM_CONFIG, writeConfirmationMode: 'never' },
    {
      loadSnapshot: () => emptySnapshot,
      saveSnapshot: (snapshot) => {
        savedSnapshot = snapshot
      },
      loadPendingPlan: () => null,
      savePendingPlan: () => {},
    },
  )

  assert.equal(result.handled, true)
  assert.match(result.response, /已验证/)
  assert.equal(savedSnapshot.workspaces[0]?.name, 'Demo')
})
