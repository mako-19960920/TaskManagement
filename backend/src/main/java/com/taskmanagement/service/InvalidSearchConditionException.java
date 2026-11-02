package com.taskmanagement.service;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.BAD_REQUEST)
public class InvalidSearchConditionException extends RuntimeException {

	public InvalidSearchConditionException(String name, String value) {
		super("検索条件が不正です: " + name + "=" + value);
	}
}
