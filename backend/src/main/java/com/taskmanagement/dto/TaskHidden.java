package com.taskmanagement.dto;

import jakarta.validation.constraints.NotNull;

/** PUT /api/tasks/{id}/hidden で受け取る、非表示かどうか。省略（null）はできない */
// 印（@NotBlank など）と項目を縦に並べたままにするため、ここは整形しない
// @formatter:off
public record TaskHidden(
		@NotNull(message = TaskInputRules.HIDDEN_REQUIRED)
		Boolean hidden) {
	// @formatter:on
}
