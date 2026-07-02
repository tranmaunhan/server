package com.aihost.expensemanager.health.dto;

import java.time.Instant;

public record HealthResponse(
  boolean ok,
  String service,
  String database,
  long registeredUsers,
  Instant time
) {
}
