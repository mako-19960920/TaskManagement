package com.taskmanagement.dto;

/** PUT /api/tasks/{id}/due-date で受け取る期限。YYYY-MM-DD か、null・空（期限なし） */
public record TaskDueDate(
		String dueDate) {
}
