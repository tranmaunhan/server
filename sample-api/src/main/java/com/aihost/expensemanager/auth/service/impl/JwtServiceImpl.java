package com.aihost.expensemanager.auth.service.impl;

import com.aihost.expensemanager.auth.service.JwtService;
import com.aihost.expensemanager.common.exception.UnauthorizedException;
import com.aihost.expensemanager.config.JwtProperties;
import com.aihost.expensemanager.security.CurrentUser;
import com.aihost.expensemanager.user.entity.AppUser;
import com.aihost.expensemanager.user.enums.UserRole;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Date;
import org.springframework.stereotype.Service;

@Service
public class JwtServiceImpl implements JwtService {

  private final JwtProperties properties;
  private final Key signingKey;

  public JwtServiceImpl(JwtProperties properties) {
    this.properties = properties;
    this.signingKey = Keys.hmacShaKeyFor(properties.getSecret().getBytes(StandardCharsets.UTF_8));
  }

  @Override
  public String generateToken(AppUser user) {
    Date issuedAt = new Date();
    Date expiration = new Date(issuedAt.getTime() + properties.getExpirationMinutes() * 60_000);

    return Jwts.builder()
      .subject(String.valueOf(user.getId()))
      .issuer(properties.getIssuer())
      .issuedAt(issuedAt)
      .expiration(expiration)
      .claim("email", user.getEmail())
      .claim("fullName", user.getFullName())
      .claim("role", user.getRole().name())
      .signWith(signingKey)
      .compact();
  }

  @Override
  public CurrentUser parseToken(String token) {
    Claims claims = parseClaims(token);
    return new CurrentUser(
      Long.valueOf(claims.getSubject()),
      claims.get("email", String.class),
      claims.get("fullName", String.class),
      UserRole.valueOf(claims.get("role", String.class))
    );
  }

  @Override
  public LocalDateTime getExpiration(String token) {
    return toLocalDateTime(parseClaims(token).getExpiration());
  }

  private Claims parseClaims(String token) {
    try {
      return Jwts.parser().verifyWith((javax.crypto.SecretKey) signingKey).build()
        .parseSignedClaims(token)
        .getPayload();
    } catch (Exception exception) {
      throw new UnauthorizedException("Token khong hop le hoac da het han.");
    }
  }

  private LocalDateTime toLocalDateTime(Date date) {
    return LocalDateTime.ofInstant(date.toInstant(), ZoneId.systemDefault());
  }
}
