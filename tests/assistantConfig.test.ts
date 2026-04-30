import test from 'node:test'
import assert from 'node:assert/strict'
import { buildAssistantSystemPrompt, normalizeLLMConfig } from '../src/shared/assistantConfig'

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
  const prompt = buildAssistantSystemPrompt(normalizeLLMConfig({ writeConfirmationMode: 'never', workflowPreset: 'chat' }))

  assert.match(prompt, /纯聊天模式/)
  assert.match(prompt, /可直接执行写操作/)
})
