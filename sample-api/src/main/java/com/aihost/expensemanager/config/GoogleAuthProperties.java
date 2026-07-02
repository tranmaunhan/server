package com.aihost.expensemanager.config;

import java.util.ArrayList;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.google")
public class GoogleAuthProperties {

  private List<String> allowedClientIds = new ArrayList<>();
  private String jwkSetUri = "https://www.googleapis.com/oauth2/v3/certs";

  public List<String> getAllowedClientIds() {
    return allowedClientIds;
  }

  public void setAllowedClientIds(List<String> allowedClientIds) {
    this.allowedClientIds = allowedClientIds;
  }

  public String getJwkSetUri() {
    return jwkSetUri;
  }

  public void setJwkSetUri(String jwkSetUri) {
    this.jwkSetUri = jwkSetUri;
  }
}
