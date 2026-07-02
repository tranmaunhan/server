package com.aihost.sampleapi.todo;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class TodoDataSeeder {

  @Bean
  CommandLineRunner seedTodos(TodoItemRepository todoItemRepository) {
    return args -> {
      if (todoItemRepository.count() == 0) {
        todoItemRepository.save(new TodoItem("Kiem tra ket noi Spring Boot -> PostgreSQL", true));
        todoItemRepository.save(new TodoItem("Dung React goi /api/health qua nginx", false));
      }
    };
  }
}
