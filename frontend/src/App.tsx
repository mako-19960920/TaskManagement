// タスクボードの画面全体。部品と hooks を組み合わせ、検索中の動きと詳細画面をまとめる
import { useState } from "react";
import { Board } from "./components/Board";
import { HiddenPanel } from "./components/HiddenPanel";
import { SearchForm } from "./components/SearchForm";
import { TaskDetail } from "./components/TaskDetail";
import { useBoard } from "./hooks/useBoard";
import { useConfirm } from "./hooks/useConfirm";
import { useSearch } from "./hooks/useSearch";
import { findBoardKey, findById, findCard, hiddenCards, visibleBoard } from "./lib/board";
import type { Card, ColumnId, TaskUpdateRequest } from "./types/task";

export default function App() {
  const board = useBoard();
  const search = useSearch();
  const { confirm, dialog } = useConfirm();
  const searching = search.result !== null;
  // ボードには非表示のカードを出さない。検索結果には非表示のカードも出す（印を付ける）
  const shown = search.result ? search.result.columns : visibleBoard(board.board);
  // 詳細画面で開いているタスクの id。ボードから id で探して出すので、移動や編集がすぐ反映される
  const [detailId, setDetailId] = useState<number | null>(null);
  const detail = detailId == null ? null : findById(board.board, detailId);

  // 検索結果の中の同じカードの key（id で探す）。検索していなければ null。
  // 詳細画面から操作したときは、ボードのカードが渡ってくるので、検索結果側の key を探し直す
  function resultKeyOf(card: Card): string | null {
    return search.result ? findBoardKey(search.result.columns, card) : null;
  }

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
    const resultKey = resultKeyOf(card);
    if (resultKey) {
      search.moveInResult(resultKey, targetId, null);
    }
  }

  // 削除ボタン。先に「削除していいですか？」と確認する。
  // 検索中は、検索結果の表示から消し、ボード側の同じカード（id で探す）も消して保存する
  async function deleteCard(card: Card): Promise<boolean> {
    const ok = await confirm({
      title: "削除していいですか？",
      target: card.text,
      note: "削除すると元に戻せません。",
      okLabel: "削除する",
    });
    if (!ok) {
      return false;
    }
    if (!searching) {
      board.remove(card.key);
      return true;
    }
    const boardKey = findBoardKey(board.current(), card);
    if (boardKey) {
      board.remove(boardKey);
    }
    const resultKey = resultKeyOf(card);
    if (resultKey) {
      search.removeFromResult(resultKey);
    }
    return true;
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
    const resultKey = resultKeyOf(card);
    if (resultKey) {
      search.setHiddenInResult(resultKey, hidden);
    }
  }

  // 詳細画面の「保存」。ボードの同じカードを変え、検索中は検索結果のカードにも反映する
  async function saveDetail(card: Card, request: TaskUpdateRequest) {
    const result = await board.update(card, request);
    if (result.ok) {
      const resultKey = resultKeyOf(card);
      if (resultKey) {
        const { text, date, description, priority, createdAt, updatedAt } = result.card;
        search.patchInResult(resultKey, { text, date, description, priority, createdAt, updatedAt });
      }
    }
    return result;
  }

  // カードを押すか「詳細」ボタンで、詳細画面を開く（まだ保存していないカードは開かない）
  function openDetail(card: Card) {
    if (card.id != null) {
      setDetailId(card.id);
    }
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
            onOpen={openDetail}
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
      {/* key に開くタスクの id を付け、閉じたときや別のタスクを開いたときに、編集中の内容を消す */}
      <TaskDetail
        key={detailId ?? "closed"}
        card={detail?.card ?? null}
        columnId={detail?.columnId ?? null}
        onClose={() => setDetailId(null)}
        onChangeStatus={moveToEnd}
        onSave={saveDetail}
        onDelete={async (card) => {
          if (await deleteCard(card)) {
            setDetailId(null);
          }
        }}
      />
      {/* 削除の確認は、詳細画面の上に重ねて出す */}
      {dialog}
    </>
  );
}
