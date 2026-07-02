package com.aihost.expensemanager.auth.controller;

import com.aihost.expensemanager.auth.dto.AuthResponse;
import com.aihost.expensemanager.auth.dto.GoogleLoginRequest;
import com.aihost.expensemanager.auth.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

  private final AuthService authService;

  public AuthController(AuthService authService) {
    this.authService = authService;
  }

  @PostMapping("/google")
  public AuthResponse loginWithGoogle(@Valid @RequestBody GoogleLoginRequest request) {
    return authService.loginWithGoogle(request);
  }
}
