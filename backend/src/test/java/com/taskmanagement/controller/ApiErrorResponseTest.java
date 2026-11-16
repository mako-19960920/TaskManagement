package com.taskmanagement.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

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

/** エラーの応答が RFC 9457（Problem Details）の形で、理由を日本語で返すこと */
@WebMvcTest(TaskController.class)
class ApiErrorResponseTest {

	@Autowired
	private MockMvc mockMvc;

	@MockitoBean
	private TaskService taskService;

	@Test
	void invalidTaskReturnsReasonAndField() throws Exception {
		when(taskService.create(any(TaskCreate.class))).thenThrow(new InvalidTaskException("title", "必須です"));

		mockMvc.perform(post("/api/tasks").contentType(MediaType.APPLICATION_JSON).content("{ \"title\": \"\" }"))
				.andExpect(status().isBadRequest())
				.andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
				.andExpect(jsonPath("$.status").value(400))
				.andExpect(jsonPath("$.title").value("入力した値が正しくありません"))
				.andExpect(jsonPath("$.detail").value("タイトルは必須です"))
				.andExpect(jsonPath("$.field").value("title"))
				.andExpect(jsonPath("$.instance").value("/api/tasks"));
	}

	@Test
	void titleTooLongSaysLimit() throws Exception {
		when(taskService.update(any(Long.class), any(TaskUpdate.class)))
				.thenThrow(new InvalidTaskException("title", "255 文字までです"));

		mockMvc.perform(put("/api/tasks/5").contentType(MediaType.APPLICATION_JSON).content("{ \"title\": \"x\" }"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.detail").value("タイトルは 255 文字までです"));
	}

	@Test
	void reasonStartingWithLettersHasSpace() throws Exception {
		when(taskService.create(any(TaskCreate.class)))
				.thenThrow(new InvalidTaskException("priority", "high / medium / low のいずれかです"));

		mockMvc.perform(post("/api/tasks").contentType(MediaType.APPLICATION_JSON).content("{ \"title\": \"x\" }"))
				.andExpect(jsonPath("$.detail").value("優先度は high / medium / low のいずれかです"))
				.andExpect(jsonPath("$.field").value("priority"));
	}

	@Test
	void notFoundReturnsReasonWithoutField() throws Exception {
		when(taskService.findById(99L)).thenThrow(new TaskNotFoundException(99L));

		mockMvc.perform(get("/api/tasks/99"))
				.andExpect(status().isNotFound())
				.andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
				.andExpect(jsonPath("$.title").value("タスクが見つかりません"))
				.andExpect(jsonPath("$.detail").value("id が 99 のタスクはありません"))
				.andExpect(jsonPath("$.field").doesNotExist());
	}

	@Test
	void invalidStatusSaysAllowedValues() throws Exception {
		when(taskService.findByStatus("later")).thenThrow(new InvalidTaskStatusException("later"));

		mockMvc.perform(get("/api/tasks/status/later"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.title").value("状態の値が正しくありません"))
				.andExpect(jsonPath("$.detail").value("状態は todo / in_progress / done のいずれかです（送られた値：later）"))
				.andExpect(jsonPath("$.field").value("status"));
	}

	@Test
	void invalidSearchConditionSaysValue() throws Exception {
		when(taskService.search(null, null, "urgent", null, null))
				.thenThrow(InvalidSearchConditionException.invalidValue("priority", "urgent"));

		mockMvc.perform(get("/api/tasks/search").param("priority", "urgent"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.title").value("検索条件が正しくありません"))
				.andExpect(jsonPath("$.detail").value("優先度は high / medium / low のいずれかです（送られた値：urgent）"))
				.andExpect(jsonPath("$.field").value("priority"));
	}

	@Test
	void reversedRangeSaysBothDates() throws Exception {
		when(taskService.search(null, null, null, "2026-12-31", "2026-12-01"))
				.thenThrow(InvalidSearchConditionException.reversedRange("2026-12-31", "2026-12-01"));

		mockMvc.perform(get("/api/tasks/search").param("dueFrom", "2026-12-31").param("dueTo", "2026-12-01"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.detail").value("期限（から）が期限（まで）より後です（2026-12-31 〜 2026-12-01）"))
				.andExpect(jsonPath("$.field").value("dueFrom"));
	}

	@Test
	void brokenJsonSaysBodyCannotBeRead() throws Exception {
		mockMvc.perform(post("/api/tasks").contentType(MediaType.APPLICATION_JSON).content("{ \"title\": "))
				.andExpect(status().isBadRequest())
				.andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
				.andExpect(jsonPath("$.title").value("本体の形が正しくありません"));
	}

	@Test
	void nonNumericIdSaysIdMustBeNumber() throws Exception {
		mockMvc.perform(get("/api/tasks/abc"))
				.andExpect(status().isBadRequest())
				.andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
				.andExpect(jsonPath("$.title").value("パスやパラメータの値が正しくありません"))
				.andExpect(jsonPath("$.detail").value("id は数字です（送られた値：abc）"))
				.andExpect(jsonPath("$.field").value("id"));
	}
}
