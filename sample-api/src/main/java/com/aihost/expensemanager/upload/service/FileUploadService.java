package com.aihost.expensemanager.upload.service;

import com.aihost.expensemanager.upload.dto.FileUploadResponse;
import org.springframework.web.multipart.MultipartFile;

public interface FileUploadService {

  FileUploadResponse storeExpenseImage(MultipartFile file);
}
