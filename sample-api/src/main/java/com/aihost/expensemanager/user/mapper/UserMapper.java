package com.aihost.expensemanager.user.mapper;

import com.aihost.expensemanager.user.dto.UserOptionResponse;
import com.aihost.expensemanager.user.dto.UserResponse;
import com.aihost.expensemanager.user.entity.AppUser;
import org.springframework.stereotype.Component;

@Component
public class UserMapper {

  public UserResponse toResponse(AppUser user) {
    return new UserResponse(
      user.getId(),
      user.getEmail(),
      user.getFullName(),
      user.getAvatarUrl(),
      user.getRole(),
      user.isActive(),
      user.getCreatedAt(),
      user.getUpdatedAt()
    );
  }

  public UserOptionResponse toOption(AppUser user) {
    return new UserOptionResponse(
      user.getId(),
      user.getFullName(),
      user.getEmail(),
      user.getAvatarUrl(),
      user.getRole(),
      user.isActive()
    );
  }
}
