package com.taskmanagement.service;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.NOT_FOUND)
public class TaskNotFoundException extends RuntimeException {

	public TaskNotFoundException(long id) {
		super("タスクが見つかりません: " + id);
	}
}
