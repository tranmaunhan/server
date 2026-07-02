package com.aihost.expensemanager.report.service;

import com.aihost.expensemanager.report.dto.MonthlyReportResponse;

public interface ReportService {

  MonthlyReportResponse getMonthlyReport(int year, int month);
}
