import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

test('CloudSyncPanel owns the transient recovery warning and binds dismiss behavior there', () => {
  const cloudSyncPanelSource = readFileSync(
    resolve('src/renderer/components/settings/CloudSyncPanel.tsx'),
    'utf8',
  )

  assert.match(cloudSyncPanelSource, /transientRecoveryMessage/)
  assert.match(cloudSyncPanelSource, /dismissTransientRecovery/)
  assert.match(cloudSyncPanelSource, /云端数据已按临时模式恢复/)
  assert.match(cloudSyncPanelSource, /onClick=\{dismissTransientRecovery\}/)
})

test('main workspace pages no longer embed the transient recovery banner markup', () => {
  const workPageSource = readFileSync(
    resolve('src/renderer/components/pages/WorkPage.tsx'),
    'utf8',
  )
  const workspacesPageSource = readFileSync(
    resolve('src/renderer/components/pages/WorkspacesPage.tsx'),
    'utf8',
  )

  assert.doesNotMatch(workPageSource, /云端数据已按临时模式恢复/)
  assert.doesNotMatch(workspacesPageSource, /云端数据已按临时模式恢复/)
})