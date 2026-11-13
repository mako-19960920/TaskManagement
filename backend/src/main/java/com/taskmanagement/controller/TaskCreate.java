package com.taskmanagement.controller;

/**
 * POST /api/tasks で受け取るタスク。
 * 必須は title だけ。状態と順番はサーバーが決める（やることの末尾）。
 */
public record TaskCreate(
		String title,
		String description,
		String priority,
		String dueDate) {
}
