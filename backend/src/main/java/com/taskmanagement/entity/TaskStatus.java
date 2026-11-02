package com.taskmanagement.entity;

public enum TaskStatus {
	TODO("todo"),
	IN_PROGRESS("in_progress"),
	DONE("done");

	private final String value;

	TaskStatus(String value) {
		this.value = value;
	}

	public String value() {
		return value;
	}

	public static TaskStatus from(String value) {
		for (TaskStatus status : values()) {
			if (status.value.equals(value)) {
				return status;
			}
		}
		throw new IllegalArgumentException(value);
	}
}
