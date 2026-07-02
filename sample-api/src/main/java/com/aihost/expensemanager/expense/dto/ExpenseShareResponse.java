package com.aihost.expensemanager.expense.dto;

import java.math.BigDecimal;

public record ExpenseShareResponse(
  Long userId,
  String fullName,
  String avatarUrl,
  BigDecimal shareAmount
) {
}
