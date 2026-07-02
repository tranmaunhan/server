package com.aihost.expensemanager.user.dto;

import jakarta.validation.constraints.NotNull;

public record UpdateUserStatusRequest(
  @NotNull(message = "khong duoc de trong") Boolean active
) {
}
