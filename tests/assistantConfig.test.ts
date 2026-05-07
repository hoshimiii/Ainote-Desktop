import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildAssistantSystemPrompt,
  normalizeLLMConfig,
  normalizeLlmFallbackConfig,
} from '../src/shared/assistantConfig'

test('normalizeLLMConfig backfills workflow-aware assistant defaults', () => {
  const config = normalizeLLMConfig({ model: 'gpt-4.1-mini', usertoken: 'token' })

  assert.equal(config.model, 'gpt-4.1-mini')
  assert.equal(config.enableFormalTools, true)
  assert.equal(config.workflowPreset, 'structured')
  assert.equal(config.writeConfirmationMode, 'always')
  assert.match(config.systemPrompt, /AiNote 的 AI 助手/)
})

test('normalizeLLMConfig keeps moonshot provider defaults instead of stale OpenAI endpoints', () => {
  const fromBlank = normalizeLLMConfig({
    providerPreset: 'moonshot',
    baseurl: '',
    model: 'moonshot-v1-8k',
  })
  const fromStaleOpenAI = normalizeLLMConfig({
    providerPreset: 'moonshot',
    baseurl: 'https://api.openai.com/v1',
    model: 'moonshot-v1-8k',
  })

  assert.equal(fromBlank.baseurl, 'https://api.moonshot.cn/v1')
  assert.equal(fromStaleOpenAI.baseurl, 'https://api.moonshot.cn/v1')
})

test('buildAssistantSystemPrompt includes workflow and confirmation instructions', () => {
  const prompt = buildAssistantSystemPrompt(normalizeLLMConfig({ writeConfirmationMode: 'never', workflowPreset: 'structured' }))

  assert.match(prompt, /结构化工作流模式/)
  assert.match(prompt, /可直接执行写操作/)
})

test('buildAssistantSystemPrompt never advertises executable tools in chat mode', () => {
  const prompt = buildAssistantSystemPrompt(normalizeLLMConfig({
    workflowPreset: 'chat',
    enableFormalTools: true,
    writeConfirmationMode: 'never',
  }))

  assert.match(prompt, /没有可执行的 formal tools 边界/)
  assert.match(prompt, /不能声称已经执行/)
  assert.doesNotMatch(prompt, /可直接执行写操作/)
})

test('normalizeLlmFallbackConfig disables tool execution claims for LLM streaming fallback', () => {
  const fallback = normalizeLlmFallbackConfig({
    workflowPreset: 'structured',
    enableFormalTools: true,
    writeConfirmationMode: 'never',
    model: 'moonshot-v1-8k',
  })

  assert.equal(fallback.workflowPreset, 'chat')
  assert.equal(fallback.enableFormalTools, false)
  assert.equal(fallback.writeConfirmationMode, 'never')
})
