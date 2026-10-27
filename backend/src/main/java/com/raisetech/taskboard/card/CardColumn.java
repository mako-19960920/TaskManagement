package com.raisetech.taskboard.card;

public enum CardColumn {
	TODO("todo-cards"),
	DOING("doing-cards"),
	DONE("done-cards");

	private final String key;

	CardColumn(String key) {
		this.key = key;
	}

	public String key() {
		return key;
	}
}
