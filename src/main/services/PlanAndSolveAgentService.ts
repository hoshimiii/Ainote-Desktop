import { randomUUID } from "crypto";
import { settingsDao } from "../database";
import {
  executeFormalKanbanCommand,
  normalizeFormalCommandSnapshot,
  type FormalKanbanCommand,
} from "@shared/formalKanbanCommands";

type PlanAndSolveResponse = {
  handled: boolean;
  response: string;
  plan?: string[];
};

const STORE_KEY = "store:kanban";

function loadSnapshot() {
  const raw = settingsDao.get(STORE_KEY);
  if (!raw) return normalizeFormalCommandSnapshot(null);
  try {
    return normalizeFormalCommandSnapshot(JSON.parse(raw));
  } catch {
    return normalizeFormalCommandSnapshot(null);
  }
}

function extractQuotedValue(input: string) {
  const match = input.match(/[“\"]([^“\"]+)[”\"]/);
  return match?.[1]?.trim();
}

function executeAndFormat(command: FormalKanbanCommand, successMessage: string): PlanAndSolveResponse {
  const snapshot = loadSnapshot();
  const result = executeFormalKanbanCommand(snapshot, command);
  if (!result.success) {
    return {
      handled: true,
      response: `正式命令执行失败：${result.error ?? "未知错误"}`,
      plan: [`执行 ${command.kind}`],
    };
  }
  settingsDao.set(STORE_KEY, JSON.stringify(result.snapshot));
  return {
    handled: true,
    response: `${successMessage}（已验证）`,
    plan: [`识别意图：${command.kind}`, `执行正式命令：${command.kind}`, "校验返回结果"],
  };
}

export function runPlanAndSolveAgent(input: string): PlanAndSolveResponse {
  const text = input.trim();
  const quoted = extractQuotedValue(text);
  const snapshot = loadSnapshot();

  if (!quoted) {
    return { handled: false, response: "" };
  }

  if (/创建工作区/.test(text)) {
    return executeAndFormat({ kind: "create_workspace", workspaceId: randomUUID(), workspaceName: quoted }, `已创建工作区“${quoted}”`);
  }

  if (/创建任务区|新建任务区/.test(text)) {
    const workspaceId = snapshot.activeWorkSpaceId ?? snapshot.workspaces[0]?.id;
    if (!workspaceId) {
      return { handled: true, response: "当前没有可用工作区，无法创建任务区。", plan: ["识别意图：create_mission", "发现缺少工作区上下文"] };
    }
    return executeAndFormat({ kind: "create_mission", workspaceId, missionId: randomUUID(), title: quoted }, `已创建任务区“${quoted}”`);
  }

  if (/创建看板|新建看板/.test(text)) {
    const missionId = snapshot.currentMissionId;
    if (!missionId) {
      return { handled: true, response: "当前没有激活的任务区，无法创建看板。", plan: ["识别意图：create_board", "发现缺少任务区上下文"] };
    }
    return executeAndFormat({ kind: "create_board", missionId, boardId: randomUUID(), title: quoted }, `已创建看板“${quoted}”`);
  }

  if (/创建任务|新建任务/.test(text)) {
    const boardId = snapshot.currentBoardId ?? Object.keys(snapshot.boards)[0];
    if (!boardId) {
      return { handled: true, response: "当前没有可用看板，无法创建任务。", plan: ["识别意图：create_task", "发现缺少看板上下文"] };
    }
    return executeAndFormat({ kind: "create_task", boardId, taskId: randomUUID(), title: quoted }, `已创建任务“${quoted}”`);
  }

  if (/创建笔记|新建笔记/.test(text)) {
    const missionId = snapshot.currentMissionId;
    if (!missionId) {
      return { handled: true, response: "当前没有激活的任务区，无法创建笔记。", plan: ["识别意图：create_note", "发现缺少任务区上下文"] };
    }
    return executeAndFormat({ kind: "create_note", missionId, noteId: randomUUID(), title: quoted }, `已创建笔记“${quoted}”`);
  }

  return { handled: false, response: "" };
}

export type { PlanAndSolveResponse };
