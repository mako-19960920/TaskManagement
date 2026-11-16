// カード1枚。文章、日付、日付の入力欄、詳細・非表示・削除ボタン、移動ボタン。ドラッグで並べ替えでき、押すと詳細画面を開く
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { columns, formatCardDate } from "../lib/board";
import type { MouseEvent } from "react";
import type { Card, ColumnId } from "../types/task";

type Props = {
  card: Card;
  columnId: ColumnId;
  searching: boolean;
  onOpen: (card: Card) => void;
  onDelete: (card: Card) => void;
  onToggleHidden: (card: Card) => void;
  onMove: (card: Card, targetId: ColumnId) => void;
  onChangeDate: (key: string, date: string) => void;
};

export function TaskCard({ card, columnId, searching, onOpen, onDelete, onToggleHidden, onMove, onChangeDate }: Props) {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: card.key,
    attributes: { roleDescription: "並べ替えできるカード" },
  });
  const date = formatCardDate(card.date);

  // カードを押したら詳細画面を開く。ボタンと入力欄の上で押したときは、それぞれの操作を優先する。
  // ドラッグしたあとは、dnd-kit がこのクリックを止めるので開かない
  function onClick(event: MouseEvent<HTMLLIElement>) {
    if (event.target instanceof Element && event.target.closest("button, input, select, textarea")) {
      return;
    }
    onOpen(card);
  }

  return (
    // oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions -- キーボードでは「詳細」ボタンで開ける。実際の画面では dnd-kit が role="button" を付ける
    <li
      ref={setNodeRef}
      // ドラッグ中、ほかのカードは入る場所をあけるためにずれる
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={["card", isDragging ? "is-dragging" : "", card.hidden ? "is-hidden" : ""].filter(Boolean).join(" ")}
      data-key={card.key}
      {...attributes}
      {...listeners}
      onClick={onClick}
    >
      <div className="card-top">
        <div className="card-main">
          {/* 非表示のカードは検索結果にだけ出る。そのときは印を付ける */}
          {card.hidden ? <span className="card-badge">非表示</span> : null}
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
          />
        </div>
        <div className="card-actions">
          {/* キーボードでも詳細画面を開けるように、ボタンも置く */}
          <button className="open-button" type="button" onClick={() => onOpen(card)}>
            詳細
          </button>
          <button className="hide-button" type="button" onClick={() => onToggleHidden(card)}>
            {card.hidden ? "表示に戻す" : "非表示"}
          </button>
          {/* 検索中も出す。検索中は、検索結果とボードの両方から消える */}
          <button className="delete-button" type="button" onClick={() => onDelete(card)}>
            削除
          </button>
        </div>
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

// ドラッグ中にポインタについてくるカード（文章と日付だけ）
export function CardPreview({ card }: { card: Card }) {
  const date = formatCardDate(card.date);
  return (
    <div className="card card-overlay">
      <span className="card-text">{card.text}</span>
      {date ? <time className="card-date">{date}</time> : null}
    </div>
  );
}
