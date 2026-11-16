// 列1つ（列名、カードの並び、やることだけ追加欄）。カードを落とせる場所でもある
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { Card, ColumnId } from "../types/task";
import { AddCardForm } from "./AddCardForm";
import { TaskCard } from "./TaskCard";

type Props = {
  id: ColumnId;
  title: string;
  cards: Card[];
  searching: boolean;
  isDropTarget: boolean;
  onDelete: (key: string) => void;
  onMove: (card: Card, targetId: ColumnId) => void;
  onChangeDate: (key: string, date: string) => void;
  onAdd: (text: string, date: string) => Promise<boolean>;
};

export function Column({ id, title, cards, searching, isDropTarget, onAdd, ...cardHandlers }: Props) {
  // カードが0枚でも落とせるように、列そのものを落とせる場所にする
  const { setNodeRef } = useDroppable({ id });

  return (
    <section ref={setNodeRef} className={isDropTarget ? "list is-drop-target" : "list"} data-column={id}>
      <h2 className="list-title">{title}</h2>
      <SortableContext items={cards.map((card) => card.key)} strategy={verticalListSortingStrategy}>
        <ul className="cards" id={id}>
          {cards.map((card) => (
            <TaskCard key={card.key} card={card} columnId={id} searching={searching} {...cardHandlers} />
          ))}
        </ul>
      </SortableContext>
      {id === "todo-cards" && !searching ? <AddCardForm onAdd={onAdd} /> : null}
    </section>
  );
}
