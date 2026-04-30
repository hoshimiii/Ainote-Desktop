import type { AssistantCapabilityDescriptor } from '../AssistantPlannerModels'
import { deleteEntitiesTool } from './deleteEntitiesTool'
import { listEntitiesTool } from './listEntitiesTool'
import { renameEntitiesTool } from './renameEntitiesTool'
import { simpleCreateTool } from './simpleCreateTool'
import { workspaceReadTool } from './workspaceReadTool'

export const assistantTools: AssistantCapabilityDescriptor[] = [
  workspaceReadTool,
  listEntitiesTool,
  renameEntitiesTool,
  deleteEntitiesTool,
  simpleCreateTool,
]
