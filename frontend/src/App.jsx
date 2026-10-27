import { useEffect, useRef, useState } from "react";
import {
  cardsFromResponse,
  emptyBoard,
  fetchBoard,
  mergeIds,
  saveBoard,
  validDate,
} from "./api.js";

const columns = [
  { id: "todo-cards", title: "やること" },
  { id: "doing-cards", title: "進行中" },
  { id: "done-cards", title: "完了" },
];

const moveLabels = {
  "todo-cards": "やることへ",
  "doing-cards": "進行中へ",
  "done-cards": "完了へ",
};

function formatCardDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return "";
  }
  return `${match[1]}年${Number(match[2])}月${Number(match[3])}日`;
}

function moveCard(board, key, targetId, beforeKey) {
  let moving = null;
  const next = emptyBoard();
  for (const column of columns) {
    next[column.id] = board[column.id].filter((card) => {
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

function cardAfterCursor(list, y, draggingKey) {
  const cards = [...list.querySelectorAll(".card")].filter((card) => card.dataset.key !== draggingKey);
  for (const card of cards) {
    const box = card.getBoundingClientRect();
    const middle = box.top + box.height / 2;
    if (y < middle) {
      return card;
    }
  }
  return null;
}

export default function App() {
  const [board, setBoard] = useState(emptyBoard);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState("");
  const [draftDate, setDraftDate] = useState("");
  const [draggingKey, setDraggingKey] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const boardRef = useRef(board);
  const draggingRef = useRef(null);
  const persistRef = useRef(() => {});
  const savingRef = useRef(false);
  const dirtyRef = useRef(false);
  const addInputRef = useRef(null);

  function persist(next) {
    boardRef.current = next;
    setBoard(next);
    dirtyRef.current = true;
    flush();
  }

  persistRef.current = persist;

  async function flush() {
    if (savingRef.current) {
      return;
    }
    savingRef.current = true;
    try {
      do {
        dirtyRef.current = false;
        const snapshot = boardRef.current;
        const saved = await saveBoard(snapshot);
        const merged = mergeIds(boardRef.current, saved);
        boardRef.current = merged;
        setBoard(merged);
        setError("");
      } while (dirtyRef.current);
    } catch {
      setError("保存できませんでした。サーバーとデータベースを確認してください。");
    } finally {
      savingRef.current = false;
      if (dirtyRef.current) {
        flush();
      }
    }
  }

  useEffect(() => {
    let active = true;
    fetchBoard()
      .then((data) => {
        if (!active) {
          return;
        }
        const next = cardsFromResponse(data.columns);
        boardRef.current = next;
        setBoard(next);
        setReady(true);
      })
      .catch(() => {
        if (!active) {
          return;
        }
        setError("ボードを読み込めませんでした。サーバーとデータベースを確認してください。");
        setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    function listAtPoint(x, y) {
      const element = draggingRef.current?.element;
      if (element) {
        element.style.pointerEvents = "none";
      }
      const hit = document.elementFromPoint(x, y);
      if (element) {
        element.style.pointerEvents = "";
      }
      return hit ? hit.closest(".list") : null;
    }

    function onMove(event) {
      if (!draggingRef.current) {
        return;
      }
      const list = listAtPoint(event.clientX, event.clientY);
      setDropTarget(list ? list.dataset.column : null);
    }

    function finish(event) {
      const dragging = draggingRef.current;
      if (!dragging) {
        return;
      }
      const list = event ? listAtPoint(event.clientX, event.clientY) : null;
      if (list) {
        const cards = list.querySelector(".cards");
        const after = cardAfterCursor(cards, event.clientY, dragging.key);
        const next = moveCard(
          boardRef.current,
          dragging.key,
          list.dataset.column,
          after?.dataset.key ?? null
        );
        persistRef.current(next);
      }
      draggingRef.current = null;
      setDraggingKey(null);
      setDropTarget(null);
    }

    function onCancel() {
      draggingRef.current = null;
      setDraggingKey(null);
      setDropTarget(null);
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", onCancel);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", onCancel);
    };
  }, []);

  function onPointerDown(event) {
    if (event.button !== 0 || event.target.closest("button, input")) {
      return;
    }
    event.preventDefault();
    const card = event.currentTarget;
    draggingRef.current = { key: card.dataset.key, element: card };
    setDraggingKey(card.dataset.key);
    card.setPointerCapture(event.pointerId);
  }

  function deleteCard(key) {
    const next = emptyBoard();
    for (const column of columns) {
      next[column.id] = boardRef.current[column.id].filter((card) => card.key !== key);
    }
    persist(next);
  }

  function moveToEnd(key, targetId) {
    persist(moveCard(boardRef.current, key, targetId, null));
  }

  function changeDate(key, date) {
    const valid = validDate(date) ? date : "";
    const next = emptyBoard();
    for (const column of columns) {
      next[column.id] = boardRef.current[column.id].map((card) =>
        card.key === key ? { ...card, date: valid } : card
      );
    }
    persist(next);
  }

  function onAdd(event) {
    event.preventDefault();
    const text = draft.trim();
    if (text === "") {
      return;
    }
    const card = {
      id: null,
      key: crypto.randomUUID(),
      text,
      date: validDate(draftDate) ? draftDate : "",
    };
    const next = {
      ...boardRef.current,
      "todo-cards": [...boardRef.current["todo-cards"], card],
    };
    persist(next);
    setDraft("");
    setDraftDate("");
    addInputRef.current?.focus();
  }

  return (
    <>
      <header className="header">
        <h1>マイボード</h1>
      </header>
      {error ? <p className="board-error">{error}</p> : null}
      {ready ? (
        <main className="board">
          {columns.map((column) => (
            <section
              className={dropTarget === column.id ? "list is-drop-target" : "list"}
              key={column.id}
              data-column={column.id}
            >
              <h2 className="list-title">{column.title}</h2>
              <ul className="cards" id={column.id}>
                {board[column.id].map((card) => (
                  <li
                    className={draggingKey === card.key ? "card is-dragging" : "card"}
                    key={card.key}
                    data-key={card.key}
                    onPointerDown={onPointerDown}
                  >
                    <div className="card-top">
                      <div className="card-main">
                        <span className="card-text">{card.text}</span>
                        {formatCardDate(card.date) ? (
                          <time className="card-date" dateTime={card.date}>
                            {formatCardDate(card.date)}
                          </time>
                        ) : null}
                        <input
                          className="card-date-input"
                          type="date"
                          aria-label="日付"
                          value={card.date}
                          onChange={(event) => changeDate(card.key, event.target.value)}
                          onPointerDown={(event) => event.stopPropagation()}
                        />
                      </div>
                      <button
                        className="delete-button"
                        type="button"
                        onClick={() => deleteCard(card.key)}
                      >
                        削除
                      </button>
                    </div>
                    <div className="card-moves">
                      {columns.map((target) => (
                        <button
                          className="move-button"
                          type="button"
                          key={target.id}
                          hidden={target.id === column.id}
                          onClick={() => moveToEnd(card.key, target.id)}
                        >
                          {moveLabels[target.id]}
                        </button>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
              {column.id === "todo-cards" ? (
                <form className="add-form" onSubmit={onAdd}>
                  <input
                    className="add-input"
                    ref={addInputRef}
                    type="text"
                    placeholder="カードを追加"
                    required
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                  />
                  <input
                    className="add-date"
                    type="date"
                    aria-label="日付"
                    value={draftDate}
                    onChange={(event) => setDraftDate(event.target.value)}
                  />
                  <button className="add-button" type="submit">
                    追加
                  </button>
                </form>
              ) : null}
            </section>
          ))}
        </main>
      ) : (
        <p className="board-status">読み込み中</p>
      )}
    </>
  );
}
