package com.aihost.expensemanager.dashboard.service;

import com.aihost.expensemanager.dashboard.dto.DashboardResponse;
import com.aihost.expensemanager.security.CurrentUser;

public interface DashboardService {

  DashboardResponse getDashboard(CurrentUser currentUser);
}
