package com.aihost.expensemanager.auth.service.impl;

import com.aihost.expensemanager.auth.model.GoogleUserProfile;
import com.aihost.expensemanager.auth.service.GoogleTokenVerifierService;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.stereotype.Service;

@Service
public class GoogleTokenVerifierServiceImpl implements GoogleTokenVerifierService {

  private final JwtDecoder jwtDecoder;

  public GoogleTokenVerifierServiceImpl(JwtDecoder jwtDecoder) {
    this.jwtDecoder = jwtDecoder;
  }

  @Override
  public GoogleUserProfile verify(String credential) {
    Jwt jwt = jwtDecoder.decode(credential);
    return fromJwt(jwt);
  }

  @Override
  public GoogleUserProfile fromJwt(Jwt jwt) {
    return new GoogleUserProfile(
      jwt.getSubject(),
      jwt.getClaimAsString("email"),
      parseBoolean(jwt.getClaim("email_verified")),
      jwt.getClaimAsString("name"),
      jwt.getClaimAsString("picture"),
      jwt.getClaimAsString("locale")
    );
  }

  private boolean parseBoolean(Object value) {
    if (value instanceof Boolean booleanValue) {
      return booleanValue;
    }
    return Boolean.parseBoolean(String.valueOf(value));
  }
}
