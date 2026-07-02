package com.aihost.expensemanager.report.dto;

import java.math.BigDecimal;

public record SettlementSuggestionResponse(
  Long fromUserId,
  String fromUserName,
  Long toUserId,
  String toUserName,
  BigDecimal amount
) {
}
