package com.aihost.expensemanager.auth.model;

public record GoogleUserProfile(
  String subject,
  String email,
  boolean emailVerified,
  String fullName,
  String avatarUrl
) {
}
