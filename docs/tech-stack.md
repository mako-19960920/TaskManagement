# 技術選定

## 使う技術

| 分類 | 項目 | 採用 | バージョン |
| --- | --- | --- | --- |
| バックエンド | 言語 | Java（Temurin） | 21（21.0.12） |
| バックエンド | フレームワーク | Spring Boot | 4.1.2 |
| バックエンド | ビルドツール | Gradle（Gradle Wrapper） | 8.14.3 |
| フロントエンド | 言語 | TypeScript | 7.0.2 |
| フロントエンド | UI ライブラリ | React | 19.3.1 |
| フロントエンド | ビルドツール・開発サーバー | Vite | 8.3.6 |
| フロントエンド | 実行環境 | Node.js | 24.20.0 |
| フロントエンド | パッケージ管理 | npm | 11.19.0 |
| データベース | DBMS | PostgreSQL（Docker、ホストの 5433） | 17（17.11） |
| 開発環境 | コンテナ | Docker | 29.9.2 |
| 開発環境 | バージョン管理 | Git | 2.56.0 |
| 開発環境 | コードのチェック（画面） | Oxlint | 1.93.0 |
| 開発環境 | コードのチェック（API） | Checkstyle | 14.4.0 |
| 開発環境 | コードの整形（画面） | Prettier | 3.10.1 |
| 開発環境 | コードの整形（API） | Spotless（Eclipse の整形） | 8.11.0 |

- Gradle は `gradlew.bat`（Gradle Wrapper）が 8.14.3 をダウンロードして使うので、どの PC でも同じ版になる
- Node.js、npm、Docker、Git は PC に入れたものを使う。表の版は、動作を確かめた PC のもの
- PostgreSQL は `postgres:17` を指定している。かっこ内は実際に動いている版

## ドラッグ

カードのドラッグには **dnd-kit** を使う。

| パッケージ | 使っているもの | 役割 |
| --- | --- | --- |
| `@dnd-kit/core` | `DndContext`、`DragOverlay`、`useDroppable`、`PointerSensor`、`KeyboardSensor`、`pointerWithin`、`closestCorners` | ドラッグの範囲、つかんだカードの表示、列を落とせる場所にする、操作の受け付け、落とす場所の判定 |
| `@dnd-kit/sortable` | `SortableContext`、`useSortable`、`verticalListSortingStrategy`、`arrayMove`、`sortableKeyboardCoordinates` | 列の中の並べ替えと、ドラッグ中にほかのカードをずらして入る場所を見せること |
| `@dnd-kit/utilities` | `CSS.Translate` | ずらす量を CSS の `transform` にする |

| 項目 | 内容 |
| --- | --- |
| 実装の場所 | `frontend/src/hooks/useCardDrag.ts`（決まりごと）、`components/Board.tsx`（`DndContext`）、`components/Column.tsx`（列）、`components/TaskCard.tsx`（カード） |
| 手順と見た目 | [screen-design.md](screen-design.md) の「6. ドラッグ」 |

dnd-kit にした理由は次のとおりである。

- 講座の指定である
- マウス、タッチ、ペンに加えて、キーボードでも動かせる。画面の読み上げ（スクリーンリーダー）向けの案内も出せる
- ドラッグ中にほかのカードがずれて、入る場所が見える
- React 用に作られていて、HTML5 Drag and Drop API と違い、スマートフォンのタッチでも同じように動く

## Lint（コードのチェック）

コードを動かす前に読んで、標準から外れた書き方やバグになりやすい書き方を見つける。指摘が0件の状態を保つ。

| 対象 | ツール | コマンド | 設定 | 見ているもの |
| --- | --- | --- | --- | --- |
| 画面 | Oxlint（型を使うチェックは oxlint-tsgolint） | `frontend` で `npm run lint` | `frontend/.oxlintrc.json` | React のフックの決まり（`react-hooks`）、TypeScript、アクセシビリティ（`jsx-a11y`）、import、テストの書き方（`vitest`）など |
| API | Checkstyle | `backend` で `gradlew.bat check`（テストも一緒に動く） | `backend/config/checkstyle/checkstyle.xml` | import、名前の付け方、`{}` の付け忘れ、宣言の順番、文字列の `==` 比較、1行 140 文字までなど |
| API | javac の警告（`-Xlint:all`、`-Werror`） | 同上（コンパイルのたびに動く） | `backend/build.gradle.kts` | 非推奨の書き方、型があいまいな所など。警告もエラーとして止める |

画面に ESLint ではなく Oxlint を使う理由は次のとおりである。

- ESLint で TypeScript を読む部品（typescript-eslint 8.72）は、TypeScript 6.1 未満にしか対応しておらず、このプロジェクトの TypeScript 7 では使えない
- Oxlint は ESLint と同じルール名（`react-hooks/exhaustive-deps` など）を使え、TypeScript 7 でも動く。Vite 8 と同じ開発元の系列（oxc）である

