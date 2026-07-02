package com.aihost.expensemanager.user.controller;

import com.aihost.expensemanager.auth.service.GoogleTokenVerifierService;
import com.aihost.expensemanager.user.dto.UserResponse;
import com.aihost.expensemanager.user.entity.AppUser;
import com.aihost.expensemanager.user.mapper.UserMapper;
import com.aihost.expensemanager.user.service.UserService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
public class UserController {

  private final UserService userService;
  private final GoogleTokenVerifierService googleTokenVerifierService;
  private final UserMapper userMapper;

  public UserController(
    UserService userService,
    GoogleTokenVerifierService googleTokenVerifierService,
    UserMapper userMapper
  ) {
    this.userService = userService;
    this.googleTokenVerifierService = googleTokenVerifierService;
    this.userMapper = userMapper;
  }

  @GetMapping("/me")
  public UserResponse me(@AuthenticationPrincipal Jwt jwt) {
    AppUser user = userService.syncGoogleUser(googleTokenVerifierService.fromJwt(jwt));
    return userMapper.toResponse(user);
  }
}
