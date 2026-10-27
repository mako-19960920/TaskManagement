package com.raisetech.taskboard.card;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface TaskCardRepository extends JpaRepository<TaskCard, Long> {

	List<TaskCard> findByBoardIdOrderByPositionAsc(Long boardId);
}
