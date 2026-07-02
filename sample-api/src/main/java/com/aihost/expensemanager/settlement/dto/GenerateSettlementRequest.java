package com.aihost.expensemanager.settlement.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record GenerateSettlementRequest(
  @NotNull(message = "Không được để trống.")
  @Min(value = 1, message = "Phải từ 1 đến 12.")
  @Max(value = 12, message = "Phải từ 1 đến 12.")
  Integer month,
  @NotNull(message = "Không được để trống.")
  @Min(value = 2000, message = "Năm không hợp lệ.")
  Integer year
) {
}
