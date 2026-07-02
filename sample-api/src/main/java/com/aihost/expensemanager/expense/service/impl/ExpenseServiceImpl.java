package com.aihost.expensemanager.expense.service.impl;

import com.aihost.expensemanager.common.exception.BadRequestException;
import com.aihost.expensemanager.common.exception.ForbiddenException;
import com.aihost.expensemanager.common.exception.NotFoundException;
import com.aihost.expensemanager.common.util.MoneyUtils;
import com.aihost.expensemanager.expense.dto.CreateExpenseRequest;
import com.aihost.expensemanager.expense.dto.ExpenseResponse;
import com.aihost.expensemanager.expense.dto.ExpenseShareRequest;
import com.aihost.expensemanager.expense.dto.UpdateExpenseRequest;
import com.aihost.expensemanager.expense.entity.Expense;
import com.aihost.expensemanager.expense.entity.ExpenseShare;
import com.aihost.expensemanager.expense.enums.ExpenseSplitType;
import com.aihost.expensemanager.expense.enums.ExpenseStatus;
import com.aihost.expensemanager.expense.mapper.ExpenseMapper;
import com.aihost.expensemanager.expense.repository.ExpenseRepository;
import com.aihost.expensemanager.expense.service.ExpenseService;
import com.aihost.expensemanager.security.CurrentUser;
import com.aihost.expensemanager.user.entity.AppUser;
import com.aihost.expensemanager.user.service.UserService;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ExpenseServiceImpl implements ExpenseService {

  private static final Set<ExpenseStatus> VISIBLE_STATUSES = EnumSet.of(ExpenseStatus.ACTIVE, ExpenseStatus.SETTLED);

  private final ExpenseRepository expenseRepository;
  private final UserService userService;
  private final ExpenseMapper expenseMapper;

  public ExpenseServiceImpl(
    ExpenseRepository expenseRepository,
    UserService userService,
    ExpenseMapper expenseMapper
  ) {
    this.expenseRepository = expenseRepository;
    this.userService = userService;
    this.expenseMapper = expenseMapper;
  }

  @Override
  @Transactional
  public ExpenseResponse create(CurrentUser currentUser, CreateExpenseRequest request) {
    Expense expense = new Expense();
    fillExpense(
      expense,
      currentUser,
      request.payerId(),
      request.amount(),
      request.description(),
      request.imageUrl(),
      request.expenseDate(),
      request.splitType(),
      request.shares()
    );
    return expenseMapper.toResponse(expenseRepository.save(expense));
  }

  @Override
  @Transactional
  public ExpenseResponse update(CurrentUser currentUser, Long expenseId, UpdateExpenseRequest request) {
    Expense expense = findActiveExpense(expenseId);
    assertExpenseOwner(currentUser, expense);
    CurrentUser systemUser = new CurrentUser(
      expense.getCreatedBy().getId(),
      expense.getCreatedBy().getEmail(),
      expense.getCreatedBy().getFullName(),
      expense.getCreatedBy().getRole()
    );
    fillExpense(
      expense,
      systemUser,
      request.payerId(),
      request.amount(),
      request.description(),
      request.imageUrl(),
      request.expenseDate(),
      request.splitType(),
      request.shares()
    );
    return expenseMapper.toResponse(expenseRepository.save(expense));
  }

  @Override
  @Transactional
  public void cancel(CurrentUser currentUser, Long expenseId) {
    Expense expense = findActiveExpense(expenseId);
    assertExpenseOwner(currentUser, expense);
    expense.setStatus(ExpenseStatus.CANCELLED);
    expenseRepository.save(expense);
  }

  @Override
  @Transactional(readOnly = true)
  public ExpenseResponse getById(Long expenseId) {
    return expenseMapper.toResponse(findVisibleExpense(expenseId));
  }

  @Override
  @Transactional(readOnly = true)
  public List<ExpenseResponse> getAll() {
    return expenseMapper.toResponseList(
      expenseRepository.findAllByStatusInOrderByExpenseDateDescCreatedAtDesc(VISIBLE_STATUSES)
    );
  }

  @Override
  @Transactional(readOnly = true)
  public List<Expense> getActiveExpensesInRange(LocalDate startDate, LocalDate endDate) {
    return expenseRepository.findAllByStatusAndExpenseDateBetweenOrderByExpenseDateDescCreatedAtDesc(
      ExpenseStatus.ACTIVE,
      startDate,
      endDate
    );
  }

  @Override
  @Transactional(readOnly = true)
  public List<Expense> getTrackedExpensesInRange(LocalDate startDate, LocalDate endDate) {
    return expenseRepository.findAllByStatusInAndExpenseDateBetweenOrderByExpenseDateDescCreatedAtDesc(
      VISIBLE_STATUSES,
      startDate,
      endDate
    );
  }

  @Override
  @Transactional
  public void settleExpensesInRange(LocalDate startDate, LocalDate endDate) {
    List<Expense> expenses = expenseRepository.findAllByStatusAndExpenseDateBetweenOrderByExpenseDateDescCreatedAtDesc(
      ExpenseStatus.ACTIVE,
      startDate,
      endDate
    );

    if (expenses.isEmpty()) {
      return;
    }

    for (Expense expense : expenses) {
      expense.setStatus(ExpenseStatus.SETTLED);
    }

    expenseRepository.saveAll(expenses);
  }

  private Expense findActiveExpense(Long expenseId) {
    return expenseRepository.findByIdAndStatus(expenseId, ExpenseStatus.ACTIVE)
      .orElseThrow(() -> new NotFoundException("Không tìm thấy khoản chi."));
  }

  private Expense findVisibleExpense(Long expenseId) {
    return expenseRepository.findByIdAndStatusIn(expenseId, VISIBLE_STATUSES)
      .orElseThrow(() -> new NotFoundException("Không tìm thấy khoản chi."));
  }

  private void assertExpenseOwner(CurrentUser currentUser, Expense expense) {
    if (currentUser == null || expense.getCreatedBy() == null || !expense.getCreatedBy().getId().equals(currentUser.id())) {
      throw new ForbiddenException("Bạn chỉ có thể sửa hoặc xóa khoản chi do chính mình tạo.");
    }
  }

  private void fillExpense(
    Expense expense,
    CurrentUser currentUser,
    Long payerId,
    BigDecimal amount,
    String description,
    String imageUrl,
    LocalDate expenseDate,
    ExpenseSplitType splitType,
    List<ExpenseShareRequest> shareRequests
  ) {
    AppUser payer = userService.getActiveUserById(payerId);
    AppUser creator = userService.getActiveUserById(currentUser.id());
    BigDecimal normalizedAmount = MoneyUtils.normalize(amount);

    if (normalizedAmount.signum() <= 0) {
      throw new BadRequestException("Tổng tiền phải lớn hơn 0.");
    }

    expense.setPayer(payer);
    expense.setCreatedBy(creator);
    expense.setAmount(normalizedAmount);
    expense.setDescription(description.trim());
    expense.setImageUrl(imageUrl == null || imageUrl.isBlank() ? null : imageUrl.trim());
    expense.setExpenseDate(expenseDate);
    expense.setSplitType(splitType);
    expense.setStatus(ExpenseStatus.ACTIVE);

    List<ExpenseShare> shares = buildShares(expense, normalizedAmount, splitType, shareRequests);
    expense.getShares().clear();
    expense.getShares().addAll(shares);
  }

  private List<ExpenseShare> buildShares(
    Expense expense,
    BigDecimal amount,
    ExpenseSplitType splitType,
    List<ExpenseShareRequest> shareRequests
  ) {
    Set<Long> uniqueUserIds = new HashSet<>();
    for (ExpenseShareRequest request : shareRequests) {
      if (!uniqueUserIds.add(request.userId())) {
        throw new BadRequestException("Danh sách người chịu tiền bị trùng lặp.");
      }
    }

    List<AppUser> users = shareRequests.stream()
      .map(request -> userService.getActiveUserById(request.userId()))
      .toList();

    List<ExpenseShare> shares = new ArrayList<>();

    if (splitType == ExpenseSplitType.EQUAL) {
      List<BigDecimal> amounts = MoneyUtils.splitEqual(amount, users.size());
      for (int index = 0; index < users.size(); index++) {
        ExpenseShare share = new ExpenseShare();
        share.setExpense(expense);
        share.setUser(users.get(index));
        share.setShareAmount(amounts.get(index));
        shares.add(share);
      }
      return shares;
    }

    BigDecimal totalShared = MoneyUtils.ZERO;
    for (int index = 0; index < shareRequests.size(); index++) {
      ExpenseShareRequest request = shareRequests.get(index);
      if (request.shareAmount() == null) {
        throw new BadRequestException("Kiểu chia theo số tiền yêu cầu nhập shareAmount.");
      }

      BigDecimal normalizedShare = MoneyUtils.normalize(request.shareAmount());
      if (normalizedShare.signum() <= 0) {
        throw new BadRequestException("Số tiền chia phải lớn hơn 0.");
      }

      ExpenseShare share = new ExpenseShare();
      share.setExpense(expense);
      share.setUser(users.get(index));
      share.setShareAmount(normalizedShare);
      shares.add(share);
      totalShared = totalShared.add(normalizedShare);
    }

    if (MoneyUtils.normalize(totalShared).compareTo(amount) != 0) {
      throw new BadRequestException("Tổng số tiền chia phải bằng tổng hóa đơn.");
    }

    return shares;
  }
}
