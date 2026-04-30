import type { Block } from '@shared/types'

export interface DragOverlayMeta {
  icon: string
  label: string
  detail?: string
}

function compactPreview(content: string): string {
  return content.replace(/\s+/g, ' ').trim().slice(0, 56)
}

function formatLanguageLabel(language?: string): string {
  if (!language) return 'Code'
  return language
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export function getBlockDragOverlayMeta(block?: Block): DragOverlayMeta {
  if (!block) {
    return {
      icon: 'article',
      label: '内容块',
      detail: '拖拽以重新排序',
    }
  }

  const preview = compactPreview(block.content)

  if (block.type === 'code') {
    return {
      icon: 'code',
      label: `${formatLanguageLabel(block.language)} 代码块`,
      detail: preview || '空代码块',
    }
  }

  return {
    icon: 'notes',
    label: 'Markdown 块',
    detail: preview || '空文本块',
  }
}
