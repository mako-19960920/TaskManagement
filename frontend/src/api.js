const columnIds = ["todo-cards", "doing-cards", "done-cards"];

const statusToColumn = {
  todo: "todo-cards",
  in_progress: "doing-cards",
  done: "done-cards",
};

const columnToStatus = {
  "todo-cards": "todo",
  "doing-cards": "in_progress",
  "done-cards": "done",
};

export function emptyBoard() {
  return {
    "todo-cards": [],
    "doing-cards": [],
    "done-cards": [],
  };
}

export function validDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function columnsFromTasks(tasks) {
  const board = emptyBoard();
  const items = Array.isArray(tasks) ? tasks : [];
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

export function cardsFromResponse(columns) {
  const board = emptyBoard();
  for (const id of columnIds) {
    const items = Array.isArray(columns?.[id]) ? columns[id] : [];
    board[id] = items
      .filter((item) => item && typeof item.text === "string")
      .map((item) => ({
        id: item.id ?? null,
        key: item.key || String(item.id),
        text: item.text,
        date: validDate(item.date) ? item.date : "",
      }));
  }
  return board;
}

export function mergeIds(board, saved) {
  const ids = new Map();
  for (const id of columnIds) {
    const items = Array.isArray(saved.columns?.[id]) ? saved.columns[id] : [];
    for (const item of items) {
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
      return { ...card, id: ids.get(card.key) };
    });
  }
  return next;
}

export async function fetchBoard() {
  const response = await fetch("/api/tasks");
  if (!response.ok) {
    throw new Error("load failed");
  }
  const tasks = await response.json();
  return { columns: columnsFromTasks(tasks) };
}

export async function saveBoard(board) {
  const tasks = [];
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
  const saved = await response.json();
  return { columns: columnsFromTasks(saved) };
}
