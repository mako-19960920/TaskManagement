// ボードの読み込みと保存。カードを変える操作は、すべてここを通す
import { useEffect, useRef, useState } from "react";
import { createTask, fetchBoard, saveBoard, updateTask } from "../api/taskApi";
import {
  appendCard,
  changeCardDate,
  emptyBoard,
  mergeIds,
  moveCard,
  patchCard,
  removeCard,
  setCardHidden,
  validDate,
} from "../lib/board";
import type { Board, Card, ColumnId, TaskUpdateRequest } from "../types/task";

// 編集の結果。失敗したときは、画面に出す文言を返す
export type UpdateResult = { ok: true; card: Card } | { ok: false; message: string };

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

  // PUT /api/tasks/{id} で1件を編集する（タイトル・説明・優先度・期限）。
  // ほかの書き込みと同じ列に並べ、成功したら、ボードの同じカードに編集後の値を入れる
  async function update(card: Card, request: TaskUpdateRequest): Promise<UpdateResult> {
    if (card.id == null) {
      return { ok: false, message: "まだ保存されていないため、編集できません。" };
    }
    const id = card.id;
    try {
      const saved = await inOrder(() => updateTask(id, request));
      const { text, date, description, priority, createdAt, updatedAt } = saved;
      show(patchCard(boardRef.current, card.key, { text, date, description, priority, createdAt, updatedAt }));
      return { ok: true, card: saved };
    } catch (error) {
      const status = String(error).match(/\d{3}/)?.[0];
      if (status === "404") {
        return { ok: false, message: "このタスクは見つかりませんでした。ほかの画面で削除された可能性があります。" };
      }
      if (status === "400") {
        return { ok: false, message: "入力した内容を確認してください。" };
      }
      return { ok: false, message: "保存できませんでした。サーバーとデータベースを確認してください。" };
    }
  }

  return {
    board,
    ready,
    error,
    // 最新のボード（描画を待たない）
    current: () => boardRef.current,
    add,
    update,
    move: (key: string, targetId: ColumnId, beforeKey: string | null) =>
      persist(moveCard(boardRef.current, key, targetId, beforeKey)),
    remove: (key: string) => persist(removeCard(boardRef.current, key)),
    changeDate: (key: string, date: string) => persist(changeCardDate(boardRef.current, key, date)),
    // 非表示にする（hidden = true）か、表示に戻す（false）。列の中の位置は変えない
    setHidden: (key: string, hidden: boolean) => persist(setCardHidden(boardRef.current, key, hidden)),
  };
}
