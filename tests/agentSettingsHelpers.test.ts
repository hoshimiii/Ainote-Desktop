import test from 'node:test'
import assert from 'node:assert/strict'
import {
  beginBackdropDismissSession,
  buildAgentSettingsConnectionConfig,
  formatAgentSettingsSaveFailureMessage,
  shouldDismissOnBackdropRelease,
} from '../src/renderer/components/settings/agentSettingsHelpers'

test('buildAgentSettingsConnectionConfig uses the current unsaved draft values', () => {
  const config = buildAgentSettingsConnectionConfig({
    providerPreset: 'custom',
    baseurl: 'https://provider.example/v1',
    model: 'gpt-4.1-mini',
    usertoken: 'secret-token',
    temperature: 0.4,
  })

  assert.deepEqual(config, {
    baseURL: 'https://provider.example/v1',
    model: 'gpt-4.1-mini',
    apiKey: 'secret-token',
    temperature: 0.4,
  })
})

test('buildAgentSettingsConnectionConfig normalizes moonshot drafts onto the Moonshot endpoint', () => {
  const config = buildAgentSettingsConnectionConfig({
    providerPreset: 'moonshot',
    baseurl: 'https://api.openai.com/v1',
    model: 'moonshot-v1-8k',
    usertoken: 'secret-token',
    temperature: 0.2,
  })

  assert.deepEqual(config, {
    baseURL: 'https://api.moonshot.cn/v1',
    model: 'moonshot-v1-8k',
    apiKey: 'secret-token',
    temperature: 0.2,
  })
})

test('backdrop dismissal closes only for a primary left-button press that ends outside the card', () => {
  const session = beginBackdropDismissSession({
    isPrimary: true,
    button: 0,
    startedInsideCard: false,
    pointerId: 8,
  })

  assert.equal(shouldDismissOnBackdropRelease(session, { pointerId: 8, releasedInsideCard: false }), true)
  assert.equal(shouldDismissOnBackdropRelease(session, { pointerId: 8, releasedInsideCard: true }), false)
  assert.equal(shouldDismissOnBackdropRelease(session, { pointerId: 9, releasedInsideCard: false }), false)
})

test('backdrop dismissal ignores in-card presses and non-primary pointer interactions', () => {
  assert.equal(beginBackdropDismissSession({ isPrimary: true, button: 0, startedInsideCard: true, pointerId: 1 }), null)
  assert.equal(beginBackdropDismissSession({ isPrimary: false, button: 0, startedInsideCard: false, pointerId: 1 }), null)
  assert.equal(beginBackdropDismissSession({ isPrimary: true, button: 2, startedInsideCard: false, pointerId: 1 }), null)
})

test('formatAgentSettingsSaveFailureMessage distinguishes full save failure from shortcut-side partial failure', () => {
  assert.equal(
    formatAgentSettingsSaveFailureMessage(false, 'db offline'),
    '保存失败：db offline',
  )

  assert.equal(
    formatAgentSettingsSaveFailureMessage(true, 'occupied'),
    'AI 设置已保存，但快捷键更新失败：occupied',
  )
})