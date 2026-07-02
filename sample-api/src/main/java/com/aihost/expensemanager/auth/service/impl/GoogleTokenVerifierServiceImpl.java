package com.aihost.expensemanager.auth.service.impl;

import com.aihost.expensemanager.auth.model.GoogleUserProfile;
import com.aihost.expensemanager.auth.service.GoogleTokenVerifierService;
import com.aihost.expensemanager.common.exception.BadRequestException;
import com.aihost.expensemanager.config.GoogleAuthProperties;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtIssuerValidator;
import org.springframework.security.oauth2.jwt.JwtTimestampValidator;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.stereotype.Service;

@Service
public class GoogleTokenVerifierServiceImpl implements GoogleTokenVerifierService {

  private final JwtDecoder jwtDecoder;

  public GoogleTokenVerifierServiceImpl(GoogleAuthProperties properties) {
    NimbusJwtDecoder decoder = NimbusJwtDecoder.withJwkSetUri(properties.getJwkSetUri()).build();
    decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(
      new JwtTimestampValidator(),
      new AllowedIssuerValidator(),
      new AllowedAudienceValidator(properties.getAllowedClientIds())
    ));
    this.jwtDecoder = decoder;
  }

  @Override
  public GoogleUserProfile verify(String credential) {
    try {
      Jwt jwt = jwtDecoder.decode(credential);
      return new GoogleUserProfile(
        jwt.getSubject(),
        jwt.getClaimAsString("email"),
        Boolean.parseBoolean(String.valueOf(jwt.getClaim("email_verified"))),
        jwt.getClaimAsString("name"),
        jwt.getClaimAsString("picture")
      );
    } catch (Exception exception) {
      throw new BadRequestException("Google token khong hop le hoac da het han.");
    }
  }

  static final class AllowedIssuerValidator implements OAuth2TokenValidator<Jwt> {

    private static final JwtIssuerValidator HTTPS_ISSUER = new JwtIssuerValidator("https://accounts.google.com");
    private static final OAuth2Error ERROR = new OAuth2Error("invalid_token", "Google issuer is invalid", null);

    @Override
    public OAuth2TokenValidatorResult validate(Jwt token) {
      if (HTTPS_ISSUER.validate(token).hasErrors()) {
        String issuer = token.getIssuer() == null ? null : token.getIssuer().toString();
        if (!"accounts.google.com".equals(issuer)) {
          return OAuth2TokenValidatorResult.failure(ERROR);
        }
      }
      return OAuth2TokenValidatorResult.success();
    }
  }

  static final class AllowedAudienceValidator implements OAuth2TokenValidator<Jwt> {

    private static final OAuth2Error ERROR = new OAuth2Error(
      "invalid_token",
      "Google client id is not allowed",
      null
    );

    private final Set<String> allowedClientIds = new HashSet<>();

    AllowedAudienceValidator(List<String> allowedClientIds) {
      for (String clientId : allowedClientIds) {
        if (clientId != null && !clientId.isBlank()) {
          this.allowedClientIds.add(clientId.trim());
        }
      }
    }

    @Override
    public OAuth2TokenValidatorResult validate(Jwt token) {
      for (String audience : token.getAudience()) {
        if (allowedClientIds.contains(audience)) {
          return OAuth2TokenValidatorResult.success();
        }
      }
      return OAuth2TokenValidatorResult.failure(ERROR);
    }
  }
}
