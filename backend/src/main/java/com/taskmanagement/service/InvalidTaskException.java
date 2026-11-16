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

	private static final Map<String, String> LABELS = Map.of(
			"title", "タイトル",
			"description", "説明",
			"priority", "優先度",
			"dueDate", "期限",
			"hidden", "非表示",
			"body", "本体");

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
