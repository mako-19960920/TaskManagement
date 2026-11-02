# 機能要件

| ID | 要件 |
| --- | --- |
| F-01 | `tasks` が空のとき、todo、in_progress、done に2件ずつ、計6件を入れる |
| F-02 | 「やること」に文章を追加できる。日付は空でも追加できる |
| F-03 | 前後の空白は除く。空白だけでは追加しない |
| F-04 | 追加に成功したら入力欄を空にする |
| F-05 | 削除は確認なしで、そのカードだけを消す |
| F-06 | 今いる列以外への移動ボタンを出す |
| F-07 | 移動ボタンは行き先の末尾へ入れる |
| F-08 | ドラッグで列の移動と、同じ列の並べ替えができる |
| F-09 | 削除ボタンと移動ボタンの上ではドラッグを開始しない |
| F-10 | 追加、削除、移動、ドラッグ、日付変更の直後に `PUT /api/tasks` で保存する |
| F-11 | ページを開き直したとき、`GET /api/tasks` の並びで復元する。読めないときはその旨を表示する |

読み取りは次の4つである。

- `GET /api/tasks` で全件を返す
- `GET /api/tasks/{id}` で1件を返す。無ければ 404
- `GET /api/tasks/status/{status}` で `todo`、`in_progress`、`done` の列を返す。それ以外は 400
- `GET /api/tasks/search` で条件に合うタスクを返す。条件はどれも省略でき、指定したものをすべて満たすものだけを返す。並びは `GET /api/tasks` と同じ
  - `keyword`：タイトルか説明に含む（部分一致、大文字小文字を区別しない。`%` と `_` も文字として探す）
  - `status`：`todo`、`in_progress`、`done`
  - `priority`：`high`、`medium`、`low`
  - `dueFrom`、`dueTo`：期限の範囲（`YYYY-MM-DD`、両端を含む。期限のないタスクは範囲指定で除かれる）
  - 値が不正なとき、`dueFrom` が `dueTo` より後のときは 400

検索を試すためのテストデータは `backend/db/test-data.sql` にある。同じタイトルは二重に入らない。

```
docker compose exec -T db psql -U taskboard -d taskboard < backend/db/test-data.sql
```
