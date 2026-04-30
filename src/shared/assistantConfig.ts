import type {
  AssistantProviderPreset,
  AssistantWorkflowPreset,
  AssistantWriteConfirmationMode,
  LLMConfig,
} from './types'

export const DEFAULT_ASSISTANT_SYSTEM_PROMPT = [
  '你是 AiNote 的 AI 助手，负责围绕工作区、任务区、看板、任务、子任务与笔记来帮助用户整理工作。',
  '在结构化工作流模式下，优先复用已有结构；只有在上下文明确时才创建新实体。',
  '涉及创建、删除、重命名、重写或链接这类写操作时，必须明确说明计划，并遵循当前确认策略。',
  '如果你无法通过正式命令确认某个结果，就不要假装已经完成，而要坦率说明需要用户进一步确认。',
].join('\n')

export const ASSISTANT_PROVIDER_PRESETS: Record<
  AssistantProviderPreset,
  { label: string; defaultBaseUrl?: string; helperText: string }
> = {
  openai: {
    label: 'OpenAI',
    defaultBaseUrl: 'https://api.openai.com/v1',
    helperText: '填写到 /v1 即可，不要填到 /chat/completions。',
  },
  openrouter: {
    label: 'OpenRouter',
    defaultBaseUrl: 'https://openrouter.ai/api/v1',
    helperText: '推荐使用 OpenRouter 的 /api/v1 根路径。',
  },
  deepseek: {
    label: 'DeepSeek',
    defaultBaseUrl: 'https://api.deepseek.com/v1',
    helperText: 'DeepSeek 兼容 OpenAI 风格接口，填写到 /v1。',
  },
  moonshot: {
    label: 'Moonshot / Kimi',
    defaultBaseUrl: 'https://api.moonshot.cn/v1',
    helperText: 'Kimi 建议使用 Moonshot 的 /v1 根路径。',
  },
  ollama: {
    label: 'Ollama',
    defaultBaseUrl: 'http://127.0.0.1:11434/v1',
    helperText: '若通过 Ollama 的 OpenAI 兼容模式访问，请填写到 /v1。',
  },
  custom: {
    label: 'Custom / OpenAI-compatible',
    helperText: '填写服务根路径，例如 https://example.com/v1，而不是完整 completions 地址。',
  },
}

export const DEFAULT_ASSISTANT_PROVIDER_PRESET: AssistantProviderPreset = 'openai'
export const DEFAULT_ASSISTANT_WORKFLOW_PRESET: AssistantWorkflowPreset = 'structured'
export const DEFAULT_ASSISTANT_WRITE_CONFIRMATION_MODE: AssistantWriteConfirmationMode = 'always'

const DEFAULT_OPENAI_PROVIDER_BASE_URL = ASSISTANT_PROVIDER_PRESETS[DEFAULT_ASSISTANT_PROVIDER_PRESET].defaultBaseUrl ?? 'https://api.openai.com/v1'

function getEffectiveDefaultProviderBaseUrl(preset: AssistantProviderPreset): string {
  return ASSISTANT_PROVIDER_PRESETS[preset].defaultBaseUrl ?? DEFAULT_OPENAI_PROVIDER_BASE_URL
}

export function normalizeAssistantBaseUrl(
  providerPreset: AssistantProviderPreset,
  baseurl?: string | null,
): string {
  const trimmed = typeof baseurl === 'string' ? baseurl.trim() : ''
  const providerDefault = ASSISTANT_PROVIDER_PRESETS[providerPreset].defaultBaseUrl

  if (!trimmed) {
    return getEffectiveDefaultProviderBaseUrl(providerPreset)
  }

  if (
    providerPreset !== DEFAULT_ASSISTANT_PROVIDER_PRESET
    && providerDefault
    && trimmed === DEFAULT_OPENAI_PROVIDER_BASE_URL
  ) {
    return providerDefault
  }

  return trimmed
}

