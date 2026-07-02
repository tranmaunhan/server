package com.aihost.expensemanager.expense.dto;

import com.aihost.expensemanager.expense.enums.ExpenseSplitType;
import com.aihost.expensemanager.expense.enums.ExpenseStatus;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record ExpenseResponse(
  Long id,
  BigDecimal amount,
  String description,
  String imageUrl,
  LocalDate expenseDate,
  ExpenseSplitType splitType,
  ExpenseStatus status,
  Long payerId,
  String payerName,
  Long createdById,
  String createdByName,
  List<ExpenseShareResponse> shares,
  LocalDateTime createdAt,
  LocalDateTime updatedAt
) {
}
