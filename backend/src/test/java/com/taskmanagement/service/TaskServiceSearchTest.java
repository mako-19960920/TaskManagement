package com.taskmanagement.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.test.util.ReflectionTestUtils;

import com.taskmanagement.controller.TaskResponse;
import com.taskmanagement.entity.Task;
import com.taskmanagement.entity.TaskStatus;
import com.taskmanagement.repository.TaskRepository;

@ExtendWith(MockitoExtension.class)
class TaskServiceSearchTest {

	@Mock
	private TaskRepository taskRepository;

	private TaskService taskService;

	@BeforeEach
	void setUp() {
		taskService = new TaskService(taskRepository);
	}

	private Task task(long id, String title, TaskStatus status, int position) {
		Task task = new Task();
		ReflectionTestUtils.setField(task, "id", id);
		task.setTitle(title);
		task.setStatus(status);
		task.setPosition(position);
		return task;
	}

	@Test
	@SuppressWarnings("unchecked")
	void searchReturnsResultsInBoardOrder() {
		when(taskRepository.findAll(any(Specification.class))).thenReturn(List.of(
				task(3L, "完了", TaskStatus.DONE, 0),
				task(2L, "やること2", TaskStatus.TODO, 1),
				task(1L, "やること1", TaskStatus.TODO, 0),
				task(4L, "進行中", TaskStatus.IN_PROGRESS, 0)));

		List<TaskResponse> result = taskService.search(null, null, null, null, null);

		assertThat(result).extracting(TaskResponse::id).containsExactly(1L, 2L, 4L, 3L);
	}

	@Test
	@SuppressWarnings("unchecked")
	void searchAcceptsBlankConditions() {
		when(taskRepository.findAll(any(Specification.class))).thenReturn(List.of());

		assertThat(taskService.search(" ", "", "  ", "", " ")).isEmpty();
	}

	@Test
	@SuppressWarnings("unchecked")
	void searchRejectsUnknownStatus() {
		assertThatThrownBy(() -> taskService.search(null, "later", null, null, null))
				.isInstanceOf(InvalidTaskStatusException.class);
		verify(taskRepository, never()).findAll(any(Specification.class));
	}

	@Test
	void searchRejectsUnknownPriority() {
		assertThatThrownBy(() -> taskService.search(null, null, "urgent", null, null))
				.isInstanceOf(InvalidSearchConditionException.class);
	}

	@Test
	void searchRejectsBadDate() {
		assertThatThrownBy(() -> taskService.search(null, null, null, "2026/11/01", null))
				.isInstanceOf(InvalidSearchConditionException.class);
		assertThatThrownBy(() -> taskService.search(null, null, null, null, "2026-02-30"))
				.isInstanceOf(InvalidSearchConditionException.class);
	}

	@Test
	void searchRejectsReversedDateRange() {
		assertThatThrownBy(() -> taskService.search(null, null, null, "2026-11-30", "2026-11-01"))
				.isInstanceOf(InvalidSearchConditionException.class);
	}
}
