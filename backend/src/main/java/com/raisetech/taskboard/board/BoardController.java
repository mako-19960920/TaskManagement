package com.raisetech.taskboard.board;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/board")
public class BoardController {

	private final BoardService boardService;

	public BoardController(BoardService boardService) {
		this.boardService = boardService;
	}

	@GetMapping
	public BoardResponse getBoard() {
		return boardService.getBoard();
	}

	@PutMapping
	public BoardResponse saveBoard(@RequestBody BoardRequest request) {
		return boardService.replace(request);
	}
}
