import test from 'node:test'
import assert from 'node:assert/strict'
import type { ChatMessage } from '../src/shared/types'
import { DEFAULT_LLM_CONFIG } from '../src/shared/assistantConfig'
import { normalizePersistedKanbanState } from '../src/shared/kanbanPersistence'

const globalAny = globalThis as typeof globalThis & {
  window?: {
    electronAPI: {
      store: {
        get: (name: string) => Promise<unknown>
        set: (name: string, data: unknown) => Promise<void>
        reset: (name: string) => Promise<void>
        onRehydrate: (callback: () => void) => () => void
      }
      botConfig: {
        set: (config: unknown) => Promise<void>
      }
      kanban: {
        planAndSolve: (input: string, config: unknown) => Promise<{
          handled: boolean
          response: string
          plan?: string[]
          internalTrace?: string[]
          pendingPreviewId?: string
          preview?: { summary: string; snapshot: ReturnType<typeof normalizePersistedKanbanState>; baseSnapshotFingerprint?: string | null }
        }>
        resolvePreview: (action: 'confirm' | 'cancel', pendingPreviewId: string, config: unknown) => Promise<{
          handled: boolean
          response: string
          plan?: string[]
        }>
      }
      llm: {
        onStreamToken: (callback: (token: string) => void) => () => void
        onStreamEnd: (callback: () => void) => () => void
        onStreamError: (callback: (error: string) => void) => () => void
        stream: (messages: unknown[], config: unknown) => void
      }
    }
  }
}

const structuredResponses: Array<{
  handled: boolean
  response: string
  plan?: string[]
  internalTrace?: string[]
  pendingPreviewId?: string
  preview?: { summary: string; snapshot: ReturnType<typeof normalizePersistedKanbanState>; baseSnapshotFingerprint?: string | null }
}> = []

const resolvedPreviewResponses: Array<{
  handled: boolean
  response: string
  plan?: string[]
}> = []

const planAndSolveInputs: string[] = []
const resolvePreviewCalls: Array<{ action: 'confirm' | 'cancel'; pendingPreviewId: string }> = []

globalAny.window = {
  electronAPI: {
    store: {
      get: async () => null,
      set: async () => {},
      reset: async () => {},
      onRehydrate: () => () => {},
    },
    botConfig: {
      set: async () => {},
    },
    kanban: {
      planAndSolve: async (input) => {
        planAndSolveInputs.push(input)
        return structuredResponses.shift() ?? { handled: false, response: '' }
      },
      resolvePreview: async (action, pendingPreviewId) => {
        resolvePreviewCalls.push({ action, pendingPreviewId })
        return resolvedPreviewResponses.shift() ?? { handled: false, response: '' }
      },
    },
    llm: {
      onStreamToken: () => () => {},
      onStreamEnd: () => () => {},
      onStreamError: () => () => {},
      stream: () => {},
    },
  },
}

let cachedModules: {
  useChatbotStore: typeof import('../src/renderer/store/chatbot').useChatbotStore
  useKanbanStore: typeof import('../src/renderer/store/kanban').useKanbanStore
  cancelPendingWrites: typeof import('../src/renderer/store/sqlitePersist').cancelPendingWrites
  waitForHydration: typeof import('../src/renderer/store/sqlitePersist').waitForHydration
} | null = null

async function loadChatbotModules() {
  if (cachedModules) return cachedModules

  const [{ useChatbotStore }, { useKanbanStore }, { cancelPendingWrites, waitForHydration }] = await Promise.all([
    import('../src/renderer/store/chatbot'),
    import('../src/renderer/store/kanban'),
    import('../src/renderer/store/sqlitePersist'),
  ])

  await Promise.all([
    waitForHydration('chatbot'),
    waitForHydration('kanban'),
  ])

  cachedModules = {
    useChatbotStore,
    useKanbanStore,
    cancelPendingWrites,
    waitForHydration,
  }

  return cachedModules
}

