package com.aihost.expensemanager.user.dto;

import com.aihost.expensemanager.user.enums.UserRole;
import jakarta.validation.constraints.NotNull;

public record UpdateUserRoleRequest(
  @NotNull(message = "khong duoc de trong") UserRole role
) {
}
