package com.aihost.expensemanager.user.dto;

import java.time.Instant;

public record UserResponse(
  Long id,
  String email,
  String fullName,
  String avatarUrl,
  String locale,
  boolean emailVerified,
  Instant createdAt,
  Instant updatedAt,
  Instant lastLoginAt
) {
}
