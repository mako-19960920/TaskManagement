// カードのドラッグ（Pointer Events。マウス、タッチ、ペンを同じ手順で扱う）
import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { ColumnId } from "../types/task";

// 離した列と、どのカードの前に入れるか（null なら末尾）を受け取る
export type DropHandler = (key: string, targetId: ColumnId, beforeKey: string | null) => void;

// ポインタより下にある最初のカード（カードの上下の中央で判定）。なければ null
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

export function useCardDrag(onDrop: DropHandler) {
  const [draggingKey, setDraggingKey] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<ColumnId | null>(null);
  const draggingRef = useRef<{ key: string; element: HTMLElement } | null>(null);
  // 下の useEffect は最初の1回だけ登録するので、最新の onDrop をここから読む
  const onDropRef = useRef(onDrop);
  onDropRef.current = onDrop;

  useEffect(() => {
    // ポインタの下にある列。ドラッグ中のカード自体は当たり判定から外す
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
      const list = listAtPoint(event.clientX, event.clientY);
      if (list) {
        const after = cardAfterCursor(list.querySelector(".cards")!, event.clientY, dragging.key);
        onDropRef.current(dragging.key, list.dataset.column as ColumnId, after?.dataset.key ?? null);
      }
      stop();
    }

    function stop() {
      draggingRef.current = null;
      setDraggingKey(null);
      setDropTarget(null);
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", stop);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", stop);
    };
  }, []);

  // カードの文章側で押したときだけ、ドラッグを始める（ボタンと入力欄の上では始めない）
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

  return { draggingKey, dropTarget, onPointerDown };
}
