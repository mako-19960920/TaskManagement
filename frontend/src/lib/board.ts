// ボードを組み替える処理。画面（React）にも API にも依存しない
import type { Board, Card, ColumnId, TaskResponse, TaskStatus } from "../types/task";

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

// API のタスク1件を、画面のカードにする
export function cardFromTask(task: TaskResponse): Card {
  return {
    id: task.id ?? null,
    key: task.key || (task.id == null ? crypto.randomUUID() : String(task.id)),
    text: task.title,
    date: validDate(task.dueDate) ? task.dueDate : "",
  };
}

// API のタスクの配列を、status と position で3列に分ける
export function columnsFromTasks(tasks: unknown): Board {
  const board = emptyBoard();
  const items: TaskResponse[] = Array.isArray(tasks) ? tasks : [];
  const sorted = items
    .filter((item) => item && typeof item.title === "string")
    .sort((left, right) => (left.position ?? 0) - (right.position ?? 0));
  for (const item of sorted) {
    const columnId = statusToColumn[item.status];
    if (!columnId) {
      continue;
    }
    board[columnId].push(cardFromTask(item));
  }
  return board;
}

// PUT の応答に入っている id を、key が同じカードに付ける
export function mergeIds(board: Board, saved: Board): Board {
  const ids = new Map<string, number | null>();
  for (const id of columnIds) {
    for (const item of saved[id]) {
      if (item && item.key) {
        ids.set(item.key, item.id);
      }
    }
  }
  const next = emptyBoard();
  for (const id of columnIds) {
    next[id] = board[id].map((card) => {
      if (!ids.has(card.key)) {
        return card;
      }
      return { ...card, id: ids.get(card.key) ?? null };
    });
  }
  return next;
}

// key のカードを targetId の列へ移す。beforeKey があればその前、なければ末尾に入れる
export function moveCard(board: Board, key: string, targetId: ColumnId, beforeKey: string | null): Board {
  let moving: Card | null = null as Card | null;
  const next = emptyBoard();
  for (const id of columnIds) {
    next[id] = board[id].filter((card) => {
      if (card.key === key) {
        moving = card;
        return false;
      }
      return true;
    });
  }
  if (!moving) {
    return board;
  }
  const list = next[targetId];
  const index = beforeKey ? list.findIndex((card) => card.key === beforeKey) : -1;
  if (index === -1) {
    list.push(moving);
  } else {
    list.splice(index, 0, moving);
  }
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
    const found = board[id].find((card) =>
      target.id != null ? card.id === target.id : card.key === target.key
    );
    if (found) {
      return found.key;
    }
  }
  return null;
}
