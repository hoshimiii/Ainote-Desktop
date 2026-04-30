import type { AssistantCapabilityDescriptor } from '../AssistantPlannerModels'
import { learningNoteWorkflow } from './learningNoteWorkflow'
import { taskNoteWorkflow } from './taskNoteWorkflow'
import { wrongAnswerWorkflow } from './wrongAnswerWorkflow'

export const assistantWorkflows: AssistantCapabilityDescriptor[] = [
  wrongAnswerWorkflow,
  learningNoteWorkflow,
  taskNoteWorkflow,
]
