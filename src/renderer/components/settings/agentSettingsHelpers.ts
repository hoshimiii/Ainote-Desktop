import type { LLMConfig } from '@shared/types'
import { normalizeLLMConfig } from '@shared/assistantConfig'

export type AgentSettingsConnectionDraft = Pick<LLMConfig, 'providerPreset' | 'baseurl' | 'model' | 'usertoken' | 'temperature'>

export type BackdropDismissSession = {
  pointerId: number
}

export function buildAgentSettingsConnectionConfig(draft: AgentSettingsConnectionDraft) {
  const normalized = normalizeLLMConfig(draft)
  return {
    model: normalized.model,
    temperature: normalized.temperature,
    baseURL: normalized.baseurl,
    apiKey: normalized.usertoken,
  }
}

export function beginBackdropDismissSession(input: {
  isPrimary: boolean
  button: number
  startedInsideCard: boolean
  pointerId: number
}): BackdropDismissSession | null {
  if (!input.isPrimary || input.button !== 0 || input.startedInsideCard) {
    return null
  }

  return { pointerId: input.pointerId }
}

export function shouldDismissOnBackdropRelease(
  session: BackdropDismissSession | null,
  input: {
    pointerId: number
    releasedInsideCard: boolean
  },
): boolean {
  if (!session) return false
  if (session.pointerId !== input.pointerId) return false
  return !input.releasedInsideCard
}

export function formatAgentSettingsSaveFailureMessage(
  aiConfigSaved: boolean,
  message: string,
): string {
  return aiConfigSaved
    ? `AI 设置已保存，但快捷键更新失败：${message}`
    : `保存失败：${message}`
}