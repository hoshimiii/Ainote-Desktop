import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildChatCompletionsUrl,
  normalizeOpenAICompatibleBaseURL,
} from '../src/main/services/LLMService'

test('normalizeOpenAICompatibleBaseURL removes duplicated chat completion suffixes', () => {
  assert.equal(
    normalizeOpenAICompatibleBaseURL('https://api.example.com/v1/chat/completions/'),
    'https://api.example.com/v1',
  )
  assert.equal(
    normalizeOpenAICompatibleBaseURL('https://api.example.com/v1/chat/completions/chat/completions'),
    'https://api.example.com/v1',
  )
})

test('buildChatCompletionsUrl appends exactly one completions path', () => {
  assert.equal(
    buildChatCompletionsUrl('https://api.example.com/v1'),
    'https://api.example.com/v1/chat/completions',
  )
  assert.equal(
    buildChatCompletionsUrl('https://api.example.com/v1/chat/completions'),
    'https://api.example.com/v1/chat/completions',
  )
})
