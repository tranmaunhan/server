package com.aihost.expensemanager.settlement.entity;

import com.aihost.expensemanager.settlement.enums.SettlementStatus;
import com.aihost.expensemanager.user.entity.AppUser;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(name = "settlements")
public class Settlement {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "from_user_id", nullable = false)
  private AppUser fromUser;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "to_user_id", nullable = false)
  private AppUser toUser;

  @Column(nullable = false, precision = 18, scale = 2)
  private BigDecimal amount;

  @Column(nullable = false)
  private int month;

  @Column(nullable = false)
  private int year;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  private SettlementStatus status = SettlementStatus.PENDING;

  @Column(name = "paid_at")
  private LocalDateTime paidAt;

  @CreationTimestamp
  @Column(name = "created_at", nullable = false, updatable = false)
  private LocalDateTime createdAt;

  public Long getId() {
    return id;
  }

  public AppUser getFromUser() {
    return fromUser;
  }

  public void setFromUser(AppUser fromUser) {
    this.fromUser = fromUser;
  }

  public AppUser getToUser() {
    return toUser;
  }

  public void setToUser(AppUser toUser) {
    this.toUser = toUser;
  }

  public BigDecimal getAmount() {
    return amount;
  }

  public void setAmount(BigDecimal amount) {
    this.amount = amount;
  }

  public int getMonth() {
    return month;
  }

  public void setMonth(int month) {
    this.month = month;
  }

  public int getYear() {
    return year;
  }

  public void setYear(int year) {
    this.year = year;
  }

  public SettlementStatus getStatus() {
    return status;
  }

  public void setStatus(SettlementStatus status) {
    this.status = status;
  }

  public LocalDateTime getPaidAt() {
    return paidAt;
  }

  public void setPaidAt(LocalDateTime paidAt) {
    this.paidAt = paidAt;
  }

  public LocalDateTime getCreatedAt() {
    return createdAt;
  }
}
