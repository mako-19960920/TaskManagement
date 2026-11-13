// 画面上部の検索フォーム
import type { FormEvent } from "react";
import type { SearchConditions } from "../types/task";

type Props = {
  conditions: SearchConditions;
  searching: boolean;
  onChange: (name: keyof SearchConditions, value: string) => void;
  onSearch: () => void;
  onClear: () => void;
};

export function SearchForm({ conditions, searching, onChange, onSearch, onClear }: Props) {
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSearch();
  }

  return (
    <form className="search-form" onSubmit={onSubmit}>
      <input
        type="text"
        placeholder="キーワード"
        aria-label="キーワード"
        value={conditions.keyword}
        onChange={(event) => onChange("keyword", event.target.value)}
      />
      <select aria-label="状態" value={conditions.status} onChange={(event) => onChange("status", event.target.value)}>
        <option value="">状態：指定なし</option>
        <option value="todo">やること</option>
        <option value="in_progress">進行中</option>
        <option value="done">完了</option>
      </select>
      <select
        aria-label="優先度"
        value={conditions.priority}
        onChange={(event) => onChange("priority", event.target.value)}
      >
        <option value="">優先度：指定なし</option>
        <option value="high">高</option>
        <option value="medium">中</option>
        <option value="low">低</option>
      </select>
      <label>
        期限
        <input
          type="date"
          aria-label="期限（から）"
          value={conditions.dueFrom}
          onChange={(event) => onChange("dueFrom", event.target.value)}
        />
      </label>
      <label>
        〜
        <input
          type="date"
          aria-label="期限（まで）"
          value={conditions.dueTo}
          onChange={(event) => onChange("dueTo", event.target.value)}
        />
      </label>
      <button className="search-button" type="submit">
        検索
      </button>
      {searching ? (
        <button className="clear-button" type="button" onClick={onClear}>
          解除
        </button>
      ) : null}
    </form>
  );
}
