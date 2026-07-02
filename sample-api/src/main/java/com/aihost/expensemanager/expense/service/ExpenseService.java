package com.aihost.expensemanager.expense.service;

import com.aihost.expensemanager.expense.dto.CreateExpenseRequest;
import com.aihost.expensemanager.expense.dto.ExpenseResponse;
import com.aihost.expensemanager.expense.dto.UpdateExpenseRequest;
import com.aihost.expensemanager.security.CurrentUser;
import java.time.LocalDate;
import java.util.List;

public interface ExpenseService {

  ExpenseResponse create(CurrentUser currentUser, CreateExpenseRequest request);

  ExpenseResponse update(Long expenseId, UpdateExpenseRequest request);

  void cancel(Long expenseId);

  ExpenseResponse getById(Long expenseId);

  List<ExpenseResponse> getAll();

  List<com.aihost.expensemanager.expense.entity.Expense> getActiveExpensesInRange(LocalDate startDate, LocalDate endDate);
}
