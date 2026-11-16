package com.taskmanagement.controller;

/**
 * PUT /api/tasks/{id}/position で受け取る、移動先。
 * status の列の、beforeId のタスクの前に入れる。beforeId が null か、その列に無いときは末尾に入れる。
 */
public record TaskMove(
		String status,
		Long beforeId) {
}
