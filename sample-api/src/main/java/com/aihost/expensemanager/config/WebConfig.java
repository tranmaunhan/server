package com.aihost.expensemanager.config;

import java.nio.file.Path;
import java.nio.file.Paths;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

  private final AppUploadProperties uploadProperties;

  public WebConfig(AppUploadProperties uploadProperties) {
    this.uploadProperties = uploadProperties;
  }

  @Override
  public void addResourceHandlers(ResourceHandlerRegistry registry) {
    Path uploadRoot = Paths.get(uploadProperties.getDir()).toAbsolutePath().normalize();
    Path expenseUploadRoot = uploadRoot.resolve("expenses").normalize();
    String publicBasePath = uploadProperties.getPublicBasePath().endsWith("/")
      ? uploadProperties.getPublicBasePath().substring(0, uploadProperties.getPublicBasePath().length() - 1)
      : uploadProperties.getPublicBasePath();

    registry
      .addResourceHandler(publicBasePath + "/**")
      .addResourceLocations(uploadRoot.toUri().toString());

    registry
      .addResourceHandler("/expenses/**")
      .addResourceLocations(expenseUploadRoot.toUri().toString());
  }
}
