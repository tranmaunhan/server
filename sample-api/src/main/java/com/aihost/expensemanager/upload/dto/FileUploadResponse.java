package com.aihost.expensemanager.upload.dto;

public record FileUploadResponse(
  String url,
  String originalFilename,
  String contentType,
  long size
) {
}
