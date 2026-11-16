package com.taskmanagement.controller;

/**
 * PUT /api/tasks で受け取るタスク1件。
 * hidden を送らなかった（null の）ときは、今の値を変えない（新しいタスクは表示）。
 */
public record TaskWrite(
		Long id,
		String key,
		String title,
		String dueDate,
		String status,
		Integer position,
		Boolean hidden) {
}
