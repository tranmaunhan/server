package com.aihost.expensemanager.common.exception;

import com.aihost.expensemanager.common.dto.ErrorResponse;
import jakarta.servlet.http.HttpServletRequest;
import java.time.Instant;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

  @ExceptionHandler(MethodArgumentNotValidException.class)
  @ResponseStatus(HttpStatus.BAD_REQUEST)
  ErrorResponse handleValidation(MethodArgumentNotValidException exception, HttpServletRequest request) {
    String message = exception.getBindingResult()
      .getFieldErrors()
      .stream()
      .map(this::formatFieldError)
      .collect(Collectors.joining(", "));

    return build(HttpStatus.BAD_REQUEST, message, request);
  }

  @ExceptionHandler(BadRequestException.class)
  @ResponseStatus(HttpStatus.BAD_REQUEST)
  ErrorResponse handleBadRequest(BadRequestException exception, HttpServletRequest request) {
    return build(HttpStatus.BAD_REQUEST, exception.getMessage(), request);
  }

  @ExceptionHandler(JwtException.class)
  @ResponseStatus(HttpStatus.UNAUTHORIZED)
  ErrorResponse handleJwt(JwtException exception, HttpServletRequest request) {
    return build(HttpStatus.UNAUTHORIZED, "Google token khong hop le hoac da het han.", request);
  }

  @ExceptionHandler(Exception.class)
  @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
  ErrorResponse handleUnknown(Exception exception, HttpServletRequest request) {
    return build(HttpStatus.INTERNAL_SERVER_ERROR, "He thong gap loi khong mong muon.", request);
  }

  private String formatFieldError(FieldError error) {
    return error.getField() + " " + error.getDefaultMessage();
  }

  private ErrorResponse build(HttpStatus status, String message, HttpServletRequest request) {
    return new ErrorResponse(
      Instant.now(),
      status.value(),
      status.getReasonPhrase(),
      message,
      request.getRequestURI()
    );
  }
}
