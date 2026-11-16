package com.taskmanagement.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import com.taskmanagement.controller.TaskDueDate;
import com.taskmanagement.controller.TaskHidden;
import com.taskmanagement.controller.TaskMove;
import com.taskmanagement.controller.TaskResponse;
import com.taskmanagement.entity.Task;
import com.taskmanagement.entity.TaskStatus;
import com.taskmanagement.repository.TaskRepository;

/** 操作ごとの API（移動・削除・期限・非表示）。ほかのタスクを消さず、順番を 0 からの連番に保つ */
@ExtendWith(MockitoExtension.class)
class TaskServiceOperationsTest {

	@Mock
	private TaskRepository taskRepository;

	private TaskService taskService;

	private final List<Task> all = new ArrayList<>();

	@BeforeEach
	void setUp() {
		taskService = new TaskService(taskRepository);
		// やること：a b c、進行中：d e f
		task(1L, "a", TaskStatus.TODO, 0);
		task(2L, "b", TaskStatus.TODO, 1);
		task(3L, "c", TaskStatus.TODO, 2);
		task(4L, "d", TaskStatus.IN_PROGRESS, 0);
		task(5L, "e", TaskStatus.IN_PROGRESS, 1);
		task(6L, "f", TaskStatus.IN_PROGRESS, 2);
		lenient().when(taskRepository.findById(any())).thenAnswer(invocation -> all.stream()
				.filter(item -> item.getId().equals(invocation.getArgument(0)))
				.findFirst());
		lenient().when(taskRepository.findByStatusOrderByPositionAsc(any())).thenAnswer(invocation -> all.stream()
				.filter(item -> item.getStatus() == invocation.getArgument(0))
				.sorted((left, right) -> Integer.compare(left.getPosition(), right.getPosition()))
				.toList());
		lenient().when(taskRepository.saveAndFlush(any(Task.class))).thenAnswer(invocation -> invocation.getArgument(0));
	}

	private Task task(long id, String title, TaskStatus status, int position) {
		Task task = new Task();
		ReflectionTestUtils.setField(task, "id", id);
		task.setTitle(title);
		task.setStatus(status);
		task.setPosition(position);
		all.add(task);
		return task;
	}

	/** その列のタイトルを、順番どおりに並べたもの */
	private List<String> column(TaskStatus status) {
		return all.stream()
				.filter(item -> item.getStatus() == status)
				.sorted((left, right) -> Integer.compare(left.getPosition(), right.getPosition()))
				.map(Task::getTitle)
				.toList();
	}

	private List<Integer> positions(TaskStatus status) {
		return all.stream()
				.filter(item -> item.getStatus() == status)
				.map(Task::getPosition)
				.sorted()
				.toList();
	}

	@Test
	void moveToAnotherColumnBeforeTask() {
		TaskResponse response = taskService.move(2L, new TaskMove("in_progress", 5L));

		assertThat(column(TaskStatus.TODO)).containsExactly("a", "c");
		assertThat(column(TaskStatus.IN_PROGRESS)).containsExactly("d", "b", "e", "f");
		assertThat(positions(TaskStatus.TODO)).containsExactly(0, 1);
		assertThat(positions(TaskStatus.IN_PROGRESS)).containsExactly(0, 1, 2, 3);
		assertThat(response.status()).isEqualTo("in_progress");
		assertThat(response.position()).isEqualTo(1);
	}

	@Test
	void moveWithinSameColumnToFront() {
		taskService.move(3L, new TaskMove("todo", 1L));

		assertThat(column(TaskStatus.TODO)).containsExactly("c", "a", "b");
		assertThat(positions(TaskStatus.TODO)).containsExactly(0, 1, 2);
	}

	@Test
	void moveToEndWhenBeforeIdIsNull() {
		taskService.move(1L, new TaskMove("in_progress", null));

		assertThat(column(TaskStatus.IN_PROGRESS)).containsExactly("d", "e", "f", "a");
		assertThat(column(TaskStatus.TODO)).containsExactly("b", "c");
	}

