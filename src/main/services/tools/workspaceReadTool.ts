import type { KanbanPersistedState } from '@shared/kanbanPersistence'
import type { AssistantCapabilityDescriptor } from '../AssistantPlannerModels'
import {
  LIST_INTENT_PATTERN,
  exactMatch,
  extractValue,
  formatBulletList,
  fuzzyMatches,
  getWorkspace,
  normalizeText,
  withId,
} from '../AssistantPlannerShared'

const WORKSPACE_PATTERN = /工作区|workspace/i
const ID_PATTERN = /id|ID|编号/
const QUERY_PATTERN = /查询|查找|搜索/i

function extractWorkspaceNameForId(input: string) {
  return extractValue(input, [
    /(?:查询|查找).*(?:工作区|workspace)\s*[“"]([^”"]+)[”"].*(?:id|ID|编号)/i,
    /(?:工作区|workspace)\s*[“"]([^”"]+)[”"].*(?:id|ID|编号)/i,
  ])
}

export function findWorkspaceMatches(snapshot: KanbanPersistedState, wanted: string) {
  const exact = exactMatch(snapshot.workspaces, (item) => item.name, wanted)
  if (exact) return [exact]
  return fuzzyMatches(snapshot.workspaces, (item) => item.name, wanted)
}

function formatWorkspaceMatches(matches: Array<{ id: string; name: string }>) {
  return formatBulletList('工作区匹配结果', matches.map((workspace) => withId(workspace.name, workspace.id)))
}

export const workspaceReadTool: AssistantCapabilityDescriptor = {
  id: 'workspace-read',
  kind: 'tool',
  label: '读取工作区',
  description: '读取当前工作区、列出全部工作区，或按名称查询工作区 ID。',
  match: ({ input }) => {
    if (!WORKSPACE_PATTERN.test(input)) return null
    if (/当前工作区/i.test(input) && (ID_PATTERN.test(input) || /名称|信息/.test(input))) {
      return { score: 100, signals: ['current-workspace'] }
    }
    if (ID_PATTERN.test(input) || QUERY_PATTERN.test(input)) {
      return { score: 95, signals: ['workspace-query'] }
    }
    if (LIST_INTENT_PATTERN.test(input)) {
      return { score: 90, signals: ['workspace-list'] }
    }
    return null
  },
  plan: ({ input, snapshot }) => {
    const workspaceNameForId = extractWorkspaceNameForId(input)
    if (workspaceNameForId) {
      const matches = findWorkspaceMatches(snapshot, workspaceNameForId)
      if (matches.length === 0) {
        return {
          handled: true,
          response: `未找到工作区“${workspaceNameForId}”。`,
          plan: ['按名称查询工作区'],
        }
      }
      if (matches.length === 1) {
        return {
          handled: true,
          response: `工作区：${matches[0].name}\nid: ${matches[0].id}`,
          plan: ['按名称查询工作区 ID'],
        }
      }
      return {
        handled: true,
        response: `${formatWorkspaceMatches(matches)}\n\n请提供更精确的工作区名称以便读取单个 ID。`,
        plan: ['按名称模糊查询工作区', '等待用户缩小范围'],
      }
    }

    if (/当前工作区/i.test(input) && (ID_PATTERN.test(input) || /名称|信息/.test(input))) {
      const workspace = getWorkspace(snapshot, snapshot.activeWorkSpaceId)
      if (!workspace) {
        return {
          handled: true,
          response: '当前没有激活工作区。',
          plan: ['读取当前工作区上下文'],
        }
      }
      const wantsId = ID_PATTERN.test(input)
      return {
        handled: true,
        response: wantsId
          ? `工作区：${workspace.name}\nid: ${workspace.id}`
          : `当前工作区：${workspace.name}`,
        plan: ['读取当前工作区信息'],
      }
    }

    if (LIST_INTENT_PATTERN.test(input)) {
      return {
        handled: true,
        response: formatBulletList('工作区', snapshot.workspaces.map((workspace) => withId(workspace.name, workspace.id))),
        plan: ['读取工作区列表'],
      }
    }

    const quotedName = extractValue(input, [/(?:工作区|workspace)\s*[“"]([^”"]+)[”"]/i])
    if (quotedName) {
      const matches = findWorkspaceMatches(snapshot, quotedName)
      if (matches.length === 0) {
        return {
          handled: true,
          response: `未找到工作区“${quotedName}”。`,
          plan: ['按名称查询工作区'],
        }
      }
      if (matches.length === 1) {
        return {
          handled: true,
          response: `工作区：${matches[0].name}\nid: ${matches[0].id}`,
          plan: ['按名称读取工作区'],
        }
      }
      return {
        handled: true,
        response: formatWorkspaceMatches(matches),
        plan: ['按名称模糊查询工作区'],
      }
    }

    if (normalizeText(input).includes('工作区')) {
      return {
        handled: true,
        response: formatBulletList('工作区', snapshot.workspaces.map((workspace) => withId(workspace.name, workspace.id))),
        plan: ['读取工作区列表'],
      }
    }

    return null
  },
}
