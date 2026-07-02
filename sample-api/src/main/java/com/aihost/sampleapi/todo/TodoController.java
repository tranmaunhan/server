package com.aihost.sampleapi.todo;

import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/todos")
public class TodoController {

  private final TodoItemRepository todoItemRepository;

  public TodoController(TodoItemRepository todoItemRepository) {
    this.todoItemRepository = todoItemRepository;
  }

  @GetMapping
  public List<TodoItem> list() {
    return todoItemRepository.findAll();
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public TodoItem create(@RequestBody TodoItemRequest request) {
    String title = request.title() == null ? "" : request.title().trim();
    if (title.isEmpty()) {
      throw new IllegalArgumentException("title is required");
    }
    return todoItemRepository.save(new TodoItem(title, request.completed()));
  }
}
