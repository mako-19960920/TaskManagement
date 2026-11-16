// タスク詳細の画面（HTML の <dialog>）。card があるあいだだけ開く。
// 見るとき：タイトル、ステータスの切り替え、説明、優先度、期限日、作成日・更新日、編集、削除
// 編集するとき：タイトル、説明、優先度、期限日
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { UpdateResult } from "../hooks/useBoard";
import {
  columns,
  formatCardDate,
  formatDateTime,
  priorities,
  priorityLabel,
  TITLE_MAX,
  toPriority,
  validDate,
} from "../lib/board";
import type { Card, ColumnId, Priority, TaskUpdateRequest } from "../types/task";

type Props = {
  card: Card | null;
  columnId: ColumnId | null;
  onClose: () => void;
  onChangeStatus: (card: Card, targetId: ColumnId) => void;
  onSave: (card: Card, request: TaskUpdateRequest) => Promise<UpdateResult>;
  onDelete: (card: Card) => void;
};

type Draft = { title: string; description: string; priority: Priority; dueDate: string };

// 呼び出し側（App.tsx）で、開くタスクの id を key に付ける。
// key が変わると React がこの部品を作り直すので、閉じたときや別のタスクを開いたときに、編集中の内容とメッセージが消える
export function TaskDetail({ card, columnId, onClose, onChangeStatus, onSave, onDelete }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState<Draft | null>(null); // null のときは見るだけ
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const open = card !== null;

  // <dialog> を開け閉めする（React の外にある DOM を動かすので、エフェクトで行う）
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    if (open && !dialog.open) {
      dialog.showModal();
    }
    if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  function startEdit() {
    if (!card) {
      return;
    }
    setDraft({ title: card.text, description: card.description, priority: card.priority, dueDate: card.date });
    setMessage("");
  }

  function change<K extends keyof Draft>(name: K, value: Draft[K]) {
    setDraft((current) => (current ? { ...current, [name]: value } : current));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!card || !draft || saving) {
      return;
    }
    const title = draft.title.trim();
    if (title === "") {
      setMessage("タイトルを入力してください。");
      return;
    }
    if (title.length > TITLE_MAX) {
      setMessage(`タイトルは ${TITLE_MAX} 文字までです。`);
      return;
    }
    setSaving(true);
    const result = await onSave(card, {
      title,
      description: draft.description.trim() === "" ? null : draft.description.trim(),
      priority: draft.priority,
      dueDate: validDate(draft.dueDate) ? draft.dueDate : null,
    });
    setSaving(false);
    if (result.ok) {
      setDraft(null);
      setMessage("");
    } else {
      setMessage(result.message);
    }
  }

  const date = card ? formatCardDate(card.date) : "";

  return (
    // oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions -- 外側のクリックで閉じる操作は、キーボードでは Esc キー（onCancel）でできる
    <dialog
      ref={dialogRef}
      className="detail-dialog"
      aria-labelledby="detail-heading"
      // Esc キーで閉じる（編集中の内容は保存しない）
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      // 外側（暗いところ）をクリックしても閉じる
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      {card ? (
        <div className="detail-content">
          <div className="detail-header">
            <h2 id="detail-heading" className="detail-heading">
              タスク詳細
            </h2>
            <button className="detail-close" type="button" aria-label="閉じる" onClick={onClose}>
              ×
            </button>
          </div>

          {draft ? (
            <form className="detail-body" onSubmit={onSubmit} noValidate>
              <label className="detail-field">
                <span className="detail-label">タイトル</span>
                <input
                  className="detail-input"
                  type="text"
                  value={draft.title}
                  maxLength={TITLE_MAX}
                  required
                  autoFocus
                  onChange={(event) => change("title", event.target.value)}
                />
              </label>
              <label className="detail-field">
                <span className="detail-label">説明</span>
                <textarea
                  className="detail-input detail-textarea"
                  value={draft.description}
                  rows={4}
                  onChange={(event) => change("description", event.target.value)}
                />
              </label>
              <div className="detail-row">
                <label className="detail-field">
                  <span className="detail-label">優先度</span>
                  <select
                    className="detail-input"
                    value={draft.priority}
                    onChange={(event) => change("priority", toPriority(event.target.value))}
                  >
                    {priorities.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="detail-field">
                  <span className="detail-label">期限日</span>
                  <input
                    className="detail-input"
                    type="date"
                    value={draft.dueDate}
                    onChange={(event) => change("dueDate", event.target.value)}
                  />
                </label>
              </div>
              {message ? (
                <p className="detail-error" role="alert">
                  {message}
                </p>
              ) : null}
              <div className="detail-form-actions">
                <button className="detail-cancel" type="button" onClick={() => setDraft(null)}>
                  キャンセル
                </button>
                <button className="detail-save" type="submit" disabled={saving}>
                  {saving ? "保存中…" : "保存"}
                </button>
              </div>
            </form>
          ) : (
            <div className="detail-body">
              <div className="detail-title-row">
                <h3 className="detail-title">{card.text}</h3>
                <button className="detail-edit" type="button" onClick={startEdit}>
                  編集
                </button>
              </div>
              {card.hidden ? <span className="card-badge">非表示</span> : null}

              {/* ボタンのまとまりなので、HTML の <fieldset> と見出しの <legend> を使う */}
              <fieldset className="detail-field detail-fieldset">
                <legend className="detail-label">ステータス</legend>
                <div className="status-buttons">
                  {columns.map((column) => {
                    const current = column.id === columnId;
                    return (
                      <button
                        key={column.id}
                        type="button"
                        className={current ? "status-button is-current" : "status-button"}
                        aria-pressed={current}
                        onClick={() => {
                          if (!current) {
                            onChangeStatus(card, column.id);
                          }
                        }}
                      >
                        {column.title}
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <div className="detail-field">
                <span className="detail-label">説明</span>
                <p className={card.description ? "detail-text" : "detail-text is-empty"}>
                  {card.description || "（なし）"}
                </p>
              </div>

              <div className="detail-row">
                <div className="detail-field">
                  <span className="detail-label">優先度</span>
                  <span className={`priority-badge priority-${card.priority}`}>{priorityLabel(card.priority)}</span>
                </div>
                <div className="detail-field">
                  <span className="detail-label">期限日</span>
                  <span className={date ? "detail-text" : "detail-text is-empty"}>{date || "（なし）"}</span>
                </div>
              </div>

              <p className="detail-meta">
                作成日：{formatDateTime(card.createdAt) || "—"}
                <br />
                更新日：{formatDateTime(card.updatedAt) || "—"}
              </p>

              <div className="detail-footer">
                <button className="detail-delete" type="button" onClick={() => onDelete(card)}>
                  <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
                    <path
                      fill="currentColor"
                      d="M6 1h4a1 1 0 0 1 1 1v1h3v2H2V3h3V2a1 1 0 0 1 1-1Zm-2 5h8l-.6 8.1a1 1 0 0 1-1 .9H5.6a1 1 0 0 1-1-.9L4 6Z"
                    />
                  </svg>
                  削除
                </button>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </dialog>
  );
}
