package com.aihost.expensemanager.dashboard.controller;

import com.aihost.expensemanager.dashboard.dto.DashboardResponse;
import com.aihost.expensemanager.dashboard.service.DashboardService;
import com.aihost.expensemanager.security.CurrentUser;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

  private final DashboardService dashboardService;

  public DashboardController(DashboardService dashboardService) {
    this.dashboardService = dashboardService;
  }

  @GetMapping
  public DashboardResponse getDashboard(@AuthenticationPrincipal CurrentUser currentUser) {
    return dashboardService.getDashboard(currentUser);
  }
}
