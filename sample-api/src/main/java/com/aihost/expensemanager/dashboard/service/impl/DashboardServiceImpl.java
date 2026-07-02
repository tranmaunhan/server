package com.aihost.expensemanager.dashboard.service.impl;

import com.aihost.expensemanager.common.util.MoneyUtils;
import com.aihost.expensemanager.dashboard.dto.DashboardResponse;
import com.aihost.expensemanager.dashboard.service.DashboardService;
import com.aihost.expensemanager.expense.dto.ExpenseResponse;
import com.aihost.expensemanager.expense.entity.Expense;
import com.aihost.expensemanager.expense.mapper.ExpenseMapper;
import com.aihost.expensemanager.expense.service.ExpenseService;
import com.aihost.expensemanager.security.CurrentUser;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DashboardServiceImpl implements DashboardService {

  private final ExpenseService expenseService;
  private final ExpenseMapper expenseMapper;

  public DashboardServiceImpl(ExpenseService expenseService, ExpenseMapper expenseMapper) {
    this.expenseService = expenseService;
    this.expenseMapper = expenseMapper;
  }

  @Override
  @Transactional(readOnly = true)
  public DashboardResponse getDashboard(CurrentUser currentUser) {
    LocalDate today = LocalDate.now();
    LocalDate monthStart = today.withDayOfMonth(1);
    LocalDate monthEnd = today.withDayOfMonth(today.lengthOfMonth());

    List<Expense> monthExpenses = expenseService.getActiveExpensesInRange(monthStart, monthEnd);
    BigDecimal monthTotal = sumAmounts(monthExpenses);
    BigDecimal todayTotal = monthExpenses.stream()
      .filter(expense -> expense.getExpenseDate().equals(today))
      .map(Expense::getAmount)
      .reduce(MoneyUtils.ZERO, BigDecimal::add);

    Map<String, BigDecimal> paidByUser = new HashMap<>();
    for (Expense expense : monthExpenses) {
      paidByUser.merge(expense.getPayer().getFullName(), expense.getAmount(), BigDecimal::add);
    }

    Map.Entry<String, BigDecimal> topPayer = paidByUser.entrySet().stream()
      .max(Map.Entry.comparingByValue())
      .orElse(null);

    List<ExpenseResponse> recentExpenses = monthExpenses.stream()
      .sorted(Comparator.comparing(Expense::getExpenseDate).reversed().thenComparing(Expense::getCreatedAt).reversed())
      .limit(5)
      .map(expenseMapper::toResponse)
      .toList();

    return new DashboardResponse(
      currentUser.fullName(),
      monthTotal,
      todayTotal,
      monthExpenses.size(),
      topPayer == null ? null : topPayer.getKey(),
      topPayer == null ? MoneyUtils.ZERO : MoneyUtils.normalize(topPayer.getValue()),
      recentExpenses
    );
  }

  private BigDecimal sumAmounts(List<Expense> expenses) {
    return expenses.stream().map(Expense::getAmount).reduce(MoneyUtils.ZERO, BigDecimal::add);
  }
}
