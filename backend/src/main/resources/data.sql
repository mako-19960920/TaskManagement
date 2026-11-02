ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_values_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_values_check CHECK (
	priority IN ('high', 'medium', 'low')
	AND status IN ('todo', 'in_progress', 'done')
	AND title <> ''
);

INSERT INTO tasks (title, description, priority, due_date, status, position, created_at, updated_at)
SELECT seed.title, seed.description, seed.priority, seed.due_date, seed.status, seed.position, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (VALUES
	('買い物リストを作る', NULL::text, 'medium', NULL::date, 'todo', 0),
	('メールを返す', NULL::text, 'medium', DATE '2026-10-26', 'todo', 1),
	('企画書の下書き', NULL::text, 'medium', NULL::date, 'in_progress', 0),
	('資料を読み直す', NULL::text, 'low', NULL::date, 'in_progress', 1),
	('会議室を予約する', NULL::text, 'medium', NULL::date, 'done', 0),
	('日程を共有する', NULL::text, 'high', NULL::date, 'done', 1)
) AS seed(title, description, priority, due_date, status, position)
WHERE NOT EXISTS (SELECT 1 FROM tasks);
