// 画面の3列の id
export type ColumnId = "todo-cards" | "doing-cards" | "done-cards";

// API の status
export type TaskStatus = "todo" | "in_progress" | "done";

// 画面で扱うカード
export type Card = {
  id: number | null;
  key: string;
  text: string;
  date: string;
};

// 3列ぶんのカード
export type Board = Record<ColumnId, Card[]>;

// API が返すタスク（GET /api/tasks など）
export type TaskResponse = {
  id: number | null;
  title: string;
  description?: string | null;
  priority?: string | null;
  dueDate: string | null;
  status: string;
  position?: number;
  key?: string;
};

// POST /api/tasks で送るタスク（title だけ必須）
export type TaskCreateRequest = {
  title: string;
  description?: string | null;
  priority?: string | null;
  dueDate?: string | null;
};

// 検索の条件（すべて省略できる）
export type SearchConditions = {
  keyword: string;
  status: string;
  priority: string;
  dueFrom: string;
  dueTo: string;
};

export type SearchResult = {
  columns: Board;
  count: number;
};

export const columnIds: ColumnId[] = ["todo-cards", "doing-cards", "done-cards"];

const statusToColumn: Record<string, ColumnId | undefined> = {
  todo: "todo-cards",
  in_progress: "doing-cards",
  done: "done-cards",
};

const columnToStatus: Record<ColumnId, TaskStatus> = {
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
    board[columnId].push({
      id: item.id ?? null,
      key: item.key || (item.id == null ? crypto.randomUUID() : String(item.id)),
      text: item.title,
      date: validDate(item.dueDate) ? item.dueDate : "",
    });
  }
  return board;
}

export function cardsFromResponse(columns: Partial<Record<ColumnId, unknown>> | undefined): Board {
  const board = emptyBoard();
  for (const id of columnIds) {
    const raw = columns?.[id];
    const items: Partial<Card>[] = Array.isArray(raw) ? raw : [];
    board[id] = items
      .filter((item): item is Partial<Card> & { text: string } => !!item && typeof item.text === "string")
      .map((item) => ({
        id: item.id ?? null,
        key: item.key || String(item.id),
        text: item.text,
        date: validDate(item.date) ? item.date : "",
      }));
  }
  return board;
}

export function mergeIds(board: Board, saved: { columns: Board }): Board {
  const ids = new Map<string, number | null>();
  for (const id of columnIds) {
    for (const item of saved.columns[id]) {
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

export async function fetchBoard(): Promise<{ columns: Board }> {
  const response = await fetch("/api/tasks");
  if (!response.ok) {
    throw new Error("load failed");
  }
  const tasks: unknown = await response.json();
  return { columns: columnsFromTasks(tasks) };
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
  return {
    id: task.id,
    key: String(task.id),
    text: task.title,
    date: validDate(task.dueDate) ? task.dueDate : "",
  };
}

export async function saveBoard(board: Board): Promise<{ columns: Board }> {
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
  const saved: unknown = await response.json();
  return { columns: columnsFromTasks(saved) };
}

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
