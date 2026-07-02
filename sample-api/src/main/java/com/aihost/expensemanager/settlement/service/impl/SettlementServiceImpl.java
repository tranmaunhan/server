package com.aihost.expensemanager.settlement.service.impl;

import com.aihost.expensemanager.common.exception.BadRequestException;
import com.aihost.expensemanager.common.exception.ForbiddenException;
import com.aihost.expensemanager.common.exception.NotFoundException;
import com.aihost.expensemanager.expense.service.ExpenseService;
import com.aihost.expensemanager.report.dto.MonthlyReportResponse;
import com.aihost.expensemanager.report.dto.SettlementSuggestionResponse;
import com.aihost.expensemanager.report.service.ReportService;
import com.aihost.expensemanager.security.CurrentUser;
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
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SettlementServiceImpl implements SettlementService {

  private final SettlementRepository settlementRepository;
  private final ExpenseService expenseService;
  private final ReportService reportService;
  private final UserService userService;
  private final SettlementMapper settlementMapper;

  public SettlementServiceImpl(
    SettlementRepository settlementRepository,
    ExpenseService expenseService,
    ReportService reportService,
    UserService userService,
    SettlementMapper settlementMapper
  ) {
    this.settlementRepository = settlementRepository;
    this.expenseService = expenseService;
    this.reportService = reportService;
    this.userService = userService;
    this.settlementMapper = settlementMapper;
  }

  @Override
  @Transactional(readOnly = true)
  public List<SettlementResponse> list(int year, int month) {
    return settlementMapper.toResponses(
      settlementRepository.findAllByYearAndMonthOrderByStatusAscCreatedAtDesc(year, month).stream()
        .filter(settlement -> settlement.getFromUser().isActive() && settlement.getToUser().isActive())
        .toList()
    );
  }

  @Override
  @Transactional
  public List<SettlementResponse> generate(GenerateSettlementRequest request) {
    List<Settlement> existingSettlements = settlementRepository.findAllByYearAndMonthOrderByStatusAscCreatedAtDesc(
      request.year(),
      request.month()
    );
    if (!existingSettlements.isEmpty()) {
      return settlementMapper.toResponses(
        existingSettlements.stream()
          .filter(settlement -> settlement.getFromUser().isActive() && settlement.getToUser().isActive())
          .toList()
      );
    }

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

    LocalDate startDate = LocalDate.of(request.year(), request.month(), 1);
    LocalDate endDate = startDate.withDayOfMonth(startDate.lengthOfMonth());
    expenseService.settleExpensesInRange(startDate, endDate);

    return settlementMapper.toResponses(generated);
  }

  @Override
  @Transactional
  public SettlementResponse updateStatus(CurrentUser currentUser, Long settlementId, UpdateSettlementStatusRequest request) {
    Settlement settlement = settlementRepository.findById(settlementId)
      .orElseThrow(() -> new NotFoundException("Không tìm thấy quyết toán."));

    if (request.status() != SettlementStatus.PAID) {
      throw new BadRequestException("Chỉ hỗ trợ xác nhận đã nhận tiền.");
    }

    if (currentUser == null || !settlement.getToUser().getId().equals(currentUser.id())) {
      throw new ForbiddenException("Chỉ người nhận tiền mới có thể xác nhận đã nhận.");
    }

    if (settlement.getStatus() == SettlementStatus.PAID) {
      throw new BadRequestException("Khoản quyết toán này đã hoàn tất.");
    }

    settlement.setStatus(SettlementStatus.PAID);
    settlement.setPaidAt(LocalDateTime.now());

    return settlementMapper.toResponse(settlementRepository.save(settlement));
  }
}
