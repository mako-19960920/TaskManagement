package com.taskmanagement.controller;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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

	@GetMapping("/{id}")
	public TaskResponse findById(@PathVariable long id) {
		return taskService.findById(id);
	}

	@PutMapping
	public List<TaskResponse> replace(@RequestBody List<TaskWrite> tasks) {
		return taskService.replace(tasks);
	}
}
