package com.aihost.expensemanager.expense.mapper;

import com.aihost.expensemanager.expense.dto.ExpenseResponse;
import com.aihost.expensemanager.expense.dto.ExpenseShareResponse;
import com.aihost.expensemanager.expense.entity.Expense;
import com.aihost.expensemanager.expense.entity.ExpenseShare;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class ExpenseMapper {

  public ExpenseResponse toResponse(Expense expense) {
    return new ExpenseResponse(
      expense.getId(),
      expense.getAmount(),
      expense.getDescription(),
      expense.getImageUrl(),
      expense.getExpenseDate(),
      expense.getSplitType(),
      expense.getStatus(),
      expense.getPayer().getId(),
      expense.getPayer().getFullName(),
      expense.getCreatedBy().getId(),
      expense.getCreatedBy().getFullName(),
      expense.getShares().stream().map(this::toShareResponse).toList(),
      expense.getCreatedAt(),
      expense.getUpdatedAt()
    );
  }

  public ExpenseShareResponse toShareResponse(ExpenseShare share) {
    return new ExpenseShareResponse(
      share.getUser().getId(),
      share.getUser().getFullName(),
      share.getUser().getAvatarUrl(),
      share.getShareAmount()
    );
  }

  public List<ExpenseResponse> toResponseList(List<Expense> expenses) {
    return expenses.stream().map(this::toResponse).toList();
  }
}
