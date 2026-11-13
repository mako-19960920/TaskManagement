// 「やること」の最下部の追加欄
import { useRef, useState } from "react";
import type { FormEvent } from "react";

type Props = {
  // 登録できたら true
  onAdd: (text: string, date: string) => Promise<boolean>;
};

export function AddCardForm({ onAdd }: Props) {
  const [draft, setDraft] = useState("");
  const [draftDate, setDraftDate] = useState("");
  const [adding, setAdding] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = draft.trim();
    // 空白だけは追加しない。登録を待つあいだは次を受け付けない
    if (text === "" || adding) {
      return;
    }
    const typed = draft;
    const typedDate = draftDate;
    setAdding(true);
    const added = await onAdd(text, typedDate);
    setAdding(false);
    if (added) {
      // 登録を待つあいだに書き足した文字は消さない
      setDraft((current) => (current === typed ? "" : current));
      setDraftDate((current) => (current === typedDate ? "" : current));
      inputRef.current?.focus();
    }
  }

  return (
    <form className="add-form" onSubmit={onSubmit}>
      <input
        className="add-input"
        ref={inputRef}
        type="text"
        placeholder="カードを追加"
        required
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
      />
      <input
        className="add-date"
        type="date"
        aria-label="日付"
        value={draftDate}
        onChange={(event) => setDraftDate(event.target.value)}
      />
      <button className="add-button" type="submit" disabled={adding}>
        追加
      </button>
    </form>
  );
}
