package com.taskmanagement.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDateTime;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import com.taskmanagement.dto.TaskCreate;
import com.taskmanagement.dto.TaskResponse;
import com.taskmanagement.service.TaskService;

/**
 * 入力チェック（Bean Validation）。値が正しくないときは、Controller の @Valid で止まり、Service を呼ばずに 400 を返すこと。
 * エラーは RFC 9457 の形で、detail は日本語の理由、field は間違えた項目。
 */
@WebMvcTest(TaskController.class)
class TaskValidationTest {

	@Autowired
	private MockMvc mockMvc;

	@MockitoBean
	private TaskService taskService;

	@Test
	void blankTitleIsRejectedBeforeService() throws Exception {
		postTask("{ \"title\": \" \\t\\n\" }")
				.andExpect(status().isBadRequest())
				.andExpect(content().contentType(MediaType.APPLICATION_PROBLEM_JSON))
				.andExpect(jsonPath("$.title").value("入力した値が正しくありません"))
				.andExpect(jsonPath("$.detail").value("タイトルは必須です"))
				.andExpect(jsonPath("$.field").value("title"));
		verify(taskService, never()).create(any());
	}

	@Test
	void missingTitleIsRejected() throws Exception {
		postTask("{ \"priority\": \"high\" }")
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.detail").value("タイトルは必須です"))
				.andExpect(jsonPath("$.field").value("title"));
		verify(taskService, never()).create(any());
	}

	@Test
	void titleOver255CharactersIsRejected() throws Exception {
		postTask("{ \"title\": \"" + "あ".repeat(256) + "\" }")
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.detail").value("タイトルは 255 文字までです"))
				.andExpect(jsonPath("$.field").value("title"));
		verify(taskService, never()).create(any());
	}

	@Test
	void spacesAroundTitleAreRemovedBeforeCountingAndSaving() throws Exception {
		// 前後の空白を除くと 255 文字なので通る。Service には空白を除いた値が渡る
		String title = "あ".repeat(255);
		when(taskService.create(any(TaskCreate.class))).thenReturn(sample(title));

		postTask("{ \"title\": \"  " + title + "  \" }").andExpect(status().isCreated());

		verify(taskService).create(new TaskCreate(title, null, null, null));
	}

	@Test
	void emptyOptionalValuesAreTreatedAsOmitted() throws Exception {
		when(taskService.create(any(TaskCreate.class))).thenReturn(sample("メモ"));

		postTask("{ \"title\": \"メモ\", \"description\": \"  \", \"priority\": \"\", \"dueDate\": \"\" }")
				.andExpect(status().isCreated());

		verify(taskService).create(new TaskCreate("メモ", null, null, null));
	}

	@Test
	void unknownPriorityIsRejected() throws Exception {
		postTask("{ \"title\": \"メモ\", \"priority\": \"urgent\" }")
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.detail").value("優先度は high / medium / low のいずれかです"))
				.andExpect(jsonPath("$.field").value("priority"));
		verify(taskService, never()).create(any());
	}

	@Test
	void titleErrorComesFirstWhenSeveralValuesAreWrong() throws Exception {
		postTask("{ \"title\": \"\", \"priority\": \"urgent\" }")
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.detail").value("タイトルは必須です"))
				.andExpect(jsonPath("$.field").value("title"));
	}

	@Test
	void updateChecksTheSameRules() throws Exception {
		mockMvc.perform(put("/api/tasks/5")
				.contentType(MediaType.APPLICATION_JSON)
				.content("{ \"title\": \"  \", \"priority\": \"high\" }"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.detail").value("タイトルは必須です"))
				.andExpect(jsonPath("$.field").value("title"));
		verify(taskService, never()).update(anyLong(), any());
	}

	@Test
	void hiddenIsRequired() throws Exception {
		mockMvc.perform(put("/api/tasks/5/hidden")
				.contentType(MediaType.APPLICATION_JSON)
				.content("{}"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.detail").value("非表示は true か false です"))
				.andExpect(jsonPath("$.field").value("hidden"));
		verify(taskService, never()).changeHidden(anyLong(), any());
	}

	private ResultActions postTask(String json) throws Exception {
		return mockMvc.perform(post("/api/tasks").contentType(MediaType.APPLICATION_JSON).content(json));
	}

	private static TaskResponse sample(String title) {
		LocalDateTime now = LocalDateTime.of(2026, 11, 17, 12, 0);
		return new TaskResponse(1L, title, null, "medium", null, "todo", 0, false, now, now);
	}
}
