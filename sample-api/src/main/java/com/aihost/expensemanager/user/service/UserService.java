package com.aihost.expensemanager.user.service;

import com.aihost.expensemanager.auth.model.GoogleUserProfile;
import com.aihost.expensemanager.security.CurrentUser;
import com.aihost.expensemanager.user.entity.AppUser;
import com.aihost.expensemanager.user.enums.UserRole;
import java.util.List;

public interface UserService {

  AppUser syncGoogleUser(GoogleUserProfile profile);

  AppUser getCurrentUser(CurrentUser currentUser);

  AppUser getActiveUserById(Long id);

  List<AppUser> getActiveUsers();

  List<AppUser> getAllUsers();

  AppUser updateRole(Long userId, UserRole role);

  AppUser updateActiveStatus(Long userId, boolean active);
}
