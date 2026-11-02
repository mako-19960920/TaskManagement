# 技術選定

| 項目 | 採用 |
| --- | --- |
| バックエンド | Java 21、Spring Boot、Gradle |
| パッケージ | `com.taskmanagement` |
| フロントエンド | React（Vite） |
| データベース | PostgreSQL 17（Docker、ホストの 5433） |
| 読み取り | `GET /api/tasks`、`GET /api/tasks/{id}`、`GET /api/tasks/status/{status}`、`GET /api/tasks/search` |
| 画面からの保存 | `PUT /api/tasks` |
| 初期データ | `backend/src/main/resources/data.sql` |

ログインはしない。このサーバーを開くブラウザは同じタスク一覧を見る。
