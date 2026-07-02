package com.aihost.expensemanager.health.dto;

import java.time.LocalDateTime;

public record HealthResponse(
  boolean ok,
  String service,
  String database,
  long totalUsers,
  long totalExpenses,
  LocalDateTime time
) {
}
