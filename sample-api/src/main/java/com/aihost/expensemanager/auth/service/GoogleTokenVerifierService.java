package com.aihost.expensemanager.auth.service;

import com.aihost.expensemanager.auth.model.GoogleUserProfile;
import org.springframework.security.oauth2.jwt.Jwt;

public interface GoogleTokenVerifierService {

  GoogleUserProfile verify(String credential);

  GoogleUserProfile fromJwt(Jwt jwt);
}
