import test from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { WindowTitlebar } from '../src/renderer/components/layout/WindowTitlebar'

test('WindowTitlebar renders dedicated drag regions while keeping control clusters isolated', () => {
  const html = renderToStaticMarkup(
    React.createElement(WindowTitlebar, {
      breadcrumb: 'Workspace',
      onBack: () => {},
      actions: React.createElement('button', { type: 'button' }, 'Sync'),
    }),
  )

  assert.match(html, /data-titlebar-drag-region="top-strip"/)
  assert.match(html, /data-titlebar-drag-region="leading"/)
  assert.match(html, /data-titlebar-control-cluster="leading-controls"/)
  assert.match(html, /data-titlebar-control-cluster="actions"/)
  assert.match(html, /data-titlebar-control-cluster="window-controls"/)
})