import type {
  FormalKanbanCommand,
  FormalCommandResult,
} from "@shared/formalKanbanCommands";

export function useKanbanService() {
  return {
    execute: (command: FormalKanbanCommand) =>
      window.electronAPI.kanban.execute(command) as Promise<FormalCommandResult>,
    listContracts: () =>
      window.electronAPI.kanban.contracts(),
  };
}
