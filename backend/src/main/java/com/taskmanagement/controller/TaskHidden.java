package com.taskmanagement.controller;

/** PUT /api/tasks/{id}/hidden で受け取る、非表示かどうか。省略（null）はできない */
public record TaskHidden(
		Boolean hidden) {
}
