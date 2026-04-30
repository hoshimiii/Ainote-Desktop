import test from 'node:test'
import assert from 'node:assert/strict'
import {
  DEFAULT_MINI_DIALOG_ACCELERATOR,
  createMiniDialogShortcutStatus,
  formatMiniDialogTrayLabel,
  normalizeMiniDialogShortcutSettings,
} from '../src/shared/miniDialogShortcut'

test('normalizeMiniDialogShortcutSettings keeps a safe default accelerator', () => {
  assert.deepEqual(normalizeMiniDialogShortcutSettings(null), {
    enabled: true,
    accelerator: DEFAULT_MINI_DIALOG_ACCELERATOR,
  })

  assert.deepEqual(normalizeMiniDialogShortcutSettings({ enabled: false, accelerator: '  ' }), {
    enabled: false,
    accelerator: DEFAULT_MINI_DIALOG_ACCELERATOR,
  })
})

test('formatMiniDialogTrayLabel reflects disabled and unavailable states', () => {
  assert.equal(
    formatMiniDialogTrayLabel(createMiniDialogShortcutStatus({ enabled: false, accelerator: DEFAULT_MINI_DIALOG_ACCELERATOR })),
    'Mini Dialog（快捷键已禁用）',
  )

  assert.equal(
    formatMiniDialogTrayLabel(createMiniDialogShortcutStatus({ enabled: true, accelerator: 'Ctrl+Shift+L' }, { isRegistered: false, error: 'occupied' })),
    'Mini Dialog（Ctrl+Shift+L 不可用）',
  )
})
