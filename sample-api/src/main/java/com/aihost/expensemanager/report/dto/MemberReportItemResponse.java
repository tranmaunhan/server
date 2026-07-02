package com.aihost.expensemanager.report.dto;

import java.math.BigDecimal;

public record MemberReportItemResponse(
  Long userId,
  String fullName,
  String avatarUrl,
  BigDecimal paidAmount,
  BigDecimal shareAmount,
  BigDecimal balance
) {
}
