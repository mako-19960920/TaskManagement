package com.taskmanagement.service;

/** その id のタスクが無いとき（404） */
public class TaskNotFoundException extends RuntimeException {

	public TaskNotFoundException(long id) {
		super("id が " + id + " のタスクはありません");
	}
}
