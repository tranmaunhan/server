package com.aihost.expensemanager.health.controller;

import com.aihost.expensemanager.health.dto.HealthResponse;
import com.aihost.expensemanager.health.service.HealthService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/health")
public class HealthController {

  private final HealthService healthService;

  public HealthController(HealthService healthService) {
    this.healthService = healthService;
  }

  @GetMapping
  public HealthResponse health() {
    return healthService.getHealth();
  }
}
