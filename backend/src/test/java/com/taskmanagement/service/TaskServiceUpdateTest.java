package com.taskmanagement.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import com.taskmanagement.controller.TaskResponse;
import com.taskmanagement.controller.TaskUpdate;
import com.taskmanagement.entity.Priority;
import com.taskmanagement.entity.Task;
import com.taskmanagement.entity.TaskStatus;
import com.taskmanagement.repository.TaskRepository;

/** PUT /api/tasks/{id}（1件の編集） */
@ExtendWith(MockitoExtension.class)
class TaskServiceUpdateTest {

	@Mock
	private TaskRepository taskRepository;

	private TaskService taskService;

	private Task task;

	@BeforeEach
	void setUp() {
		taskService = new TaskService(taskRepository);
		task = new Task();
		ReflectionTestUtils.setField(task, "id", 5L);
		task.setTitle("メールを返す");
		task.setDescription("前の説明");
		task.setPriority(Priority.LOW);
		task.setDueDate(LocalDate.of(2026, 10, 26));
		task.setStatus(TaskStatus.IN_PROGRESS);
		task.setPosition(3);
		task.setHidden(true);
		lenient().when(taskRepository.findById(5L)).thenReturn(Optional.of(task));
		lenient().when(taskRepository.save(any(Task.class))).thenAnswer(invocation -> invocation.getArgument(0));
	}

	@Test
	void updateReplacesFourFieldsOnly() {
		TaskResponse response = taskService.update(5L, new TaskUpdate("  請求書を送る  ", "  新しい説明  ", "high", "2026-11-30"));

		assertThat(task.getTitle()).isEqualTo("請求書を送る");
		assertThat(task.getDescription()).isEqualTo("新しい説明");
		assertThat(task.getPriority()).isEqualTo(Priority.HIGH);
		assertThat(task.getDueDate()).isEqualTo(LocalDate.of(2026, 11, 30));
		// 状態・順番・非表示は変えない
		assertThat(task.getStatus()).isEqualTo(TaskStatus.IN_PROGRESS);
		assertThat(task.getPosition()).isEqualTo(3);
		assertThat(task.isHidden()).isTrue();
		assertThat(response.id()).isEqualTo(5L);
		assertThat(response.priority()).isEqualTo("high");
	}

	@Test
	void omittedFieldsBecomeEmptyOrMedium() {
		taskService.update(5L, new TaskUpdate("メールを返す", " ", null, ""));

		assertThat(task.getDescription()).isNull();
		assertThat(task.getPriority()).isEqualTo(Priority.MEDIUM);
		assertThat(task.getDueDate()).isNull();
	}

	@Test
	void unknownIdIsNotFound() {
		when(taskRepository.findById(9L)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> taskService.update(9L, new TaskUpdate("メモ", null, null, null)))
				.isInstanceOf(TaskNotFoundException.class);
		verify(taskRepository, never()).save(any());
	}

	@Test
	void invalidValuesAreRejectedWithoutSaving() {
		assertThatThrownBy(() -> taskService.update(5L, new TaskUpdate("  ", null, null, null)))
				.isInstanceOf(InvalidTaskException.class);
		assertThatThrownBy(() -> taskService.update(5L, new TaskUpdate("あ".repeat(256), null, null, null)))
				.isInstanceOf(InvalidTaskException.class);
		assertThatThrownBy(() -> taskService.update(5L, new TaskUpdate("メモ", null, "urgent", null)))
				.isInstanceOf(InvalidTaskException.class);
		assertThatThrownBy(() -> taskService.update(5L, new TaskUpdate("メモ", null, null, "2026/11/30")))
				.isInstanceOf(InvalidTaskException.class);
		assertThatThrownBy(() -> taskService.update(5L, null))
				.isInstanceOf(InvalidTaskException.class);
		verify(taskRepository, never()).save(any());
		// 失敗したときは、元の値のまま
		assertThat(task.getTitle()).isEqualTo("メールを返す");
	}
}
