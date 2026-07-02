package com.aihost.expensemanager.user.repository;

import com.aihost.expensemanager.user.entity.AppUser;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AppUserRepository extends JpaRepository<AppUser, Long> {

  Optional<AppUser> findByGoogleSubject(String googleSubject);

  Optional<AppUser> findByEmailIgnoreCase(String email);
}
