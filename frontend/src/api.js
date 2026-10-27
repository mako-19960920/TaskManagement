const columnIds = ["todo-cards", "doing-cards", "done-cards"];

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
  const response = await fetch("/api/board");
  if (!response.ok) {
    throw new Error("load failed");
  }
  return response.json();
}

export async function saveBoard(board) {
  const columns = {};
  for (const id of columnIds) {
    columns[id] = board[id].map((card) => ({
      id: card.id,
      key: card.key,
      text: card.text,
      date: card.date || "",
    }));
  }
  const response = await fetch("/api/board", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ columns }),
  });
  if (!response.ok) {
    throw new Error("save failed");
  }
  return response.json();
}