export const DEFAULT_LLM_CONFIG: LLMConfig = {
  providerPreset: DEFAULT_ASSISTANT_PROVIDER_PRESET,
  baseurl: DEFAULT_OPENAI_PROVIDER_BASE_URL,
  model: '',
  usertoken: '',
  temperature: 0.7,
  systemPrompt: DEFAULT_ASSISTANT_SYSTEM_PROMPT,
  workflowPreset: DEFAULT_ASSISTANT_WORKFLOW_PRESET,
  enableFormalTools: true,
  writeConfirmationMode: DEFAULT_ASSISTANT_WRITE_CONFIRMATION_MODE,
}

function normalizeProviderPreset(value: unknown): AssistantProviderPreset {
  return typeof value === 'string' && value in ASSISTANT_PROVIDER_PRESETS
    ? (value as AssistantProviderPreset)
    : DEFAULT_ASSISTANT_PROVIDER_PRESET
}

function normalizeWorkflowPreset(value: unknown): AssistantWorkflowPreset {
  return value === 'chat' ? 'chat' : DEFAULT_ASSISTANT_WORKFLOW_PRESET
}

function normalizeWriteConfirmationMode(value: unknown): AssistantWriteConfirmationMode {
  return value === 'never' ? 'never' : DEFAULT_ASSISTANT_WRITE_CONFIRMATION_MODE
}

export function normalizeLLMConfig(config?: Partial<LLMConfig> | null): LLMConfig {
  const providerPreset = normalizeProviderPreset(config?.providerPreset)
  return {
    ...DEFAULT_LLM_CONFIG,
    ...config,
    providerPreset,
    baseurl: normalizeAssistantBaseUrl(providerPreset, config?.baseurl),
    model: typeof config?.model === 'string' ? config.model.trim() : DEFAULT_LLM_CONFIG.model,
    usertoken: typeof config?.usertoken === 'string' ? config.usertoken.trim() : DEFAULT_LLM_CONFIG.usertoken,
    temperature: typeof config?.temperature === 'number' ? config.temperature : DEFAULT_LLM_CONFIG.temperature,
    systemPrompt: typeof config?.systemPrompt === 'string' && config.systemPrompt.trim()
      ? config.systemPrompt.trim()
      : DEFAULT_LLM_CONFIG.systemPrompt,
    workflowPreset: normalizeWorkflowPreset(config?.workflowPreset),
    enableFormalTools: typeof config?.enableFormalTools === 'boolean'
      ? config.enableFormalTools
      : DEFAULT_LLM_CONFIG.enableFormalTools,
    writeConfirmationMode: normalizeWriteConfirmationMode(config?.writeConfirmationMode),
  }
}

export function buildAssistantSystemPrompt(config: LLMConfig): string {
  const normalized = normalizeLLMConfig(config)
  const presetInstruction = normalized.workflowPreset === 'structured'
    ? '当前处于结构化工作流模式：优先围绕 workspace / mission / board / task / subtask / note / link 给出步骤化建议。'
    : '当前处于纯聊天模式：以解释、总结和建议为主，避免声称已执行正式写操作。'
  const toolInstruction = normalized.enableFormalTools
    ? '当系统可用时，你应优先通过正式命令边界来完成结构化写操作。'
    : '当前 formal tools 已关闭，因此你只能提供建议，不能假装已经执行结构化写入。'
  const confirmationInstruction = normalized.writeConfirmationMode === 'always'
    ? '当前确认策略为：所有写操作先展示计划，等待用户明确确认后再执行。'
    : '当前确认策略为：当上下文明确时可直接执行写操作，但仍要报告执行结果。'

  return [
    DEFAULT_ASSISTANT_SYSTEM_PROMPT,
    presetInstruction,
    toolInstruction,
    confirmationInstruction,
    normalized.systemPrompt !== DEFAULT_ASSISTANT_SYSTEM_PROMPT ? normalized.systemPrompt : '',
  ]
    .filter(Boolean)
    .join('\n\n')
}

export function getProviderBaseUrl(preset: AssistantProviderPreset): string {
  return ASSISTANT_PROVIDER_PRESETS[preset].defaultBaseUrl ?? ''
}
