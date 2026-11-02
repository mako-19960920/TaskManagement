package com.taskmanagement.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.taskmanagement.entity.Task;
import com.taskmanagement.entity.TaskStatus;

public interface TaskRepository extends JpaRepository<Task, Long> {

	List<Task> findByStatusOrderByPositionAsc(TaskStatus status);
}