Checkstyle は、インデントのタブを禁止しない（Spring 本体と同じく、タブでインデントしているため）。

ルールを止めている所は、理由をコメントに書く。

| 場所 | 止めているルール | 理由 |
| --- | --- | --- |
| `.oxlintrc.json` | `react/react-in-jsx-scope` | React 16 までの決まり。React 17 からは JSX のために React を import しなくてよい |
| `ConfirmDialog.tsx`、`TaskDetail.tsx` の `<dialog>` | `jsx-a11y` のクリックとキーボードのルール | 外側のクリックで閉じる操作は、キーボードでは Esc キーでできる |
| `TaskCard.tsx` の `<li>` | 同上 | キーボードでは「詳細」ボタンで開ける。実際の画面では dnd-kit が `role="button"` を付ける |

## 整形（フォーマッター）

空白・改行・引用符などの見た目を、自動でそろえる。Lint は「書き方の決まり」、整形は「見た目」を受け持つ。CI では、整形済みかを確かめる（整っていなければ ❌）。

| 対象 | ツール | 整形する | 確かめるだけ | 決まり |
| --- | --- | --- | --- | --- |
| 画面 | Prettier | `frontend` で `npm run format` | `npm run format:check` | `frontend/.prettierrc.json`（1行 120 文字、ダブルクォート、セミコロンあり）。改行（CRLF・LF）は Git に任せる（`endOfLine: auto`） |
| API | Spotless（Eclipse の整形） | `backend` で `gradlew.bat format` | `gradlew.bat spotlessCheck`（`check` にも含まれる） | `backend/config/eclipse-formatter.prefs`（タブでインデント、1行 120 文字） |

Java の整形に、Spring 本体が使う Spring Java Format ではなく Spotless を使う理由は次のとおりである。

- Spring Java Format は Javadoc の改行をつなげ直すので、日本語のコメントの文の途中に空白が入り、`<pre>` の中まで崩れた。「コメントは整形しない」という設定がない
- Spotless（Eclipse の整形）は、コメントを整形しないように決められる。インデントは Spring 本体と同じくタブにしている

record の項目に付けた印（`@NotBlank` など）は、Eclipse の整形では1行につながってしまうので、`// @formatter:off` と `// @formatter:on` で囲んで、縦に並べたままにしている（`TaskCreate`・`TaskUpdate`・`TaskHidden`）。

## テスト

| 対象 | ツール | コマンド | 場所 | 確かめていること |
| --- | --- | --- | --- | --- |
| API | JUnit、Mockito、MockMvc（`@WebMvcTest`） | `backend` で `gradlew.bat test`（`check` にも含まれる） | `backend/src/test/java/com/taskmanagement/controller`・`service` | API の応答とエラーの形、入力チェック、Service の処理。データベースは使わない |
| API と PostgreSQL | Testcontainers（`spring-boot-testcontainers`、`testcontainers-postgresql`）、`@SpringBootTest`、MockMvc | 同上 | `backend/src/test/java/com/taskmanagement/TaskDatabaseIntegrationTest.java` | テストのときだけ Docker で使い捨ての PostgreSQL 17 を立て、Flyway の V1・V2 と初期データ、Hibernate の確かめ（`validate`）、登録・移動・削除のあとの並び、検索（`%` を文字として探す、大文字小文字を区別しない）、CHECK 制約を確かめる。テストごとに変更を取り消す。Docker が無い PC では飛ばす |
| 画面 | Vitest | `frontend` で `npm test` | `frontend/src/**/*.test.ts` | ボードを組み替える関数（`lib/board.ts`）。ブラウザは使わず、Node.js の上で動かす |

テストと Lint は、GitHub Actions（`.github/workflows/ci.yml`）でも、PR を作ったとき・更新したときと `main` にマージしたときに自動で動く。backend（Java 21、`./gradlew check`）と frontend（Node.js 24、`npm ci` のあと lint・typecheck・test・build）の2つのジョブを同時に動かす。

画面のテストは、Vitest を直接ではなく `frontend/scripts/vitest.mjs` から動かす。Windows では、ターミナルの今のフォルダのドライブ名が小文字（`c:...`、VS Code のターミナルで起きやすい）のことがあり、そのまま動かすと、Vitest の本体とテストのファイルが別々の書き方（`c:` と `C:`）で読み込まれて、「Vitest failed to find the current suite」のエラーでテストが1件も動かない。このスクリプトは、ドライブ名を大文字にそろえてから Vitest を動かす。

## API とデータ

