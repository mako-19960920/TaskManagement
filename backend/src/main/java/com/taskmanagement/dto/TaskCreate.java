package com.taskmanagement.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * POST /api/tasks で受け取るタスク。
 * 必須は title だけ。状態と順番はサーバーが決める（やることの末尾）。
 * 値のチェックは、項目に付けた印（Bean Validation）で行う。期限の日付が存在するかは、Service で確かめる。
 */
public record TaskCreate(
		@NotBlank(message = TaskInputRules.TITLE_REQUIRED)
		@Size(max = TaskInputRules.TITLE_MAX, message = TaskInputRules.TITLE_TOO_LONG)
		String title,
		String description,
		@Pattern(regexp = TaskInputRules.PRIORITY_VALUES, message = TaskInputRules.PRIORITY_INVALID)
		String priority,
		String dueDate) {

	/** 受け取ったときに前後の空白を除く（印のチェックは、除いたあとの値に対して行われる）。空の説明・優先度・期限は省略と同じにする */
	public TaskCreate {
		title = TaskInputRules.strip(title);
		description = TaskInputRules.blankToNull(description);
		priority = TaskInputRules.blankToNull(priority);
		dueDate = TaskInputRules.blankToNull(dueDate);
	}
}
