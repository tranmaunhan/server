package com.aihost.expensemanager.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.upload")
public class AppUploadProperties {

  private String dir = "uploads";
  private String publicBasePath = "/api/uploads";

  public String getDir() {
    return dir;
  }

  public void setDir(String dir) {
    this.dir = dir;
  }

  public String getPublicBasePath() {
    return publicBasePath;
  }

  public void setPublicBasePath(String publicBasePath) {
    this.publicBasePath = publicBasePath;
  }
}
