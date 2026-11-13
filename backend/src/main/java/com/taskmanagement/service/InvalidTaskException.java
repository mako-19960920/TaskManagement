package com.taskmanagement.service;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/** 登録しようとしたタスクの値が不正なとき。400 を返す。 */
@ResponseStatus(HttpStatus.BAD_REQUEST)
public class InvalidTaskException extends RuntimeException {

	public InvalidTaskException(String name, String reason) {
		super("タスクの値が不正です: " + name + "（" + reason + "）");
	}
}
