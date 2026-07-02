package com.aihost.expensemanager.user.controller;

import com.aihost.expensemanager.security.CurrentUser;
import com.aihost.expensemanager.user.dto.UpdateUserRoleRequest;
import com.aihost.expensemanager.user.dto.UpdateUserStatusRequest;
import com.aihost.expensemanager.user.dto.UserOptionResponse;
import com.aihost.expensemanager.user.dto.UserResponse;
import com.aihost.expensemanager.user.mapper.UserMapper;
import com.aihost.expensemanager.user.service.UserService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
public class UserController {

  private final UserService userService;
  private final UserMapper userMapper;

  public UserController(UserService userService, UserMapper userMapper) {
    this.userService = userService;
    this.userMapper = userMapper;
  }

  @GetMapping("/me")
  public UserResponse me(@AuthenticationPrincipal CurrentUser currentUser) {
    return userMapper.toResponse(userService.getCurrentUser(currentUser));
  }

  @GetMapping
  public List<UserOptionResponse> list() {
    return userService.getActiveUsers().stream().map(userMapper::toOption).toList();
  }

  @GetMapping("/admin")
  public List<UserOptionResponse> adminList() {
    return userService.getAllUsers().stream().map(userMapper::toOption).toList();
  }

  @PatchMapping("/admin/{userId}/role")
  public UserResponse updateRole(@PathVariable Long userId, @Valid @RequestBody UpdateUserRoleRequest request) {
    return userMapper.toResponse(userService.updateRole(userId, request.role()));
  }

  @PatchMapping("/admin/{userId}/status")
  public UserResponse updateStatus(@PathVariable Long userId, @Valid @RequestBody UpdateUserStatusRequest request) {
    return userMapper.toResponse(userService.updateActiveStatus(userId, request.active()));
  }
}
