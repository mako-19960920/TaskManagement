package com.taskmanagement.service;

import java.io.Serial;

/**
 * 検索条件が正しくないとき（400）。
 * field は間違えた条件（priority など）、メッセージは理由と送られた値。
 * 作るときは、場合ごとに名前の付いた invalidValue か reversedRange を使う。
 */
public final class InvalidSearchConditionException extends RuntimeException {

	@Serial
	private static final long serialVersionUID = 1L;

	private final String field;

	private InvalidSearchConditionException(String field, String detail) {
		super(detail);
		this.field = field;
	}

	/** 値の形が正しくないとき。例：("priority", "urgent") → 「優先度は high / medium / low のいずれかです（送られた値：urgent）」 */
	public static InvalidSearchConditionException invalidValue(String field, String value) {
		return new InvalidSearchConditionException(field,
				reason(field) + "（送られた値：" + (value == null ? "なし" : value) + "）");
	}

	/** 期限の範囲が逆のとき（dueFrom が dueTo より後） */
	public static InvalidSearchConditionException reversedRange(String dueFrom, String dueTo) {
		return new InvalidSearchConditionException("dueFrom",
				"期限（から）が期限（まで）より後です（" + dueFrom + " 〜 " + dueTo + "）");
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
