import { cn } from '../ui/cn'

export function getMarkdownBlockContainerClassName(selected?: boolean) {
  return cn(
    'markdown-render max-w-none cursor-pointer rounded-xl px-1 pr-8 text-on-surface outline-none transition-all',
    selected
      ? 'bg-primary/5 ring-2 ring-primary/30 shadow-[inset_0_0_0_1px_rgba(81,97,105,0.08)]'
      : 'hover:bg-surface-container-low/60',
  )
}

export function getMarkdownCodeClassName(className?: string) {
  const isBlockCode = !!className && className.includes('language-')

  return cn(
    'font-mono',
    isBlockCode
      ? 'block text-[13px] leading-6 text-slate-100'
      : 'rounded-md bg-surface-container-high px-1.5 py-0.5 text-[0.92em] text-secondary-dim',
    className,
  )
}

export function isExternalMarkdownLink(href?: string) {
  return !!href && /^(https?:)?\/\//.test(href)
}

export const markdownElementClasses = {
  h1: 'mb-4 mt-2 text-3xl font-display font-semibold tracking-tight text-on-surface',
  h2: 'mb-3 mt-8 text-2xl font-display font-semibold tracking-tight text-on-surface',
  h3: 'mb-3 mt-6 text-xl font-display font-semibold text-on-surface',
  p: 'my-3 text-[15px] leading-7 text-on-surface',
  ul: 'my-4 list-disc space-y-2 pl-6 text-[15px] leading-7 text-on-surface marker:text-on-surface-variant',
  ol: 'my-4 list-decimal space-y-2 pl-6 text-[15px] leading-7 text-on-surface marker:text-on-surface-variant',
  li: 'pl-1',
  blockquote:
    'my-5 rounded-r-2xl border-l-4 border-primary/25 bg-surface-container-low px-4 py-3 text-[15px] italic leading-7 text-on-surface-variant',
  a: 'font-medium text-primary decoration-primary/40 underline underline-offset-4',
  hr: 'my-6 border-outline-variant/60',
  strong: 'font-semibold text-on-surface',
  em: 'text-on-surface',
  pre: 'my-5 overflow-x-auto rounded-2xl border border-outline-variant/50 bg-[#1f2528] px-4 py-3 text-[13px] leading-6 text-slate-100 shadow-sm',
} as const