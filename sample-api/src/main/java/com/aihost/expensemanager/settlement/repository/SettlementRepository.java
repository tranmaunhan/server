package com.aihost.expensemanager.settlement.repository;

import com.aihost.expensemanager.settlement.entity.Settlement;
import com.aihost.expensemanager.settlement.enums.SettlementStatus;
import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SettlementRepository extends JpaRepository<Settlement, Long> {

  @EntityGraph(attributePaths = {"fromUser", "toUser"})
  List<Settlement> findAllByYearAndMonthOrderByStatusAscCreatedAtDesc(int year, int month);

  void deleteByYearAndMonthAndStatus(int year, int month, SettlementStatus status);
}
