package com.raisetech.taskboard.board;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(BoardController.class)
class BoardControllerTest {

	@Autowired
	private MockMvc mockMvc;

	@MockitoBean
	private BoardService boardService;

	@Test
	void getBoardReturnsName() throws Exception {
		when(boardService.getBoard()).thenReturn(new BoardResponse("マイボード", Map.of(
				"todo-cards", List.of(),
				"doing-cards", List.of(),
				"done-cards", List.of())));

		mockMvc.perform(get("/api/board"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.name").value("マイボード"));
	}

	@Test
	void putBoardSavesColumns() throws Exception {
		when(boardService.replace(org.mockito.ArgumentMatchers.any())).thenReturn(new BoardResponse("マイボード", Map.of(
				"todo-cards", List.of(new CardView(1L, "k1", "買う", "")),
				"doing-cards", List.of(),
				"done-cards", List.of())));

		mockMvc.perform(put("/api/board")
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"columns\":{\"todo-cards\":[{\"text\":\"買う\",\"date\":\"\"}]}}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.columns.todo-cards[0].text").value("買う"));
	}
}