| 項目 | 採用 |
| --- | --- |
| パッケージ | `com.taskmanagement`。役割ごとに分け、依存は「controller → service → repository → entity」の一方向にする。API で受け取る・返すデータの形（DTO）は `dto` に置き、controller と service の両方から使う（`dto` はほかのパッケージに依存しない） |
| API の形式 | JSON（REST）。一覧と仕様は [functional-requirements.md](functional-requirements.md) の「2. API」 |
| 入力チェック | Bean Validation（`spring-boot-starter-validation`）。受け取るクラス（`TaskCreate`・`TaskUpdate`・`TaskHidden`）の項目に `@NotBlank`・`@Size`・`@Pattern`・`@NotNull` を付け、Controller の `@Valid` で調べる。決まり（上限の数、エラー文）は `dto/TaskInputRules.java` にまとめる。期限の日付が存在するか（2月30日など）は印では調べられないので、`TaskService` で調べる |
| テーブル | `tasks`。定義は [database-design.md](database-design.md) |
| テーブルの作成と変更 | Flyway。版番号を付けた SQL（`src/main/resources/db/migration/V1__…sql` など）で管理し、起動時にまだ流していない版を流す。Hibernate は `ddl-auto: validate` で、クラスとテーブルが合っているかを確かめるだけ |

## バージョン

2026-11-16 時点で、このリポジトリが使っているバージョンである。「指定」は設定ファイルに書いてある値、「実際」はその指定で入ったものを示す。

### バックエンド（`backend/build.gradle.kts`）

| 技術 | 指定 | 実際 | 決めている場所 |
| --- | --- | --- | --- |
| Java | 21 | 21（Temurin 21.0.12） | `java.toolchain` |
| Gradle | 8.14.3 | 8.14.3 | `gradle/wrapper/gradle-wrapper.properties` |
| Spring Boot | 4.1.2 | 4.1.2 | `plugins` |
| Spring Dependency Management プラグイン | 1.1.7 | 1.1.7 | `plugins` |
| Checkstyle | 14.4.0 | 14.4.0 | `checkstyle.toolVersion` |
| Spotless プラグイン | 8.11.0 | 8.11.0 | `plugins` |

次のライブラリは、Spring Boot 4.1.2 がバージョンを決める（自分では書かない）。

| ライブラリ | バージョン | 役割 |
| --- | --- | --- |
| Spring Framework（spring-webmvc） | 7.0.10 | API の受け口 |
| Tomcat（組み込み） | 11.0.27 | Web サーバー |
| Hibernate ORM | 7.4.13.Final | Java のクラスとテーブルの対応（JPA） |
| Flyway（`flyway-core`、`flyway-database-postgresql`） | 12.4.0 | テーブルの作成と変更（マイグレーション） |
| Jackson | 3.1.7 | JSON の読み書き |
| PostgreSQL JDBC ドライバ | 42.7.14 | データベースへの接続 |
| JUnit Jupiter | 6.0.3 | テスト |
| Mockito | 5.23.0 | テスト用の偽物（モック） |
| AssertJ | 3.27.7 | テストの確認（アサーション） |
| Testcontainers | 2.0.5 | テストのときだけ、Docker で使い捨ての PostgreSQL を立てる |

### フロントエンド（`frontend/package.json`）

`^` は「この版以上で、先頭の数字が同じもの」を表す。実際の版は `package-lock.json` で固定される。

| パッケージ | 指定 | 実際 | 役割 |
| --- | --- | --- | --- |
| react | ^19.3.1 | 19.3.1 | 画面の部品 |
| react-dom | ^19.3.1 | 19.3.1 | React をブラウザに表示する |
| @dnd-kit/core | ^6.3.1 | 6.3.1 | カードのドラッグ |
| @dnd-kit/sortable | ^10.0.0 | 10.0.0 | 列の中の並べ替え |
| @dnd-kit/utilities | ^3.2.2 | 3.2.2 | ドラッグ中のずれを CSS にする |
| typescript | ^7.0.2 | 7.0.2 | 型チェック |
| vitest | ^5.1.0 | 5.1.0 | テスト（`npm test`） |
| prettier | ^3.10.1 | 3.10.1 | 整形（`npm run format`） |
| vite | ^8.3.6 | 8.3.6 | 開発サーバーとビルド |
| @vitejs/plugin-react | ^6.3.0 | 6.3.0 | Vite で React を扱う |
| @types/react | ^19.3.0 | 19.3.0 | React の型定義 |
| @types/react-dom | ^19.3.0 | 19.3.0 | React DOM の型定義 |
| oxlint | ^1.93.0 | 1.93.0 | コードのチェック（Lint） |
| oxlint-tsgolint | ^7.0.2007 | 7.0.2007 | Oxlint で型を使うチェック（TypeScript 7 用） |

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
