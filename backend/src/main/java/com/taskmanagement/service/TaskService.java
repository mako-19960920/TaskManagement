package com.taskmanagement.service;

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

import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.taskmanagement.controller.TaskCreate;
import com.taskmanagement.controller.TaskDueDate;
import com.taskmanagement.controller.TaskHidden;
import com.taskmanagement.controller.TaskInputRules;
import com.taskmanagement.controller.TaskMove;
import com.taskmanagement.controller.TaskResponse;
import com.taskmanagement.controller.TaskUpdate;
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

	/** ボードの並び：列の順（やること → 進行中 → 完了）、列の中は position の順 */
	private static final Comparator<Task> BOARD_ORDER = Comparator
			.comparingInt((Task task) -> STATUS_ORDER.indexOf(task.getStatus()))
			.thenComparingInt(Task::getPosition);

	private final TaskRepository taskRepository;

	public TaskService(TaskRepository taskRepository) {
		this.taskRepository = taskRepository;
	}

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
			throw InvalidSearchConditionException.reversedRange(dueFrom, dueTo);
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
			throw InvalidSearchConditionException.invalidValue("priority", value);
		}
	}

	private LocalDate parseSearchDate(String name, String value) {
		if (value == null) {
			return null;
		}
		LocalDate date = parseDate(value);
		if (date == null) {
			throw InvalidSearchConditionException.invalidValue(name, value);
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

	/**
	 * タスクを1件登録する。状態は todo、順番は「やること」の末尾（いちばん後ろの position + 1）にする。
	 * 件数ではなく最大の position を使うのは、途中の番号が抜けていても重ならないようにするため。
	 */
	@Transactional
	public TaskResponse create(TaskCreate input) {
		int position = taskRepository.findFirstByStatusOrderByPositionDesc(TaskStatus.TODO)
				.map(last -> last.getPosition() + 1)
				.orElse(0);

		Task task = new Task();
		applyFields(task, input.title(), input.description(), input.priority(), input.dueDate());
		task.setStatus(TaskStatus.TODO);
		task.setPosition(position);
		return toResponse(taskRepository.save(task), null);
	}

	/**
	 * タスクを1件編集する。タイトル・説明・優先度・期限を、送られた値に置き換える（省略した説明と期限はなし、優先度は medium）。
	 * 状態・順番・非表示は変えない。
	 */
	@Transactional
	public TaskResponse update(long id, TaskUpdate input) {
		Task task = taskRepository.findById(id).orElseThrow(() -> new TaskNotFoundException(id));
		applyFields(task, input.title(), input.description(), input.priority(), input.dueDate());
		return toResponse(taskRepository.saveAndFlush(task), null);
	}

	/**
	 * タスクを1件、別の列や同じ列の別の位置へ移す。input.status() の列の、input.beforeId() のタスクの前に入れる。
	 * beforeId が null か、その列に無いとき（ほかの画面で消えたなど）は末尾に入れる。
	 * 元の列と行き先の列の順番を、0 からの連番に振り直す。ほかのタスクは消さない。
	 */
	@Transactional
	public TaskResponse move(long id, TaskMove input) {
		Task task = taskRepository.findById(id).orElseThrow(() -> new TaskNotFoundException(id));
		TaskStatus target = parseStatus(input.status());
		TaskStatus source = task.getStatus();

		List<Task> sourceList = new ArrayList<>(taskRepository.findByStatusOrderByPositionAsc(source));
		sourceList.removeIf(item -> item.getId().equals(task.getId()));
		List<Task> targetList = source == target
				? sourceList
				: new ArrayList<>(taskRepository.findByStatusOrderByPositionAsc(target));

		int index = targetList.size();
		if (input.beforeId() != null) {
			for (int i = 0; i < targetList.size(); i++) {
				if (targetList.get(i).getId().equals(input.beforeId())) {
					index = i;
					break;
				}
			}
		}
		targetList.add(index, task);
		task.setStatus(target);

		if (source != target) {
			renumber(sourceList);
		}
		renumber(targetList);
		// すぐに書き込んで、応答に新しい更新日時を入れる
		return toResponse(taskRepository.saveAndFlush(task), null);
	}

	/** タスクを1件削除する（行ごと消す）。同じ列で後ろにあるタスクの順番を詰める */
	@Transactional
	public void delete(long id) {
		Task task = taskRepository.findById(id).orElseThrow(() -> new TaskNotFoundException(id));
		TaskStatus status = task.getStatus();
		taskRepository.delete(task);
		List<Task> rest = new ArrayList<>(taskRepository.findByStatusOrderByPositionAsc(status));
		rest.removeIf(item -> item.getId().equals(task.getId()));
		renumber(rest);
	}

	/** 期限だけを変える。null か空なら期限なし。形が違えば 400 */
	@Transactional
	public TaskResponse changeDueDate(long id, TaskDueDate input) {
		Task task = taskRepository.findById(id).orElseThrow(() -> new TaskNotFoundException(id));
		String value = blankToNull(input.dueDate());
		LocalDate dueDate = null;
		if (value != null) {
			dueDate = parseDate(value);
			if (dueDate == null) {
				throw new InvalidTaskException("dueDate", "YYYY-MM-DD の形です");
			}
		}
		task.setDueDate(dueDate);
		return toResponse(taskRepository.saveAndFlush(task), null);
	}

	/** 非表示かどうかだけを変える。列の中の順番は変えない。hidden の省略は、Controller の @Valid で 400 にしている */
	@Transactional
	public TaskResponse changeHidden(long id, TaskHidden input) {
		Task task = taskRepository.findById(id).orElseThrow(() -> new TaskNotFoundException(id));
		task.setHidden(input.hidden());
		return toResponse(taskRepository.saveAndFlush(task), null);
	}

	/** 列の中の順番を、並びのとおり 0 からの連番にする。変わったものだけ保存する */
	private void renumber(List<Task> tasks) {
		for (int i = 0; i < tasks.size(); i++) {
			Task task = tasks.get(i);
			if (task.getPosition() != i) {
				task.setPosition(i);
				taskRepository.save(task);
			}
		}
	}

	/**
	 * 登録と編集で共通の、値の入れ方。
	 * タイトルと優先度は、Controller の @Valid で調べ済み（空白も除いてある）。
	 * 期限の日付が存在するか（2月30日など）は印では調べられないので、ここで調べて、正しくなければ 400（InvalidTaskException）にする。
	 */
	private void applyFields(Task task, String title, String description, String priority, String dueDateText) {
		LocalDate dueDate = null;
		if (dueDateText != null) {
			dueDate = parseDate(dueDateText);
			if (dueDate == null) {
				throw new InvalidTaskException("dueDate", "YYYY-MM-DD の形です");
			}
		}
		task.setTitle(title);
		task.setDescription(description);
		task.setPriority(priority == null ? Priority.MEDIUM : Priority.from(priority));
		task.setDueDate(dueDate);
	}

	@Transactional
	public List<TaskResponse> replace(List<TaskWrite> inputs) {
		// 1件でも長すぎるタイトルがあれば、何も変えずに 400 にする（データベースに入れる前に止める）
		if (inputs != null) {
			for (TaskWrite input : inputs) {
				if (input != null && input.title() != null && input.title().strip().length() > TaskInputRules.TITLE_MAX) {
					throw new InvalidTaskException("title", TaskInputRules.TITLE_MAX + " 文字までです");
				}
			}
		}
		Map<Long, Task> byId = new LinkedHashMap<>();
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
				if (input.hidden() != null) {
					task.setHidden(input.hidden());
				}
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
				task.isHidden(),
				task.getCreatedAt(),
				task.getUpdatedAt(),
				key);
	}
}
