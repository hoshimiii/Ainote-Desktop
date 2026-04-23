import { useState, useEffect } from 'react'
import { useAuthStore } from '../../store'
import { Button, Card } from '../ui'
import { WindowTitlebar } from '../layout/WindowTitlebar'

export function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register' | 'cloud'>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [cloudEmail, setCloudEmail] = useState('')
  const [cloudPassword, setCloudPassword] = useState('')
  const [cloudUrl, setCloudUrl] = useState('')
  const [cloudLoading, setCloudLoading] = useState(false)
  const [cloudSuccess, setCloudSuccess] = useState(false)
  const [users, setUsers] = useState<Array<{ id: string; username: string; displayName: string | null }>>([])

  const login = useAuthStore((s) => s.login)
  const register = useAuthStore((s) => s.register)
  const cloudLogin = useAuthStore((s) => s.cloudLogin)
  const error = useAuthStore((s) => s.error)
  const clearError = useAuthStore((s) => s.clearError)

  useEffect(() => {
    window.electronAPI.auth.listUsers().then(setUsers).catch(() => {})
    // Pre-fill URL if already configured
    window.electronAPI.sync.cloudStatus().then((s) => {
      if (s.baseUrl) setCloudUrl(s.baseUrl)
      if (s.connected && s.email) { setCloudSuccess(true); setCloudEmail(s.email) }
    }).catch(() => {})
  }, [])

  const handleSubmit = async () => {
    if (mode === 'cloud') {
      setCloudLoading(true)
      setCloudSuccess(false)
      await cloudLogin(cloudEmail, cloudPassword, cloudUrl)
      setCloudLoading(false)
      const status = await window.electronAPI.sync.cloudStatus().catch(() => null)
      if (status?.connected) setCloudSuccess(true)
      return
    }
    if (mode === 'register') {
      if (password !== confirmPassword) {
        return
      }
      await register(username, password)
    } else {
      await login(username, password)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit()
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      <WindowTitlebar />

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <span className="material-symbols-outlined text-5xl text-primary mb-2 block">edit_note</span>
            <h1 className="text-2xl font-bold font-display text-on-surface">AiNote</h1>
            <p className="text-sm text-on-surface-variant mt-1">智能笔记 · 知识管理</p>
          </div>

          <Card className="p-6">
            {/* Mode toggle */}
            <div className="flex mb-6 bg-surface-container-high rounded-lg p-0.5">
              <button
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                  mode === 'login' ? 'bg-surface text-on-surface shadow-sm' : 'text-on-surface-variant'
                }`}
                onClick={() => { setMode('login'); clearError() }}
              >
                登录
              </button>
              <button
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                  mode === 'register' ? 'bg-surface text-on-surface shadow-sm' : 'text-on-surface-variant'
                }`}
                onClick={() => { setMode('register'); clearError() }}
              >
                注册
              </button>
              <button
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                  mode === 'cloud' ? 'bg-surface text-on-surface shadow-sm' : 'text-on-surface-variant'
                }`}
                onClick={() => { setMode('cloud'); clearError() }}
              >
                云端
              </button>
            </div>

            {/* Local login/register form */}
            {mode !== 'cloud' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-1">用户名</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full bg-surface-container-high rounded-lg px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
                  placeholder="输入用户名"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-1">密码</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full bg-surface-container-high rounded-lg px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
                  placeholder="输入密码"
                />
              </div>
              {mode === 'register' && (
                <div>
                  <label className="block text-xs font-medium text-on-surface-variant mb-1">确认密码</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-full bg-surface-container-high rounded-lg px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
                    placeholder="再次输入密码"
                  />
                  {password && confirmPassword && password !== confirmPassword && (
                    <p className="text-xs text-error mt-1">密码不一致</p>
                  )}
                </div>
              )}

              {error && <p className="text-xs text-error">{error}</p>}

              <Button
                className="w-full"
                onClick={handleSubmit}
                disabled={!username || !password || (mode === 'register' && password !== confirmPassword)}
              >
                {mode === 'login' ? '登录' : '注册'}
              </Button>
            </div>
            )}

            {/* Cloud login form */}
            {mode === 'cloud' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-1">云端地址</label>
                <input
                  type="text"
                  value={cloudUrl}
                  onChange={(e) => setCloudUrl(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full bg-surface-container-high rounded-lg px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
                  placeholder="https://your-ainote.vercel.app"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-1">邮箱</label>
                <input
                  type="email"
                  value={cloudEmail}
                  onChange={(e) => setCloudEmail(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full bg-surface-container-high rounded-lg px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
                  placeholder="your@email.com"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-1">密码</label>
                <input
                  type="password"
                  value={cloudPassword}
                  onChange={(e) => setCloudPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full bg-surface-container-high rounded-lg px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
                  placeholder="云端密码"
                />
              </div>

              {error && <p className="text-xs text-error">{error}</p>}
              {cloudSuccess && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                  <span className="material-symbols-outlined text-sm text-green-600">check_circle</span>
                  <p className="text-xs text-green-700">已连接云端：{cloudEmail}</p>
                </div>
              )}

              <Button
                className="w-full"
                onClick={handleSubmit}
                disabled={cloudLoading || (!cloudEmail || !cloudPassword || !cloudUrl)}
              >
                {cloudLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    连接中...
                  </span>
                ) : cloudSuccess ? '重新连接' : '连接云端'}
              </Button>
              <p className="text-[10px] text-on-surface-variant text-center">
                连接后可同步数据到云端，支持多端访问
              </p>
            </div>
            )}
          </Card>

          {/* Quick user switch */}
          {users.length > 0 && mode === 'login' && (
            <div className="mt-6">
              <p className="text-xs text-on-surface-variant text-center mb-3">快速切换用户</p>
              <div className="space-y-1">
                {users.map((u) => (
                  <button
                    key={u.id}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-surface-container-high transition-colors"
                    onClick={() => setUsername(u.username)}
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-xs font-medium text-primary">{u.username[0]?.toUpperCase()}</span>
                    </div>
                    <span className="text-sm text-on-surface">{u.displayName ?? u.username}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
