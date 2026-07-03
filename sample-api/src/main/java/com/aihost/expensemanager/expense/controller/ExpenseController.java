package com.aihost.expensemanager.expense.controller;

import com.aihost.expensemanager.common.dto.PageResponse;
import com.aihost.expensemanager.expense.dto.CreateExpenseRequest;
import com.aihost.expensemanager.expense.dto.ExpenseResponse;
import com.aihost.expensemanager.expense.dto.UpdateExpenseRequest;
import com.aihost.expensemanager.expense.service.ExpenseService;
import com.aihost.expensemanager.security.CurrentUser;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/expenses")
public class ExpenseController {

  private final ExpenseService expenseService;

  public ExpenseController(ExpenseService expenseService) {
    this.expenseService = expenseService;
  }

  @GetMapping
  public PageResponse<ExpenseResponse> list(
    @RequestParam(defaultValue = "0") int page,
    @RequestParam(defaultValue = "10") int size
  ) {
    return expenseService.getPage(page, size);
  }

  @GetMapping("/{expenseId}")
  public ExpenseResponse detail(@PathVariable Long expenseId) {
    return expenseService.getById(expenseId);
  }

  @PostMapping
  public ExpenseResponse create(
    @AuthenticationPrincipal CurrentUser currentUser,
    @Valid @RequestBody CreateExpenseRequest request
  ) {
    return expenseService.create(currentUser, request);
  }

  @PutMapping("/{expenseId}")
  public ExpenseResponse update(
    @AuthenticationPrincipal CurrentUser currentUser,
    @PathVariable Long expenseId,
    @Valid @RequestBody UpdateExpenseRequest request
  ) {
    return expenseService.update(currentUser, expenseId, request);
  }

  @DeleteMapping("/{expenseId}")
  public void cancel(@AuthenticationPrincipal CurrentUser currentUser, @PathVariable Long expenseId) {
    expenseService.cancel(currentUser, expenseId);
  }
}
