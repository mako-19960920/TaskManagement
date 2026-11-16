// アプリ内の確認画面（HTML の <dialog>）。request があるあいだだけ開く
import { useEffect, useRef } from "react";

export type ConfirmRequest = {
  title: string; // 例：「削除していいですか？」
  target: string; // 対象の名前（カードの文章）
  note?: string; // 注意書き
  okLabel: string; // 実行するボタンの文言
};

type Props = {
  request: ConfirmRequest | null;
  onAnswer: (ok: boolean) => void;
};

export function ConfirmDialog({ request, onAnswer }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    if (request && !dialog.open) {
      dialog.showModal();
      // まちがって消さないように、はじめは「やめる」を選んでおく
      cancelRef.current?.focus();
    }
    if (!request && dialog.open) {
      dialog.close();
    }
  }, [request]);

  return (
    <dialog
      ref={dialogRef}
      className="confirm-dialog"
      role="alertdialog"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-target"
      // Esc キーはやめる
      onCancel={(event) => {
        event.preventDefault();
        onAnswer(false);
      }}
      // 外側（暗いところ）をクリックしてもやめる
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onAnswer(false);
        }
      }}
    >
      {request ? (
        <div className="confirm-body">
          <h2 id="confirm-title" className="confirm-title">
            {request.title}
          </h2>
          <p id="confirm-target" className="confirm-target">
            「{request.target}」
          </p>
          {request.note ? <p className="confirm-note">{request.note}</p> : null}
          <div className="confirm-actions">
            <button ref={cancelRef} type="button" className="confirm-cancel" onClick={() => onAnswer(false)}>
              やめる
            </button>
            <button type="button" className="confirm-ok" onClick={() => onAnswer(true)}>
              {request.okLabel}
            </button>
          </div>
        </div>
      ) : null}
    </dialog>
  );
}
