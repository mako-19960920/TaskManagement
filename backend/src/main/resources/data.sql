ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_values_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_values_check CHECK (
	priority IN ('high', 'medium', 'low')
	AND status IN ('todo', 'in_progress', 'done')
	AND title <> ''
);

-- SQL で直接入れたときも、アプリから入れたときと同じ値になるように、デフォルト値をテーブルに設定する
ALTER TABLE tasks
	ALTER COLUMN priority SET DEFAULT 'medium',
	ALTER COLUMN status SET DEFAULT 'todo',
	ALTER COLUMN position SET DEFAULT 0,
	ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP,
	ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP;

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
