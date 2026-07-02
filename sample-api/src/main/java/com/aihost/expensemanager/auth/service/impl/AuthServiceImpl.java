package com.aihost.expensemanager.auth.service.impl;

import com.aihost.expensemanager.auth.dto.AuthResponse;
import com.aihost.expensemanager.auth.dto.GoogleLoginRequest;
import com.aihost.expensemanager.auth.model.GoogleUserProfile;
import com.aihost.expensemanager.auth.service.AuthService;
import com.aihost.expensemanager.auth.service.GoogleTokenVerifierService;
import com.aihost.expensemanager.auth.service.JwtService;
import com.aihost.expensemanager.user.entity.AppUser;
import com.aihost.expensemanager.user.mapper.UserMapper;
import com.aihost.expensemanager.user.service.UserService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class AuthServiceImpl implements AuthService {

  private static final Logger log = LoggerFactory.getLogger(AuthServiceImpl.class);

  private final GoogleTokenVerifierService googleTokenVerifierService;
  private final UserService userService;
  private final JwtService jwtService;
  private final UserMapper userMapper;

  public AuthServiceImpl(
    GoogleTokenVerifierService googleTokenVerifierService,
    UserService userService,
    JwtService jwtService,
    UserMapper userMapper
  ) {
    this.googleTokenVerifierService = googleTokenVerifierService;
    this.userService = userService;
    this.jwtService = jwtService;
    this.userMapper = userMapper;
  }

  @Override
  public AuthResponse loginWithGoogle(GoogleLoginRequest request) {
    GoogleUserProfile profile = googleTokenVerifierService.verify(request.credential());
    log.info(
      "Google token verified successfully: email={}, emailVerified={}, subject={}",
      profile.email(),
      profile.emailVerified(),
      profile.subject()
    );
    AppUser user = userService.syncGoogleUser(profile);
    log.info(
      "User synced after Google login: userId={}, email={}, role={}, active={}",
      user.getId(),
      user.getEmail(),
      user.getRole(),
      user.isActive()
    );
    String accessToken = jwtService.generateToken(user);

    return new AuthResponse(
      accessToken,
      "Bearer",
      jwtService.getExpiration(accessToken),
      userMapper.toResponse(user)
    );
  }
}
