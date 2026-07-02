package com.aihost.expensemanager.settlement.controller;

import com.aihost.expensemanager.settlement.dto.GenerateSettlementRequest;
import com.aihost.expensemanager.settlement.dto.SettlementResponse;
import com.aihost.expensemanager.settlement.dto.UpdateSettlementStatusRequest;
import com.aihost.expensemanager.security.CurrentUser;
import com.aihost.expensemanager.settlement.service.SettlementService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/settlements")
public class SettlementController {

  private final SettlementService settlementService;

  public SettlementController(SettlementService settlementService) {
    this.settlementService = settlementService;
  }

  @GetMapping
  public List<SettlementResponse> list(
    @RequestParam int year,
    @RequestParam int month
  ) {
    return settlementService.list(year, month);
  }

  @PostMapping("/generate")
  public List<SettlementResponse> generate(@Valid @RequestBody GenerateSettlementRequest request) {
    return settlementService.generate(request);
  }

  @PatchMapping("/{settlementId}/status")
  public SettlementResponse updateStatus(
    @AuthenticationPrincipal CurrentUser currentUser,
    @PathVariable Long settlementId,
    @Valid @RequestBody UpdateSettlementStatusRequest request
  ) {
    return settlementService.updateStatus(currentUser, settlementId, request);
  }
}
