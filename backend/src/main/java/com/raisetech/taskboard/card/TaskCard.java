package com.raisetech.taskboard.card;

import java.time.LocalDate;

import com.raisetech.taskboard.board.Board;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "task_cards", indexes = {
		@Index(name = "idx_task_cards_board_column_position", columnList = "board_id, column_name, position")
})
public class TaskCard {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@ManyToOne(optional = false, fetch = FetchType.LAZY)
	@JoinColumn(name = "board_id", nullable = false)
	private Board board;

	@Column(nullable = false, columnDefinition = "text")
	private String text;

	private LocalDate dueDate;

	@Enumerated(EnumType.STRING)
	@Column(name = "column_name", nullable = false, length = 20)
	private CardColumn columnName;

	@Column(nullable = false)
	private int position;

	public Long getId() {
		return id;
	}

	public Board getBoard() {
		return board;
	}

	public void setBoard(Board board) {
		this.board = board;
	}

	public String getText() {
		return text;
	}

	public void setText(String text) {
		this.text = text;
	}

	public LocalDate getDueDate() {
		return dueDate;
	}

	public void setDueDate(LocalDate dueDate) {
		this.dueDate = dueDate;
	}

	public CardColumn getColumnName() {
		return columnName;
	}

	public void setColumnName(CardColumn columnName) {
		this.columnName = columnName;
	}

	public int getPosition() {
		return position;
	}

	public void setPosition(int position) {
		this.position = position;
	}
}
