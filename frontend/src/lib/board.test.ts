// lib/board.ts（ボードを組み替える関数）のテスト。npm test で動く
import { describe, expect, it } from "vitest";
import type { Board, Card, TaskResponse } from "../types/task";
import {
  appendCard,
  cardFromTask,
  changeCardDate,
  columnsFromTasks,
  emptyBoard,
  findBoardKey,
  findById,
  findCard,
  formatCardDate,
  formatDateTime,
  hiddenCards,
  moveCard,
  patchCard,
  priorityLabel,
  removeCard,
  setCardHidden,
  toPriority,
  validDate,
  visibleBoard,
} from "./board";

// テスト用のカード。key と id は同じ数字にする（保存済みのカード）
function card(id: number, text: string, overrides: Partial<Card> = {}): Card {
  return {
    id,
    key: String(id),
    text,
    date: "",
    hidden: false,
    description: "",
    priority: "medium",
    createdAt: "",
    updatedAt: "",
    ...overrides,
  };
}

// やること：1, 2, 3 ／ 進行中：4 ／ 完了：なし
function sampleBoard(): Board {
  return {
    "todo-cards": [card(1, "買い物"), card(2, "メール"), card(3, "企画書")],
    "doing-cards": [card(4, "資料")],
    "done-cards": [],
  };
}

// 列ごとのカードの key の並び（結果を短く確かめるため）
function keys(board: Board) {
  return {
    todo: board["todo-cards"].map((item) => item.key),
    doing: board["doing-cards"].map((item) => item.key),
    done: board["done-cards"].map((item) => item.key),
  };
}

describe("moveCard（カードを移す）", () => {
  it("別の列の、指定したカードの前に入れる", () => {
    const next = moveCard(sampleBoard(), "2", "doing-cards", "4");
    expect(keys(next)).toEqual({ todo: ["1", "3"], doing: ["2", "4"], done: [] });
  });

  it("beforeKey が null なら、行き先の列の末尾に入れる", () => {
    const next = moveCard(sampleBoard(), "1", "done-cards", null);
    expect(keys(next)).toEqual({ todo: ["2", "3"], doing: ["4"], done: ["1"] });
  });

  it("同じ列の中で並べ替えられる", () => {
    const next = moveCard(sampleBoard(), "3", "todo-cards", "1");
    expect(keys(next).todo).toEqual(["3", "1", "2"]);
  });

  it("beforeKey が行き先の列に無ければ、末尾に入れる", () => {
    const next = moveCard(sampleBoard(), "1", "doing-cards", "999");
    expect(keys(next).doing).toEqual(["4", "1"]);
  });

  it("無い key なら、元のボードをそのまま返す", () => {
    const board = sampleBoard();
    expect(moveCard(board, "999", "done-cards", null)).toBe(board);
  });

  it("元のボードは書き換えない", () => {
    const board = sampleBoard();
    const before = structuredClone(board);
    moveCard(board, "2", "doing-cards", "4");
    expect(board).toEqual(before);
  });
});

describe("removeCard・appendCard・patchCard・changeCardDate・setCardHidden（カードを変える）", () => {
  it("removeCard は、その key のカードだけを消す", () => {
    expect(keys(removeCard(sampleBoard(), "2"))).toEqual({ todo: ["1", "3"], doing: ["4"], done: [] });
  });

  it("appendCard は、列の末尾にカードを足す", () => {
    const next = appendCard(sampleBoard(), "done-cards", card(5, "予約"));
    expect(keys(next).done).toEqual(["5"]);
  });

  it("patchCard は、その key のカードの一部の値だけを変える", () => {
    const next = patchCard(sampleBoard(), "2", { text: "メールを返す", priority: "high" });
    expect(findCard(next, "2")).toMatchObject({ text: "メールを返す", priority: "high", id: 2 });
    expect(findCard(next, "1")?.text).toBe("買い物");
  });

  it("changeCardDate は、YYYY-MM-DD でない日付を空にする", () => {
    expect(findCard(changeCardDate(sampleBoard(), "1", "2026-11-30"), "1")?.date).toBe("2026-11-30");
    expect(findCard(changeCardDate(sampleBoard(), "1", "2026/11/30"), "1")?.date).toBe("");
  });

  it("setCardHidden は、非表示にしても列の中の位置を変えない", () => {
    const next = setCardHidden(sampleBoard(), "2", true);
    expect(keys(next).todo).toEqual(["1", "2", "3"]);
    expect(findCard(next, "2")?.hidden).toBe(true);
  });

  it("どれも元のボードは書き換えない", () => {
    const board = sampleBoard();
    const before = structuredClone(board);
    removeCard(board, "2");
    appendCard(board, "done-cards", card(5, "予約"));
    patchCard(board, "2", { text: "変えた" });
    changeCardDate(board, "1", "2026-11-30");
    setCardHidden(board, "2", true);
    expect(board).toEqual(before);
  });
});

