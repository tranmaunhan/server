package com.aihost.expensemanager.settlement.dto;

import com.aihost.expensemanager.settlement.enums.SettlementStatus;
import java.math.BigDecimal;
import java.time.LocalDateTime;

public record SettlementResponse(
  Long id,
  Long fromUserId,
  String fromUserName,
  Long toUserId,
  String toUserName,
  BigDecimal amount,
  int month,
  int year,
  SettlementStatus status,
  LocalDateTime paidAt,
  LocalDateTime createdAt
) {
}
