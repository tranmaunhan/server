package com.aihost.expensemanager.expense.entity;

import com.aihost.expensemanager.expense.enums.ExpenseSplitType;
import com.aihost.expensemanager.expense.enums.ExpenseStatus;
import com.aihost.expensemanager.user.entity.AppUser;
import jakarta.persistence.CascadeType;
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
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

@Entity
@Table(name = "expenses")
public class Expense {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "payer_id", nullable = false)
  private AppUser payer;

  @Column(nullable = false, precision = 18, scale = 2)
  private BigDecimal amount;

  @Column(nullable = false, length = 255)
  private String description;

  @Column(name = "image_url", length = 500)
  private String imageUrl;

  @Column(name = "expense_date", nullable = false)
  private LocalDate expenseDate;

  @Enumerated(EnumType.STRING)
  @Column(name = "split_type", nullable = false, length = 20)
  private ExpenseSplitType splitType;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  private ExpenseStatus status = ExpenseStatus.ACTIVE;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "created_by", nullable = false)
  private AppUser createdBy;

  @OneToMany(mappedBy = "expense", cascade = CascadeType.ALL, orphanRemoval = true)
  private List<ExpenseShare> shares = new ArrayList<>();

  @CreationTimestamp
  @Column(name = "created_at", nullable = false, updatable = false)
  private LocalDateTime createdAt;

  @UpdateTimestamp
  @Column(name = "updated_at", nullable = false)
  private LocalDateTime updatedAt;

  public Long getId() {
    return id;
  }

  public AppUser getPayer() {
    return payer;
  }

  public void setPayer(AppUser payer) {
    this.payer = payer;
  }

  public BigDecimal getAmount() {
    return amount;
  }

  public void setAmount(BigDecimal amount) {
    this.amount = amount;
  }

  public String getDescription() {
    return description;
  }

  public void setDescription(String description) {
    this.description = description;
  }

  public String getImageUrl() {
    return imageUrl;
  }

  public void setImageUrl(String imageUrl) {
    this.imageUrl = imageUrl;
  }

  public LocalDate getExpenseDate() {
    return expenseDate;
  }

  public void setExpenseDate(LocalDate expenseDate) {
    this.expenseDate = expenseDate;
  }

  public ExpenseSplitType getSplitType() {
    return splitType;
  }

  public void setSplitType(ExpenseSplitType splitType) {
    this.splitType = splitType;
  }

  public ExpenseStatus getStatus() {
    return status;
  }

  public void setStatus(ExpenseStatus status) {
    this.status = status;
  }

  public AppUser getCreatedBy() {
    return createdBy;
  }

  public void setCreatedBy(AppUser createdBy) {
    this.createdBy = createdBy;
  }

  public List<ExpenseShare> getShares() {
    return shares;
  }

  public void setShares(List<ExpenseShare> shares) {
    this.shares = shares;
  }

  public LocalDateTime getCreatedAt() {
    return createdAt;
  }

  public LocalDateTime getUpdatedAt() {
    return updatedAt;
  }
}
