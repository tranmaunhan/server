package com.aihost.expensemanager.auth.dto;

import com.aihost.expensemanager.user.dto.UserResponse;
import java.time.Instant;

public record AuthResponse(
  String provider,
  String message,
  Instant authenticatedAt,
  UserResponse user
) {
}
