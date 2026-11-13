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

// API が返すタスク（GET /api/tasks など）。PUT で送るときにも使う
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
