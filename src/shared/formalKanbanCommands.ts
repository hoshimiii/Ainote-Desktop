import type { Block } from "@shared/types";
import {
  normalizePersistedKanbanState,
  type KanbanPersistedState,
} from "@shared/kanbanPersistence";
import type { FormalCommandKind } from "@shared/formalToolContracts";

export type FormalCommandVerification = {
  verified: boolean;
  details: string[];
};

export type FormalCommandResult = {
  success: boolean;
  commandKind: FormalCommandKind;
  affectedIds: Record<string, string | undefined>;
  verification: FormalCommandVerification;
  snapshot?: KanbanPersistedState;
  error?: string;
};

export type FormalKanbanCommand =
  | { kind: "create_workspace"; workspaceId: string; workspaceName: string }
  | { kind: "rename_workspace"; workspaceId: string; newName: string }
  | { kind: "delete_workspace"; workspaceId: string }
  | { kind: "create_mission"; workspaceId: string; missionId: string; title: string }
  | { kind: "rename_mission"; missionId: string; newTitle: string }
  | { kind: "delete_mission"; missionId: string }
  | { kind: "create_board"; missionId: string; boardId: string; title: string }
  | { kind: "rename_board"; boardId: string; newTitle: string }
  | { kind: "delete_board"; boardId: string }
  | { kind: "create_task"; boardId: string; taskId: string; title: string }
  | { kind: "rename_task"; boardId: string; taskId: string; newTitle: string }
  | { kind: "delete_task"; boardId: string; taskId: string }
  | { kind: "create_subtask"; boardId: string; taskId: string; subTaskId: string; title: string }
  | { kind: "rename_subtask"; boardId: string; taskId: string; subTaskId: string; newTitle: string }
  | { kind: "delete_subtask"; boardId: string; taskId: string; subTaskId: string }
  | { kind: "create_note"; missionId: string; noteId: string; title: string }
  | { kind: "rename_note"; missionId: string; noteId: string; newTitle: string }
  | { kind: "delete_note"; missionId: string; noteId: string }
  | { kind: "link_task_note"; taskId: string; noteId?: string; subTaskId?: string; blockId?: string }
  | { kind: "link_block"; noteId: string; blockId: string; boardId: string; taskId: string; subTaskId?: string }
  | { kind: "rewrite_note"; noteId: string; blocks: Block[] };

const createEmptyState = (): KanbanPersistedState => ({
  workspaces: [],
  activeWorkSpaceId: null,
  currentMissionId: null,
  currentNoteId: null,
  currentBoardId: null,
  centerTab: "boards",
  previewMissionId: null,
  missionPanelCollapsed: false,
  listPanelCollapsed: false,
  missions: {},
  boards: {},
  tasks: {},
  notes: {},
  missionOrder: {},
  boardOrder: {},
});

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const ok = (
  commandKind: FormalCommandKind,
  snapshot: KanbanPersistedState,
  affectedIds: Record<string, string | undefined>,
  details: string[],
): FormalCommandResult => ({
  success: true,
  commandKind,
  affectedIds,
  snapshot,
  verification: { verified: true, details },
});

const fail = (commandKind: FormalCommandKind, error: string): FormalCommandResult => ({
  success: false,
  commandKind,
  affectedIds: {},
  error,
  verification: { verified: false, details: [error] },
});

const ensureState = (state?: KanbanPersistedState | null) => clone(state ?? createEmptyState());

function removeNoteLinks(snapshot: KanbanPersistedState, noteId: string, blockIds: string[]) {
  const blockIdSet = new Set(blockIds);
  for (const task of Object.values(snapshot.tasks)) {
    if (task.linkedNoteId === noteId) task.linkedNoteId = undefined;
    task.subtasks = task.subtasks.map((subtask) => ({
      ...subtask,
      noteId: subtask.noteId === noteId ? undefined : subtask.noteId,
      blockId: subtask.blockId && blockIdSet.has(subtask.blockId) ? undefined : subtask.blockId,
    }));
  }
}

function removeTaskLinks(snapshot: KanbanPersistedState, taskId: string, subTaskIds: string[]) {
  const subTaskIdSet = new Set(subTaskIds);
  for (const note of Object.values(snapshot.notes)) {
    note.blocks = note.blocks.map((block) => ({
      ...block,
      linkedTaskId: block.linkedTaskId === taskId ? undefined : block.linkedTaskId,
      linkedSubTaskId: block.linkedSubTaskId && subTaskIdSet.has(block.linkedSubTaskId)
        ? undefined
        : block.linkedSubTaskId,
    }));
  }
}

