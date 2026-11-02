package com.taskmanagement.service;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.BAD_REQUEST)
public class InvalidTaskStatusException extends RuntimeException {

	public InvalidTaskStatusException(String status) {
		super("状態が不正です: " + status);
	}
}
