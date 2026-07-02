package com.aihost.expensemanager.user.repository;

import com.aihost.expensemanager.user.entity.AppUser;
import com.aihost.expensemanager.user.enums.UserRole;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AppUserRepository extends JpaRepository<AppUser, Long> {

  Optional<AppUser> findByGoogleId(String googleId);

  Optional<AppUser> findByEmailIgnoreCase(String email);

  long countByRole(UserRole role);

  List<AppUser> findAllByOrderByFullNameAsc();
}
