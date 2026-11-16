// ボード（3列を横に並べる）。ドラッグできる範囲（DndContext）もここで決める
import { DndContext, DragOverlay } from "@dnd-kit/core";
import { useCardDrag } from "../hooks/useCardDrag";
import type { DropHandler } from "../hooks/useCardDrag";
import { columns } from "../lib/board";
import type { Board as BoardCards, Card, ColumnId } from "../types/task";
import { Column } from "./Column";
import { CardPreview } from "./TaskCard";

type Props = {
  cards: BoardCards;
  searching: boolean;
  onDrop: DropHandler;
  onOpen: (card: Card) => void;
  onDelete: (card: Card) => void;
  onToggleHidden: (card: Card) => void;
  onMove: (card: Card, targetId: ColumnId) => void;
  onChangeDate: (key: string, date: string) => void;
  onAdd: (text: string, date: string) => Promise<boolean>;
};

export function Board({ cards, onDrop, ...rest }: Props) {
  const drag = useCardDrag(cards, onDrop);

  return (
    <DndContext {...drag.context}>
      <main className="board">
        {columns.map((column) => (
          <Column
            key={column.id}
            id={column.id}
            title={column.title}
            cards={drag.view[column.id]}
            isDropTarget={drag.overColumn === column.id}
            {...rest}
          />
        ))}
      </main>
      {/* ドラッグ中にポインタについてくるカード。離したら、すぐ新しい位置に出す（元の位置へ戻るアニメーションはしない） */}
      <DragOverlay dropAnimation={null}>{drag.activeCard ? <CardPreview card={drag.activeCard} /> : null}</DragOverlay>
    </DndContext>
  );
}
