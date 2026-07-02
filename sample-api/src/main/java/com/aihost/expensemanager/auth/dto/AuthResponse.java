package com.aihost.expensemanager.auth.dto;

import com.aihost.expensemanager.user.dto.UserResponse;
import java.time.LocalDateTime;

public record AuthResponse(
  String accessToken,
  String tokenType,
  LocalDateTime expiresAt,
  UserResponse user
) {
}
