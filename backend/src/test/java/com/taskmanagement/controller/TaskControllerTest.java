package com.taskmanagement.controller;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDateTime;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.taskmanagement.service.InvalidTaskStatusException;
import com.taskmanagement.service.TaskNotFoundException;
import com.taskmanagement.service.TaskService;

@WebMvcTest(TaskController.class)
class TaskControllerTest {

	@Autowired
	private MockMvc mockMvc;

	@MockitoBean
	private TaskService taskService;

	@Test
	void getTasksReturnsAll() throws Exception {
		when(taskService.findAll()).thenReturn(List.of(sample(1L, "買い物リストを作る", "todo")));

		mockMvc.perform(get("/api/tasks"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[0].id").value(1))
				.andExpect(jsonPath("$[0].title").value("買い物リストを作る"))
				.andExpect(jsonPath("$[0].status").value("todo"));
	}

	@Test
	void getTaskByIdReturnsOne() throws Exception {
		when(taskService.findById(1L)).thenReturn(sample(1L, "メールを返す", "todo"));

		mockMvc.perform(get("/api/tasks/1"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.title").value("メールを返す"));
	}

	@Test
	void getTaskByIdReturnsNotFound() throws Exception {
		when(taskService.findById(99L)).thenThrow(new TaskNotFoundException(99L));

		mockMvc.perform(get("/api/tasks/99"))
				.andExpect(status().isNotFound());
	}

	@Test
	void getTasksByStatusReturnsColumn() throws Exception {
		when(taskService.findByStatus("todo")).thenReturn(List.of(sample(1L, "買い物リストを作る", "todo")));

		mockMvc.perform(get("/api/tasks/status/todo"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[0].status").value("todo"));
	}

	@Test
	void getTasksByUnknownStatusReturnsBadRequest() throws Exception {
		when(taskService.findByStatus("later")).thenThrow(new InvalidTaskStatusException("later"));

		mockMvc.perform(get("/api/tasks/status/later"))
				.andExpect(status().isBadRequest());
	}

	private TaskResponse sample(Long id, String title, String status) {
		LocalDateTime now = LocalDateTime.of(2026, 11, 2, 12, 0);
		return new TaskResponse(id, title, null, "medium", null, status, 0, now, now, null);
	}
}
