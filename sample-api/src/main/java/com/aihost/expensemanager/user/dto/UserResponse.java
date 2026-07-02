package com.aihost.expensemanager.user.dto;

import com.aihost.expensemanager.user.enums.UserRole;
import java.time.LocalDateTime;

public record UserResponse(
  Long id,
  String email,
  String fullName,
  String avatarUrl,
  UserRole role,
  boolean active,
  LocalDateTime createdAt,
  LocalDateTime updatedAt
) {
}
