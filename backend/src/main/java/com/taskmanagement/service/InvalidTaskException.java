package com.taskmanagement.service;

import java.io.Serial;
import java.util.Map;

/**
 * 登録・編集しようとしたタスクの値が正しくないとき（400）。
 * field は間違えた項目（title など）、メッセージは「タイトルは必須です」のような理由。
 */
public class InvalidTaskException extends RuntimeException {

	@Serial
	private static final long serialVersionUID = 1L;

	// タイトルの必須・文字数と、優先度・非表示の値は、Controller の @Valid（Bean Validation）で調べる。
	// ここに来るのは、期限の日付が存在しないときと、まとめて保存（PUT /api/tasks）でタイトルが長すぎるとき
	private static final Map<String, String> LABELS = Map.of(
			"title", "タイトル",
			"dueDate", "期限");

	private final String field;

	/**
	 * 例：("title", "必須です") → 「タイトルは必須です」、("title", "255 文字までです") → 「タイトルは 255 文字までです」
	 * （英字や数字で始まるときは、読みやすいように「は」のあとに空白を入れる）
	 */
	public InvalidTaskException(String field, String reason) {
		super(LABELS.getOrDefault(field, field) + (reason.charAt(0) < 128 ? "は " : "は") + reason);
		this.field = field;
	}

	public String getField() {
		return field;
	}
}
