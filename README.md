# タスクボード

Trelloのように、カードを列のあいだで動かすタスク管理アプリです。

## 技術スタック

| 層 | 採用 |
| --- | --- |
| フロントエンド | React（Vite） |
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

ブラウザで http://localhost:5173 を開く。API は http://localhost:8080 で、開発中の画面からは `/api` として届く。

## できること

- カードを「やること」に追加する。日付も入れられる
- カードの日付をあとから変える
- カードを削除する
- 「進行中へ」「完了へ」などのボタンで列を移す
- カードをドラッグして、別の列や同じ列の好きな位置へ移す
- ページを開き直しても、最後の並びを残す

## 画面の形

ボードの中に列があり、列の中にカードがあります。

- **やること** … まだ手を付けていないタスク
- **進行中** … 今やっているタスク
- **完了** … 終わったタスク

`prototype/index.html`、`prototype/style.css`、`prototype/script.js` は、サーバーへ保存する前の静的な試作です。
