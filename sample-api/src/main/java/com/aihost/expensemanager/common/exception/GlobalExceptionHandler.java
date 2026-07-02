package com.aihost.expensemanager.common.exception;

import com.aihost.expensemanager.common.dto.ErrorResponse;
import jakarta.servlet.http.HttpServletRequest;
import java.time.LocalDateTime;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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

  private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

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
    log.warn("Request failed with 400: method={}, uri={}, message={}", request.getMethod(), request.getRequestURI(), exception.getMessage());
    return build(HttpStatus.BAD_REQUEST, exception.getMessage(), request);
  }

  @ExceptionHandler(NotFoundException.class)
  @ResponseStatus(HttpStatus.NOT_FOUND)
  ErrorResponse handleNotFound(NotFoundException exception, HttpServletRequest request) {
    log.warn("Request failed with 404: method={}, uri={}, message={}", request.getMethod(), request.getRequestURI(), exception.getMessage());
    return build(HttpStatus.NOT_FOUND, exception.getMessage(), request);
  }

  @ExceptionHandler(ForbiddenException.class)
  @ResponseStatus(HttpStatus.FORBIDDEN)
  ErrorResponse handleForbidden(ForbiddenException exception, HttpServletRequest request) {
    log.warn(
      "Request failed with 403: method={}, uri={}, origin={}, forwardedProto={}, message={}",
      request.getMethod(),
      request.getRequestURI(),
      request.getHeader("Origin"),
      request.getHeader("X-Forwarded-Proto"),
      exception.getMessage()
    );
    return build(HttpStatus.FORBIDDEN, exception.getMessage(), request);
  }

  @ExceptionHandler({UnauthorizedException.class, AuthenticationException.class})
  @ResponseStatus(HttpStatus.UNAUTHORIZED)
  ErrorResponse handleUnauthorized(Exception exception, HttpServletRequest request) {
    log.warn("Request failed with 401: method={}, uri={}, message={}", request.getMethod(), request.getRequestURI(), exception.getMessage());
    return build(HttpStatus.UNAUTHORIZED, exception.getMessage(), request);
  }

  @ExceptionHandler(AccessDeniedException.class)
  @ResponseStatus(HttpStatus.FORBIDDEN)
  ErrorResponse handleAccessDenied(AccessDeniedException exception, HttpServletRequest request) {
    log.warn(
      "Request denied by Spring Security: method={}, uri={}, origin={}, forwardedProto={}",
      request.getMethod(),
      request.getRequestURI(),
      request.getHeader("Origin"),
      request.getHeader("X-Forwarded-Proto")
    );
    return build(HttpStatus.FORBIDDEN, "Ban khong du quyen thuc hien thao tac nay.", request);
  }

  @ExceptionHandler(Exception.class)
  @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
  ErrorResponse handleUnknown(Exception exception, HttpServletRequest request) {
    log.error("Unhandled exception: method={}, uri={}", request.getMethod(), request.getRequestURI(), exception);
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
