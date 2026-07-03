package com.aihost.expensemanager.expense.repository;

import com.aihost.expensemanager.expense.entity.Expense;
import com.aihost.expensemanager.expense.enums.ExpenseStatus;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ExpenseRepository extends JpaRepository<Expense, Long> {

  @EntityGraph(attributePaths = {"payer", "createdBy", "shares", "shares.user"})
  List<Expense> findAllByStatusOrderByExpenseDateDescCreatedAtDesc(ExpenseStatus status);

  @EntityGraph(attributePaths = {"payer", "createdBy", "shares", "shares.user"})
  List<Expense> findAllByStatusInOrderByExpenseDateDescCreatedAtDesc(Collection<ExpenseStatus> statuses);

  @EntityGraph(attributePaths = {"payer", "createdBy", "shares", "shares.user"})
  Page<Expense> findAllByStatusIn(Collection<ExpenseStatus> statuses, Pageable pageable);

  @EntityGraph(attributePaths = {"payer", "createdBy", "shares", "shares.user"})
  List<Expense> findAllByStatusAndExpenseDateBetweenOrderByExpenseDateDescCreatedAtDesc(
    ExpenseStatus status,
    LocalDate startDate,
    LocalDate endDate
  );

  @EntityGraph(attributePaths = {"payer", "createdBy", "shares", "shares.user"})
  List<Expense> findAllByStatusInAndExpenseDateBetweenOrderByExpenseDateDescCreatedAtDesc(
    Collection<ExpenseStatus> statuses,
    LocalDate startDate,
    LocalDate endDate
  );

  @EntityGraph(attributePaths = {"payer", "createdBy", "shares", "shares.user"})
  Optional<Expense> findByIdAndStatus(Long id, ExpenseStatus status);

  @EntityGraph(attributePaths = {"payer", "createdBy", "shares", "shares.user"})
  Optional<Expense> findByIdAndStatusIn(Long id, Collection<ExpenseStatus> statuses);
}
