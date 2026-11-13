// タスクボードの画面全体。部品と hooks を組み合わせ、検索中の動きをまとめる
import { Board } from "./components/Board";
import { SearchForm } from "./components/SearchForm";
import { useBoard } from "./hooks/useBoard";
import { useCardDrag } from "./hooks/useCardDrag";
import { useSearch } from "./hooks/useSearch";
import { findBoardKey, findCard } from "./lib/board";
import type { Card, ColumnId } from "./types/task";

export default function App() {
  const board = useBoard();
  const search = useSearch();
  const searching = search.result !== null;
  const shown = search.result ? search.result.columns : board.board;

  // ドラッグで離したとき。検索中は、検索結果の表示を動かし、ボード側の同じカード（id で探す）も移動・保存する
  function dropCard(key: string, targetId: ColumnId, beforeKey: string | null) {
    const result = search.result;
    if (!result) {
      board.move(key, targetId, beforeKey);
      return;
    }
    const card = findCard(result.columns, key);
    if (!card) {
      return;
    }
    const before = beforeKey ? findCard(result.columns, beforeKey) : null;
    const boardKey = findBoardKey(board.current(), card);
    const boardBefore = before ? findBoardKey(board.current(), before) : null;
    if (boardKey) {
      board.move(boardKey, targetId, boardBefore);
    }
    search.moveInResult(key, targetId, beforeKey);
  }

  const drag = useCardDrag(dropCard);

  // 移動ボタン。行き先の列の末尾へ入れる。検索中はドラッグと同じく、ボード側も動かす
  function moveToEnd(card: Card, targetId: ColumnId) {
    if (!searching) {
      board.move(card.key, targetId, null);
      return;
    }
    const boardKey = findBoardKey(board.current(), card);
    if (boardKey) {
      board.move(boardKey, targetId, null);
    }
    search.moveInResult(card.key, targetId, null);
  }

  return (
    <>
      <header className="header">
        <h1>マイボード</h1>
      </header>
      <SearchForm
        conditions={search.conditions}
        searching={searching}
        onChange={search.changeCondition}
        onSearch={search.search}
        onClear={search.clear}
      />
      {search.result ? (
        <p className="search-status">
          {search.result.count === 0
            ? "該当するタスクはありません"
            : `検索結果：${search.result.count}件（検索中は列の移動のみできます）`}
        </p>
      ) : null}
      {search.error ? <p className="board-error">{search.error}</p> : null}
      {board.error ? <p className="board-error">{board.error}</p> : null}
      {board.ready ? (
        <Board
          cards={shown}
          searching={searching}
          draggingKey={drag.draggingKey}
          dropTarget={drag.dropTarget}
          onPointerDown={drag.onPointerDown}
          onDelete={board.remove}
          onMove={moveToEnd}
          onChangeDate={board.changeDate}
          onAdd={board.add}
        />
      ) : (
        <p className="board-status">読み込み中</p>
      )}
    </>
  );
}
