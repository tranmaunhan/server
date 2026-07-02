package com.aihost.expensemanager.settlement.mapper;

import com.aihost.expensemanager.settlement.dto.SettlementResponse;
import com.aihost.expensemanager.settlement.entity.Settlement;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class SettlementMapper {

  public SettlementResponse toResponse(Settlement settlement) {
    return new SettlementResponse(
      settlement.getId(),
      settlement.getFromUser().getId(),
      settlement.getFromUser().getFullName(),
      settlement.getToUser().getId(),
      settlement.getToUser().getFullName(),
      settlement.getAmount(),
      settlement.getMonth(),
      settlement.getYear(),
      settlement.getStatus(),
      settlement.getPaidAt(),
      settlement.getCreatedAt()
    );
  }

  public List<SettlementResponse> toResponses(List<Settlement> settlements) {
    return settlements.stream().map(this::toResponse).toList();
  }
}
