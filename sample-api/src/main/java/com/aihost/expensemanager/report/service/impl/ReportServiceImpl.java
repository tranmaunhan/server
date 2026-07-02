package com.aihost.expensemanager.report.service.impl;

import com.aihost.expensemanager.common.util.MoneyUtils;
import com.aihost.expensemanager.expense.entity.Expense;
import com.aihost.expensemanager.expense.entity.ExpenseShare;
import com.aihost.expensemanager.expense.service.ExpenseService;
import com.aihost.expensemanager.report.dto.MemberReportItemResponse;
import com.aihost.expensemanager.report.dto.MonthlyReportResponse;
import com.aihost.expensemanager.report.dto.SettlementSuggestionResponse;
import com.aihost.expensemanager.report.service.ReportService;
import com.aihost.expensemanager.user.entity.AppUser;
import com.aihost.expensemanager.user.service.UserService;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ReportServiceImpl implements ReportService {

  private final ExpenseService expenseService;
  private final UserService userService;

  public ReportServiceImpl(ExpenseService expenseService, UserService userService) {
    this.expenseService = expenseService;
    this.userService = userService;
  }

  @Override
  @Transactional(readOnly = true)
  public MonthlyReportResponse getMonthlyReport(int year, int month) {
    LocalDate startDate = LocalDate.of(year, month, 1);
    LocalDate endDate = startDate.withDayOfMonth(startDate.lengthOfMonth());
    List<Expense> expenses = expenseService.getActiveExpensesInRange(startDate, endDate);

    Map<Long, BigDecimal> paidMap = new HashMap<>();
    Map<Long, BigDecimal> shareMap = new HashMap<>();
    Map<Long, AppUser> users = new HashMap<>();

    for (AppUser user : userService.getActiveUsers()) {
      users.put(user.getId(), user);
      paidMap.put(user.getId(), MoneyUtils.ZERO);
      shareMap.put(user.getId(), MoneyUtils.ZERO);
    }

    BigDecimal totalAmount = MoneyUtils.ZERO;
    for (Expense expense : expenses) {
      totalAmount = totalAmount.add(expense.getAmount());
      paidMap.merge(expense.getPayer().getId(), expense.getAmount(), BigDecimal::add);
      for (ExpenseShare share : expense.getShares()) {
        shareMap.merge(share.getUser().getId(), share.getShareAmount(), BigDecimal::add);
      }
    }

    List<MemberReportItemResponse> members = users.values().stream()
      .sorted(Comparator.comparing(AppUser::getFullName))
      .map(user -> {
        BigDecimal paidAmount = MoneyUtils.normalize(paidMap.getOrDefault(user.getId(), MoneyUtils.ZERO));
        BigDecimal shareAmount = MoneyUtils.normalize(shareMap.getOrDefault(user.getId(), MoneyUtils.ZERO));
        BigDecimal balance = MoneyUtils.normalize(paidAmount.subtract(shareAmount));
        return new MemberReportItemResponse(
          user.getId(),
          user.getFullName(),
          user.getAvatarUrl(),
          paidAmount,
          shareAmount,
          balance
        );
      })
      .toList();

    return new MonthlyReportResponse(
      month,
      year,
      MoneyUtils.normalize(totalAmount),
      expenses.size(),
      members,
      suggestSettlements(members)
    );
  }

  private List<SettlementSuggestionResponse> suggestSettlements(List<MemberReportItemResponse> members) {
    List<BalanceNode> creditors = new ArrayList<>();
    List<BalanceNode> debtors = new ArrayList<>();

    for (MemberReportItemResponse member : members) {
      if (member.balance().compareTo(MoneyUtils.ZERO) > 0) {
        creditors.add(new BalanceNode(member.userId(), member.fullName(), member.balance()));
      } else if (member.balance().compareTo(MoneyUtils.ZERO) < 0) {
        debtors.add(new BalanceNode(member.userId(), member.fullName(), member.balance().abs()));
      }
    }

    List<SettlementSuggestionResponse> suggestions = new ArrayList<>();
    int creditorIndex = 0;
    int debtorIndex = 0;

    while (creditorIndex < creditors.size() && debtorIndex < debtors.size()) {
      BalanceNode creditor = creditors.get(creditorIndex);
      BalanceNode debtor = debtors.get(debtorIndex);
      BigDecimal transferAmount = creditor.amount().min(debtor.amount());

      suggestions.add(new SettlementSuggestionResponse(
        debtor.userId(),
        debtor.fullName(),
        creditor.userId(),
        creditor.fullName(),
        MoneyUtils.normalize(transferAmount)
      ));

      creditor.subtract(transferAmount);
      debtor.subtract(transferAmount);

      if (creditor.amount().compareTo(MoneyUtils.ZERO) == 0) {
        creditorIndex++;
      }
      if (debtor.amount().compareTo(MoneyUtils.ZERO) == 0) {
        debtorIndex++;
      }
    }

    return suggestions;
  }

  private static final class BalanceNode {
    private final Long userId;
    private final String fullName;
    private BigDecimal amount;

    private BalanceNode(Long userId, String fullName, BigDecimal amount) {
      this.userId = userId;
      this.fullName = fullName;
      this.amount = MoneyUtils.normalize(amount);
    }

    public Long userId() {
      return userId;
    }

    public String fullName() {
      return fullName;
    }

    public BigDecimal amount() {
      return amount;
    }

    public void subtract(BigDecimal value) {
      this.amount = MoneyUtils.normalize(this.amount.subtract(value));
    }
  }
}
