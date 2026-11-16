// 検索の条件と結果
import { useState } from "react";
import { searchBoard } from "../api/taskApi";
import { findCard, moveCard, removeCard } from "../lib/board";
import type { ColumnId, SearchConditions, SearchResult } from "../types/task";

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
    } catch {
      setError("検索できませんでした。条件を確認してください。");
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

  return { conditions, result, error, changeCondition, search, clear, moveInResult, removeFromResult };
}
