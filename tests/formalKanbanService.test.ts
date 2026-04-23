import test from "node:test";
import assert from "node:assert/strict";
import { executeFormalKanbanCommand } from "../src/shared/formalKanbanCommands";

const baseState = {
  workspaces: [{ id: "ws-1", name: "工作区", missionIds: ["mission-1"] }],
  activeWorkSpaceId: "ws-1",
  currentMissionId: "mission-1",
  currentNoteId: "note-1",
  currentBoardId: null,
  centerTab: "boards" as const,
  previewMissionId: null,
  missionPanelCollapsed: false,
  listPanelCollapsed: false,
  missions: {
    "mission-1": { id: "mission-1", title: "任务区", boardIds: ["board-1"], noteIds: ["note-1"] },
  },
  boards: {
    "board-1": { id: "board-1", title: "看板", taskIds: ["task-1"] },
  },
  tasks: {
    "task-1": { id: "task-1", title: "任务", description: "", subtasks: [] },
  },
  notes: {
    "note-1": {
      id: "note-1",
      title: "笔记",
      blocks: [{ id: "block-1", type: "markdown", content: "旧内容" }],
    },
  },
  missionOrder: { "ws-1": ["mission-1"] },
  boardOrder: { "mission-1": ["board-1"] },
};

test("desktop formal command can create and rename structures", () => {
  const createdBoard = executeFormalKanbanCommand(baseState, {
    kind: "create_board",
    missionId: "mission-1",
    boardId: "board-2",
    title: "新看板",
  });
  assert.equal(createdBoard.success, true);
  assert.deepEqual(createdBoard.snapshot?.missions["mission-1"].boardIds, ["board-1", "board-2"]);

  const renamedBoard = executeFormalKanbanCommand(createdBoard.snapshot, {
    kind: "rename_board",
    boardId: "board-2",
    newTitle: "已重命名看板",
  });
  assert.equal(renamedBoard.snapshot?.boards["board-2"].title, "已重命名看板");
});

test("desktop formal command rewrites notes and keeps verification details", () => {
  const result = executeFormalKanbanCommand(baseState, {
    kind: "rewrite_note",
    noteId: "note-1",
    blocks: [{ id: "block-2", type: "markdown", content: "新内容" }],
  });

  assert.equal(result.success, true);
  assert.equal(result.verification.verified, true);
  assert.equal(result.snapshot?.notes["note-1"].blocks[0].content, "新内容");
});

test("desktop formal command deletes notes and clears task links", () => {
  const linked = executeFormalKanbanCommand(baseState, {
    kind: "link_task_note",
    taskId: "task-1",
    noteId: "note-1",
  });

  const deleted = executeFormalKanbanCommand(linked.snapshot, {
    kind: "delete_note",
    missionId: "mission-1",
    noteId: "note-1",
  });

  assert.equal(deleted.success, true);
  assert.equal(deleted.snapshot?.notes["note-1"], undefined);
  assert.equal(deleted.snapshot?.tasks["task-1"].linkedNoteId, undefined);
  assert.deepEqual(deleted.snapshot?.missions["mission-1"].noteIds, []);
});
