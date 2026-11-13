// カード1枚。文章、日付、日付の入力欄、削除ボタン、移動ボタン
import type { PointerEvent as ReactPointerEvent } from "react";
import { columns, formatCardDate } from "../lib/board";
import type { Card, ColumnId } from "../types/task";

type Props = {
  card: Card;
  columnId: ColumnId;
  searching: boolean;
  dragging: boolean;
  onPointerDown: (event: ReactPointerEvent<HTMLLIElement>) => void;
  onDelete: (key: string) => void;
  onMove: (card: Card, targetId: ColumnId) => void;
  onChangeDate: (key: string, date: string) => void;
};

export function TaskCard({ card, columnId, searching, dragging, onPointerDown, onDelete, onMove, onChangeDate }: Props) {
  const date = formatCardDate(card.date);

  return (
    <li className={dragging ? "card is-dragging" : "card"} data-key={card.key} onPointerDown={onPointerDown}>
      <div className="card-top">
        <div className="card-main">
          <span className="card-text">{card.text}</span>
          {date ? (
            <time className="card-date" dateTime={card.date}>
              {date}
            </time>
          ) : null}
          <input
            className="card-date-input"
            type="date"
            aria-label="日付"
            value={card.date}
            disabled={searching}
            onChange={(event) => onChangeDate(card.key, event.target.value)}
            onPointerDown={(event) => event.stopPropagation()}
          />
        </div>
        {searching ? null : (
          <button className="delete-button" type="button" onClick={() => onDelete(card.key)}>
            削除
          </button>
        )}
      </div>
      <div className="card-moves">
        {columns
          .filter((target) => target.id !== columnId)
          .map((target) => (
            <button className="move-button" type="button" key={target.id} onClick={() => onMove(card, target.id)}>
              {target.moveLabel}
            </button>
          ))}
      </div>
    </li>
  );
}
