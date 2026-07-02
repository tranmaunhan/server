CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  google_id VARCHAR(120) NOT NULL UNIQUE,
  email VARCHAR(160) NOT NULL UNIQUE,
  full_name VARCHAR(160) NOT NULL,
  avatar_url VARCHAR(500),
  role VARCHAR(20) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE expenses (
  id BIGSERIAL PRIMARY KEY,
  payer_id BIGINT NOT NULL REFERENCES users(id),
  amount NUMERIC(18, 2) NOT NULL,
  description VARCHAR(255) NOT NULL,
  image_url VARCHAR(500),
  expense_date DATE NOT NULL,
  split_type VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL,
  created_by BIGINT NOT NULL REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE expense_shares (
  id BIGSERIAL PRIMARY KEY,
  expense_id BIGINT NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id),
  share_amount NUMERIC(18, 2) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE settlements (
  id BIGSERIAL PRIMARY KEY,
  from_user_id BIGINT NOT NULL REFERENCES users(id),
  to_user_id BIGINT NOT NULL REFERENCES users(id),
  amount NUMERIC(18, 2) NOT NULL,
  month INT NOT NULL,
  year INT NOT NULL,
  status VARCHAR(20) NOT NULL,
  paid_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_expenses_date ON expenses(expense_date);
CREATE INDEX idx_expenses_payer ON expenses(payer_id);
CREATE INDEX idx_expense_shares_expense ON expense_shares(expense_id);
CREATE INDEX idx_expense_shares_user ON expense_shares(user_id);
CREATE INDEX idx_settlements_period ON settlements(year, month);
