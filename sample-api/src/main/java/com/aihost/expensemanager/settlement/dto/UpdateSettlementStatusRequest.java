package com.aihost.expensemanager.settlement.dto;

import com.aihost.expensemanager.settlement.enums.SettlementStatus;
import jakarta.validation.constraints.NotNull;

public record UpdateSettlementStatusRequest(
  @NotNull(message = "Không được để trống.") SettlementStatus status
) {
}