export function executeFormalKanbanCommand(
  persistedState: KanbanPersistedState | null | undefined,
  command: FormalKanbanCommand,
): FormalCommandResult {
  const snapshot = ensureState(persistedState);

  switch (command.kind) {
    case "create_workspace": {
      snapshot.workspaces.push({ id: command.workspaceId, name: command.workspaceName, missionIds: [] });
      snapshot.missionOrder[command.workspaceId] = snapshot.missionOrder[command.workspaceId] ?? [];
      return ok(command.kind, snapshot, { workspaceId: command.workspaceId }, ["工作区已创建"]);
    }
    case "rename_workspace": {
      const workspace = snapshot.workspaces.find((item) => item.id === command.workspaceId);
      if (!workspace) return fail(command.kind, `Workspace ${command.workspaceId} not found`);
      workspace.name = command.newName;
      return ok(command.kind, snapshot, { workspaceId: command.workspaceId }, ["工作区名称已更新"]);
    }
    case "delete_workspace": {
      const workspace = snapshot.workspaces.find((item) => item.id === command.workspaceId);
      if (!workspace) return fail(command.kind, `Workspace ${command.workspaceId} not found`);
      for (const missionId of workspace.missionIds) {
        const mission = snapshot.missions[missionId];
        for (const boardId of mission?.boardIds ?? []) {
          const board = snapshot.boards[boardId];
          for (const taskId of board?.taskIds ?? []) {
            const task = snapshot.tasks[taskId];
            removeTaskLinks(snapshot, taskId, task?.subtasks.map((subtask) => subtask.id) ?? []);
            delete snapshot.tasks[taskId];
          }
          delete snapshot.boards[boardId];
        }
        for (const noteId of mission?.noteIds ?? []) {
          const note = snapshot.notes[noteId];
          removeNoteLinks(snapshot, noteId, note?.blocks.map((block) => block.id) ?? []);
          delete snapshot.notes[noteId];
        }
        delete snapshot.missions[missionId];
        delete snapshot.boardOrder[missionId];
      }
      snapshot.workspaces = snapshot.workspaces.filter((item) => item.id !== command.workspaceId);
      delete snapshot.missionOrder[command.workspaceId];
      if (snapshot.activeWorkSpaceId === command.workspaceId) snapshot.activeWorkSpaceId = null;
      return ok(command.kind, snapshot, { workspaceId: command.workspaceId }, ["工作区及其下属结构已删除"]);
    }
    case "create_mission": {
      const workspace = snapshot.workspaces.find((item) => item.id === command.workspaceId);
      if (!workspace) return fail(command.kind, `Workspace ${command.workspaceId} not found`);
      snapshot.missions[command.missionId] = { id: command.missionId, title: command.title, boardIds: [], noteIds: [] };
      workspace.missionIds = [...workspace.missionIds, command.missionId];
      snapshot.missionOrder[command.workspaceId] = [...(snapshot.missionOrder[command.workspaceId] ?? []), command.missionId];
      snapshot.boardOrder[command.missionId] = [];
      snapshot.currentMissionId = command.missionId;
      return ok(command.kind, snapshot, { workspaceId: command.workspaceId, missionId: command.missionId }, ["任务区已创建"]);
    }
    case "rename_mission": {
      const mission = snapshot.missions[command.missionId];
      if (!mission) return fail(command.kind, `Mission ${command.missionId} not found`);
      mission.title = command.newTitle;
      return ok(command.kind, snapshot, { missionId: command.missionId }, ["任务区名称已更新"]);
    }
    case "delete_mission": {
      const mission = snapshot.missions[command.missionId];
      if (!mission) return fail(command.kind, `Mission ${command.missionId} not found`);
      for (const boardId of mission.boardIds) {
        const board = snapshot.boards[boardId];
        for (const taskId of board?.taskIds ?? []) {
          const task = snapshot.tasks[taskId];
          removeTaskLinks(snapshot, taskId, task?.subtasks.map((subtask) => subtask.id) ?? []);
          delete snapshot.tasks[taskId];
        }
        delete snapshot.boards[boardId];
      }
      for (const noteId of mission.noteIds) {
        const note = snapshot.notes[noteId];
        removeNoteLinks(snapshot, noteId, note?.blocks.map((block) => block.id) ?? []);
        delete snapshot.notes[noteId];
      }
      delete snapshot.missions[command.missionId];
      delete snapshot.boardOrder[command.missionId];
      for (const workspace of snapshot.workspaces) {
        workspace.missionIds = workspace.missionIds.filter((id) => id !== command.missionId);
      }
      for (const workspaceId of Object.keys(snapshot.missionOrder)) {
        snapshot.missionOrder[workspaceId] = snapshot.missionOrder[workspaceId].filter((id) => id !== command.missionId);
      }
      if (snapshot.currentMissionId === command.missionId) snapshot.currentMissionId = null;
      return ok(command.kind, snapshot, { missionId: command.missionId }, ["任务区已删除"]);
    }
    case "create_board": {
      const mission = snapshot.missions[command.missionId];
      if (!mission) return fail(command.kind, `Mission ${command.missionId} not found`);
      snapshot.boards[command.boardId] = { id: command.boardId, title: command.title, taskIds: [] };
      mission.boardIds = [...mission.boardIds, command.boardId];
      snapshot.boardOrder[command.missionId] = [...(snapshot.boardOrder[command.missionId] ?? []), command.boardId];
      return ok(command.kind, snapshot, { missionId: command.missionId, boardId: command.boardId }, ["看板已创建"]);
    }
    case "rename_board": {
      const board = snapshot.boards[command.boardId];
      if (!board) return fail(command.kind, `Board ${command.boardId} not found`);
      board.title = command.newTitle;
      return ok(command.kind, snapshot, { boardId: command.boardId }, ["看板名称已更新"]);
    }
    case "delete_board": {
      const board = snapshot.boards[command.boardId];
      if (!board) return fail(command.kind, `Board ${command.boardId} not found`);
      for (const taskId of board.taskIds) {
        const task = snapshot.tasks[taskId];
        removeTaskLinks(snapshot, taskId, task?.subtasks.map((subtask) => subtask.id) ?? []);
        delete snapshot.tasks[taskId];
      }
      delete snapshot.boards[command.boardId];
      for (const mission of Object.values(snapshot.missions)) {
        mission.boardIds = mission.boardIds.filter((id) => id !== command.boardId);
      }
      for (const missionId of Object.keys(snapshot.boardOrder)) {
        snapshot.boardOrder[missionId] = snapshot.boardOrder[missionId].filter((id) => id !== command.boardId);
      }
      return ok(command.kind, snapshot, { boardId: command.boardId }, ["看板已删除"]);
    }
    case "create_task": {
      const board = snapshot.boards[command.boardId];
      if (!board) return fail(command.kind, `Board ${command.boardId} not found`);
      snapshot.tasks[command.taskId] = { id: command.taskId, title: command.title, description: "", subtasks: [] };
      board.taskIds = [...board.taskIds, command.taskId];
      return ok(command.kind, snapshot, { boardId: command.boardId, taskId: command.taskId }, ["任务已创建"]);
    }
    case "rename_task": {
      const task = snapshot.tasks[command.taskId];
      if (!task) return fail(command.kind, `Task ${command.taskId} not found`);
      task.title = command.newTitle;
      return ok(command.kind, snapshot, { boardId: command.boardId, taskId: command.taskId }, ["任务名称已更新"]);
    }
    case "delete_task": {
      const task = snapshot.tasks[command.taskId];
      const board = snapshot.boards[command.boardId];
      if (!task || !board) return fail(command.kind, `Task ${command.taskId} not found`);
      removeTaskLinks(snapshot, command.taskId, task.subtasks.map((subtask) => subtask.id));
      board.taskIds = board.taskIds.filter((id) => id !== command.taskId);
      delete snapshot.tasks[command.taskId];
      return ok(command.kind, snapshot, { boardId: command.boardId, taskId: command.taskId }, ["任务已删除"]);
    }
    case "create_subtask": {
      const task = snapshot.tasks[command.taskId];
      if (!task) return fail(command.kind, `Task ${command.taskId} not found`);
      task.subtasks = [...task.subtasks, { id: command.subTaskId, title: command.title, done: false }];
      return ok(command.kind, snapshot, { taskId: command.taskId, subTaskId: command.subTaskId }, ["子任务已创建"]);
    }
    case "rename_subtask": {
      const task = snapshot.tasks[command.taskId];
      if (!task) return fail(command.kind, `Task ${command.taskId} not found`);
      task.subtasks = task.subtasks.map((subtask) =>
        subtask.id === command.subTaskId ? { ...subtask, title: command.newTitle } : subtask,
      );
      return ok(command.kind, snapshot, { taskId: command.taskId, subTaskId: command.subTaskId }, ["子任务名称已更新"]);
    }
    case "delete_subtask": {
      const task = snapshot.tasks[command.taskId];
      if (!task) return fail(command.kind, `Task ${command.taskId} not found`);
      removeTaskLinks(snapshot, command.taskId, [command.subTaskId]);
      task.subtasks = task.subtasks.filter((subtask) => subtask.id !== command.subTaskId);
      return ok(command.kind, snapshot, { taskId: command.taskId, subTaskId: command.subTaskId }, ["子任务已删除"]);
    }
    case "create_note": {
      const mission = snapshot.missions[command.missionId];
      if (!mission) return fail(command.kind, `Mission ${command.missionId} not found`);
      snapshot.notes[command.noteId] = { id: command.noteId, title: command.title, blocks: [] };
      mission.noteIds = [...mission.noteIds, command.noteId];
      snapshot.currentMissionId = command.missionId;
      snapshot.currentNoteId = command.noteId;
      return ok(command.kind, snapshot, { missionId: command.missionId, noteId: command.noteId }, ["笔记已创建"]);
    }
    case "rename_note": {
      const note = snapshot.notes[command.noteId];
      if (!note) return fail(command.kind, `Note ${command.noteId} not found`);
      note.title = command.newTitle;
      return ok(command.kind, snapshot, { missionId: command.missionId, noteId: command.noteId }, ["笔记名称已更新"]);
    }
    case "delete_note": {
      const note = snapshot.notes[command.noteId];
      const mission = snapshot.missions[command.missionId];
      if (!note || !mission) return fail(command.kind, `Note ${command.noteId} not found`);
      removeNoteLinks(snapshot, command.noteId, note.blocks.map((block) => block.id));
      mission.noteIds = mission.noteIds.filter((id) => id !== command.noteId);
      delete snapshot.notes[command.noteId];
      if (snapshot.currentNoteId === command.noteId) snapshot.currentNoteId = null;
      return ok(command.kind, snapshot, { missionId: command.missionId, noteId: command.noteId }, ["笔记已删除"]);
    }
    case "link_task_note": {
      const task = snapshot.tasks[command.taskId];
      if (!task) return fail(command.kind, `Task ${command.taskId} not found`);
      task.linkedNoteId = command.noteId;
      if (command.subTaskId) {
        task.subtasks = task.subtasks.map((subtask) =>
          subtask.id === command.subTaskId
            ? { ...subtask, noteId: command.noteId, blockId: command.blockId }
            : subtask,
        );
      }
      return ok(command.kind, snapshot, { taskId: command.taskId, noteId: command.noteId, subTaskId: command.subTaskId }, ["任务链接已更新"]);
    }
    case "link_block": {
      const note = snapshot.notes[command.noteId];
      const task = snapshot.tasks[command.taskId];
      if (!note || !task) return fail(command.kind, "Link target not found");
      note.blocks = note.blocks.map((block) =>
        block.id === command.blockId
          ? {
              ...block,
              linkedBoardId: command.boardId,
              linkedTaskId: command.taskId,
              linkedSubTaskId: command.subTaskId,
            }
          : block,
      );
      if (command.subTaskId) {
        task.subtasks = task.subtasks.map((subtask) =>
          subtask.id === command.subTaskId
            ? { ...subtask, noteId: command.noteId, blockId: command.blockId }
            : subtask,
        );
      }
      return ok(command.kind, snapshot, { noteId: command.noteId, blockId: command.blockId, taskId: command.taskId }, ["块链接已更新"]);
    }
    case "rewrite_note": {
      const note = snapshot.notes[command.noteId];
      if (!note) return fail(command.kind, `Note ${command.noteId} not found`);
      note.blocks = command.blocks;
      return ok(command.kind, snapshot, { noteId: command.noteId }, ["笔记内容已重写"]);
    }
    default:
      return fail(command, "Unsupported command");
  }
}

export function normalizeFormalCommandSnapshot(snapshot: KanbanPersistedState | null | undefined) {
  return normalizePersistedKanbanState(snapshot ?? createEmptyState());
}
