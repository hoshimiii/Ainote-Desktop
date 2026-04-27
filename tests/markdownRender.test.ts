import test from 'node:test'
import assert from 'node:assert/strict'
import {
  getMarkdownBlockContainerClassName,
  getMarkdownCodeClassName,
  isExternalMarkdownLink,
  markdownElementClasses,
} from '../src/renderer/components/Note/markdownRender'

test('getMarkdownBlockContainerClassName adds selection emphasis only for selected blocks', () => {
  const selectedClassName = getMarkdownBlockContainerClassName(true)
  const idleClassName = getMarkdownBlockContainerClassName(false)

  assert.match(selectedClassName, /ring-2/)
  assert.match(selectedClassName, /bg-primary\/5/)
  assert.doesNotMatch(idleClassName, /ring-2/)
  assert.match(idleClassName, /hover:bg-surface-container-low\/60/)
})

test('getMarkdownCodeClassName differentiates fenced and inline code treatments', () => {
  const inlineCodeClassName = getMarkdownCodeClassName()
  const fencedCodeClassName = getMarkdownCodeClassName('language-ts')

  assert.match(inlineCodeClassName, /rounded-md/)
  assert.match(inlineCodeClassName, /bg-surface-container-high/)
  assert.doesNotMatch(inlineCodeClassName, /block text-\[13px\]/)
  assert.match(fencedCodeClassName, /block text-\[13px\]/)
  assert.match(fencedCodeClassName, /language-ts/)
})

test('isExternalMarkdownLink only treats http-like links as external', () => {
  assert.equal(isExternalMarkdownLink('https://example.com'), true)
  assert.equal(isExternalMarkdownLink('//example.com'), true)
  assert.equal(isExternalMarkdownLink('/notes/123'), false)
  assert.equal(isExternalMarkdownLink('#section'), false)
  assert.equal(isExternalMarkdownLink(undefined), false)
})

test('markdownElementClasses preserves differentiated typography tokens', () => {
  assert.match(markdownElementClasses.h1, /text-3xl/)
  assert.match(markdownElementClasses.h2, /text-2xl/)
  assert.match(markdownElementClasses.blockquote, /border-l-4/)
  assert.match(markdownElementClasses.pre, /overflow-x-auto/)
})