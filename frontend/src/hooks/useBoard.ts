// ボードの読み込みと保存。カードを変える操作は、すべてここを通す。
// 保存は、操作ごとに1件だけを変える API を使う（ほかの画面で追加したタスクを消さないため）
import { useEffect, useRef, useState } from "react";
import {
  ApiError,
  changeTaskDueDate,
  changeTaskHidden,
  createTask,
  deleteTask,
  fetchBoard,
  moveTask,
  updateTask,
} from "../api/taskApi";
import {
  appendCard,
  changeCardDate,
  emptyBoard,
  findCard,
  moveCard,
  patchCard,
  removeCard,
  setCardHidden,
  validDate,
} from "../lib/board";
import type { Board, Card, ColumnId, TaskUpdateRequest } from "../types/task";

// 編集の結果。失敗したときは、画面に出す文言を返す
export type UpdateResult = { ok: true; card: Card } | { ok: false; message: string };

const SAVE_FAILED = "保存できませんでした。サーバーとデータベースを確認してください。";
const DELETE_FAILED = "削除できませんでした。サーバーとデータベースを確認してください。";
const NOT_FOUND = "ほかの画面で削除されたタスクがありました。最新の内容を読み込みます。";

function statusOf(error: unknown): number {
  return error instanceof ApiError ? error.status : 0;
}

export function useBoard() {
  const [board, setBoard] = useState<Board>(emptyBoard);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  // 最新のボード。state は次の描画まで古いままなので、操作はこちらを読む
  const boardRef = useRef(board);
  // 書き込みを1つずつ順番に行うための列
  const writeQueueRef = useRef<Promise<unknown>>(Promise.resolve());
  // 列に入れた書き込みの通し番号（いちばん新しいもの）
  const lastSeqRef = useRef(0);
  // 保存に失敗したので、書き込みが全部終わったらサーバーの内容を読み直す
  const needResyncRef = useRef(false);

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

  // 前の書き込みが終わってから job を始める。最後の書き込みが終わったとき、読み直しが必要なら読み直す
  function inOrder<T>(job: () => Promise<T>): Promise<T> {
    const seq = ++lastSeqRef.current;
    const result = writeQueueRef.current.then(job);
    writeQueueRef.current = result
      .catch(() => {})
      .then(() => {
        if (seq === lastSeqRef.current && needResyncRef.current) {
          needResyncRef.current = false;
          resync();
        }
      });
    return result;
  }

  // サーバーの最新の内容を読み直して、画面とデータベースのずれをなくす。
  // 読んでいるあいだに次の書き込みが入ったら、それが終わってからもう一度読み直す
  function resync() {
    const seq = lastSeqRef.current + 1;
    inOrder(fetchBoard)
      .then((next) => {
        if (seq === lastSeqRef.current) {
          show(next);
        } else {
          needResyncRef.current = true;
        }
      })
      .catch(() => {
        // つながらないときは、今の画面のまま（エラーの文言は出ている）
      });
  }

  // 画面を先に変えてから、job（1件だけを変える API）を送る。
  // 成功したら更新日時を受け取り、失敗したら文言を出して、あとで読み直す
  function write(next: Board, key: string, job: () => Promise<Card | void>, failMessage: string, notFoundIsOk = false) {
    show(next);
    inOrder(async () => {
      try {
        return await job();
      } catch (reason) {
        // 読み直しの印は、書き込みの中で付ける（列の「全部終わったか」の判断より先に付けるため）
        if (!(statusOf(reason) === 404 && notFoundIsOk)) {
          needResyncRef.current = true;
        }
        throw reason;
      }
    }).then(
      (saved) => {
        if (saved) {
          show(patchCard(boardRef.current, key, { updatedAt: saved.updatedAt }));
        }
        setError("");
      },
      (reason) => {
        const status = statusOf(reason);
        if (status === 404 && notFoundIsOk) {
          setError("");
          return;
        }
        setError(status === 404 ? NOT_FOUND : failMessage);
      }
    );
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
      const saved = await inOrder(async () => {
        try {
          return await updateTask(id, request);
        } catch (reason) {
          // ほかの画面で削除されていたら、書き込みが全部終わったあとに読み直す
          if (statusOf(reason) === 404) {
            needResyncRef.current = true;
          }
          throw reason;
        }
      });
      const { text, date, description, priority, createdAt, updatedAt } = saved;
      show(patchCard(boardRef.current, card.key, { text, date, description, priority, createdAt, updatedAt }));
      return { ok: true, card: saved };
    } catch (reason) {
      const status = statusOf(reason);
      if (status === 404) {
        return { ok: false, message: "このタスクは見つかりませんでした。ほかの画面で削除された可能性があります。" };
      }
      if (status === 400) {
        // サーバーが返した理由があれば、それを出す（例：「タイトルは 255 文字までです。」）
        const detail = reason instanceof ApiError ? reason.detail : "";
        return { ok: false, message: detail ? `${detail}。` : "入力した内容を確認してください。" };
      }
      return { ok: false, message: SAVE_FAILED };
    }
  }

  // key のカードを targetId の列の、beforeKey のカードの前へ移す（null なら末尾）
  function move(key: string, targetId: ColumnId, beforeKey: string | null) {
    const current = boardRef.current;
    const card = findCard(current, key);
    if (!card) {
      return;
    }
    const next = moveCard(current, key, targetId, beforeKey);
    if (card.id == null) {
      show(next);
      return;
    }
    const id = card.id;
    const beforeId = beforeKey ? (findCard(current, beforeKey)?.id ?? null) : null;
    write(next, key, () => moveTask(id, targetId, beforeId), SAVE_FAILED);
  }

  // 削除する。ほかの画面ですでに削除されていた（404）ときは、成功として扱う
  function remove(key: string) {
    const current = boardRef.current;
    const card = findCard(current, key);
    const next = removeCard(current, key);
    if (!card || card.id == null) {
      show(next);
      return;
    }
    const id = card.id;
    write(next, key, () => deleteTask(id), DELETE_FAILED, true);
  }

  // 期限を変える。形が違う日付は、期限なしにする
  function changeDate(key: string, date: string) {
    const current = boardRef.current;
    const card = findCard(current, key);
    const next = changeCardDate(current, key, date);
    if (!card || card.id == null) {
      show(next);
      return;
    }
    const id = card.id;
    write(next, key, () => changeTaskDueDate(id, validDate(date) ? date : null), SAVE_FAILED);
  }

  // 非表示にする（hidden = true）か、表示に戻す（false）。列の中の位置は変えない
  function setHidden(key: string, hidden: boolean) {
    const current = boardRef.current;
    const card = findCard(current, key);
    const next = setCardHidden(current, key, hidden);
    if (!card || card.id == null) {
      show(next);
      return;
    }
    const id = card.id;
    write(next, key, () => changeTaskHidden(id, hidden), SAVE_FAILED);
  }

  return {
    board,
    ready,
    error,
    // 最新のボード（描画を待たない）
    current: () => boardRef.current,
    add,
    update,
    move,
    remove,
    changeDate,
    setHidden,
  };
}