	@Test
	void moveToEndWhenBeforeIdIsNotInTargetColumn() {
		// ほかの画面で消えた、別の列にある、などのとき
		taskService.move(1L, new TaskMove("in_progress", 99L));

		assertThat(column(TaskStatus.IN_PROGRESS)).containsExactly("d", "e", "f", "a");
	}

	@Test
	void moveDoesNotDeleteOtherTasks() {
		taskService.move(2L, new TaskMove("done", null));

		assertThat(all).hasSize(6);
		verify(taskRepository, never()).delete(any(Task.class));
		verify(taskRepository, never()).deleteAll(any());
	}

	@Test
	void moveRejectsUnknownStatusAndId() {
		assertThatThrownBy(() -> taskService.move(1L, new TaskMove("later", null)))
				.isInstanceOf(InvalidTaskStatusException.class);
		assertThatThrownBy(() -> taskService.move(99L, new TaskMove("todo", null)))
				.isInstanceOf(TaskNotFoundException.class);
		assertThat(column(TaskStatus.TODO)).containsExactly("a", "b", "c");
	}

	@Test
	void deleteRemovesOneAndClosesGap() {
		Task e = all.get(4);

		taskService.delete(5L);
		all.remove(e);

		verify(taskRepository).delete(e);
		assertThat(column(TaskStatus.IN_PROGRESS)).containsExactly("d", "f");
		assertThat(positions(TaskStatus.IN_PROGRESS)).containsExactly(0, 1);
		assertThat(column(TaskStatus.TODO)).containsExactly("a", "b", "c");
	}

	@Test
	void deleteUnknownIdIsNotFound() {
		assertThatThrownBy(() -> taskService.delete(99L)).isInstanceOf(TaskNotFoundException.class);
		verify(taskRepository, never()).delete(any(Task.class));
	}

	@Test
	void changeDueDateSetsAndClears() {
		taskService.changeDueDate(1L, new TaskDueDate("2026-12-01"));
		assertThat(all.get(0).getDueDate()).isEqualTo(LocalDate.of(2026, 12, 1));

		taskService.changeDueDate(1L, new TaskDueDate(null));
		assertThat(all.get(0).getDueDate()).isNull();

		taskService.changeDueDate(1L, new TaskDueDate("2026-12-01"));
		taskService.changeDueDate(1L, new TaskDueDate(" "));
		assertThat(all.get(0).getDueDate()).isNull();
	}

	@Test
	void changeDueDateRejectsInvalidValues() {
		assertThatThrownBy(() -> taskService.changeDueDate(1L, new TaskDueDate("2026/12/01")))
				.isInstanceOf(InvalidTaskException.class);
		assertThatThrownBy(() -> taskService.changeDueDate(1L, new TaskDueDate("2026-02-30")))
				.isInstanceOf(InvalidTaskException.class);
		assertThatThrownBy(() -> taskService.changeDueDate(99L, new TaskDueDate(null)))
				.isInstanceOf(TaskNotFoundException.class);
		verify(taskRepository, never()).saveAndFlush(any());
	}

	@Test
	void changeHiddenKeepsPosition() {
		TaskResponse response = taskService.changeHidden(2L, new TaskHidden(true));

		assertThat(all.get(1).isHidden()).isTrue();
		assertThat(response.hidden()).isTrue();
		assertThat(column(TaskStatus.TODO)).containsExactly("a", "b", "c");

		taskService.changeHidden(2L, new TaskHidden(false));
		assertThat(all.get(1).isHidden()).isFalse();
	}

	@Test
	void changeHiddenRequiresValue() {
		assertThatThrownBy(() -> taskService.changeHidden(2L, new TaskHidden(null)))
				.isInstanceOf(InvalidTaskException.class);
		assertThatThrownBy(() -> taskService.changeHidden(2L, null))
				.isInstanceOf(InvalidTaskException.class);
		when(taskRepository.findById(99L)).thenReturn(Optional.empty());
		assertThatThrownBy(() -> taskService.changeHidden(99L, new TaskHidden(true)))
				.isInstanceOf(TaskNotFoundException.class);
	}
}
