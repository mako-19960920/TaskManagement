# 技術選定

| 項目 | 採用 |
| --- | --- |
| バックエンド | Java 21、Spring Boot、Gradle |
| パッケージ | `com.taskmanagement` |
| フロントエンド | React + TypeScript（Vite） |
| データベース | PostgreSQL 17（Docker、ホストの 5433） |
| 読み取り | `GET /api/tasks`、`GET /api/tasks/{id}`、`GET /api/tasks/status/{status}`、`GET /api/tasks/search` |
| 画面からの保存 | `PUT /api/tasks` |
| 初期データ | `backend/src/main/resources/data.sql` |

ログインはしない。このサーバーを開くブラウザは同じタスク一覧を見る。

## バージョン

2026-11-09 時点で、このリポジトリが使っているバージョンである。「指定」は設定ファイルに書いてある値、「実際」はその指定で入ったものを示す。

### バックエンド（`backend/build.gradle.kts`）

| 技術 | 指定 | 実際 | 決めている場所 |
| --- | --- | --- | --- |
| Java | 21 | 21（Temurin 21.0.12） | `java.toolchain` |
| Gradle | 8.14.3 | 8.14.3 | `gradle/wrapper/gradle-wrapper.properties` |
| Spring Boot | 4.1.2 | 4.1.2 | `plugins` |
| Spring Dependency Management プラグイン | 1.1.7 | 1.1.7 | `plugins` |

次のライブラリは、Spring Boot 4.1.2 がバージョンを決める（自分では書かない）。

| ライブラリ | バージョン | 役割 |
| --- | --- | --- |
| Spring Framework（spring-webmvc） | 7.0.10 | API の受け口 |
| Tomcat（組み込み） | 11.0.27 | Web サーバー |
| Hibernate ORM | 7.4.13.Final | Java のクラスとテーブルの対応（JPA） |
| Jackson | 3.1.7 | JSON の読み書き |
| PostgreSQL JDBC ドライバ | 42.7.14 | データベースへの接続 |
| JUnit Jupiter | 6.0.3 | テスト |
| Mockito | 5.23.0 | テスト用の偽物（モック） |
| AssertJ | 3.27.7 | テストの確認（アサーション） |

### フロントエンド（`frontend/package.json`）

`^` は「この版以上で、先頭の数字が同じもの」を表す。実際の版は `package-lock.json` で固定される。

| パッケージ | 指定 | 実際 | 役割 |
| --- | --- | --- | --- |
| react | ^19.3.1 | 19.3.1 | 画面の部品 |
| react-dom | ^19.3.1 | 19.3.1 | React をブラウザに表示する |
| typescript | ^7.0.2 | 7.0.2 | 型チェック |
| vite | ^8.3.6 | 8.3.6 | 開発サーバーとビルド |
| @vitejs/plugin-react | ^6.3.0 | 6.3.0 | Vite で React を扱う |
| @types/react | ^19.3.0 | 19.3.0 | React の型定義 |
| @types/react-dom | ^19.3.0 | 19.3.0 | React DOM の型定義 |

### データベース（`docker-compose.yml`）

| 技術 | 指定 | 実際 |
| --- | --- | --- |
| PostgreSQL | `postgres:17` | 17.11 |

`postgres:17` は 17 系の最新を指すので、イメージを取り直すと小さい数字（17.11 の 11）は上がることがある。

### 開発に使うツール

アプリには含まれないが、動かすのに必要なもの。確認した PC での版を書く。

| ツール | 確認した版 | 使う場面 |
| --- | --- | --- |
| Node.js | 24.20.0 | フロントエンドの起動とビルド |
| npm | 11.19.0 | フロントエンドのパッケージの導入 |
| Docker | 29.9.2 | PostgreSQL の起動 |
| Git | 2.56.0 | バージョン管理 |

バージョンを上げたときは、この表も一緒に直す。
