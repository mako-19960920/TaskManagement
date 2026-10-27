package com.raisetech.taskboard.board;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.raisetech.taskboard.card.CardColumn;
import com.raisetech.taskboard.card.TaskCard;
import com.raisetech.taskboard.card.TaskCardRepository;

@Service
public class BoardService {

	private static final Pattern DATE = Pattern.compile("\\d{4}-\\d{2}-\\d{2}");

	private final BoardRepository boardRepository;
	private final TaskCardRepository cardRepository;
	private final Object seedLock = new Object();

	public BoardService(BoardRepository boardRepository, TaskCardRepository cardRepository) {
		this.boardRepository = boardRepository;
		this.cardRepository = cardRepository;
	}

	@Transactional
	public BoardResponse getBoard() {
		return toResponse(ensureBoard());
	}

	@Transactional
	public Board ensureBoard() {
		return boardRepository.findFirstByOrderByIdAsc().orElseGet(() -> {
			synchronized (seedLock) {
				return boardRepository.findFirstByOrderByIdAsc().orElseGet(this::createInitialBoard);
			}
		});
	}

	@Transactional
	public BoardResponse replace(BoardRequest request) {
		Board board = ensureBoard();
		Map<String, List<CardInput>> columns = request == null || request.columns() == null
				? Map.of()
				: request.columns();
		List<TaskCard> existing = cardRepository.findByBoardIdOrderByPositionAsc(board.getId());
		Map<Long, TaskCard> byId = new LinkedHashMap<>();
		for (TaskCard card : existing) {
			byId.put(card.getId(), card);
		}

		Set<Long> kept = new HashSet<>();
		Map<String, List<CardView>> responseColumns = new LinkedHashMap<>();
		for (CardColumn column : CardColumn.values()) {
			List<CardInput> inputs = columns.getOrDefault(column.key(), List.of());
			List<CardView> views = new ArrayList<>();
			int position = 0;
			for (CardInput input : inputs) {
				if (input == null || input.text() == null) {
					continue;
				}
				String text = input.text().strip();
				if (text.isEmpty()) {
					continue;
				}
				TaskCard card = input.id() == null ? null : byId.get(input.id());
				if (card == null || kept.contains(card.getId())) {
					card = new TaskCard();
					card.setBoard(board);
				}
				card.setText(text);
				card.setDueDate(parseDate(input.date()));
				card.setColumnName(column);
				card.setPosition(position);
				TaskCard saved = cardRepository.save(card);
				kept.add(saved.getId());
				views.add(new CardView(saved.getId(), input.key(), saved.getText(), formatDate(saved.getDueDate())));
				position++;
			}
			responseColumns.put(column.key(), views);
		}

		List<TaskCard> removed = existing.stream().filter(card -> !kept.contains(card.getId())).toList();
		if (!removed.isEmpty()) {
			cardRepository.deleteAll(removed);
		}
		return new BoardResponse(board.getName(), responseColumns);
	}

	private Board createInitialBoard() {
		Board board = new Board();
		board.setName("マイボード");
		board = boardRepository.save(board);
		addSeed(board, CardColumn.TODO, 0, "買い物リストを作る");
		addSeed(board, CardColumn.TODO, 1, "メールを返す");
		addSeed(board, CardColumn.DOING, 0, "企画書の下書き");
		addSeed(board, CardColumn.DONE, 0, "会議室を予約する");
		return board;
	}

	private void addSeed(Board board, CardColumn column, int position, String text) {
		TaskCard card = new TaskCard();
		card.setBoard(board);
		card.setColumnName(column);
		card.setPosition(position);
		card.setText(text);
		cardRepository.save(card);
	}

	private BoardResponse toResponse(Board board) {
		Map<String, List<CardView>> columns = new LinkedHashMap<>();
		for (CardColumn column : CardColumn.values()) {
			columns.put(column.key(), new ArrayList<>());
		}
		cardRepository.findByBoardIdOrderByPositionAsc(board.getId()).stream()
				.sorted(Comparator.comparingInt(TaskCard::getPosition))
				.forEach(card -> columns.get(card.getColumnName().key()).add(toView(card)));
		return new BoardResponse(board.getName(), columns);
	}

	private CardView toView(TaskCard card) {
		return new CardView(card.getId(), null, card.getText(), formatDate(card.getDueDate()));
	}

	private LocalDate parseDate(String value) {
		if (value == null || !DATE.matcher(value).matches()) {
			return null;
		}
		try {
			return LocalDate.parse(value);
		}
		catch (DateTimeParseException exception) {
			return null;
		}
	}

	private String formatDate(LocalDate date) {
		return date == null ? "" : date.toString();
	}
}
