package com.aihost.expensemanager.auth.service.impl;

import com.aihost.expensemanager.auth.dto.AuthResponse;
import com.aihost.expensemanager.auth.dto.GoogleLoginRequest;
import com.aihost.expensemanager.auth.model.GoogleUserProfile;
import com.aihost.expensemanager.auth.service.AuthService;
import com.aihost.expensemanager.auth.service.GoogleTokenVerifierService;
import com.aihost.expensemanager.user.entity.AppUser;
import com.aihost.expensemanager.user.mapper.UserMapper;
import com.aihost.expensemanager.user.service.UserService;
import java.time.Instant;
import org.springframework.stereotype.Service;

@Service
public class AuthServiceImpl implements AuthService {

  private final GoogleTokenVerifierService googleTokenVerifierService;
  private final UserService userService;
  private final UserMapper userMapper;

  public AuthServiceImpl(
    GoogleTokenVerifierService googleTokenVerifierService,
    UserService userService,
    UserMapper userMapper
  ) {
    this.googleTokenVerifierService = googleTokenVerifierService;
    this.userService = userService;
    this.userMapper = userMapper;
  }

  @Override
  public AuthResponse loginWithGoogle(GoogleLoginRequest request) {
    GoogleUserProfile profile = googleTokenVerifierService.verify(request.credential());
    AppUser user = userService.syncGoogleUser(profile);

    return new AuthResponse(
      "google",
      "Dang nhap Google thanh cong.",
      Instant.now(),
      userMapper.toResponse(user)
    );
  }
}
