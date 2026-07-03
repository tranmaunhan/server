package com.aihost.expensemanager.expense.service;

import com.aihost.expensemanager.common.dto.PageResponse;
import com.aihost.expensemanager.expense.dto.CreateExpenseRequest;
import com.aihost.expensemanager.expense.dto.ExpenseResponse;
import com.aihost.expensemanager.expense.dto.UpdateExpenseRequest;
import com.aihost.expensemanager.expense.entity.Expense;
import com.aihost.expensemanager.security.CurrentUser;
import java.time.LocalDate;
import java.util.List;

public interface ExpenseService {

  ExpenseResponse create(CurrentUser currentUser, CreateExpenseRequest request);

  ExpenseResponse update(CurrentUser currentUser, Long expenseId, UpdateExpenseRequest request);

  void cancel(CurrentUser currentUser, Long expenseId);

  ExpenseResponse getById(Long expenseId);

  PageResponse<ExpenseResponse> getPage(int page, int size);

  List<Expense> getActiveExpensesInRange(LocalDate startDate, LocalDate endDate);

  List<Expense> getTrackedExpensesInRange(LocalDate startDate, LocalDate endDate);

  void settleExpensesInRange(LocalDate startDate, LocalDate endDate);
}
