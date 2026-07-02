package com.aihost.sampleapi.health;

import com.aihost.sampleapi.todo.TodoItemRepository;
import java.time.Instant;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/health")
public class ApiHealthController {

  private final TodoItemRepository todoItemRepository;

  public ApiHealthController(TodoItemRepository todoItemRepository) {
    this.todoItemRepository = todoItemRepository;
  }

  @GetMapping
  public Map<String, Object> health() {
    return Map.of(
      "ok", true,
      "service", "sample-api",
      "database", "postgres",
      "todoCount", todoItemRepository.count(),
      "time", Instant.now().toString()
    );
  }
}
