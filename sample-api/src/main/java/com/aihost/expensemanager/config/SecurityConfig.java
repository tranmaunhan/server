package com.aihost.expensemanager.config;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtIssuerValidator;
import org.springframework.security.oauth2.jwt.JwtTimestampValidator;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
@EnableWebSecurity
@EnableConfigurationProperties({AppCorsProperties.class, GoogleAuthProperties.class})
public class SecurityConfig {

  @Bean
  SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
    http
      .csrf(csrf -> csrf.disable())
      .cors(Customizer.withDefaults())
      .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
      .authorizeHttpRequests(auth -> auth
        .requestMatchers("/actuator/health/**", "/api/health", "/api/auth/google").permitAll()
        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
        .anyRequest().authenticated()
      )
      .oauth2ResourceServer(oauth2 -> oauth2.jwt(Customizer.withDefaults()));

    return http.build();
  }

  @Bean
  CorsConfigurationSource corsConfigurationSource(AppCorsProperties properties) {
    CorsConfiguration configuration = new CorsConfiguration();
    configuration.setAllowedOrigins(properties.getAllowedOrigins());
    configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
    configuration.setAllowedHeaders(List.of("Authorization", "Content-Type"));
    configuration.setAllowCredentials(true);

    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", configuration);
    return source;
  }

  @Bean
  JwtDecoder jwtDecoder(GoogleAuthProperties googleAuthProperties) {
    NimbusJwtDecoder decoder = NimbusJwtDecoder.withJwkSetUri(googleAuthProperties.getJwkSetUri()).build();

    OAuth2TokenValidator<Jwt> validator = new DelegatingOAuth2TokenValidator<>(
      new JwtTimestampValidator(),
      new AllowedGoogleIssuerValidator(),
      new AllowedAudienceValidator(googleAuthProperties.getAllowedClientIds())
    );

    decoder.setJwtValidator(validator);
    return decoder;
  }

  static final class AllowedGoogleIssuerValidator implements OAuth2TokenValidator<Jwt> {

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

    private final Set<String> allowedClientIds;

    AllowedAudienceValidator(List<String> allowedClientIds) {
      this.allowedClientIds = new HashSet<>();
      for (String allowedClientId : allowedClientIds) {
        if (allowedClientId != null && !allowedClientId.isBlank()) {
          this.allowedClientIds.add(allowedClientId.trim());
        }
      }
    }

    @Override
    public OAuth2TokenValidatorResult validate(Jwt token) {
      if (allowedClientIds.isEmpty()) {
        return OAuth2TokenValidatorResult.failure(ERROR);
      }

      for (String audience : token.getAudience()) {
        if (allowedClientIds.contains(audience)) {
          return OAuth2TokenValidatorResult.success();
        }
      }

      return OAuth2TokenValidatorResult.failure(ERROR);
    }
  }
}
