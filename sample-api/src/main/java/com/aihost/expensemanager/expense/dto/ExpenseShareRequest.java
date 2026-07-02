package com.aihost.expensemanager.expense.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record ExpenseShareRequest(
  @NotNull(message = "khong duoc de trong") Long userId,
  @DecimalMin(value = "0.00", inclusive = false, message = "phai lon hon 0")
  BigDecimal shareAmount
) {
}
