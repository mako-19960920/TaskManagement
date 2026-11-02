package com.taskmanagement.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicLong;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import com.taskmanagement.controller.TaskResponse;
import com.taskmanagement.controller.TaskWrite;
import com.taskmanagement.entity.Task;
import com.taskmanagement.entity.TaskStatus;
import com.taskmanagement.repository.TaskRepository;

@ExtendWith(MockitoExtension.class)
class TaskServiceTest {

	@Mock
	private TaskRepository taskRepository;

	private TaskService taskService;

	private final AtomicLong nextId = new AtomicLong(100);

	@BeforeEach
	void setUp() {
		taskService = new TaskService(taskRepository);
	}

	/** 保存されたタスクに、まだ id が無ければ新しい id を付けて返すようにする。 */
	private void saveAssignsIds() {
		when(taskRepository.save(any(Task.class))).thenAnswer(invocation -> {
			Task task = invocation.getArgument(0);
			if (task.getId() == null) {
				ReflectionTestUtils.setField(task, "id", nextId.getAndIncrement());
			}
			return task;
		});
	}

	private Task existing(long id, String title, TaskStatus status) {
		Task task = new Task();
		ReflectionTestUtils.setField(task, "id", id);
		task.setTitle(title);
		task.setStatus(status);
		return task;
	}

	@Test
	void replaceSkipsBlankTitlesAndStripsSpaces() {
		when(taskRepository.findAll()).thenReturn(List.of());
		saveAssignsIds();
		List<TaskWrite> inputs = new ArrayList<>();
		inputs.add(new TaskWrite(null, "a", "  買い物  ", null, "todo", 0));
		inputs.add(new TaskWrite(null, "b", "   ", null, "todo", 1));
		inputs.add(new TaskWrite(null, "c", null, null, "todo", 2));
		inputs.add(null);

		List<TaskResponse> result = taskService.replace(inputs);

		assertThat(result).hasSize(1);
		assertThat(result.get(0).title()).isEqualTo("買い物");
		assertThat(result.get(0).key()).isEqualTo("a");
	}

	@Test
	void replaceDeletesTasksThatWereNotSent() {
		Task kept = existing(1L, "残す", TaskStatus.TODO);
		Task removed = existing(2L, "消す", TaskStatus.DONE);
		when(taskRepository.findAll()).thenReturn(List.of(kept, removed));
		saveAssignsIds();

		taskService.replace(List.of(new TaskWrite(1L, "k", "残す", null, "todo", 0)));

		@SuppressWarnings("unchecked")
		ArgumentCaptor<List<Task>> captor = ArgumentCaptor.forClass(List.class);
		verify(taskRepository).deleteAll(captor.capture());
		assertThat(captor.getValue()).containsExactly(removed);
	}

	@Test
	void replaceDoesNotDeleteWhenEverythingIsKept() {
		when(taskRepository.findAll()).thenReturn(List.of(existing(1L, "残す", TaskStatus.TODO)));
		saveAssignsIds();

		taskService.replace(List.of(new TaskWrite(1L, "k", "残す", null, "todo", 0)));

		verify(taskRepository, never()).deleteAll(any());
	}

	@Test
	void replaceKeepsValidDateAndDropsInvalidDate() {
		when(taskRepository.findAll()).thenReturn(List.of());
		saveAssignsIds();

		List<TaskResponse> result = taskService.replace(List.of(
				new TaskWrite(null, "a", "正しい日付", "2026-10-26", "todo", 0),
				new TaskWrite(null, "b", "形が違う", "2026/10/26", "todo", 1),
				new TaskWrite(null, "c", "存在しない日", "2026-02-30", "todo", 2)));

		assertThat(result.get(0).dueDate()).isEqualTo(LocalDate.of(2026, 10, 26));
		assertThat(result.get(1).dueDate()).isNull();
		assertThat(result.get(2).dueDate()).isNull();
	}

	@Test
	void replaceTreatsDuplicateIdAsNewTask() {
		when(taskRepository.findAll()).thenReturn(List.of(existing(1L, "元", TaskStatus.TODO)));
		saveAssignsIds();

		List<TaskResponse> result = taskService.replace(List.of(
				new TaskWrite(1L, "a", "1件目", null, "todo", 0),
				new TaskWrite(1L, "b", "2件目", null, "todo", 1)));

		assertThat(result.get(0).id()).isEqualTo(1L);
		assertThat(result.get(1).id()).isNotEqualTo(1L);
		assertThat(result.get(1).title()).isEqualTo("2件目");
	}

	@Test
	void replaceRejectsUnknownStatus() {
		when(taskRepository.findAll()).thenReturn(List.of());

		assertThatThrownBy(() -> taskService.replace(List.of(new TaskWrite(null, "a", "カード", null, "later", 0))))
				.isInstanceOf(InvalidTaskStatusException.class);
	}
}
