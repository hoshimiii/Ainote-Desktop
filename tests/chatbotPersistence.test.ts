import test from 'node:test'
import assert from 'node:assert/strict'
import {
  restoreChatbotPersistenceSnapshot,
  serializeChatbotPersistenceSnapshot,
} from '../src/renderer/store/chatbotPersistence'

test('serializeChatbotPersistenceSnapshot preserves messages and normalizes config fields', () => {
  const snapshot = serializeChatbotPersistenceSnapshot({
    messages: [{ id: 'm-1', role: 'user', content: 'hello', timestamp: 1 }],
    isStreaming: true,
    config: { model: 'gpt-4.1-mini', usertoken: 'token', baseurl: ' https://api.openai.com/v1/ ' },
  })

  assert.deepEqual(snapshot.messages, [{ id: 'm-1', role: 'user', content: 'hello', timestamp: 1 }])
  assert.equal(snapshot.isStreaming, true)
  assert.equal(snapshot.config.model, 'gpt-4.1-mini')
  assert.equal(snapshot.config.usertoken, 'token')
  assert.equal(snapshot.config.baseurl, 'https://api.openai.com/v1/')
  assert.equal(snapshot.config.enableFormalTools, true)
})

test('restoreChatbotPersistenceSnapshot resets unsafe streaming state and sanitizes invalid persisted data', () => {
  const snapshot = restoreChatbotPersistenceSnapshot({
    messages: 'not-an-array',
    isStreaming: true,
    config: { workflowPreset: 'chat', usertoken: 'token' },
  })

  assert.deepEqual(snapshot.messages, [])
  assert.equal(snapshot.isStreaming, false)
  assert.equal(snapshot.config.workflowPreset, 'chat')
  assert.equal(snapshot.config.usertoken, 'token')
  assert.equal(snapshot.config.enableFormalTools, true)
})

test('saved assistant configuration survives a persist and restore round-trip for reopen flows', () => {
  const persisted = serializeChatbotPersistenceSnapshot({
    messages: [],
    isStreaming: false,
    config: {
      providerPreset: 'custom',
      baseurl: 'https://provider.example/v1',
      model: 'gpt-4.1-mini',
      usertoken: 'secret-token',
      temperature: 0.2,
      systemPrompt: 'custom prompt',
      workflowPreset: 'chat',
      enableFormalTools: false,
      writeConfirmationMode: 'never',
    },
  })

  const restored = restoreChatbotPersistenceSnapshot(persisted)

  assert.equal(restored.config.providerPreset, 'custom')
  assert.equal(restored.config.baseurl, 'https://provider.example/v1')
  assert.equal(restored.config.model, 'gpt-4.1-mini')
  assert.equal(restored.config.usertoken, 'secret-token')
  assert.equal(restored.config.workflowPreset, 'chat')
  assert.equal(restored.config.enableFormalTools, false)
  assert.equal(restored.config.writeConfirmationMode, 'never')
  assert.equal(restored.config.systemPrompt, 'custom prompt')
})

test('restoreChatbotPersistenceSnapshot repairs stale OpenAI base URLs for Moonshot reopen flows', () => {
  const restored = restoreChatbotPersistenceSnapshot({
    messages: [],
    isStreaming: false,
    config: {
      providerPreset: 'moonshot',
      baseurl: 'https://api.openai.com/v1',
      model: 'moonshot-v1-8k',
      usertoken: 'moonshot-token',
    },
  })

  assert.equal(restored.config.providerPreset, 'moonshot')
  assert.equal(restored.config.baseurl, 'https://api.moonshot.cn/v1')
  assert.equal(restored.config.usertoken, 'moonshot-token')
})