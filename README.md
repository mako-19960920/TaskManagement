# タスクボード

Trelloのように、カードを列のあいだで動かすタスク管理アプリです。

## 技術スタック

| 層 | 採用 |
| --- | --- |
| フロントエンド | React + TypeScript（Vite） |
| バックエンド | Java 21、Spring Boot、Gradle |
| データベース | PostgreSQL |

ログインはしない。ボードは1つで、このサーバーを開くブラウザは同じボードを見る。

## 起動

PostgreSQL は Docker で起動する。データベース名、ユーザー、パスワードはいずれも `taskboard` で、この PC のポートは 5433 である。`TaskManagement` で次を実行する。

```
docker compose up -d
```

バックエンド:

```
cd backend
gradlew.bat bootRun
```

フロントエンド:

```
cd frontend
npm install
npm run dev
```

まとめて起動するときは `powershell -ExecutionPolicy Bypass -File scripts\start-servers.ps1` を使う。8080 や 5173 が使用中なら、そのプロセスを止めてから同じポートで起動する。ログは `logs/` に日時付きで残る。

ブラウザで http://localhost:5173 を開く。API は http://localhost:8080 で、開発中の画面からは `/api` として届く。

## できること

- カードを「やること」に追加する。日付も入れられる
- カードの日付をあとから変える
- カードを削除する
- 「進行中へ」「完了へ」などのボタンで列を移す
- カードをドラッグして、別の列や同じ列の好きな位置へ移す
- ページを開き直しても、最後の並びを残す
- 画面上部の検索フォームで、キーワード、状態、優先度、期限の範囲からタスクを探す。結果は3列のボードに出る（API は `GET /api/tasks/search`）
- 検索中も「完了へ」などのボタンやドラッグで列を移せる。移した結果は保存され、検索結果の表示にもすぐ反映される。削除、追加、日付の変更は、検索を解除してから行う
- 「解除」で、いつものボードに戻る

## 画面の形

ボードの中に列があり、列の中にカードがあります。

- **やること** … まだ手を付けていないタスク
- **進行中** … 今やっているタスク
- **完了** … 終わったタスク

`prototype/index.html`、`prototype/style.css`、`prototype/script.js` は、サーバーへ保存する前の静的な試作です。
