package com.aihost.expensemanager.expense.dto;

import com.aihost.expensemanager.expense.enums.ExpenseSplitType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record CreateExpenseRequest(
  @NotNull(message = "khong duoc de trong") Long payerId,
  @NotNull(message = "khong duoc de trong")
  @DecimalMin(value = "0.01", inclusive = true, message = "phai lon hon 0")
  BigDecimal amount,
  @NotBlank(message = "khong duoc de trong") String description,
  String imageUrl,
  @NotNull(message = "khong duoc de trong") LocalDate expenseDate,
  @NotNull(message = "khong duoc de trong") ExpenseSplitType splitType,
  @Valid @NotEmpty(message = "phai co it nhat mot nguoi chiu tien") List<ExpenseShareRequest> shares
) {
}
