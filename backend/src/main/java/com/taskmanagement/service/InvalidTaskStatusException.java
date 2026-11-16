package com.taskmanagement.service;

import java.io.Serial;

/** 状態（status）の値が正しくないとき（400） */
public class InvalidTaskStatusException extends RuntimeException {

	@Serial
	private static final long serialVersionUID = 1L;

	public InvalidTaskStatusException(String status) {
		super("状態は todo / in_progress / done のいずれかです（送られた値：" + (status == null ? "なし" : status) + "）");
	}

	public String getField() {
		return "status";
	}
}
