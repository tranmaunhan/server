package com.aihost.expensemanager.health.service.impl;

import com.aihost.expensemanager.expense.repository.ExpenseRepository;
import com.aihost.expensemanager.health.dto.HealthResponse;
import com.aihost.expensemanager.health.service.HealthService;
import com.aihost.expensemanager.user.repository.AppUserRepository;
import java.time.LocalDateTime;
import org.springframework.stereotype.Service;

@Service
public class HealthServiceImpl implements HealthService {

  private final AppUserRepository appUserRepository;
  private final ExpenseRepository expenseRepository;

  public HealthServiceImpl(AppUserRepository appUserRepository, ExpenseRepository expenseRepository) {
    this.appUserRepository = appUserRepository;
    this.expenseRepository = expenseRepository;
  }

  @Override
  public HealthResponse getHealth() {
    return new HealthResponse(
      true,
      "family-expense-api",
      "postgres",
      appUserRepository.count(),
      expenseRepository.count(),
      LocalDateTime.now()
    );
  }
}
