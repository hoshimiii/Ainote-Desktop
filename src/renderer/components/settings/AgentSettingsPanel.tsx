import React, { useEffect, useRef, useState } from 'react'
import { useChatbotStore } from '../../store'
import { Button } from '../ui'
import {
  ASSISTANT_PROVIDER_PRESETS,
  DEFAULT_LLM_CONFIG,
  getProviderBaseUrl,
  normalizeLLMConfig,
} from '@shared/assistantConfig'
import { DEFAULT_MINI_DIALOG_ACCELERATOR } from '@shared/miniDialogShortcut'
import type {
  AssistantProviderPreset,
  AssistantWorkflowPreset,
  AssistantWriteConfirmationMode,
  MiniDialogShortcutStatus,
} from '@shared/types'
import {
  beginBackdropDismissSession,
  buildAgentSettingsConnectionConfig,
  formatAgentSettingsSaveFailureMessage,
  shouldDismissOnBackdropRelease,
} from './agentSettingsHelpers'
import { serializeChatbotPersistenceSnapshot } from '../../store/chatbotPersistence'

interface AgentSettingsPanelProps {
  open: boolean
  onClose: () => void
}

export function AgentSettingsPanel({ open, onClose }: AgentSettingsPanelProps) {
  const config = useChatbotStore((s) => s.config)
  const setConfig = useChatbotStore((s) => s.setConfig)
  const cardRef = useRef<HTMLDivElement | null>(null)
  const backdropDismissSessionRef = useRef<ReturnType<typeof beginBackdropDismissSession>>(null)

  const [providerPreset, setProviderPreset] = useState<AssistantProviderPreset>(config.providerPreset)
  const [baseurl, setBaseurl] = useState(config.baseurl)
  const [model, setModel] = useState(config.model)
  const [usertoken, setUsertoken] = useState(config.usertoken)
  const [temperature, setTemperature] = useState(config.temperature)
  const [systemPrompt, setSystemPrompt] = useState(config.systemPrompt)
  const [workflowPreset, setWorkflowPreset] = useState<AssistantWorkflowPreset>(config.workflowPreset)
  const [enableFormalTools, setEnableFormalTools] = useState(config.enableFormalTools)
  const [writeConfirmationMode, setWriteConfirmationMode] = useState<AssistantWriteConfirmationMode>(config.writeConfirmationMode)
  const [shortcutEnabled, setShortcutEnabled] = useState(true)
  const [shortcutAccelerator, setShortcutAccelerator] = useState(DEFAULT_MINI_DIALOG_ACCELERATOR)
  const [shortcutStatus, setShortcutStatus] = useState<MiniDialogShortcutStatus | null>(null)
  const [showToken, setShowToken] = useState(false)
  const [testing, setTesting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)
  const [saveResult, setSaveResult] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      const normalized = normalizeLLMConfig(config)
      setProviderPreset(normalized.providerPreset)
      setBaseurl(normalized.baseurl)
      setModel(normalized.model)
      setUsertoken(normalized.usertoken)
      setTemperature(normalized.temperature)
      setSystemPrompt(normalized.systemPrompt)
      setWorkflowPreset(normalized.workflowPreset)
      setEnableFormalTools(normalized.enableFormalTools)
      setWriteConfirmationMode(normalized.writeConfirmationMode)
      setTestResult(null)
      setSaveResult(null)

      window.electronAPI.dialog.getShortcutSettings().then((settings) => {
        setShortcutEnabled(settings.enabled)
        setShortcutAccelerator(settings.accelerator)
      }).catch((error) => {
        console.error('[AgentSettingsPanel] failed to load shortcut settings', error)
      })

      window.electronAPI.dialog.getShortcutStatus().then((status) => {
        setShortcutStatus(status)
      }).catch((error) => {
        console.error('[AgentSettingsPanel] failed to load shortcut status', error)
      })
    }
  }, [open, config])

  useEffect(() => {
    if (!open) return
    return window.electronAPI.dialog.onShortcutStatusChange((status) => {
      setShortcutStatus(status)
    })
  }, [open])

  if (!open) return null

  const providerHelperText = ASSISTANT_PROVIDER_PRESETS[providerPreset].helperText

  const isPointInsideCard = (clientX: number, clientY: number) => {
    const rect = cardRef.current?.getBoundingClientRect()
    if (!rect) return false

    return clientX >= rect.left
      && clientX <= rect.right
      && clientY >= rect.top
      && clientY <= rect.bottom
  }

  const resetBackdropDismissSession = () => {
    backdropDismissSessionRef.current = null
  }

  const handleBackdropPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    backdropDismissSessionRef.current = beginBackdropDismissSession({
      isPrimary: event.isPrimary,
      button: event.button,
      startedInsideCard: Boolean(cardRef.current?.contains(event.target as Node)),
      pointerId: event.pointerId,
    })
  }

  const handleBackdropPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const shouldClose = shouldDismissOnBackdropRelease(backdropDismissSessionRef.current, {
      pointerId: event.pointerId,
      releasedInsideCard: isPointInsideCard(event.clientX, event.clientY),
    })

    resetBackdropDismissSession()

    if (!shouldClose) return

    event.preventDefault()
    event.stopPropagation()
    onClose()
  }

  const handleProviderPresetChange = (nextPreset: AssistantProviderPreset) => {
    setProviderPreset(nextPreset)
    const suggestedBaseUrl = getProviderBaseUrl(nextPreset)
    if (suggestedBaseUrl) {
      setBaseurl(suggestedBaseUrl)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setSaveResult(null)

    const nextConfig = normalizeLLMConfig({
      providerPreset,
      baseurl,
      model,
      usertoken,
      temperature,
      systemPrompt,
      workflowPreset,
      enableFormalTools,
      writeConfirmationMode,
    })

    let aiConfigSaved = false

    try {
      const currentState = useChatbotStore.getState()
      await window.electronAPI.store.set('chatbot', serializeChatbotPersistenceSnapshot({
        messages: currentState.messages,
        isStreaming: currentState.isStreaming,
        config: nextConfig,
      }))
      aiConfigSaved = true
      setConfig(nextConfig)

      const status = await window.electronAPI.dialog.updateShortcutSettings({
        enabled: shortcutEnabled,
        accelerator: shortcutAccelerator,
      })
      setShortcutStatus(status)

      if (status.error) {
        setSaveResult(`AI 设置已保存，但快捷键注册失败：${status.error}`)
        return
      }

      // onClose()
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      setSaveResult(formatAgentSettingsSaveFailureMessage(aiConfigSaved, message))
    } finally {
      setTimeout(() => {setSaving(false)}, 500)
    }
  }

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const result = await window.electronAPI.llm.chat(
        [{ role: 'user', content: 'Hi, respond with "OK" only.' }],
        buildAgentSettingsConnectionConfig({
          providerPreset,
          baseurl,
          model,
          usertoken,
          temperature,
        }),
      )
      setTestResult(result ? '✓ 连接成功' : '✗ 无响应')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setTestResult(`✗ ${msg}`)
    } finally {
      setTesting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 p-4"
      onPointerDown={handleBackdropPointerDown}
      onPointerUp={handleBackdropPointerUp}
      onPointerCancel={resetBackdropDismissSession}
    >
      <div
        ref={cardRef}
        className="flex w-full max-w-[560px] max-h-[calc(100vh-2rem)] md:max-h-[80vh] flex-col overflow-hidden rounded-2xl border border-outline-variant bg-surface shadow-2xl"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-outline-variant p-4">
          <h3 className="text-sm font-semibold text-on-surface">AI 助手设置</h3>
          <button className="p-1 rounded hover:bg-surface-container-high" onClick={onClose}>
            <span className="material-symbols-outlined text-sm text-on-surface-variant">close</span>
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
          <section className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-on-surface">模型与 Provider</h4>
              <p className="mt-1 text-xs text-on-surface-variant">填写 Provider 根路径即可，系统会自动补全 chat completions endpoint。</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1">Provider 预设</label>
              <select
                value={providerPreset}
                onChange={(e) => handleProviderPresetChange(e.target.value as AssistantProviderPreset)}
                className="w-full bg-surface-container-high rounded-lg px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                {Object.entries(ASSISTANT_PROVIDER_PRESETS).map(([value, preset]) => (
                  <option key={value} value={value}>{preset.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1">Base URL</label>
              <input
                type="text"
                value={baseurl}
                onChange={(e) => setBaseurl(e.target.value)}
                placeholder="https://api.openai.com/v1"
                className="w-full bg-surface-container-high rounded-lg px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <p className="mt-1 text-[11px] text-on-surface-variant">{providerHelperText}</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1">模型</label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder={DEFAULT_LLM_CONFIG.model || 'gpt-4o-mini'}
                className="w-full bg-surface-container-high rounded-lg px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1">API 密钥</label>
              <div className="relative">
                <input
                  type={showToken ? 'text' : 'password'}
                  value={usertoken}
                  onChange={(e) => setUsertoken(e.target.value)}
                  placeholder="sk-..."
                  className="w-full bg-surface-container-high rounded-lg px-3 py-2 pr-10 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <button
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-surface-container-highest"
                  onClick={() => setShowToken(!showToken)}
                >
                  <span className="material-symbols-outlined text-sm text-on-surface-variant">
                    {showToken ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1">
                Temperature: {temperature.toFixed(1)}
              </label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-[10px] text-on-surface-variant">
                <span>Precise (0)</span>
                <span>Creative (2)</span>
              </div>
            </div>
          </section>

          <section className="space-y-4 border-t border-outline-variant pt-4">
            <div>
              <h4 className="text-sm font-medium text-on-surface">助手角色与工作流</h4>
              <p className="mt-1 text-xs text-on-surface-variant">让主聊天窗和迷你助手共享同一套系统角色、formal tool 策略和确认行为。</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1">工作流模式</label>
              <select
                value={workflowPreset}
                onChange={(e) => setWorkflowPreset(e.target.value as AssistantWorkflowPreset)}
                className="w-full bg-surface-container-high rounded-lg px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="structured">Structured workflow（优先走 AiNote 结构化流程）</option>
                <option value="chat">Chat only（纯聊天建议，不主动走 formal tools）</option>
              </select>
            </div>

            <label className="flex items-start gap-3 rounded-lg border border-outline-variant bg-surface-container-low/40 px-3 py-3">
              <input
                type="checkbox"
                checked={enableFormalTools}
                onChange={(e) => setEnableFormalTools(e.target.checked)}
                className="mt-0.5 accent-primary"
              />
              <div>
                <div className="text-sm text-on-surface">启用 Formal Tools</div>
                <p className="mt-1 text-xs text-on-surface-variant">启用后，助手会优先尝试通过正式命令边界创建或链接工作区 / 任务 / 笔记。</p>
              </div>
            </label>

            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1">写操作确认策略</label>
              <select
                value={writeConfirmationMode}
                onChange={(e) => setWriteConfirmationMode(e.target.value as AssistantWriteConfirmationMode)}
                className="w-full bg-surface-container-high rounded-lg px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="always">总是先展示计划并等待确认</option>
                <option value="never">上下文明确时可直接执行</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1">系统提示词</label>
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                rows={7}
                className="w-full resize-y bg-surface-container-high rounded-lg px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/40"
                placeholder="描述 AI 助手在 AiNote 中的职责、边界和输出风格..."
              />
            </div>
          </section>

          <section className="space-y-4 border-t border-outline-variant pt-4">
            <div>
              <h4 className="text-sm font-medium text-on-surface">迷你助手快捷键</h4>
              <p className="mt-1 text-xs text-on-surface-variant">保存后立即重注册，托盘菜单会同步显示当前可用状态。</p>
            </div>

            <label className="flex items-start gap-3 rounded-lg border border-outline-variant bg-surface-container-low/40 px-3 py-3">
              <input
                type="checkbox"
                checked={shortcutEnabled}
                onChange={(e) => setShortcutEnabled(e.target.checked)}
                className="mt-0.5 accent-primary"
              />
              <div>
                <div className="text-sm text-on-surface">启用迷你助手全局快捷键</div>
                <p className="mt-1 text-xs text-on-surface-variant">默认快捷键是 {DEFAULT_MINI_DIALOG_ACCELERATOR}，关闭后仍可从托盘菜单打开 Mini Dialog。</p>
              </div>
            </label>

            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1">快捷键</label>
              <input
                type="text"
                value={shortcutAccelerator}
                onChange={(e) => setShortcutAccelerator(e.target.value)}
                disabled={!shortcutEnabled}
                placeholder={DEFAULT_MINI_DIALOG_ACCELERATOR}
                className="w-full bg-surface-container-high rounded-lg px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50"
              />
              <p className="mt-1 text-[11px] text-on-surface-variant">示例：Shift+Alt+Space、CommandOrControl+Shift+L</p>
            </div>

            {shortcutStatus && (
              <div className={`rounded-lg px-3 py-2 text-xs ${shortcutStatus.error ? 'bg-error/10 text-error' : 'bg-surface-container-high text-on-surface-variant'}`}>
                {shortcutStatus.error
                  ? `当前状态：注册失败 · ${shortcutStatus.error}`
                  : shortcutStatus.enabled
                    ? `当前状态：已${shortcutStatus.isRegistered ? '' : '未'}注册 ${shortcutStatus.accelerator}`
                    : '当前状态：快捷键已禁用'}
              </div>
            )}
          </section>




        </div>

        <div className="flex shrink-0 items-center justify-between border-t border-outline-variant bg-surface px-4 py-3">
          <div className="flex items-center gap-4">
            <Button variant="secondary" size="sm" onClick={handleTest} disabled={testing}>
              {testing ? '测试中...' : '测试连接'}
            </Button>
            {testResult && (
              <p className={`text-xs ${testResult.startsWith('✓') ? 'text-green-600' : 'text-error'}`}>
                {testResult}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>取消</Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>{saving ? '保存中...' : '保存'}</Button>
              {saveResult && (
            <p className={`text-xs ${saveResult.startsWith('AI 设置已保存') ? 'text-amber-600' : 'text-error'}`}>
              {saveResult}
            </p>
          )}
          </div>
        </div>
      </div>
    </div>
  )
}
