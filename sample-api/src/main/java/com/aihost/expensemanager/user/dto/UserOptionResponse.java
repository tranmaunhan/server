package com.aihost.expensemanager.user.dto;

import com.aihost.expensemanager.user.enums.UserRole;

public record UserOptionResponse(
  Long id,
  String fullName,
  String email,
  String avatarUrl,
  UserRole role,
  boolean active
) {
}
