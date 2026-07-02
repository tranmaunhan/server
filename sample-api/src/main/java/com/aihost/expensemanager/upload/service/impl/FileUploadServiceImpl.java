package com.aihost.expensemanager.upload.service.impl;

import com.aihost.expensemanager.common.exception.BadRequestException;
import com.aihost.expensemanager.config.AppUploadProperties;
import com.aihost.expensemanager.upload.dto.FileUploadResponse;
import com.aihost.expensemanager.upload.service.FileUploadService;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class FileUploadServiceImpl implements FileUploadService {

  private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/heic",
    "image/heif"
  );

  private final AppUploadProperties uploadProperties;

  public FileUploadServiceImpl(AppUploadProperties uploadProperties) {
    this.uploadProperties = uploadProperties;
  }

  @Override
  public FileUploadResponse storeExpenseImage(MultipartFile file) {
    validateFile(file);

    try {
      Path expenseImageDir = Paths.get(uploadProperties.getDir()).resolve("expenses").toAbsolutePath().normalize();
      Files.createDirectories(expenseImageDir);

      String extension = resolveExtension(file.getOriginalFilename(), file.getContentType());
      String storedFilename = UUID.randomUUID() + extension;
      Path targetPath = expenseImageDir.resolve(storedFilename).normalize();

      if (!targetPath.startsWith(expenseImageDir)) {
        throw new BadRequestException("Ten tep khong hop le.");
      }

      Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);

      return new FileUploadResponse(
        normalizePublicBasePath(uploadProperties.getPublicBasePath()) + "/expenses/" + storedFilename,
        file.getOriginalFilename(),
        file.getContentType(),
        file.getSize()
      );
    } catch (IOException exception) {
      throw new BadRequestException("Khong the luu anh hoa don len server.");
    }
  }

  private void validateFile(MultipartFile file) {
    if (file == null || file.isEmpty()) {
      throw new BadRequestException("Vui long chon mot anh hoa don.");
    }

    String contentType = file.getContentType();
    if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType.toLowerCase(Locale.ROOT))) {
      throw new BadRequestException("Chi ho tro anh JPG, PNG, WEBP hoac HEIC.");
    }
  }

  private String resolveExtension(String originalFilename, String contentType) {
    if (originalFilename != null) {
      int dotIndex = originalFilename.lastIndexOf('.');
      if (dotIndex >= 0 && dotIndex < originalFilename.length() - 1) {
        String extension = originalFilename.substring(dotIndex).toLowerCase(Locale.ROOT);
        if (extension.matches("\\.[a-z0-9]{1,8}")) {
          return extension;
        }
      }
    }

    return switch (contentType == null ? "" : contentType.toLowerCase(Locale.ROOT)) {
      case "image/jpeg" -> ".jpg";
      case "image/png" -> ".png";
      case "image/webp" -> ".webp";
      case "image/heic" -> ".heic";
      case "image/heif" -> ".heif";
      default -> ".bin";
    };
  }

  private String normalizePublicBasePath(String publicBasePath) {
    if (publicBasePath == null || publicBasePath.isBlank()) {
      return "/api/uploads";
    }
    return publicBasePath.endsWith("/")
      ? publicBasePath.substring(0, publicBasePath.length() - 1)
      : publicBasePath;
  }
}
