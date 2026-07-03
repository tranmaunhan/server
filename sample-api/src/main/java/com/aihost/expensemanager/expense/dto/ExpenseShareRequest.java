package com.aihost.expensemanager.expense.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record ExpenseShareRequest(
  @NotNull(message = "Không được để trống.") Long userId,
  @DecimalMin(value = "0.00", inclusive = false, message = "Phải lớn hơn 0.")
  BigDecimal shareAmount
) {
}
