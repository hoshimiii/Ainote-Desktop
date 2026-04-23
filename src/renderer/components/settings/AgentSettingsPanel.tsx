import { useState, useEffect } from 'react'
import { useChatbotStore } from '../../store'
import { Button } from '../ui'

interface AgentSettingsPanelProps {
  open: boolean
  onClose: () => void
}

export function AgentSettingsPanel({ open, onClose }: AgentSettingsPanelProps) {
  const config = useChatbotStore((s) => s.config)
  const setConfig = useChatbotStore((s) => s.setConfig)

  const [baseurl, setBaseurl] = useState(config.baseurl)
  const [model, setModel] = useState(config.model)
  const [usertoken, setUsertoken] = useState(config.usertoken)
  const [temperature, setTemperature] = useState(config.temperature)
  const [showToken, setShowToken] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setBaseurl(config.baseurl)
      setModel(config.model)
      setUsertoken(config.usertoken)
      setTemperature(config.temperature)
      setTestResult(null)
    }
  }, [open, config])

  if (!open) return null

  const handleSave = () => {
    setConfig({ baseurl, model, usertoken, temperature })
    onClose()
  }

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const result = await window.electronAPI.llm.chat(
        [{ role: 'user', content: 'Hi, respond with "OK" only.' }],
        {
          model,
          temperature,
          baseURL: baseurl,
          apiKey: usertoken,
        },
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30">
      <div
        className="w-[420px] bg-surface rounded-2xl shadow-2xl border border-outline-variant overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-outline-variant">
          <h3 className="text-sm font-semibold text-on-surface">AI 模型设置</h3>
          <button className="p-1 rounded hover:bg-surface-container-high" onClick={onClose}>
            <span className="material-symbols-outlined text-sm text-on-surface-variant">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {/* Base URL */}
          <div>
            <label className="block text-xs font-medium text-on-surface-variant mb-1">Base URL</label>
            <input
              type="text"
              value={baseurl}
              onChange={(e) => setBaseurl(e.target.value)}
              placeholder="https://api.openai.com/v1"
              className="w-full bg-surface-container-high rounded-lg px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          {/* Model */}
          <div>
            <label className="block text-xs font-medium text-on-surface-variant mb-1">模型</label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="gpt-4o"
              className="w-full bg-surface-container-high rounded-lg px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          {/* API Token */}
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

          {/* Temperature */}
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

          {/* Test result */}
          {testResult && (
            <p className={`text-xs ${testResult.startsWith('✓') ? 'text-green-600' : 'text-error'}`}>
              {testResult}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-outline-variant">
          <Button variant="secondary" size="sm" onClick={handleTest} disabled={testing}>
            {testing ? '测试中...' : '测试连接'}
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>取消</Button>
            <Button size="sm" onClick={handleSave}>保存</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
