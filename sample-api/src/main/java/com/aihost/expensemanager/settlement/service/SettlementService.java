package com.aihost.expensemanager.settlement.service;

import com.aihost.expensemanager.settlement.dto.GenerateSettlementRequest;
import com.aihost.expensemanager.settlement.dto.SettlementResponse;
import com.aihost.expensemanager.settlement.dto.UpdateSettlementStatusRequest;
import com.aihost.expensemanager.security.CurrentUser;
import java.util.List;

public interface SettlementService {

  List<SettlementResponse> list(int year, int month);

  List<SettlementResponse> generate(GenerateSettlementRequest request);

  SettlementResponse updateStatus(CurrentUser currentUser, Long settlementId, UpdateSettlementStatusRequest request);
}
