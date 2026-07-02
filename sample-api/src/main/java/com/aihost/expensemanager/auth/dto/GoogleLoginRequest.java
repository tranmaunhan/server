package com.aihost.expensemanager.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record GoogleLoginRequest(
  @NotBlank(message = "khong duoc de trong") String credential
) {
}
