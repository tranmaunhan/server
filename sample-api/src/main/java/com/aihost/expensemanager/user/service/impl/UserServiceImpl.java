package com.aihost.expensemanager.user.service.impl;

import com.aihost.expensemanager.auth.model.GoogleUserProfile;
import com.aihost.expensemanager.common.exception.BadRequestException;
import com.aihost.expensemanager.user.entity.AppUser;
import com.aihost.expensemanager.user.repository.AppUserRepository;
import com.aihost.expensemanager.user.service.UserService;
import java.time.Instant;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserServiceImpl implements UserService {

  private final AppUserRepository appUserRepository;

  public UserServiceImpl(AppUserRepository appUserRepository) {
    this.appUserRepository = appUserRepository;
  }

  @Override
  @Transactional
  public AppUser syncGoogleUser(GoogleUserProfile profile) {
    if (profile.email() == null || profile.email().isBlank()) {
      throw new BadRequestException("Tai khoan Google khong tra ve email hop le.");
    }

    String normalizedEmail = profile.email().trim().toLowerCase();

    AppUser user = appUserRepository.findByGoogleSubject(profile.subject())
      .or(() -> appUserRepository.findByEmailIgnoreCase(normalizedEmail))
      .orElseGet(AppUser::new);

    user.setGoogleSubject(profile.subject());
    user.setEmail(normalizedEmail);
    user.setFullName(defaultText(profile.fullName(), profile.email()));
    user.setAvatarUrl(profile.avatarUrl());
    user.setLocale(defaultText(profile.locale(), "vi"));
    user.setEmailVerified(profile.emailVerified());
    user.setLastLoginAt(Instant.now());

    return appUserRepository.save(user);
  }

  private String defaultText(String value, String fallback) {
    if (value == null || value.isBlank()) {
      return fallback;
    }
    return value.trim();
  }
}
