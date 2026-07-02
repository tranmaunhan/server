package com.aihost.expensemanager.auth.service;

import com.aihost.expensemanager.auth.dto.AuthResponse;
import com.aihost.expensemanager.auth.dto.GoogleLoginRequest;

public interface AuthService {

  AuthResponse loginWithGoogle(GoogleLoginRequest request);
}
