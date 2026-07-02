package com.aihost.expensemanager.report.dto;

import java.math.BigDecimal;
import java.util.List;

public record MonthlyReportResponse(
  int month,
  int year,
  BigDecimal totalExpenseAmount,
  long totalExpenseCount,
  List<MemberReportItemResponse> members,
  List<SettlementSuggestionResponse> suggestions
) {
}
