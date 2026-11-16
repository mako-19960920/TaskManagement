package com.taskmanagement.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import com.taskmanagement.controller.TaskResponse;
import com.taskmanagement.controller.TaskWrite;
import com.taskmanagement.entity.Task;
import com.taskmanagement.entity.TaskStatus;
import com.taskmanagement.repository.TaskRepository;

/** PUT /api/tasks（まとめて保存）での非表示の扱い */
@ExtendWith(MockitoExtension.class)
class TaskServiceReplaceTest {

	@Mock
	private TaskRepository taskRepository;

	private TaskService taskService;

	@BeforeEach
	void setUp() {
		taskService = new TaskService(taskRepository);
		// save されたタスクに、id がなければ 99 を付けて返す
		when(taskRepository.save(any(Task.class))).thenAnswer(invocation -> {
			Task task = invocation.getArgument(0);
			if (task.getId() == null) {
				ReflectionTestUtils.setField(task, "id", 99L);
			}
			return task;
		});
	}

	private Task existing(long id, boolean hidden) {
		Task task = new Task();
		ReflectionTestUtils.setField(task, "id", id);
		task.setTitle("メールを返す");
		task.setStatus(TaskStatus.TODO);
		task.setHidden(hidden);
		return task;
	}

	@Test
	void hiddenTrueHidesTask() {
		Task task = existing(1L, false);
		when(taskRepository.findAll()).thenReturn(List.of(task));

		List<TaskResponse> responses = taskService.replace(List.of(
				new TaskWrite(1L, "1", "メールを返す", null, "todo", 0, true)));

		assertThat(task.isHidden()).isTrue();
		assertThat(responses.get(0).hidden()).isTrue();
	}

	@Test
	void hiddenFalseShowsTaskAgain() {
		Task task = existing(1L, true);
		when(taskRepository.findAll()).thenReturn(List.of(task));

		taskService.replace(List.of(new TaskWrite(1L, "1", "メールを返す", null, "todo", 0, false)));

		assertThat(task.isHidden()).isFalse();
	}

	@Test
	void missingHiddenKeepsCurrentValue() {
		Task task = existing(1L, true);
		when(taskRepository.findAll()).thenReturn(List.of(task));

		taskService.replace(List.of(new TaskWrite(1L, "1", "メールを返す", null, "todo", 0, null)));

		assertThat(task.isHidden()).isTrue();
	}

	@Test
	void newTaskWithoutHiddenIsShown() {
		when(taskRepository.findAll()).thenReturn(List.of());

		List<TaskResponse> responses = taskService.replace(List.of(
				new TaskWrite(null, "k", "新しいタスク", null, "todo", 0, null)));

		assertThat(responses.get(0).hidden()).isFalse();
	}
}
