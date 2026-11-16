// タスクボードの画面全体。部品と hooks を組み合わせ、検索中の動きをまとめる
import { Board } from "./components/Board";
import { HiddenPanel } from "./components/HiddenPanel";
import { SearchForm } from "./components/SearchForm";
import { useBoard } from "./hooks/useBoard";
import { useConfirm } from "./hooks/useConfirm";
import { useSearch } from "./hooks/useSearch";
import { findBoardKey, findCard, hiddenCards, visibleBoard } from "./lib/board";
import type { Card, ColumnId } from "./types/task";

export default function App() {
  const board = useBoard();
  const search = useSearch();
  const { confirm, dialog } = useConfirm();
  const searching = search.result !== null;
  // ボードには非表示のカードを出さない。検索結果には非表示のカードも出す（印を付ける）
  const shown = search.result ? search.result.columns : visibleBoard(board.board);

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

  // 削除ボタン。先に「削除していいですか？」と確認する。
  // 検索中は、検索結果の表示から消し、ボード側の同じカード（id で探す）も消して保存する
  async function deleteCard(card: Card) {
    const ok = await confirm({
      title: "削除していいですか？",
      target: card.text,
      note: "削除すると元に戻せません。",
      okLabel: "削除する",
    });
    if (!ok) {
      return;
    }
    if (!searching) {
      board.remove(card.key);
      return;
    }
    const boardKey = findBoardKey(board.current(), card);
    if (boardKey) {
      board.remove(boardKey);
    }
    search.removeFromResult(card.key);
  }

  // 非表示ボタンと「表示に戻す」。列の中の位置は変えないので、表示に戻すと元の位置に出る。
  // 検索中は、検索結果の印を付け外しし、ボード側の同じカード（id で探す）も変えて保存する
  function toggleHidden(card: Card) {
    const hidden = !card.hidden;
    if (!searching) {
      board.setHidden(card.key, hidden);
      return;
    }
    const boardKey = findBoardKey(board.current(), card);
    if (boardKey) {
      board.setHidden(boardKey, hidden);
    }
    search.setHiddenInResult(card.key, hidden);
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
            : `検索結果：${search.result.count}件（検索中は列の移動、非表示、削除ができます）`}
        </p>
      ) : null}
      {search.error ? <p className="board-error">{search.error}</p> : null}
      {board.error ? <p className="board-error">{board.error}</p> : null}
      {board.ready ? (
        <>
          <Board
            cards={shown}
            searching={searching}
            onDrop={dropCard}
            onDelete={deleteCard}
            onToggleHidden={toggleHidden}
            onMove={moveToEnd}
            onChangeDate={board.changeDate}
            onAdd={board.add}
          />
          {/* 検索中は、非表示のタスクも検索結果に出るので、非表示欄は出さない */}
          {searching ? null : (
            <HiddenPanel items={hiddenCards(board.board)} onShow={toggleHidden} onDelete={deleteCard} />
          )}
        </>
      ) : (
        <p className="board-status">読み込み中</p>
      )}
      {dialog}
    </>
  );
}
