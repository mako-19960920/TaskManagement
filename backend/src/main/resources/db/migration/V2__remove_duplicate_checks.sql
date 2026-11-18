-- V2：重なっていた CHECK 制約を1つにまとめる。
-- tasks_values_check が、優先度・状態・タイトルの3つをまとめて調べているので、
-- 同じことを調べている tasks_priority_check と tasks_status_check を外す。
-- 前からあるデータベースにも、新しいデータベースにも流れる。

ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_priority_check;
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
