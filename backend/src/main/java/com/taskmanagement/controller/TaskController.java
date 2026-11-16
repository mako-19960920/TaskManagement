package com.taskmanagement.controller;

import java.net.URI;
import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import com.taskmanagement.service.TaskService;

@RestController
@RequestMapping("/api/tasks")
public class TaskController {

	private final TaskService taskService;

	public TaskController(TaskService taskService) {
		this.taskService = taskService;
	}

	@GetMapping
	public List<TaskResponse> findAll() {
		return taskService.findAll();
	}

	@GetMapping("/status/{status}")
	public List<TaskResponse> findByStatus(@PathVariable String status) {
		return taskService.findByStatus(status);
	}

	@GetMapping("/search")
	public List<TaskResponse> search(
			@RequestParam(required = false) String keyword,
			@RequestParam(required = false) String status,
			@RequestParam(required = false) String priority,
			@RequestParam(required = false) String dueFrom,
			@RequestParam(required = false) String dueTo) {
		return taskService.search(keyword, status, priority, dueFrom, dueTo);
	}

	@GetMapping("/{id}")
	public TaskResponse findById(@PathVariable long id) {
		return taskService.findById(id);
	}

	/** タスクを1件登録する。作れたら 201 と、作ったタスクの URL（Location）を返す。 */
	@PostMapping
	public ResponseEntity<TaskResponse> create(@RequestBody TaskCreate task) {
		TaskResponse created = taskService.create(task);
		// 今のリクエストの URL（http://ホスト/api/tasks）の後ろに id を付けて、作ったタスクの URL にする
		URI location = ServletUriComponentsBuilder.fromCurrentRequest()
				.path("/{id}")
				.buildAndExpand(created.id())
				.toUri();
		return ResponseEntity.created(location).body(created);
	}

	/** タスクを1件削除する。削除できたら 204、無ければ 404 */
	@DeleteMapping("/{id}")
	public ResponseEntity<Void> delete(@PathVariable long id) {
		taskService.delete(id);
		return ResponseEntity.noContent().build();
	}

	/** タスクを1件、別の列や同じ列の別の位置へ移す。無ければ 404、状態の値が違えば 400 */
	@PutMapping("/{id}/position")
	public TaskResponse move(@PathVariable long id, @RequestBody TaskMove move) {
		return taskService.move(id, move);
	}

	/** 期限だけを変える。無ければ 404、形が違えば 400 */
	@PutMapping("/{id}/due-date")
	public TaskResponse changeDueDate(@PathVariable long id, @RequestBody TaskDueDate dueDate) {
		return taskService.changeDueDate(id, dueDate);
	}

	/** 非表示かどうかだけを変える。無ければ 404、hidden を省略したら 400 */
	@PutMapping("/{id}/hidden")
	public TaskResponse changeHidden(@PathVariable long id, @RequestBody TaskHidden hidden) {
		return taskService.changeHidden(id, hidden);
	}

	/** タスクを1件編集する（タイトル・説明・優先度・期限）。無ければ 404、値が不正なら 400 */
	@PutMapping("/{id}")
	public TaskResponse update(@PathVariable long id, @RequestBody TaskUpdate task) {
		return taskService.update(id, task);
	}

	@PutMapping
	public List<TaskResponse> replace(@RequestBody List<TaskWrite> tasks) {
		return taskService.replace(tasks);
	}
}
