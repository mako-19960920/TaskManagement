import { useEffect, useRef, useState } from "react";
import type { FormEvent, PointerEvent as ReactPointerEvent } from "react";
import {
  cardsFromResponse,
  createTask,
  emptyBoard,
  fetchBoard,
  mergeIds,
  saveBoard,
  searchBoard,
  validDate,
} from "./api";
import type { Board, Card, ColumnId, SearchConditions, SearchResult } from "./api";

const columns: { id: ColumnId; title: string }[] = [
  { id: "todo-cards", title: "やること" },
  { id: "doing-cards", title: "進行中" },
  { id: "done-cards", title: "完了" },
];

const moveLabels: Record<ColumnId, string> = {
  "todo-cards": "やることへ",
  "doing-cards": "進行中へ",
  "done-cards": "完了へ",
};

const emptyConditions: SearchConditions = { keyword: "", status: "", priority: "", dueFrom: "", dueTo: "" };

function formatCardDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return "";
  }
  return `${match[1]}年${Number(match[2])}月${Number(match[3])}日`;
}

function moveCard(board: Board, key: string, targetId: ColumnId, beforeKey: string | null): Board {
  let moving: Card | null = null as Card | null;
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

function findBoardKey(board: Board, target: Card): string | null {
  for (const column of columns) {
    const found = board[column.id].find((card) =>
      target.id != null ? card.id === target.id : card.key === target.key
    );
    if (found) {
      return found.key;
    }
  }
  return null;
}

function cardAfterCursor(list: Element, y: number, draggingKey: string): HTMLElement | null {
  const cards = [...list.querySelectorAll<HTMLElement>(".card")].filter((card) => card.dataset.key !== draggingKey);
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
  const [board, setBoard] = useState<Board>(emptyBoard);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState("");
  const [draftDate, setDraftDate] = useState("");
  const [draggingKey, setDraggingKey] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<ColumnId | null>(null);
  const boardRef = useRef(board);
  const draggingRef = useRef<{ key: string; element: HTMLElement } | null>(null);
  const persistRef = useRef<(next: Board) => void>(() => {});
  // 書き込み（POST と PUT）を1つずつ順番に行うための列
  const writeQueueRef = useRef<Promise<unknown>>(Promise.resolve());
  // まだ始まっていない PUT が列にあるか（あれば、その PUT が最新のボードを送るので、もう1つは足さない）
  const putWaitingRef = useRef(false);
  const [adding, setAdding] = useState(false);
  const addInputRef = useRef<HTMLInputElement>(null);
  const [conditions, setConditions] = useState(emptyConditions);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [searchError, setSearchError] = useState("");
  const searching = result !== null;
  const shown = searching ? result.columns : board;
  const resultRef = useRef<SearchResult | null>(null);
  resultRef.current = result;

  function changeCondition(name: keyof SearchConditions, value: string) {
    setConditions((current) => ({ ...current, [name]: value }));
  }

  async function onSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const data = await searchBoard(conditions);
      setResult(data);
      setSearchError("");
    } catch {
      setSearchError("検索できませんでした。条件を確認してください。");
    }
  }

  function clearSearch() {
    setResult(null);
    setConditions(emptyConditions);
    setSearchError("");
  }

  // 前の書き込みが終わってから job を始める。POST と PUT が同時に走ると、
  // PUT が「まだ知らないカード」を消したり、同じカードを二重に作ったりするため
  function inOrder<T>(job: () => Promise<T>): Promise<T> {
    const result = writeQueueRef.current.then(job);
    writeQueueRef.current = result.catch(() => {});
    return result;
  }

  function persist(next: Board) {
    boardRef.current = next;
    setBoard(next);
    if (putWaitingRef.current) {
      return;
    }
    putWaitingRef.current = true;
    inOrder(async () => {
      putWaitingRef.current = false;
      // 送るのは、順番が来た時点の最新のボード
      const saved = await saveBoard(boardRef.current);
      const merged = mergeIds(boardRef.current, saved);
      boardRef.current = merged;
      setBoard(merged);
      setError("");
    }).catch(() => {
      setError("保存できませんでした。サーバーとデータベースを確認してください。");
    });
  }

  persistRef.current = persist;

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
    function listAtPoint(x: number, y: number): HTMLElement | null {
      const element = draggingRef.current?.element;
      if (element) {
        element.style.pointerEvents = "none";
      }
      const hit = document.elementFromPoint(x, y);
      if (element) {
        element.style.pointerEvents = "";
      }
      return hit ? hit.closest<HTMLElement>(".list") : null;
    }

    function onMove(event: PointerEvent) {
      if (!draggingRef.current) {
        return;
      }
      const list = listAtPoint(event.clientX, event.clientY);
      setDropTarget(list ? (list.dataset.column as ColumnId) : null);
    }

    function finish(event: PointerEvent) {
      const dragging = draggingRef.current;
      if (!dragging) {
        return;
      }
      const list = event ? listAtPoint(event.clientX, event.clientY) : null;
      if (list) {
        const cards = list.querySelector(".cards")!;
        const after = cardAfterCursor(cards, event.clientY, dragging.key);
        const targetId = list.dataset.column as ColumnId;
        const beforeKey = after?.dataset.key ?? null;
        const current = resultRef.current;
        if (current) {
          // 検索中: 検索結果の表示を動かし、ボード側の同じカード（id で探す）も移動・保存する
          let card: Card | null = null;
          for (const column of columns) {
            card = card ?? current.columns[column.id].find((item) => item.key === dragging.key) ?? null;
          }
          if (card) {
            const before = beforeKey
              ? columns
                  .flatMap((column) => current.columns[column.id])
                  .find((item) => item.key === beforeKey)
              : null;
            const boardKey = findBoardKey(boardRef.current, card);
            const boardBefore = before ? findBoardKey(boardRef.current, before) : null;
            if (boardKey) {
              persistRef.current(moveCard(boardRef.current, boardKey, targetId, boardBefore));
            }
            setResult({
              ...current,
              columns: moveCard(current.columns, dragging.key, targetId, beforeKey),
            });
          }
        } else {
          persistRef.current(moveCard(boardRef.current, dragging.key, targetId, beforeKey));
        }
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

  function onPointerDown(event: ReactPointerEvent<HTMLLIElement>) {
    if (event.button !== 0 || (event.target as HTMLElement).closest("button, input")) {
      return;
    }
    event.preventDefault();
    const card = event.currentTarget;
    const key = card.dataset.key!;
    draggingRef.current = { key, element: card };
    setDraggingKey(key);
    card.setPointerCapture(event.pointerId);
  }

  function deleteCard(key: string) {
    const next = emptyBoard();
    for (const column of columns) {
      next[column.id] = boardRef.current[column.id].filter((card) => card.key !== key);
    }
    persist(next);
  }

  function moveToEnd(card: Card, targetId: ColumnId) {
    if (!searching) {
      persist(moveCard(boardRef.current, card.key, targetId, null));
      return;
    }
    // 検索中: ボード側の同じカードを id で探して移動・保存し、検索結果の表示も動かす
    const boardKey = findBoardKey(boardRef.current, card);
    if (boardKey) {
      persist(moveCard(boardRef.current, boardKey, targetId, null));
    }
    setResult((current) =>
      current ? { ...current, columns: moveCard(current.columns, card.key, targetId, null) } : current
    );
  }

  function changeDate(key: string, date: string) {
    const valid = validDate(date) ? date : "";
    const next = emptyBoard();
    for (const column of columns) {
      next[column.id] = boardRef.current[column.id].map((card) =>
        card.key === key ? { ...card, date: valid } : card
      );
    }
    persist(next);
  }

  // POST /api/tasks で1件登録し、登録できたら「やること」の末尾に出す
  async function onAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = draft.trim();
    if (text === "" || adding) {
      return;
    }
    const typed = draft;
    const typedDate = draftDate;
    setAdding(true);
    try {
      const card = await inOrder(() =>
        createTask({ title: text, dueDate: validDate(typedDate) ? typedDate : null })
      );
      const next = {
        ...boardRef.current,
        "todo-cards": [...boardRef.current["todo-cards"], card],
      };
      boardRef.current = next;
      setBoard(next);
      setError("");
      // 登録を待つあいだに書き足した文字は消さない
      setDraft((current) => (current === typed ? "" : current));
      setDraftDate((current) => (current === typedDate ? "" : current));
      addInputRef.current?.focus();
    } catch {
      setError("追加できませんでした。サーバーとデータベースを確認してください。");
    } finally {
      setAdding(false);
    }
  }

  return (
    <>
      <header className="header">
        <h1>マイボード</h1>
      </header>
      <form className="search-form" onSubmit={onSearch}>
        <input
          type="text"
          placeholder="キーワード"
          aria-label="キーワード"
          value={conditions.keyword}
          onChange={(event) => changeCondition("keyword", event.target.value)}
        />
        <select
          aria-label="状態"
          value={conditions.status}
          onChange={(event) => changeCondition("status", event.target.value)}
        >
          <option value="">状態：指定なし</option>
          <option value="todo">やること</option>
          <option value="in_progress">進行中</option>
          <option value="done">完了</option>
        </select>
        <select
          aria-label="優先度"
          value={conditions.priority}
          onChange={(event) => changeCondition("priority", event.target.value)}
        >
          <option value="">優先度：指定なし</option>
          <option value="high">高</option>
          <option value="medium">中</option>
          <option value="low">低</option>
        </select>
        <label>
          期限
          <input
            type="date"
            aria-label="期限（から）"
            value={conditions.dueFrom}
            onChange={(event) => changeCondition("dueFrom", event.target.value)}
          />
        </label>
        <label>
          〜
          <input
            type="date"
            aria-label="期限（まで）"
            value={conditions.dueTo}
            onChange={(event) => changeCondition("dueTo", event.target.value)}
          />
        </label>
        <button className="search-button" type="submit">検索</button>
        {searching ? (
          <button className="clear-button" type="button" onClick={clearSearch}>
            解除
          </button>
        ) : null}
      </form>
      {searching ? (
        <p className="search-status">
          {result.count === 0
            ? "該当するタスクはありません"
            : `検索結果：${result.count}件（検索中は列の移動のみできます）`}
        </p>
      ) : null}
      {searchError ? <p className="board-error">{searchError}</p> : null}
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
                {shown[column.id].map((card) => (
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
                          disabled={searching}
                          onChange={(event) => changeDate(card.key, event.target.value)}
                          onPointerDown={(event) => event.stopPropagation()}
                        />
                      </div>
                      {searching ? null : (
                      <button
                        className="delete-button"
                        type="button"
                        onClick={() => deleteCard(card.key)}
                      >
                        削除
                      </button>
                      )}
                    </div>
                    {(
                      <div className="card-moves">
                        {columns
                          .filter((target) => target.id !== column.id)
                          .map((target) => (
                            <button
                              className="move-button"
                              type="button"
                              key={target.id}
                              onClick={() => moveToEnd(card, target.id)}
                            >
                              {moveLabels[target.id]}
                            </button>
                          ))}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
              {column.id === "todo-cards" && !searching ? (
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
                  <button className="add-button" type="submit" disabled={adding}>
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
