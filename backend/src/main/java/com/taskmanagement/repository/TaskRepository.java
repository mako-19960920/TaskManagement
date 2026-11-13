package com.taskmanagement.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import com.taskmanagement.entity.Task;
import com.taskmanagement.entity.TaskStatus;

public interface TaskRepository extends JpaRepository<Task, Long>, JpaSpecificationExecutor<Task> {

	List<Task> findByStatusOrderByPositionAsc(TaskStatus status);

	/** その列でいちばん後ろ（position が最大）のタスク。列が空なら空。 */
	Optional<Task> findFirstByStatusOrderByPositionDesc(TaskStatus status);
}
