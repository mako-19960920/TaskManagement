package com.taskmanagement.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * PUT /api/tasks/{id} で受け取る、編集後のタスク。
 * 送った値で置き換える。必須は title だけで、省略した description と dueDate はなし、priority は medium になる。
 * 状態・順番・非表示は、ここでは変えない。
 * 値のチェックは、項目に付けた印（Bean Validation）で行う。期限の日付が存在するかは、Service で確かめる。
 */
public record TaskUpdate(
		@NotBlank(message = TaskInputRules.TITLE_REQUIRED)
		@Size(max = TaskInputRules.TITLE_MAX, message = TaskInputRules.TITLE_TOO_LONG)
		String title,
		String description,
		@Pattern(regexp = TaskInputRules.PRIORITY_VALUES, message = TaskInputRules.PRIORITY_INVALID)
		String priority,
		String dueDate) {

	/** 受け取ったときに前後の空白を除く（印のチェックは、除いたあとの値に対して行われる）。空の説明・優先度・期限は省略と同じにする */
	public TaskUpdate {
		title = TaskInputRules.strip(title);
		description = TaskInputRules.blankToNull(description);
		priority = TaskInputRules.blankToNull(priority);
		dueDate = TaskInputRules.blankToNull(dueDate);
	}
}
