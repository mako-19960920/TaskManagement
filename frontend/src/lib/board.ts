// ボードを組み替える処理。画面（React）にも API にも依存しない
import type { Board, Card, ColumnId, Priority, TaskResponse, TaskStatus } from "../types/task";

// タイトルの最大の文字数（サーバーとデータベースの上限と同じ）
export const TITLE_MAX = 255;

// 左から並べる3列
export const columns: { id: ColumnId; title: string; moveLabel: string }[] = [
  { id: "todo-cards", title: "やること", moveLabel: "やることへ" },
  { id: "doing-cards", title: "進行中", moveLabel: "進行中へ" },
  { id: "done-cards", title: "完了", moveLabel: "完了へ" },
];

export const columnIds: ColumnId[] = columns.map((column) => column.id);

const statusToColumn: Record<string, ColumnId | undefined> = {
  todo: "todo-cards",
  in_progress: "doing-cards",
  done: "done-cards",
};

export const columnToStatus: Record<ColumnId, TaskStatus> = {
  "todo-cards": "todo",
  "doing-cards": "in_progress",
  "done-cards": "done",
};

export function emptyBoard(): Board {
  return {
    "todo-cards": [],
    "doing-cards": [],
    "done-cards": [],
  };
}

export function validDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

// 「2026-10-26」を「2026年10月26日」にする。形が違えば空
export function formatCardDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return "";
  }
  return `${match[1]}年${Number(match[2])}月${Number(match[3])}日`;
}

// 優先度の表示名（高い順）
export const priorities: { value: Priority; label: string }[] = [
  { value: "high", label: "高" },
  { value: "medium", label: "中" },
  { value: "low", label: "低" },
];

export function priorityLabel(priority: Priority): string {
  return priorities.find((item) => item.value === priority)?.label ?? "中";
}

// 優先度の文字を確かめて Priority にする。high・low 以外は medium
export function toPriority(value: unknown): Priority {
  return value === "high" || value === "low" ? value : "medium";
}

// 「2026-11-02T08:12:26.71」を「2026/11/2 8:12」にする。形が違えば空
export function formatDateTime(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (!match) {
    return "";
  }
  return `${match[1]}/${Number(match[2])}/${Number(match[3])} ${Number(match[4])}:${match[5]}`;
}

// API のタスク1件を、画面のカードにする
export function cardFromTask(task: TaskResponse): Card {
  return {
    id: task.id ?? null,
    // 画面の中でカードを見分ける目印。保存済みなら id、まだなければ作る
    key: task.id == null ? crypto.randomUUID() : String(task.id),
    text: task.title,
    date: validDate(task.dueDate) ? task.dueDate : "",
    hidden: task.hidden === true,
    description: task.description ?? "",
    priority: toPriority(task.priority),
    createdAt: task.createdAt ?? "",
    updatedAt: task.updatedAt ?? "",
  };
}

// API のタスクの配列を、status と position で3列に分ける
export function columnsFromTasks(tasks: unknown): Board {
  const board = emptyBoard();
  const items: TaskResponse[] = Array.isArray(tasks) ? tasks : [];
  const sorted = items
    .filter((item) => item && typeof item.title === "string")
    .toSorted((left, right) => (left.position ?? 0) - (right.position ?? 0));
  for (const item of sorted) {
    const columnId = statusToColumn[item.status];
    if (!columnId) {
      continue;
    }
    board[columnId].push(cardFromTask(item));
  }
  return board;
}

// key のカードの一部の値を変える
export function patchCard(board: Board, key: string, patch: Partial<Card>): Board {
  const next = emptyBoard();
  for (const id of columnIds) {
    next[id] = board[id].map((card) => (card.key === key ? { ...card, ...patch } : card));
  }
  return next;
}

// id のカードと、それがある列を探す
export function findById(board: Board, id: number): { card: Card; columnId: ColumnId } | null {
  for (const columnId of columnIds) {
    const card = board[columnId].find((item) => item.id === id);
    if (card) {
      return { card, columnId };
    }
  }
  return null;
}

// key のカードを targetId の列へ移す。beforeKey があればその前、なければ末尾に入れる
export function moveCard(board: Board, key: string, targetId: ColumnId, beforeKey: string | null): Board {
  const moving = findCard(board, key);
  if (!moving) {
    return board;
  }
  // いったん外してから、行き先の列に入れる（removeCard は新しい配列を作るので、元のボードは変わらない）
  const next = removeCard(board, key);
  const list = next[targetId];
  const index = beforeKey ? list.findIndex((card) => card.key === beforeKey) : -1;
  next[targetId] = index === -1 ? [...list, moving] : list.toSpliced(index, 0, moving);
  return next;
}

export function removeCard(board: Board, key: string): Board {
  const next = emptyBoard();
  for (const id of columnIds) {
    next[id] = board[id].filter((card) => card.key !== key);
  }
  return next;
}

export function changeCardDate(board: Board, key: string, date: string): Board {
  const valid = validDate(date) ? date : "";
  const next = emptyBoard();
  for (const id of columnIds) {
    next[id] = board[id].map((card) => (card.key === key ? { ...card, date: valid } : card));
  }
  return next;
}

export function setCardHidden(board: Board, key: string, hidden: boolean): Board {
  const next = emptyBoard();
  for (const id of columnIds) {
    next[id] = board[id].map((card) => (card.key === key ? { ...card, hidden } : card));
  }
  return next;
}

// ボードに出すカード（非表示のカードを除く）。並びはそのまま
export function visibleBoard(board: Board): Board {
  const next = emptyBoard();
  for (const id of columnIds) {
    next[id] = board[id].filter((card) => !card.hidden);
  }
  return next;
}

// 非表示のカードを、列の順（やること → 進行中 → 完了）、列の中の並び順で返す
export function hiddenCards(board: Board): { card: Card; columnId: ColumnId }[] {
  return columnIds.flatMap((columnId) =>
    board[columnId].filter((card) => card.hidden).map((card) => ({ card, columnId }))
  );
}

export function appendCard(board: Board, columnId: ColumnId, card: Card): Board {
  return { ...board, [columnId]: [...board[columnId], card] };
}

export function findCard(board: Board, key: string): Card | null {
  for (const id of columnIds) {
    const found = board[id].find((card) => card.key === key);
    if (found) {
      return found;
    }
  }
  return null;
}

// 検索結果のカードと同じカードを、ボードの中から探して key を返す（保存済みなら id で探す）
export function findBoardKey(board: Board, target: Card): string | null {
  for (const id of columnIds) {
    const found = board[id].find((card) => (target.id != null ? card.id === target.id : card.key === target.key));
    if (found) {
      return found.key;
    }
  }
  return null;
}
