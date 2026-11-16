package com.taskmanagement.service;

import java.io.Serial;

/** その id のタスクが無いとき（404） */
public class TaskNotFoundException extends RuntimeException {

	@Serial
	private static final long serialVersionUID = 1L;

	public TaskNotFoundException(long id) {
		super("id が " + id + " のタスクはありません");
	}
}
