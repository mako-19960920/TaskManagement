package com.taskmanagement.controller;

/**
 * PUT /api/tasks/{id} で受け取る、編集後のタスク。
 * 送った値で置き換える。必須は title だけで、省略した description と dueDate はなし、priority は medium になる。
 * 状態・順番・非表示は、ここでは変えない。
 */
public record TaskUpdate(
		String title,
		String description,
		String priority,
		String dueDate) {
}
