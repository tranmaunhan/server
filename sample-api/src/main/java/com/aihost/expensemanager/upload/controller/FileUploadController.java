package com.aihost.expensemanager.upload.controller;

import com.aihost.expensemanager.security.CurrentUser;
import com.aihost.expensemanager.upload.dto.FileUploadResponse;
import com.aihost.expensemanager.upload.service.FileUploadService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/uploads")
public class FileUploadController {

  private static final Logger log = LoggerFactory.getLogger(FileUploadController.class);

  private final FileUploadService fileUploadService;

  public FileUploadController(FileUploadService fileUploadService) {
    this.fileUploadService = fileUploadService;
  }

  @PostMapping("/expenses")
  public FileUploadResponse uploadExpenseImage(
    @AuthenticationPrincipal CurrentUser currentUser,
    @RequestParam("file") MultipartFile file
  ) {
    log.info(
      "Expense image upload requested: userId={}, filename={}, contentType={}, size={}",
      currentUser == null ? null : currentUser.id(),
      file.getOriginalFilename(),
      file.getContentType(),
      file.getSize()
    );
    return fileUploadService.storeExpenseImage(file);
  }
}
