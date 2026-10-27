package com.raisetech.taskboard.config;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import com.raisetech.taskboard.board.BoardService;

@Component
public class DataSeeder implements ApplicationRunner {

	private final BoardService boardService;

	public DataSeeder(BoardService boardService) {
		this.boardService = boardService;
	}

	@Override
	public void run(ApplicationArguments args) {
		boardService.ensureBoard();
	}
}
