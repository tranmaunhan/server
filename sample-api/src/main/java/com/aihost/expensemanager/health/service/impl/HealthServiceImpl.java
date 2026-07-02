package com.aihost.expensemanager.health.service.impl;

import com.aihost.expensemanager.health.dto.HealthResponse;
import com.aihost.expensemanager.health.service.HealthService;
import com.aihost.expensemanager.user.repository.AppUserRepository;
import java.time.Instant;
import org.springframework.stereotype.Service;

@Service
public class HealthServiceImpl implements HealthService {

  private final AppUserRepository appUserRepository;

  public HealthServiceImpl(AppUserRepository appUserRepository) {
    this.appUserRepository = appUserRepository;
  }

  @Override
  public HealthResponse getHealth() {
    return new HealthResponse(
      true,
      "expense-api",
      "postgres",
      appUserRepository.count(),
      Instant.now()
    );
  }
}
