package com.aihost.expensemanager.common.exception;

import com.aihost.expensemanager.common.dto.ErrorResponse;
import jakarta.servlet.http.HttpServletRequest;
import java.time.LocalDateTime;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
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

  @ExceptionHandler(NotFoundException.class)
  @ResponseStatus(HttpStatus.NOT_FOUND)
  ErrorResponse handleNotFound(NotFoundException exception, HttpServletRequest request) {
    return build(HttpStatus.NOT_FOUND, exception.getMessage(), request);
  }

  @ExceptionHandler(ForbiddenException.class)
  @ResponseStatus(HttpStatus.FORBIDDEN)
  ErrorResponse handleForbidden(ForbiddenException exception, HttpServletRequest request) {
    return build(HttpStatus.FORBIDDEN, exception.getMessage(), request);
  }

  @ExceptionHandler({UnauthorizedException.class, AuthenticationException.class})
  @ResponseStatus(HttpStatus.UNAUTHORIZED)
  ErrorResponse handleUnauthorized(Exception exception, HttpServletRequest request) {
    return build(HttpStatus.UNAUTHORIZED, exception.getMessage(), request);
  }

  @ExceptionHandler(AccessDeniedException.class)
  @ResponseStatus(HttpStatus.FORBIDDEN)
  ErrorResponse handleAccessDenied(AccessDeniedException exception, HttpServletRequest request) {
    return build(HttpStatus.FORBIDDEN, "Ban khong du quyen thuc hien thao tac nay.", request);
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
      LocalDateTime.now(),
      status.value(),
      status.getReasonPhrase(),
      message,
      request.getRequestURI()
    );
  }
}
