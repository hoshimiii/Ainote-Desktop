import test from 'node:test'
import assert from 'node:assert/strict'
import { classifyAssistantIntentWithLLM } from '../src/main/services/AssistantIntentClassifier'
import { DEFAULT_LLM_CONFIG } from '../src/shared/assistantConfig'

test('intent classifier parses ordered candidate ids from JSON response', async () => {
  const result = await classifyAssistantIntentWithLLM(
    {
      input: '在工作区“个人”里帮我整理错题',
      config: {
        ...DEFAULT_LLM_CONFIG,
        model: 'test-model',
        usertoken: 'test-token',
        baseurl: 'https://example.com/v1',
      },
      candidates: [
        {
          id: 'workspace-read',
          kind: 'tool',
          label: '读取工作区',
          description: '读取工作区信息',
          score: 90,
          signals: ['workspace-list'],
        },
        {
          id: 'wrong-answer-workflow',
          kind: 'workflow',
          label: '错题整理工作流',
          description: '整理错题',
          score: 95,
          signals: ['wrong-answer'],
        },
      ],
    },
    async () => JSON.stringify({
      orderedCandidateIds: ['wrong-answer-workflow', 'workspace-read'],
      reason: '错题整理更符合用户目标',
      needsClarification: false,
      clarificationQuestion: '',
    }),
  )

  assert.deepEqual(result?.orderedCandidateIds, ['wrong-answer-workflow', 'workspace-read'])
  assert.equal(result?.source, 'llm')
})
