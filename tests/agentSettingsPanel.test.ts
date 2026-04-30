import test from 'node:test'
import assert from 'node:assert/strict'

function installRendererWindowMock() {
  ;(globalThis as { window?: unknown }).window = {
    electronAPI: {
      store: {
        get: async () => null,
        set: async () => undefined,
        reset: async () => undefined,
        onRehydrate: () => () => {},
      },
      sync: {
        onTransientRecovery: () => () => {},
        cloudStatus: async () => ({ connected: false, email: null, baseUrl: null }),
      },
      auth: {
        currentUser: async () => null,
      },
      dialog: {
        getShortcutSettings: async () => ({ enabled: true, accelerator: 'Shift+Alt+Space' }),
        getShortcutStatus: async () => ({ enabled: true, accelerator: 'Shift+Alt+Space', isRegistered: true }),
        updateShortcutSettings: async () => ({ enabled: true, accelerator: 'Shift+Alt+Space', isRegistered: true }),
        onShortcutStatusChange: () => () => {},
      },
      llm: {
        chat: async () => 'OK',
      },
      kanban: {
        planAndSolve: async () => ({ handled: false, response: '' }),
      },
    },
  } as unknown as Window
}

test('AgentSettingsPanel renders a visible modal footer with validation and save actions', async () => {
  installRendererWindowMock()

  const React = await import('react')
  const { renderToStaticMarkup } = await import('react-dom/server')
  const { AgentSettingsPanel } = await import('../src/renderer/components/settings/AgentSettingsPanel')

  const html = renderToStaticMarkup(
    React.createElement(AgentSettingsPanel, {
      open: true,
      onClose: () => {},
    }),
  )

  assert.match(html, />测试连接</)
  assert.match(html, />取消</)
  assert.match(html, />保存</)
  assert.match(html, /max-h-\[calc\(100vh-2rem\)\]/)
  assert.match(html, /min-h-0 flex-1/)
  assert.match(html, /shrink-0 items-center justify-between border-t/)
})