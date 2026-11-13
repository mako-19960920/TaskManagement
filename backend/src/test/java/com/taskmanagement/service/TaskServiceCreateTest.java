package com.taskmanagement.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import com.taskmanagement.controller.TaskCreate;
import com.taskmanagement.controller.TaskResponse;
import com.taskmanagement.entity.Priority;
import com.taskmanagement.entity.Task;
import com.taskmanagement.entity.TaskStatus;
import com.taskmanagement.repository.TaskRepository;

@ExtendWith(MockitoExtension.class)
class TaskServiceCreateTest {

	@Mock
	private TaskRepository taskRepository;

	private TaskService taskService;

	@BeforeEach
	void setUp() {
		taskService = new TaskService(taskRepository);
	}

	/** save されたタスクに id を付けて、そのまま返すようにする。 */
	private ArgumentCaptor<Task> captureSave() {
		ArgumentCaptor<Task> captor = ArgumentCaptor.forClass(Task.class);
		when(taskRepository.save(captor.capture())).thenAnswer(invocation -> {
			Task task = invocation.getArgument(0);
			ReflectionTestUtils.setField(task, "id", 10L);
			return task;
		});
		return captor;
	}

	private Task last(int position) {
		Task task = new Task();
		task.setTitle("いちばん後ろ");
		task.setStatus(TaskStatus.TODO);
		task.setPosition(position);
		return task;
	}

	@Test
	void createPutsTaskAtEndOfTodo() {
		when(taskRepository.findFirstByStatusOrderByPositionDesc(TaskStatus.TODO)).thenReturn(Optional.of(last(4)));
		ArgumentCaptor<Task> saved = captureSave();

		TaskResponse response = taskService.create(new TaskCreate("  請求書を送る  ", "  ", "high", "2026-11-20"));

		Task task = saved.getValue();
		assertThat(task.getTitle()).isEqualTo("請求書を送る");
		assertThat(task.getDescription()).isNull();
		assertThat(task.getPriority()).isEqualTo(Priority.HIGH);
		assertThat(task.getDueDate()).isEqualTo(LocalDate.of(2026, 11, 20));
		assertThat(task.getStatus()).isEqualTo(TaskStatus.TODO);
		assertThat(task.getPosition()).isEqualTo(5);
		assertThat(response.id()).isEqualTo(10L);
		assertThat(response.status()).isEqualTo("todo");
		assertThat(response.key()).isNull();
	}

	@Test
	void createInEmptyTodoStartsAtZeroWithDefaults() {
		when(taskRepository.findFirstByStatusOrderByPositionDesc(TaskStatus.TODO)).thenReturn(Optional.empty());
		ArgumentCaptor<Task> saved = captureSave();

		taskService.create(new TaskCreate("メモ", "説明文", null, null));

		Task task = saved.getValue();
		assertThat(task.getPosition()).isZero();
		assertThat(task.getPriority()).isEqualTo(Priority.MEDIUM);
		assertThat(task.getDueDate()).isNull();
		assertThat(task.getDescription()).isEqualTo("説明文");
	}

	@Test
	void blankTitleIsRejected() {
		assertThatThrownBy(() -> taskService.create(new TaskCreate(" \t\n", null, null, null)))
				.isInstanceOf(InvalidTaskException.class);
		assertThatThrownBy(() -> taskService.create(new TaskCreate(null, null, null, null)))
				.isInstanceOf(InvalidTaskException.class);
		assertThatThrownBy(() -> taskService.create(null))
				.isInstanceOf(InvalidTaskException.class);
		verify(taskRepository, never()).save(any());
	}

	@Test
	void titleUpTo255CharactersIsAccepted() {
		when(taskRepository.findFirstByStatusOrderByPositionDesc(TaskStatus.TODO)).thenReturn(Optional.empty());
		ArgumentCaptor<Task> saved = captureSave();

		taskService.create(new TaskCreate("あ".repeat(255), null, null, null));

		assertThat(saved.getValue().getTitle()).hasSize(255);
	}

	@Test
	void titleOver255CharactersIsRejected() {
		assertThatThrownBy(() -> taskService.create(new TaskCreate("あ".repeat(256), null, null, null)))
				.isInstanceOf(InvalidTaskException.class);
		verify(taskRepository, never()).save(any());
	}

	@Test
	void unknownPriorityIsRejected() {
		assertThatThrownBy(() -> taskService.create(new TaskCreate("メモ", null, "urgent", null)))
				.isInstanceOf(InvalidTaskException.class);
		verify(taskRepository, never()).save(any());
	}

	@Test
	void invalidDueDateIsRejected() {
		assertThatThrownBy(() -> taskService.create(new TaskCreate("メモ", null, null, "2026/11/20")))
				.isInstanceOf(InvalidTaskException.class);
		assertThatThrownBy(() -> taskService.create(new TaskCreate("メモ", null, null, "2026-02-30")))
				.isInstanceOf(InvalidTaskException.class);
		verify(taskRepository, never()).save(any());
	}
}
