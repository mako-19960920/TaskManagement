-- 検索 API を確かめるためのテストデータ。
-- 何回流しても、同じタイトルのタスクは二重に入らない。
-- 各列の末尾（今ある position の続き）に追加する。
--
-- 流し方（TaskManagement フォルダで）:
--   docker compose exec -T db psql -U taskboard -d taskboard < backend/db/test-data.sql

INSERT INTO tasks (title, description, priority, due_date, status, position, created_at, updated_at)
SELECT
	seed.title,
	seed.description,
	seed.priority,
	seed.due_date,
	seed.status,
	COALESCE((SELECT MAX(t.position) + 1 FROM tasks t WHERE t.status = seed.status), 0)
		+ ROW_NUMBER() OVER (PARTITION BY seed.status ORDER BY seed.no) - 1,
	CURRENT_TIMESTAMP,
	CURRENT_TIMESTAMP
FROM (VALUES
	(1, 'API の設計書を書く', '検索 API の仕様をまとめる', 'high', DATE '2026-11-05', 'todo'),
	(2, 'ログイン画面の調査', 'Spring Security の資料を読む', 'low', DATE '2026-11-20', 'todo'),
	(3, '週次レポートを提出する', NULL, 'medium', DATE '2026-11-06', 'todo'),
	(4, 'データベースのバックアップ', 'PostgreSQL のダンプを取る', 'high', DATE '2026-11-03', 'in_progress'),
	(5, 'テストコードを書く', '検索 API の JUnit テスト', 'medium', DATE '2026-11-10', 'in_progress'),
	(6, '100%_達成の記録', '記号 % と _ を含むタイトル', 'low', NULL, 'in_progress'),
	(7, 'Docker の設定を見直す', 'docker compose のポートを確認', 'medium', DATE '2026-10-30', 'done'),
	(8, '要件定義のレビュー', NULL, 'high', DATE '2026-10-28', 'done')
) AS seed(no, title, description, priority, due_date, status)
WHERE NOT EXISTS (SELECT 1 FROM tasks t WHERE t.title = seed.title);

SELECT id, title, priority, status, due_date, position FROM tasks ORDER BY status, position;
