package com.aihost.expensemanager.user.service.impl;

import com.aihost.expensemanager.auth.model.GoogleUserProfile;
import com.aihost.expensemanager.common.exception.ForbiddenException;
import com.aihost.expensemanager.common.exception.NotFoundException;
import com.aihost.expensemanager.security.CurrentUser;
import com.aihost.expensemanager.user.entity.AppUser;
import com.aihost.expensemanager.user.enums.UserRole;
import com.aihost.expensemanager.user.repository.AppUserRepository;
import com.aihost.expensemanager.user.service.UserService;
import java.util.List;
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
    AppUser user = appUserRepository.findByGoogleId(profile.subject())
      .or(() -> appUserRepository.findByEmailIgnoreCase(profile.email()))
      .orElseGet(AppUser::new);

    if (user.getId() != null && !user.isActive()) {
      throw new ForbiddenException("Tai khoan cua ban dang bi khoa.");
    }

    if (user.getId() == null) {
      user.setRole(appUserRepository.count() == 0 ? UserRole.ADMIN : UserRole.MEMBER);
      user.setActive(true);
    }

    user.setGoogleId(profile.subject());
    user.setEmail(profile.email().trim().toLowerCase());
    user.setFullName(profile.fullName() == null || profile.fullName().isBlank() ? profile.email() : profile.fullName().trim());
    user.setAvatarUrl(profile.avatarUrl());

    return appUserRepository.save(user);
  }

  @Override
  @Transactional(readOnly = true)
  public AppUser getCurrentUser(CurrentUser currentUser) {
    return appUserRepository.findById(currentUser.id())
      .orElseThrow(() -> new NotFoundException("Khong tim thay nguoi dung hien tai."));
  }

  @Override
  @Transactional(readOnly = true)
  public AppUser getActiveUserById(Long id) {
    AppUser user = appUserRepository.findById(id)
      .orElseThrow(() -> new NotFoundException("Khong tim thay thanh vien."));

    if (!user.isActive()) {
      throw new ForbiddenException("Thanh vien da bi khoa.");
    }
    return user;
  }

  @Override
  @Transactional(readOnly = true)
  public List<AppUser> getActiveUsers() {
    return appUserRepository.findAllByActiveTrueOrderByFullNameAsc();
  }

  @Override
  @Transactional(readOnly = true)
  public List<AppUser> getAllUsers() {
    return appUserRepository.findAllByOrderByFullNameAsc();
  }

  @Override
  @Transactional
  public AppUser updateRole(Long userId, UserRole role) {
    AppUser user = appUserRepository.findById(userId)
      .orElseThrow(() -> new NotFoundException("Khong tim thay thanh vien."));
    user.setRole(role);
    return appUserRepository.save(user);
  }

  @Override
  @Transactional
  public AppUser updateActiveStatus(Long userId, boolean active) {
    AppUser user = appUserRepository.findById(userId)
      .orElseThrow(() -> new NotFoundException("Khong tim thay thanh vien."));
    user.setActive(active);
    return appUserRepository.save(user);
  }
}
