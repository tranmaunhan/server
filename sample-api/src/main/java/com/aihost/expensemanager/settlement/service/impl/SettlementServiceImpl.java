package com.aihost.expensemanager.settlement.service.impl;

import com.aihost.expensemanager.common.exception.NotFoundException;
import com.aihost.expensemanager.report.dto.MonthlyReportResponse;
import com.aihost.expensemanager.report.dto.SettlementSuggestionResponse;
import com.aihost.expensemanager.report.service.ReportService;
import com.aihost.expensemanager.settlement.dto.GenerateSettlementRequest;
import com.aihost.expensemanager.settlement.dto.SettlementResponse;
import com.aihost.expensemanager.settlement.dto.UpdateSettlementStatusRequest;
import com.aihost.expensemanager.settlement.entity.Settlement;
import com.aihost.expensemanager.settlement.enums.SettlementStatus;
import com.aihost.expensemanager.settlement.mapper.SettlementMapper;
import com.aihost.expensemanager.settlement.repository.SettlementRepository;
import com.aihost.expensemanager.settlement.service.SettlementService;
import com.aihost.expensemanager.user.entity.AppUser;
import com.aihost.expensemanager.user.service.UserService;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SettlementServiceImpl implements SettlementService {

  private final SettlementRepository settlementRepository;
  private final ReportService reportService;
  private final UserService userService;
  private final SettlementMapper settlementMapper;

  public SettlementServiceImpl(
    SettlementRepository settlementRepository,
    ReportService reportService,
    UserService userService,
    SettlementMapper settlementMapper
  ) {
    this.settlementRepository = settlementRepository;
    this.reportService = reportService;
    this.userService = userService;
    this.settlementMapper = settlementMapper;
  }

  @Override
  @Transactional(readOnly = true)
  public List<SettlementResponse> list(int year, int month) {
    return settlementMapper.toResponses(settlementRepository.findAllByYearAndMonthOrderByStatusAscCreatedAtDesc(year, month));
  }

  @Override
  @Transactional
  public List<SettlementResponse> generate(GenerateSettlementRequest request) {
    settlementRepository.deleteByYearAndMonthAndStatus(request.year(), request.month(), SettlementStatus.PENDING);

    MonthlyReportResponse report = reportService.getMonthlyReport(request.year(), request.month());
    List<Settlement> generated = new ArrayList<>();

    for (SettlementSuggestionResponse suggestion : report.suggestions()) {
      Settlement settlement = new Settlement();
      AppUser fromUser = userService.getActiveUserById(suggestion.fromUserId());
      AppUser toUser = userService.getActiveUserById(suggestion.toUserId());
      settlement.setFromUser(fromUser);
      settlement.setToUser(toUser);
      settlement.setAmount(suggestion.amount());
      settlement.setMonth(request.month());
      settlement.setYear(request.year());
      settlement.setStatus(SettlementStatus.PENDING);
      generated.add(settlementRepository.save(settlement));
    }

    return settlementMapper.toResponses(generated);
  }

  @Override
  @Transactional
  public SettlementResponse updateStatus(Long settlementId, UpdateSettlementStatusRequest request) {
    Settlement settlement = settlementRepository.findById(settlementId)
      .orElseThrow(() -> new NotFoundException("Khong tim thay quyet toan."));

    settlement.setStatus(request.status());
    settlement.setPaidAt(request.status() == SettlementStatus.PAID ? LocalDateTime.now() : null);

    return settlementMapper.toResponse(settlementRepository.save(settlement));
  }
}
