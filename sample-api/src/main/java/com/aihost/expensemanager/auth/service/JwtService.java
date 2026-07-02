package com.aihost.expensemanager.auth.service;

import com.aihost.expensemanager.security.CurrentUser;
import com.aihost.expensemanager.user.entity.AppUser;
import java.time.LocalDateTime;

public interface JwtService {

  String generateToken(AppUser user);

  CurrentUser parseToken(String token);

  LocalDateTime getExpiration(String token);
}
