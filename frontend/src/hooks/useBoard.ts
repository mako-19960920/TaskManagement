// ボードの読み込みと保存。カードを変える操作は、すべてここを通す
import { useEffect, useRef, useState } from "react";
import { createTask, fetchBoard, saveBoard } from "../api/taskApi";
import { appendCard, changeCardDate, emptyBoard, mergeIds, moveCard, removeCard, validDate } from "../lib/board";
import type { Board, ColumnId } from "../types/task";

export function useBoard() {
  const [board, setBoard] = useState<Board>(emptyBoard);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  // 最新のボード。state は次の描画まで古いままなので、操作はこちらを読む
  const boardRef = useRef(board);
  // 書き込み（POST と PUT）を1つずつ順番に行うための列
  const writeQueueRef = useRef<Promise<unknown>>(Promise.resolve());
  // まだ始まっていない PUT が列にあるか（あれば、その PUT が最新のボードを送るので、もう1つは足さない）
  const putWaitingRef = useRef(false);

  function show(next: Board) {
    boardRef.current = next;
    setBoard(next);
  }

  useEffect(() => {
    let active = true;
    fetchBoard()
      .then((next) => {
        if (!active) {
          return;
        }
        show(next);
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

  // 前の書き込みが終わってから job を始める。POST と PUT が同時に走ると、
  // PUT が「まだ知らないカード」を消したり、同じカードを二重に作ったりするため
  function inOrder<T>(job: () => Promise<T>): Promise<T> {
    const result = writeQueueRef.current.then(job);
    writeQueueRef.current = result.catch(() => {});
    return result;
  }

  // 画面を先に変えてから、PUT で3列ぶんを保存する
  function persist(next: Board) {
    show(next);
    if (putWaitingRef.current) {
      return;
    }
    putWaitingRef.current = true;
    inOrder(async () => {
      putWaitingRef.current = false;
      // 送るのは、順番が来た時点の最新のボード
      const saved = await saveBoard(boardRef.current);
      show(mergeIds(boardRef.current, saved));
      setError("");
    }).catch(() => {
      setError("保存できませんでした。サーバーとデータベースを確認してください。");
    });
  }

  // POST /api/tasks で1件登録し、登録できたら「やること」の末尾に出す。成功したら true
  async function add(text: string, date: string): Promise<boolean> {
    try {
      const card = await inOrder(() => createTask({ title: text, dueDate: validDate(date) ? date : null }));
      show(appendCard(boardRef.current, "todo-cards", card));
      setError("");
      return true;
    } catch {
      setError("追加できませんでした。サーバーとデータベースを確認してください。");
      return false;
    }
  }

  return {
    board,
    ready,
    error,
    // 最新のボード（描画を待たない）
    current: () => boardRef.current,
    add,
    move: (key: string, targetId: ColumnId, beforeKey: string | null) =>
      persist(moveCard(boardRef.current, key, targetId, beforeKey)),
    remove: (key: string) => persist(removeCard(boardRef.current, key)),
    changeDate: (key: string, date: string) => persist(changeCardDate(boardRef.current, key, date)),
  };
}
