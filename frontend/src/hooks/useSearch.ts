// 検索の条件と結果
import { useState } from "react";
import { ApiError, searchBoard } from "../api/taskApi";
import { findCard, moveCard, patchCard, removeCard, setCardHidden } from "../lib/board";
import type { Card, ColumnId, SearchConditions, SearchResult } from "../types/task";

export const emptyConditions: SearchConditions = { keyword: "", status: "", priority: "", dueFrom: "", dueTo: "" };

export function useSearch() {
  const [conditions, setConditions] = useState(emptyConditions);
  // null のときは検索していない
  const [result, setResult] = useState<SearchResult | null>(null);
  const [error, setError] = useState("");

  function changeCondition(name: keyof SearchConditions, value: string) {
    setConditions((current) => ({ ...current, [name]: value }));
  }

  async function search() {
    try {
      setResult(await searchBoard(conditions));
      setError("");
    } catch (reason) {
      // サーバーが返した理由があれば、それを出す（例：「検索できませんでした。期限（から）が期限（まで）より後です（…）。」）
      const detail = reason instanceof ApiError ? reason.detail : "";
      setError(detail ? `検索できませんでした。${detail}。` : "検索できませんでした。条件を確認してください。");
    }
  }

  function clear() {
    setResult(null);
    setConditions(emptyConditions);
    setError("");
  }

  // 検索結果の表示の中で、カードを動かす（保存はボード側で行う）
  function moveInResult(key: string, targetId: ColumnId, beforeKey: string | null) {
    setResult((current) =>
      current ? { ...current, columns: moveCard(current.columns, key, targetId, beforeKey) } : current
    );
  }

  // 検索結果の表示から、カードを消す（保存はボード側で行う）。件数も1減らす
  function removeFromResult(key: string) {
    setResult((current) => {
      if (!current || !findCard(current.columns, key)) {
        return current;
      }
      return { columns: removeCard(current.columns, key), count: current.count - 1 };
    });
  }

  // 検索結果の表示の中で、非表示の印を付け外しする（非表示のタスクも検索結果に出すので、件数は変わらない）
  function setHiddenInResult(key: string, hidden: boolean) {
    setResult((current) => (current ? { ...current, columns: setCardHidden(current.columns, key, hidden) } : current));
  }

  // 検索結果の表示の中で、カードの値を変える（編集の結果を出す）
  function patchInResult(key: string, patch: Partial<Card>) {
    setResult((current) => (current ? { ...current, columns: patchCard(current.columns, key, patch) } : current));
  }

  return {
    conditions,
    patchInResult,
    result,
    error,
    changeCondition,
    search,
    clear,
    moveInResult,
    removeFromResult,
    setHiddenInResult,
  };
}
