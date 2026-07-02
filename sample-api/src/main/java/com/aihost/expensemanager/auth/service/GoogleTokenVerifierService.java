package com.aihost.expensemanager.auth.service;

import com.aihost.expensemanager.auth.model.GoogleUserProfile;

public interface GoogleTokenVerifierService {

  GoogleUserProfile verify(String credential);
}
