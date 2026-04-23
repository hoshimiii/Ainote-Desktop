/**
 * LLM Service for Electron main process.
 * Uses node-fetch/https to call OpenAI-compatible APIs directly (no CORS issues).
 */

export interface LLMStreamConfig {
  model?: string
  temperature?: number
  baseURL?: string
  apiKey?: string
}

export interface ApiMessage {
  role: string
  content: string
}

/**
 * Stream completion from an OpenAI-compatible API.
 * Yields text tokens as they arrive.
 */
export async function* streamCompletion(
  messages: ApiMessage[],
  config: LLMStreamConfig,
): AsyncGenerator<string> {
  const baseURL = (config.baseURL || 'https://api.openai.com/v1').replace(/\/+$/, '')
  const url = `${baseURL}/chat/completions`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey || ''}`,
    },
    body: JSON.stringify({
      model: config.model || 'gpt-4o-mini',
      messages,
      temperature: config.temperature ?? 0.7,
      stream: true,
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`LLM API error ${response.status}: ${text}`)
  }

  const reader = response.body?.getReader()
  if (!reader) return

  const decoder = new TextDecoder()
  let carry = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    carry += decoder.decode(value, { stream: true })
    const lines = carry.split('\n')
    carry = lines.pop() ?? ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed === 'data: [DONE]') continue
      if (trimmed.startsWith('data: ')) {
        try {
          const json = JSON.parse(trimmed.slice(6))
          const content: string = json.choices?.[0]?.delta?.content ?? ''
          if (content) yield content
        } catch {
          // skip malformed chunks
        }
      }
    }
  }
}

/**
 * Non-streaming completion.
 */
export async function completion(
  messages: ApiMessage[],
  config: LLMStreamConfig,
): Promise<string> {
  let full = ''
  for await (const chunk of streamCompletion(messages, config)) {
    full += chunk
  }
  return full
}
