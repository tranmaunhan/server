package com.aihost.expensemanager.security;

import com.aihost.expensemanager.user.enums.UserRole;

public record CurrentUser(
  Long id,
  String email,
  String fullName,
  UserRole role
) {
}
