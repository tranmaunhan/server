package com.aihost.expensemanager.dashboard.dto;

import com.aihost.expensemanager.expense.dto.ExpenseResponse;
import java.math.BigDecimal;
import java.util.List;

public record DashboardResponse(
  String greetingName,
  BigDecimal monthTotal,
  BigDecimal todayTotal,
  long monthExpenseCount,
  String topPayerName,
  BigDecimal topPayerAmount,
  List<ExpenseResponse> recentExpenses
) {
}
