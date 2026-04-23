import { BrowserWindow } from "electron";
import { settingsDao } from "../database";
import {
  executeFormalKanbanCommand,
  normalizeFormalCommandSnapshot,
  type FormalKanbanCommand,
  type FormalCommandResult,
} from "@shared/formalKanbanCommands";
import { FORMAL_TOOL_CONTRACTS } from "@shared/formalToolContracts";

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

function saveSnapshot(snapshot: NonNullable<FormalCommandResult["snapshot"]>) {
  settingsDao.set(STORE_KEY, JSON.stringify(snapshot));
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send("store-rehydrate");
  }
}

export function listFormalToolContracts() {
  return FORMAL_TOOL_CONTRACTS;
}

export function executeDesktopKanbanFormalCommand(command: FormalKanbanCommand): FormalCommandResult {
  const current = loadSnapshot();
  const result = executeFormalKanbanCommand(current, command);
  if (result.success && result.snapshot) {
    saveSnapshot(result.snapshot);
  }
  return result;
}
