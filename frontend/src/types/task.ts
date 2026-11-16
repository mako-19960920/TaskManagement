// 画面の3列の id
export type ColumnId = "todo-cards" | "doing-cards" | "done-cards";

// API の status
export type TaskStatus = "todo" | "in_progress" | "done";

// 優先度
export type Priority = "high" | "medium" | "low";

// 画面で扱うカード
export type Card = {
  id: number | null;
  key: string;
  text: string;
  date: string;
  // 非表示か。非表示でも列の並びの中に残し、表示に戻したら元の位置に出す
  hidden: boolean;
  // 以下は詳細画面に出す。説明がないときは空
  description: string;
  priority: Priority;
  // 作成日時と更新日時（サーバーが決める。例：2026-11-02T08:12:26.71）。まだ保存していなければ空
  createdAt: string;
  updatedAt: string;
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
  hidden?: boolean;
  createdAt?: string;
  updatedAt?: string;
  key?: string;
};

// PUT /api/tasks/{id} で送る、編集後のタスク（title だけ必須）
export type TaskUpdateRequest = {
  title: string;
  description: string | null;
  priority: Priority;
  dueDate: string | null;
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
