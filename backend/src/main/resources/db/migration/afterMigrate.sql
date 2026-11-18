-- 初期データ。Flyway が起動のたびに、マイグレーション（V1、V2 …）のあとで流す（afterMigrate という決まった名前のファイル）。
-- tasks が空のときだけ、各列2件ずつ計6件を入れる。カードをすべて消したあとに起動し直したときも、また入る（F-01）。

INSERT INTO tasks (title, description, priority, due_date, status, position)
SELECT seed.title, seed.description, seed.priority, seed.due_date, seed.status, seed.position
FROM (VALUES
	('買い物リストを作る', NULL::text, 'medium', NULL::date, 'todo', 0),
	('メールを返す', NULL::text, 'medium', DATE '2026-10-26', 'todo', 1),
	('企画書の下書き', NULL::text, 'medium', NULL::date, 'in_progress', 0),
	('資料を読み直す', NULL::text, 'low', NULL::date, 'in_progress', 1),
	('会議室を予約する', NULL::text, 'medium', NULL::date, 'done', 0),
	('日程を共有する', NULL::text, 'high', NULL::date, 'done', 1)
) AS seed(title, description, priority, due_date, status, position)
WHERE NOT EXISTS (SELECT 1 FROM tasks);
