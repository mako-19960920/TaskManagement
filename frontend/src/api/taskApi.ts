// API（/api/tasks）の呼び出し。失敗したら Error を投げる
import { cardFromTask, columnIds, columnsFromTasks, columnToStatus, validDate } from "../lib/board";
import type { Board, Card, SearchConditions, SearchResult, TaskCreateRequest, TaskResponse } from "../types/task";

// 全件を読み、3列に分けて返す
export async function fetchBoard(): Promise<Board> {
  const response = await fetch("/api/tasks");
  if (!response.ok) {
    throw new Error("load failed");
  }
  return columnsFromTasks(await response.json());
}

// タスクを1件登録し、登録できたカード（id 付き）を返す
export async function createTask(request: TaskCreateRequest): Promise<Card> {
  const response = await fetch("/api/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  if (!response.ok) {
    throw new Error("create failed");
  }
  const task: TaskResponse = await response.json();
  return cardFromTask(task);
}

// 3列ぶんのカードで、タスクをまとめて置き換える。応答のカードには送った key が付く
export async function saveBoard(board: Board): Promise<Board> {
  const tasks: TaskResponse[] = [];
  for (const id of columnIds) {
    board[id].forEach((card, position) => {
      const title = typeof card.text === "string" ? card.text.trim() : "";
      if (title === "") {
        return;
      }
      tasks.push({
        id: card.id,
        key: card.key,
        title,
        dueDate: validDate(card.date) ? card.date : null,
        status: columnToStatus[id],
        position,
      });
    });
  }
  const response = await fetch("/api/tasks", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(tasks),
  });
  if (!response.ok) {
    throw new Error("save failed");
  }
  return columnsFromTasks(await response.json());
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
  const response = await fetch(`/api/tasks/search?${params}`);
  if (!response.ok) {
    throw new Error("search failed");
  }
  const tasks: unknown = await response.json();
  return { columns: columnsFromTasks(tasks), count: Array.isArray(tasks) ? tasks.length : 0 };
}
