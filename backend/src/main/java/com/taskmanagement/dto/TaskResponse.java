package com.taskmanagement.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;

/** API が返すタスク1件（GET・POST・PUT の応答） */
public record TaskResponse(
		Long id,
		String title,
		String description,
		String priority,
		LocalDate dueDate,
		String status,
		int position,
		boolean hidden,
		LocalDateTime createdAt,
		LocalDateTime updatedAt) {
}