async function resetChatbotStore(messages: ChatMessage[]) {
  const { useChatbotStore, useKanbanStore, cancelPendingWrites } = await loadChatbotModules()
  structuredResponses.length = 0
  resolvedPreviewResponses.length = 0
  planAndSolveInputs.length = 0
  resolvePreviewCalls.length = 0
  cancelPendingWrites('kanban')
  cancelPendingWrites('chatbot')
  useKanbanStore.setState({
    workspaces: [],
    activeWorkSpaceId: null,
    currentMissionId: null,
    currentNoteId: null,
    activeNoteTargetBlockId: null,
    currentBoardId: null,
    centerTab: 'boards',
    previewMissionId: null,
    previewSession: null,
    rehydrationError: null,
    transientRecoveryActive: false,
    transientRecoveryMessage: null,
    missionPanelCollapsed: false,
    listPanelCollapsed: false,
    missions: {},
    boards: {},
    tasks: {},
    notes: {},
    missionOrder: {},
    boardOrder: {},
  })
  useChatbotStore.setState({
    messages,
    isStreaming: false,
    config: DEFAULT_LLM_CONFIG,
  })
}

for (const decision of ['确认', '取消'] as const) {
  test(`sendMessage resolves active previews directly after ${decision}`, async () => {
    await resetChatbotStore([
      {
        id: 'assistant-preview',
        role: 'assistant',
        content: '已整理出创建工作区“Demo”的预览。',
        timestamp: 1,
        previewAction: {
          pendingPreviewId: 'pending-preview',
          summary: '已整理出创建工作区“Demo”的预览。',
        },
      },
    ])

    const { useKanbanStore } = await loadChatbotModules()
    useKanbanStore.getState().setPreviewSession({
      pendingPreviewId: 'pending-preview',
      summary: '已整理出创建工作区“Demo”的预览。',
      snapshot: normalizePersistedKanbanState({
        workspaces: [{ id: 'ws-preview', name: 'Demo', missionIds: [] }],
        activeWorkSpaceId: null,
      }),
    })

    resolvedPreviewResponses.push({
      handled: true,
      response: decision === '确认'
        ? '工作区已创建（已提交并验证）'
        : '已取消预览，未更改当前数据。',
    })

    const { useChatbotStore, cancelPendingWrites } = await loadChatbotModules()
    await useChatbotStore.getState().sendMessage(decision)

    const messages = useChatbotStore.getState().messages
    assert.deepEqual(resolvePreviewCalls, [{ action: decision === '确认' ? 'confirm' : 'cancel', pendingPreviewId: 'pending-preview' }])
    assert.deepEqual(planAndSolveInputs, [])
    assert.equal(messages.some((message) => Boolean(message.previewAction)), false)
    assert.match(
      messages[messages.length - 1]?.content ?? '',
      decision === '确认' ? /工作区已创建|已提交并验证/ : /已取消预览/,
    )

    cancelPendingWrites('chatbot')
  })
}

test('sendMessage stores preview snapshots immediately and hides internalTrace from chat content', async () => {
  await resetChatbotStore([])

  structuredResponses.push({
    handled: true,
    response: '已生成界面预览，可直接查看。',
    plan: ['将创建工作区 Demo'],
    internalTrace: ['内部分析步骤'],
    pendingPreviewId: 'pending-preview',
    preview: {
      summary: '已生成界面预览，可直接查看。',
      snapshot: normalizePersistedKanbanState({
        workspaces: [{ id: 'ws-preview', name: 'Demo', missionIds: [] }],
        activeWorkSpaceId: null,
      }),
      baseSnapshotFingerprint: null,
    },
  })

  const { useChatbotStore, useKanbanStore, cancelPendingWrites } = await loadChatbotModules()
  await useChatbotStore.getState().sendMessage('创建工作区 Demo')

  const previewSession = useKanbanStore.getState().previewSession
  assert.equal(previewSession?.pendingPreviewId, 'pending-preview')
  assert.equal(previewSession?.snapshot.workspaces[0]?.name, 'Demo')

  const lastMessage = useChatbotStore.getState().messages.at(-1)
  assert.match(lastMessage?.content ?? '', /已生成界面预览/)
  assert.match(lastMessage?.content ?? '', /将创建工作区 Demo/)
  assert.doesNotMatch(lastMessage?.content ?? '', /内部分析步骤/)
  assert.deepEqual(planAndSolveInputs, ['创建工作区 Demo'])

  cancelPendingWrites('kanban')
  cancelPendingWrites('chatbot')
})