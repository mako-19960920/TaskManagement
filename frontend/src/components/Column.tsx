// 列1つ（列名、カードの並び、やることだけ追加欄）
import type { PointerEvent as ReactPointerEvent } from "react";
import type { Card, ColumnId } from "../types/task";
import { AddCardForm } from "./AddCardForm";
import { TaskCard } from "./TaskCard";

type Props = {
  id: ColumnId;
  title: string;
  cards: Card[];
  searching: boolean;
  isDropTarget: boolean;
  draggingKey: string | null;
  onPointerDown: (event: ReactPointerEvent<HTMLLIElement>) => void;
  onDelete: (key: string) => void;
  onMove: (card: Card, targetId: ColumnId) => void;
  onChangeDate: (key: string, date: string) => void;
  onAdd: (text: string, date: string) => Promise<boolean>;
};

export function Column({ id, title, cards, searching, isDropTarget, draggingKey, onAdd, ...cardHandlers }: Props) {
  return (
    <section className={isDropTarget ? "list is-drop-target" : "list"} data-column={id}>
      <h2 className="list-title">{title}</h2>
      <ul className="cards" id={id}>
        {cards.map((card) => (
          <TaskCard
            key={card.key}
            card={card}
            columnId={id}
            searching={searching}
            dragging={draggingKey === card.key}
            {...cardHandlers}
          />
        ))}
      </ul>
      {id === "todo-cards" && !searching ? <AddCardForm onAdd={onAdd} /> : null}
    </section>
  );
}
