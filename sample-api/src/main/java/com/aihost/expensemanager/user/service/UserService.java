package com.aihost.expensemanager.user.service;

import com.aihost.expensemanager.auth.model.GoogleUserProfile;
import com.aihost.expensemanager.user.entity.AppUser;

public interface UserService {

  AppUser syncGoogleUser(GoogleUserProfile profile);
}
