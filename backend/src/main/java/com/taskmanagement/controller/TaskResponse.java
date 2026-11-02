package com.taskmanagement.controller;

import java.time.LocalDate;
import java.time.LocalDateTime;

import com.fasterxml.jackson.annotation.JsonInclude;

public record TaskResponse(
		Long id,
		String title,
		String description,
		String priority,
		LocalDate dueDate,
		String status,
		int position,
		LocalDateTime createdAt,
		LocalDateTime updatedAt,
		@JsonInclude(JsonInclude.Include.NON_NULL) String key) {
}
