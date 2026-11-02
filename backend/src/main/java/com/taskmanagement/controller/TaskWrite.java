package com.taskmanagement.controller;

public record TaskWrite(
		Long id,
		String key,
		String title,
		String dueDate,
		String status,
		Integer position) {
}
