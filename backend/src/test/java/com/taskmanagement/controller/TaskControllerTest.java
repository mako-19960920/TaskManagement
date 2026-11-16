package com.taskmanagement.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDateTime;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.taskmanagement.service.InvalidSearchConditionException;
import com.taskmanagement.service.InvalidTaskException;
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
				.andExpect(jsonPath("$[0].status").value("todo"))
				.andExpect(jsonPath("$[0].hidden").value(false));
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

	@Test
	void searchPassesConditionsToService() throws Exception {
		when(taskService.search("api", "todo", "high", "2026-11-01", "2026-11-30"))
				.thenReturn(List.of(sample(9L, "API の設計書を書く", "todo")));

		mockMvc.perform(get("/api/tasks/search")
				.param("keyword", "api")
				.param("status", "todo")
				.param("priority", "high")
				.param("dueFrom", "2026-11-01")
				.param("dueTo", "2026-11-30"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[0].title").value("API の設計書を書く"));
	}

	@Test
	void searchWithInvalidConditionReturnsBadRequest() throws Exception {
		when(taskService.search(null, null, "urgent", null, null))
				.thenThrow(InvalidSearchConditionException.invalidValue("priority", "urgent"));

		mockMvc.perform(get("/api/tasks/search").param("priority", "urgent"))
				.andExpect(status().isBadRequest());
	}

	@Test
	void postTaskReturnsCreatedWithLocation() throws Exception {
		when(taskService.create(new TaskCreate("請求書を送る", null, "high", "2026-11-20")))
				.thenReturn(sample(7L, "請求書を送る", "todo"));

		mockMvc.perform(post("/api/tasks")
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{ "title": "請求書を送る", "priority": "high", "dueDate": "2026-11-20" }
						"""))
				.andExpect(status().isCreated())
				.andExpect(header().string("Location", "http://localhost/api/tasks/7"))
				.andExpect(jsonPath("$.id").value(7))
				.andExpect(jsonPath("$.status").value("todo"))
				.andExpect(jsonPath("$.key").doesNotExist());
	}

	@Test
	void postFromScreenOriginIsAllowedByCors() throws Exception {
		when(taskService.create(any(TaskCreate.class))).thenReturn(sample(8L, "メモ", "todo"));

		// 画面（5173）から来た POST を、CORS で拒否しない
		mockMvc.perform(post("/api/tasks")
				.header("Origin", "http://localhost:5173")
				.contentType(MediaType.APPLICATION_JSON)
				.content("{ \"title\": \"メモ\" }"))
				.andExpect(status().isCreated())
				.andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5173"));
	}

	@Test
	void postFromOtherOriginIsRejectedByCors() throws Exception {
		mockMvc.perform(post("/api/tasks")
				.header("Origin", "http://localhost:3000")
				.contentType(MediaType.APPLICATION_JSON)
				.content("{ \"title\": \"メモ\" }"))
				.andExpect(status().isForbidden());
	}

	@Test
	void postInvalidTaskReturnsBadRequest() throws Exception {
		when(taskService.create(any(TaskCreate.class))).thenThrow(new InvalidTaskException("title", "必須です"));

		mockMvc.perform(post("/api/tasks")
				.contentType(MediaType.APPLICATION_JSON)
				.content("{ \"title\": \"  \" }"))
				.andExpect(status().isBadRequest());
	}

	@Test
	void putTaskByIdUpdatesOne() throws Exception {
		when(taskService.update(5L, new TaskUpdate("請求書を送る", "月末まで", "high", "2026-11-30")))
				.thenReturn(sample(5L, "請求書を送る", "todo"));

		mockMvc.perform(put("/api/tasks/5")
				.header("Origin", "http://localhost:5173")
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{ "title": "請求書を送る", "description": "月末まで", "priority": "high", "dueDate": "2026-11-30" }
						"""))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.id").value(5))
				.andExpect(jsonPath("$.title").value("請求書を送る"));
	}

	@Test
	void putUnknownTaskReturnsNotFound() throws Exception {
		when(taskService.update(any(Long.class), any(TaskUpdate.class))).thenThrow(new TaskNotFoundException(9L));

		mockMvc.perform(put("/api/tasks/9")
				.contentType(MediaType.APPLICATION_JSON)
				.content("{ \"title\": \"メモ\" }"))
				.andExpect(status().isNotFound());
	}

	@Test
	void putInvalidTaskReturnsBadRequest() throws Exception {
		when(taskService.update(any(Long.class), any(TaskUpdate.class)))
				.thenThrow(new InvalidTaskException("title", "必須です"));

		mockMvc.perform(put("/api/tasks/5")
				.contentType(MediaType.APPLICATION_JSON)
				.content("{ \"title\": \"\" }"))
				.andExpect(status().isBadRequest());
	}

	@Test
	void deleteTaskReturnsNoContent() throws Exception {
		// 画面（5173）からの DELETE を、CORS で拒否しない
		mockMvc.perform(delete("/api/tasks/5").header("Origin", "http://localhost:5173"))
				.andExpect(status().isNoContent())
				.andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5173"));
		verify(taskService).delete(5L);
	}

	@Test
	void deleteUnknownTaskReturnsNotFound() throws Exception {
		doThrow(new TaskNotFoundException(9L)).when(taskService).delete(9L);

		mockMvc.perform(delete("/api/tasks/9"))
				.andExpect(status().isNotFound());
	}

	@Test
	void putPositionMovesTask() throws Exception {
		when(taskService.move(5L, new TaskMove("in_progress", 7L))).thenReturn(sample(5L, "メールを返す", "in_progress"));

		mockMvc.perform(put("/api/tasks/5/position")
				.contentType(MediaType.APPLICATION_JSON)
				.content("{ \"status\": \"in_progress\", \"beforeId\": 7 }"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.status").value("in_progress"));
	}

	@Test
	void putPositionWithUnknownStatusReturnsBadRequest() throws Exception {
		when(taskService.move(any(Long.class), any(TaskMove.class))).thenThrow(new InvalidTaskStatusException("later"));

		mockMvc.perform(put("/api/tasks/5/position")
				.contentType(MediaType.APPLICATION_JSON)
				.content("{ \"status\": \"later\" }"))
				.andExpect(status().isBadRequest());
	}

	@Test
	void putDueDateChangesDate() throws Exception {
		when(taskService.changeDueDate(5L, new TaskDueDate("2026-12-01"))).thenReturn(sample(5L, "メールを返す", "todo"));

		mockMvc.perform(put("/api/tasks/5/due-date")
				.contentType(MediaType.APPLICATION_JSON)
				.content("{ \"dueDate\": \"2026-12-01\" }"))
				.andExpect(status().isOk());
	}

	@Test
	void putHiddenChangesHidden() throws Exception {
		when(taskService.changeHidden(5L, new TaskHidden(true))).thenReturn(sample(5L, "メールを返す", "todo"));

		mockMvc.perform(put("/api/tasks/5/hidden")
				.contentType(MediaType.APPLICATION_JSON)
				.content("{ \"hidden\": true }"))
				.andExpect(status().isOk());
	}

	private TaskResponse sample(Long id, String title, String status) {
		LocalDateTime now = LocalDateTime.of(2026, 11, 2, 12, 0);
		return new TaskResponse(id, title, null, "medium", null, status, 0, false, now, now, null);
	}
}
