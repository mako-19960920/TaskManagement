package com.taskmanagement.controller;

/**
 * 登録・編集で受け取る値の決まり（Bean Validation の印で使う値と、受け取ったときの空白の除き方）。
 * エラー文は、そのまま API のエラーの detail になる（例：「タイトルは必須です」）。
 */
public final class TaskInputRules {

	/** タイトルの最大の文字数（データベースの title 列は varchar(255)） */
	public static final int TITLE_MAX = 255;

	public static final String TITLE_REQUIRED = "タイトルは必須です";

	/** {max} には、@Size の max（255）が入る */
	public static final String TITLE_TOO_LONG = "タイトルは {max} 文字までです";

	public static final String PRIORITY_VALUES = "high|medium|low";

	public static final String PRIORITY_INVALID = "優先度は high / medium / low のいずれかです";

	public static final String HIDDEN_REQUIRED = "非表示は true か false です";

	private TaskInputRules() {
	}

	/** 前後の空白（スペース、タブ、改行）を除く。null は null のまま */
	public static String strip(String value) {
		return value == null ? null : value.strip();
	}

	/** 前後の空白を除き、空になったら null にする（省略したのと同じに扱う） */
	public static String blankToNull(String value) {
		String stripped = strip(value);
		return stripped == null || stripped.isEmpty() ? null : stripped;
	}
}
