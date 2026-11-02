package com.taskmanagement.entity;

public enum Priority {
	HIGH("high"),
	MEDIUM("medium"),
	LOW("low");

	private final String value;

	Priority(String value) {
		this.value = value;
	}

	public String value() {
		return value;
	}

	public static Priority from(String value) {
		for (Priority priority : values()) {
			if (priority.value.equals(value)) {
				return priority;
			}
		}
		throw new IllegalArgumentException(value);
	}
}
