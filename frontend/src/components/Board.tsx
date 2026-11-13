// ボード（3列を横に並べる）
import type { PointerEvent as ReactPointerEvent } from "react";
import { columns } from "../lib/board";
import type { Board as BoardCards, Card, ColumnId } from "../types/task";
import { Column } from "./Column";

type Props = {
  cards: BoardCards;
  searching: boolean;
  draggingKey: string | null;
  dropTarget: ColumnId | null;
  onPointerDown: (event: ReactPointerEvent<HTMLLIElement>) => void;
  onDelete: (key: string) => void;
  onMove: (card: Card, targetId: ColumnId) => void;
  onChangeDate: (key: string, date: string) => void;
  onAdd: (text: string, date: string) => Promise<boolean>;
};

export function Board({ cards, dropTarget, ...rest }: Props) {
  return (
    <main className="board">
      {columns.map((column) => (
        <Column
          key={column.id}
          id={column.id}
          title={column.title}
          cards={cards[column.id]}
          isDropTarget={dropTarget === column.id}
          {...rest}
        />
      ))}
    </main>
  );
}
