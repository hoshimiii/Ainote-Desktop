import {
  executeFormalKanbanCommand,
  type FormalKanbanCommand,
  type FormalCommandResult,
} from "@shared/formalKanbanCommands";
import { FORMAL_TOOL_CONTRACTS } from "@shared/formalToolContracts";
import { loadKanbanSnapshot, saveKanbanSnapshot } from './KanbanSnapshotStore'

export function listFormalToolContracts() {
  return FORMAL_TOOL_CONTRACTS;
}

export function executeDesktopKanbanFormalCommand(command: FormalKanbanCommand): FormalCommandResult {
  const current = loadKanbanSnapshot();
  const result = executeFormalKanbanCommand(current, command);
  if (result.success && result.snapshot) {
    saveKanbanSnapshot(result.snapshot);
  }
  return result;
}