describe("visibleBoard・hiddenCards（非表示）", () => {
  const board = setCardHidden(setCardHidden(sampleBoard(), "4", true), "2", true);

  it("visibleBoard は、非表示のカードを除き、並びはそのまま", () => {
    expect(keys(visibleBoard(board))).toEqual({ todo: ["1", "3"], doing: [], done: [] });
  });

  it("hiddenCards は、列の順（やること → 進行中 → 完了）で、元の列と一緒に返す", () => {
    expect(hiddenCards(board).map(({ card: item, columnId }) => [item.key, columnId])).toEqual([
      ["2", "todo-cards"],
      ["4", "doing-cards"],
    ]);
  });
});

describe("findCard・findById・findBoardKey（カードを探す）", () => {
  it("findCard は key で探し、無ければ null", () => {
    expect(findCard(sampleBoard(), "3")?.text).toBe("企画書");
    expect(findCard(sampleBoard(), "999")).toBeNull();
  });

  it("findById は id で探し、列も返す", () => {
    expect(findById(sampleBoard(), 4)).toMatchObject({ columnId: "doing-cards", card: { text: "資料" } });
    expect(findById(sampleBoard(), 999)).toBeNull();
  });

  it("findBoardKey は、保存済みのカードを id で探す（検索結果とボードで key が違っても見つかる）", () => {
    const fromSearch = card(2, "メール", { key: "検索結果の key" });
    expect(findBoardKey(sampleBoard(), fromSearch)).toBe("2");
  });

  it("findBoardKey は、まだ保存していない（id が無い）カードを key で探す", () => {
    const unsaved = card(0, "新しい", { id: null, key: "new-key" });
    const board = appendCard(sampleBoard(), "todo-cards", unsaved);
    expect(findBoardKey(board, unsaved)).toBe("new-key");
    expect(findBoardKey(sampleBoard(), unsaved)).toBeNull();
  });
});

// テスト用の、API が返すタスク
function task(id: number, status: string, position: number): TaskResponse {
  return { id, title: `タスク${id}`, dueDate: null, status, position };
}

describe("columnsFromTasks・cardFromTask（API のタスクを画面のカードにする）", () => {
  it("状態で3列に分け、列の中は position の順に並べる", () => {
    const board = columnsFromTasks([task(1, "done", 0), task(2, "todo", 1), task(3, "todo", 0), task(4, "in_progress", 0)]);
    expect(keys(board)).toEqual({ todo: ["3", "2"], doing: ["4"], done: ["1"] });
  });

  it("知らない状態のタスクと、タイトルの無い要素は入れない", () => {
    const board = columnsFromTasks([task(1, "later", 0), { id: 2 }, null, task(3, "todo", 0)]);
    expect(keys(board)).toEqual({ todo: ["3"], doing: [], done: [] });
  });

  it("配列でなければ、空のボードにする", () => {
    expect(columnsFromTasks("こわれたデータ")).toEqual(emptyBoard());
  });

  it("cardFromTask は、省略された値を画面の決まった値にする", () => {
    expect(cardFromTask({ id: 7, title: "メモ", dueDate: "2026-11-30", status: "todo" })).toEqual({
      id: 7,
      key: "7",
      text: "メモ",
      date: "2026-11-30",
      hidden: false,
      description: "",
      priority: "medium",
      createdAt: "",
      updatedAt: "",
    });
  });

  it("cardFromTask は、形の違う日付と知らない優先度を、空と medium にする", () => {
    const result = cardFromTask({ id: 7, title: "メモ", dueDate: "11/30", status: "todo", priority: "urgent" });
    expect(result.date).toBe("");
    expect(result.priority).toBe("medium");
  });
});

describe("日付と優先度の表示", () => {
  it("validDate は YYYY-MM-DD の形だけを正しいとする", () => {
    expect(validDate("2026-10-26")).toBe(true);
    expect(validDate("2026/10/26")).toBe(false);
    expect(validDate(null)).toBe(false);
  });

  it("formatCardDate は「2026年10月26日」の形にし、形が違えば空にする", () => {
    expect(formatCardDate("2026-10-26")).toBe("2026年10月26日");
    expect(formatCardDate("2026-01-05")).toBe("2026年1月5日");
    expect(formatCardDate("")).toBe("");
  });

  it("formatDateTime は「2026/11/2 8:12」の形にする", () => {
    expect(formatDateTime("2026-11-02T08:12:26.71")).toBe("2026/11/2 8:12");
    expect(formatDateTime("")).toBe("");
  });

  it("toPriority は high・low 以外を medium にし、priorityLabel は日本語の名前を返す", () => {
    expect(toPriority("high")).toBe("high");
    expect(toPriority("low")).toBe("low");
    expect(toPriority("urgent")).toBe("medium");
    expect(priorityLabel("high")).toBe("高");
    expect(priorityLabel("medium")).toBe("中");
    expect(priorityLabel("low")).toBe("低");
  });
});
