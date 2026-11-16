// 確認を出して、答え（true = 実行する）を待つ。出し方は config.ts の confirmStyle で切り替える
import { useRef, useState } from "react";
import { ConfirmDialog } from "../components/ConfirmDialog";
import type { ConfirmRequest } from "../components/ConfirmDialog";
import { confirmStyle } from "../config";

export function useConfirm() {
  const [request, setRequest] = useState<ConfirmRequest | null>(null);
  // 開いている確認画面の答えを返す関数
  const resolveRef = useRef<((ok: boolean) => void) | null>(null);

  function confirm(next: ConfirmRequest): Promise<boolean> {
    if (confirmStyle === "browser") {
      const lines = [next.title, "", `「${next.target}」`, next.note ?? ""];
      return Promise.resolve(window.confirm(lines.join("\n").trim()));
    }
    // 前の確認が開いたままなら、やめたことにする
    resolveRef.current?.(false);
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setRequest(next);
    });
  }

  function answer(ok: boolean) {
    resolveRef.current?.(ok);
    resolveRef.current = null;
    setRequest(null);
  }

  return { confirm, dialog: <ConfirmDialog request={request} onAnswer={answer} /> };
}
