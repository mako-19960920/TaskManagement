// API（/api/tasks）の呼び出し。失敗したら ApiError（HTTP のステータス付き）を投げる。
// 書き込みは、どれも1件だけを変える（ほかの画面で追加したタスクを消さないため）
import { cardFromTask, columnsFromTasks, columnToStatus } from "../lib/board";
import type {
  Board,
  Card,
  ColumnId,
  SearchConditions,
  SearchResult,
  TaskCreateRequest,
  TaskResponse,
  TaskUpdateRequest,
} from "../types/task";

// API が失敗したとき。status はサーバーが返した数字（つながらなかったときは 0）
export class ApiError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`API の呼び出しに失敗しました（${status}）`);
    this.status = status;
  }
}

async function call(url: string, init?: RequestInit): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch {
    throw new ApiError(0);
  }
  if (!response.ok) {
    throw new ApiError(response.status);
  }
  return response;
}

// 本体を JSON で送り、応答のタスクをカードにして返す
async function send(url: string, method: string, body: unknown): Promise<Card> {
  const response = await call(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const task: TaskResponse = await response.json();
  return cardFromTask(task);
}

// 全件を読み、3列に分けて返す
export async function fetchBoard(): Promise<Board> {
  const response = await call("/api/tasks");
  return columnsFromTasks(await response.json());
}

// タスクを1件登録し、登録できたカード（id 付き）を返す（POST /api/tasks）
export function createTask(request: TaskCreateRequest): Promise<Card> {
  return send("/api/tasks", "POST", request);
}

// タスクを1件編集し（タイトル・説明・優先度・期限）、編集後のカードを返す（PUT /api/tasks/{id}）
export function updateTask(id: number, request: TaskUpdateRequest): Promise<Card> {
  return send(`/api/tasks/${id}`, "PUT", request);
}

// タスクを1件、columnId の列の beforeId のタスクの前へ移す。null なら末尾（PUT /api/tasks/{id}/position）
export function moveTask(id: number, columnId: ColumnId, beforeId: number | null): Promise<Card> {
  return send(`/api/tasks/${id}/position`, "PUT", { status: columnToStatus[columnId], beforeId });
}

// 期限だけを変える。null なら期限なし（PUT /api/tasks/{id}/due-date）
export function changeTaskDueDate(id: number, dueDate: string | null): Promise<Card> {
  return send(`/api/tasks/${id}/due-date`, "PUT", { dueDate });
}

// 非表示かどうかだけを変える（PUT /api/tasks/{id}/hidden）
export function changeTaskHidden(id: number, hidden: boolean): Promise<Card> {
  return send(`/api/tasks/${id}/hidden`, "PUT", { hidden });
}

// タスクを1件削除する（DELETE /api/tasks/{id}）
export async function deleteTask(id: number): Promise<void> {
  await call(`/api/tasks/${id}`, { method: "DELETE" });
}

// 条件に合うタスクを3列に分けて返す。空の条件は送らない
export async function searchBoard(conditions: SearchConditions): Promise<SearchResult> {
  const params = new URLSearchParams();
  for (const [name, value] of Object.entries(conditions)) {
    const text = typeof value === "string" ? value.trim() : "";
    if (text !== "") {
      params.set(name, text);
    }
  }
  const response = await call(`/api/tasks/search?${params}`);
  const tasks: unknown = await response.json();
  return { columns: columnsFromTasks(tasks), count: Array.isArray(tasks) ? tasks.length : 0 };
}
