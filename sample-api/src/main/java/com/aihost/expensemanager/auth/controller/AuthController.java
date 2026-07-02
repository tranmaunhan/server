package com.aihost.expensemanager.auth.controller;

import com.aihost.expensemanager.auth.dto.AuthResponse;
import com.aihost.expensemanager.auth.dto.GoogleLoginRequest;
import com.aihost.expensemanager.auth.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

  private static final Logger log = LoggerFactory.getLogger(AuthController.class);

  private final AuthService authService;

  public AuthController(AuthService authService) {
    this.authService = authService;
  }

  @PostMapping("/google")
  public AuthResponse loginWithGoogle(@Valid @RequestBody GoogleLoginRequest request, HttpServletRequest httpRequest) {
    log.info(
      "Google login request received: origin={}, host={}, scheme={}, forwardedProto={}, forwardedHost={}, userAgent={}",
      httpRequest.getHeader("Origin"),
      httpRequest.getHeader("Host"),
      httpRequest.getScheme(),
      httpRequest.getHeader("X-Forwarded-Proto"),
      httpRequest.getHeader("X-Forwarded-Host"),
      httpRequest.getHeader("User-Agent")
    );
    return authService.loginWithGoogle(request);
  }
}
