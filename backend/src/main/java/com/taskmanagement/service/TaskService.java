package com.taskmanagement.service;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.taskmanagement.controller.TaskResponse;
import com.taskmanagement.controller.TaskWrite;
import com.taskmanagement.entity.Priority;
import com.taskmanagement.entity.Task;
import com.taskmanagement.entity.TaskStatus;
import com.taskmanagement.repository.TaskRepository;

@Service
public class TaskService {

	private static final Pattern DATE = Pattern.compile("\\d{4}-\\d{2}-\\d{2}");

	private static final List<TaskStatus> STATUS_ORDER = List.of(
			TaskStatus.TODO,
			TaskStatus.IN_PROGRESS,
			TaskStatus.DONE);

	private final TaskRepository taskRepository;

	public TaskService(TaskRepository taskRepository) {
		this.taskRepository = taskRepository;
	}

	@Transactional(readOnly = true)
	public List<TaskResponse> findAll() {
		return taskRepository.findAll().stream()
				.sorted(Comparator
						.comparingInt((Task task) -> STATUS_ORDER.indexOf(task.getStatus()))
						.thenComparingInt(Task::getPosition))
				.map(task -> toResponse(task, null))
				.toList();
	}

	@Transactional(readOnly = true)
	public TaskResponse findById(long id) {
		Task task = taskRepository.findById(id).orElseThrow(() -> new TaskNotFoundException(id));
		return toResponse(task, null);
	}

	@Transactional(readOnly = true)
	public List<TaskResponse> findByStatus(String status) {
		TaskStatus parsed = parseStatus(status);
		return taskRepository.findByStatusOrderByPositionAsc(parsed).stream()
				.map(task -> toResponse(task, null))
				.toList();
	}

	@Transactional
	public List<TaskResponse> replace(List<TaskWrite> inputs) {
		Map<Long, Task> byId = new java.util.LinkedHashMap<>();
		for (Task task : taskRepository.findAll()) {
			byId.put(task.getId(), task);
		}
		Set<Long> kept = new HashSet<>();
		List<TaskResponse> responses = new ArrayList<>();
		if (inputs != null) {
			for (TaskWrite input : inputs) {
				if (input == null || input.title() == null || input.title().isBlank()) {
					continue;
				}
				Task task = input.id() == null ? null : byId.get(input.id());
				if (task == null || kept.contains(task.getId())) {
					task = new Task();
					task.setPriority(Priority.MEDIUM);
				}
				task.setTitle(input.title().strip());
				task.setDueDate(parseDate(input.dueDate()));
				task.setStatus(parseStatus(input.status()));
				task.setPosition(input.position() == null ? 0 : input.position());
				Task saved = taskRepository.save(task);
				kept.add(saved.getId());
				responses.add(toResponse(saved, input.key()));
			}
		}
		List<Task> removed = byId.values().stream().filter(task -> !kept.contains(task.getId())).toList();
		if (!removed.isEmpty()) {
			taskRepository.deleteAll(removed);
		}
		return responses;
	}

	private TaskStatus parseStatus(String status) {
		try {
			return TaskStatus.from(status);
		}
		catch (IllegalArgumentException exception) {
			throw new InvalidTaskStatusException(status);
		}
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

	private TaskResponse toResponse(Task task, String key) {
		return new TaskResponse(
				task.getId(),
				task.getTitle(),
				task.getDescription(),
				task.getPriority().value(),
				task.getDueDate(),
				task.getStatus().value(),
				task.getPosition(),
				task.getCreatedAt(),
				task.getUpdatedAt(),
				key);
	}
}
