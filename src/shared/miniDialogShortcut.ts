import type { MiniDialogShortcutSettings, MiniDialogShortcutStatus } from './types'

export const DEFAULT_MINI_DIALOG_ACCELERATOR = 'Shift+Alt+Space'

export function normalizeMiniDialogShortcutSettings(
  settings?: Partial<MiniDialogShortcutSettings> | null,
): MiniDialogShortcutSettings {
  const accelerator = typeof settings?.accelerator === 'string'
    ? settings.accelerator.trim()
    : ''

  return {
    enabled: typeof settings?.enabled === 'boolean' ? settings.enabled : true,
    accelerator: accelerator || DEFAULT_MINI_DIALOG_ACCELERATOR,
  }
}

export function createMiniDialogShortcutStatus(
  settings?: Partial<MiniDialogShortcutSettings> | null,
  overrides?: Partial<Omit<MiniDialogShortcutStatus, 'enabled' | 'accelerator'>>,
): MiniDialogShortcutStatus {
  const normalized = normalizeMiniDialogShortcutSettings(settings)
  return {
    ...normalized,
    isRegistered: overrides?.isRegistered ?? false,
    error: overrides?.error,
  }
}

export function formatMiniDialogTrayLabel(status: MiniDialogShortcutStatus): string {
  if (!status.enabled) return 'Mini Dialog（快捷键已禁用）'
  if (!status.isRegistered && status.error) return `Mini Dialog（${status.accelerator} 不可用）`
  if (!status.isRegistered) return `Mini Dialog（${status.accelerator} 未注册）`
  return 'Mini Dialog'
}
