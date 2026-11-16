// ボードの下の「非表示のタスク」欄。押すと開いたり閉じたりする（HTML の <details>）
import { columns, formatCardDate } from "../lib/board";
import type { Card, ColumnId } from "../types/task";

type Props = {
  items: { card: Card; columnId: ColumnId }[];
  onShow: (card: Card) => void;
  onDelete: (card: Card) => void;
};

export function HiddenPanel({ items, onShow, onDelete }: Props) {
  return (
    <details className="hidden-panel">
      <summary className="hidden-summary">非表示のタスク（{items.length}件）</summary>
      {items.length === 0 ? (
        <p className="hidden-empty">非表示のタスクはありません</p>
      ) : (
        <ul className="hidden-list">
          {items.map(({ card, columnId }) => {
            const columnTitle = columns.find((column) => column.id === columnId)?.title ?? "";
            const date = formatCardDate(card.date);
            return (
              <li className="hidden-item" key={card.key} data-key={card.key}>
                <div className="hidden-main">
                  <span className="hidden-text">{card.text}</span>
                  {/* 元の列（表示に戻すと、この列の元の位置に戻る）と日付 */}
                  <span className="hidden-meta">
                    {columnTitle}
                    {date ? `・${date}` : ""}
                  </span>
                </div>
                <div className="hidden-actions">
                  <button className="show-button" type="button" onClick={() => onShow(card)}>
                    表示に戻す
                  </button>
                  <button className="delete-button" type="button" onClick={() => onDelete(card)}>
                    削除
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </details>
  );
}
