// カードのドラッグ（dnd-kit）。ドラッグ中は画面の上だけで並びを変え、離したときに onDrop を1回呼ぶ
import { useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from "react";
import {
  closestCorners,
  KeyboardSensor,
  MeasuringStrategy,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type {
  Active,
  Announcements,
  CollisionDetection,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  KeyboardSensorOptions,
  Over,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { columnIds, columns, findCard } from "../lib/board";
import type { Board, Card, ColumnId } from "../types/task";

// 離した列と、どのカードの前に入れるか（null なら末尾）を受け取る
export type DropHandler = (key: string, targetId: ColumnId, beforeKey: string | null) => void;

const columnIdSet = new Set<string>(columnIds);

function isColumnId(id: string): id is ColumnId {
  return columnIdSet.has(id);
}

// 押した場所がボタンや入力欄なら、ドラッグを始めない（削除、移動、日付の入力を優先する）
function startsOnControl(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest("button, input, select, textarea") !== null;
}

// マウス、タッチ、ペン。左ボタン（タッチは1本目の指）で、ボタンと入力欄以外を押したときだけ始める
class CardPointerSensor extends PointerSensor {
  static activators = [
    {
      eventName: "onPointerDown" as const,
      handler: ({ nativeEvent }: ReactPointerEvent) =>
        nativeEvent.isPrimary && nativeEvent.button === 0 && !startsOnControl(nativeEvent.target),
    },
  ];
}

// キーボード。カードそのものにフォーカスがあるときだけ、スペースかエンターで始める
const keyboardActivator = KeyboardSensor.activators[0];
class CardKeyboardSensor extends KeyboardSensor {
  static activators = [
    {
      eventName: "onKeyDown" as const,
      handler: (
        event: ReactKeyboardEvent,
        options: KeyboardSensorOptions,
        context: Parameters<typeof keyboardActivator.handler>[2]
      ) => event.target === event.currentTarget && keyboardActivator.handler(event, options, context),
    },
  ];
}

// どこに落とそうとしているか。ポインタが乗っているカードを優先し、カードの外なら列にする。
// 列の外ならどこにも落とさない（元の位置に戻る）。キーボードのときはポインタがないので、いちばん近いものにする
const collisionDetection: CollisionDetection = (args) => {
  if (!args.pointerCoordinates) {
    return closestCorners(args);
  }
  const hits = pointerWithin(args);
  const onCards = hits.filter((hit) => !isColumnId(String(hit.id)));
  return onCards.length > 0 ? onCards : hits;
};

// id（列の id かカードの key）が、どの列にあるか
function findColumn(board: Board, id: string): ColumnId | null {
  if (isColumnId(id)) {
    return id;
  }
  return columnIds.find((columnId) => board[columnId].some((card) => card.key === id)) ?? null;
}

// つかんでいるカードの上下の中央
function activeCenterY(active: Active): number | null {
  const box = active.rect.current.translated;
  return box ? box.top + box.height / 2 : null;
}

// 列の空いているところに落とすときの位置。つかんでいるカードの中央より下にある、最初のカードの前
function indexByCenter(columnId: ColumnId, others: Card[], centerY: number): number {
  const list = document.getElementById(columnId);
  for (let index = 0; index < others.length; index++) {
    const element = list?.querySelector(`[data-key="${CSS.escape(others[index].key)}"]`);
    const box = element?.getBoundingClientRect();
    if (box && centerY < box.top + box.height / 2) {
      return index;
    }
  }
  return others.length;
}

// active を over の位置へ入れた、新しい列の並び
function placeInColumn(list: Card[], columnId: ColumnId, moving: Card, active: Active, over: Over): Card[] {
  const others = list.filter((card) => card.key !== moving.key);
  const overId = String(over.id);
  let index = others.length;
  const centerY = activeCenterY(active);
  if (isColumnId(overId)) {
    if (centerY !== null) {
      index = indexByCenter(columnId, others, centerY);
    }
  } else {
    // カードの上なら、そのカードの中央より上か下かで、前か後ろに入れる
    const overIndex = others.findIndex((card) => card.key === overId);
    const below = centerY !== null && centerY > over.rect.top + over.rect.height / 2;
    index = overIndex === -1 ? others.length : overIndex + (below ? 1 : 0);
  }
  return [...others.slice(0, index), moving, ...others.slice(index)];
}

export function useCardDrag(cards: Board, onDrop: DropHandler) {
  // ドラッグ中だけ使う、画面の上の並び。null ならドラッグしていない
  const [dragBoard, setDragBoard] = useState<Board | null>(null);
  const dragBoardRef = useRef<Board | null>(null);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<ColumnId | null>(null);

  const sensors = useSensors(
    // 4px 動かしてから始める。押しただけ（クリック）ではドラッグにしない
    useSensor(CardPointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(CardKeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function update(next: Board | null) {
    dragBoardRef.current = next;
    setDragBoard(next);
  }

  function reset() {
    update(null);
    setActiveKey(null);
    setOverColumn(null);
  }

  function onDragStart({ active }: DragStartEvent) {
    setActiveKey(String(active.id));
    update(cards);
  }

  // 別の列の上に来たら、画面の上だけでその列へ移す（同じ列の中のずれは dnd-kit が見せる）
  function onDragOver({ active, over }: DragOverEvent) {
    const current = dragBoardRef.current;
    const key = String(active.id);
    const to = over && current ? findColumn(current, String(over.id)) : null;
    setOverColumn(to);
    if (!over || !current || !to) {
      return;
    }
    const from = findColumn(current, key);
    if (!from || from === to) {
      return;
    }
    const moving = current[from].find((card) => card.key === key);
    if (!moving) {
      return;
    }
    update({
      ...current,
      [from]: current[from].filter((card) => card.key !== key),
      [to]: placeInColumn(current[to], to, moving, active, over),
    });
  }

  // 離したとき。最終的な列と位置を決めて onDrop を呼ぶ。列の外なら何もしない（元の位置に戻る）
  function onDragEnd({ active, over }: DragEndEvent) {
    const current = dragBoardRef.current;
    const key = String(active.id);
    reset();
    if (!over || !current) {
      return;
    }
    const overId = String(over.id);
    const to = findColumn(current, overId);
    if (!to) {
      return;
    }
    let list = current[to];
    const oldIndex = list.findIndex((card) => card.key === key);
    if (oldIndex === -1) {
      return;
    }
    if (isColumnId(overId)) {
      list = placeInColumn(list, to, list[oldIndex], active, over);
    } else if (overId !== key) {
      list = arrayMove(
        list,
        oldIndex,
        list.findIndex((card) => card.key === overId)
      );
    }
    const position = list.findIndex((card) => card.key === key);
    onDrop(key, to, list[position + 1]?.key ?? null);
  }

  // 画面読み上げ（スクリーンリーダー）向けの案内
  const cardText = (id: string | number) => findCard(dragBoardRef.current ?? cards, String(id))?.text ?? "カード";
  const columnTitle = (over: Over | null) => {
    const id = over ? findColumn(dragBoardRef.current ?? cards, String(over.id)) : null;
    return columns.find((column) => column.id === id)?.title ?? null;
  };
  const announcements: Announcements = {
    onDragStart: ({ active }) => `「${cardText(active.id)}」をつかみました。`,
    onDragOver: ({ active, over }) => {
      const title = columnTitle(over);
      return title
        ? `「${cardText(active.id)}」は「${title}」の上にあります。`
        : `「${cardText(active.id)}」は列の外にあります。`;
    },
    onDragEnd: ({ active, over }) => {
      const title = columnTitle(over);
      return title
        ? `「${cardText(active.id)}」を「${title}」に置きました。`
        : `「${cardText(active.id)}」を元の位置に戻しました。`;
    },
    onDragCancel: ({ active }) => `「${cardText(active.id)}」の移動をやめました。`,
  };

  return {
    // 画面に出す並び（ドラッグ中はドラッグ中の並び）
    view: dragBoard ?? cards,
    activeCard: activeKey ? findCard(dragBoard ?? cards, activeKey) : null,
    overColumn,
    // DndContext にそのまま渡すもの
    context: {
      sensors,
      collisionDetection,
      measuring: { droppable: { strategy: MeasuringStrategy.Always } },
      onDragStart,
      onDragOver,
      onDragEnd,
      onDragCancel: reset,
      accessibility: {
        announcements,
        screenReaderInstructions: {
          draggable:
            "カードを動かすには、スペースキーかエンターキーでつかみ、矢印キーで動かして、もう一度スペースキーかエンターキーで置きます。エスケープキーでやめます。",
        },
      },
    },
  };
}
