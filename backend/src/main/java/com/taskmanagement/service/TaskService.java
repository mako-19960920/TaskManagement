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

import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.taskmanagement.controller.TaskCreate;
import com.taskmanagement.controller.TaskResponse;
import com.taskmanagement.controller.TaskWrite;
import com.taskmanagement.entity.Priority;
import com.taskmanagement.entity.Task;
import com.taskmanagement.entity.TaskStatus;
import com.taskmanagement.repository.TaskRepository;
import com.taskmanagement.repository.TaskSpecifications;

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

	private static final Comparator<Task> BOARD_ORDER = Comparator
			.comparingInt((Task task) -> STATUS_ORDER.indexOf(task.getStatus()))
			.thenComparingInt(Task::getPosition);

	@Transactional(readOnly = true)
	public List<TaskResponse> findAll() {
		return taskRepository.findAll().stream()
				.sorted(BOARD_ORDER)
				.map(task -> toResponse(task, null))
				.toList();
	}

	/** 指定された条件をすべて満たすタスクを、ボードと同じ並びで返す。空の条件は使わない。 */
	@Transactional(readOnly = true)
	public List<TaskResponse> search(String keyword, String status, String priority, String dueFrom, String dueTo) {
		String word = blankToNull(keyword);
		TaskStatus parsedStatus = blankToNull(status) == null ? null : parseStatus(status.strip());
		Priority parsedPriority = parseSearchPriority(blankToNull(priority));
		LocalDate from = parseSearchDate("dueFrom", blankToNull(dueFrom));
		LocalDate to = parseSearchDate("dueTo", blankToNull(dueTo));
		if (from != null && to != null && from.isAfter(to)) {
			throw new InvalidSearchConditionException("dueFrom", dueFrom + " > dueTo " + dueTo);
		}
		Specification<Task> spec = Specification.allOf(
				TaskSpecifications.keyword(word),
				TaskSpecifications.status(parsedStatus),
				TaskSpecifications.priority(parsedPriority),
				TaskSpecifications.dueFrom(from),
				TaskSpecifications.dueTo(to));
		return taskRepository.findAll(spec).stream()
				.sorted(BOARD_ORDER)
				.map(task -> toResponse(task, null))
				.toList();
	}

	private String blankToNull(String value) {
		return value == null || value.isBlank() ? null : value.strip();
	}

	private Priority parseSearchPriority(String value) {
		if (value == null) {
			return null;
		}
		try {
			return Priority.from(value);
		}
		catch (IllegalArgumentException exception) {
			throw new InvalidSearchConditionException("priority", value);
		}
	}

	private LocalDate parseSearchDate(String name, String value) {
		if (value == null) {
			return null;
		}
		LocalDate date = parseDate(value);
		if (date == null) {
			throw new InvalidSearchConditionException(name, value);
		}
		return date;
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

	private static final int TITLE_MAX = 255;

	/**
	 * タスクを1件登録する。状態は todo、順番は「やること」の末尾（いちばん後ろの position + 1）にする。
	 * 件数ではなく最大の position を使うのは、途中の番号が抜けていても重ならないようにするため。
	 */
	@Transactional
	public TaskResponse create(TaskCreate input) {
		if (input == null) {
			throw new InvalidTaskException("body", "空です");
		}
		String title = input.title() == null ? "" : input.title().strip();
		if (title.isEmpty()) {
			throw new InvalidTaskException("title", "必須です");
		}
		if (title.length() > TITLE_MAX) {
			throw new InvalidTaskException("title", TITLE_MAX + " 文字までです");
		}
		Priority priority = Priority.MEDIUM;
		String priorityText = blankToNull(input.priority());
		if (priorityText != null) {
			try {
				priority = Priority.from(priorityText);
			}
			catch (IllegalArgumentException exception) {
				throw new InvalidTaskException("priority", "high / medium / low のいずれかです");
			}
		}
		LocalDate dueDate = null;
		String dueDateText = blankToNull(input.dueDate());
		if (dueDateText != null) {
			dueDate = parseDate(dueDateText);
			if (dueDate == null) {
				throw new InvalidTaskException("dueDate", "YYYY-MM-DD の形です");
			}
		}
		int position = taskRepository.findFirstByStatusOrderByPositionDesc(TaskStatus.TODO)
				.map(last -> last.getPosition() + 1)
				.orElse(0);

		Task task = new Task();
		task.setTitle(title);
		task.setDescription(blankToNull(input.description()));
		task.setPriority(priority);
		task.setDueDate(dueDate);
		task.setStatus(TaskStatus.TODO);
		task.setPosition(position);
		return toResponse(taskRepository.save(task), null);
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
