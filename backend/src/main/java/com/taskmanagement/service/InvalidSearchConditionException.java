package com.taskmanagement.service;

/**
 * 検索条件が正しくないとき（400）。
 * field は間違えた条件（priority など）、メッセージは理由と送られた値。
 */
public class InvalidSearchConditionException extends RuntimeException {

	private final String field;

	/** 値の形が正しくないとき。例：("priority", "urgent") → 「優先度は high / medium / low のいずれかです（送られた値：urgent）」 */
	public InvalidSearchConditionException(String field, String value) {
		this(field, reason(field) + "（送られた値：" + (value == null ? "なし" : value) + "）", true);
	}

	private InvalidSearchConditionException(String field, String detail, boolean ignored) {
		super(detail);
		this.field = field;
	}

	/** 期限の範囲が逆のとき（dueFrom が dueTo より後） */
	public static InvalidSearchConditionException reversedRange(String dueFrom, String dueTo) {
		return new InvalidSearchConditionException("dueFrom",
				"期限（から）が期限（まで）より後です（" + dueFrom + " 〜 " + dueTo + "）", true);
	}

	private static String reason(String field) {
		return switch (field) {
			case "priority" -> "優先度は high / medium / low のいずれかです";
			case "dueFrom" -> "期限（から）は YYYY-MM-DD の形です";
			case "dueTo" -> "期限（まで）は YYYY-MM-DD の形です";
			default -> field + " の値が正しくありません";
		};
	}

	public String getField() {
		return field;
	}
}
