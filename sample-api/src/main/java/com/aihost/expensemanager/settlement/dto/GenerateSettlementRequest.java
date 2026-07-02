package com.aihost.expensemanager.settlement.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record GenerateSettlementRequest(
  @NotNull(message = "khong duoc de trong")
  @Min(value = 1, message = "phai tu 1 den 12")
  @Max(value = 12, message = "phai tu 1 den 12")
  Integer month,
  @NotNull(message = "khong duoc de trong")
  @Min(value = 2000, message = "nam khong hop le")
  Integer year
) {
}
