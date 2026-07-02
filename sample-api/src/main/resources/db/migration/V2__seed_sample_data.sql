INSERT INTO users (id, google_id, email, full_name, avatar_url, role, is_active, created_at, updated_at)
VALUES
  (1, 'seed-admin', 'admin@family.local', 'Anh Quan', 'https://i.pravatar.cc/150?img=12', 'ADMIN', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (2, 'seed-member-1', 'me@family.local', 'Chi Mai', 'https://i.pravatar.cc/150?img=32', 'MEMBER', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (3, 'seed-member-2', 'em@family.local', 'Be Tom', 'https://i.pravatar.cc/150?img=7', 'MEMBER', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

INSERT INTO expenses (id, payer_id, amount, description, image_url, expense_date, split_type, status, created_by, created_at, updated_at)
VALUES
  (1, 1, 1200000.00, 'Sieu thi cuoi tuan', NULL, CURRENT_DATE - INTERVAL '2 day', 'AMOUNT', 'ACTIVE', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (2, 2, 180000.00, 'An sang ca nha', NULL, CURRENT_DATE, 'EQUAL', 'ACTIVE', 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

INSERT INTO expense_shares (id, expense_id, user_id, share_amount, created_at)
VALUES
  (1, 1, 1, 300000.00, CURRENT_TIMESTAMP),
  (2, 1, 2, 500000.00, CURRENT_TIMESTAMP),
  (3, 1, 3, 400000.00, CURRENT_TIMESTAMP),
  (4, 2, 1, 60.00, CURRENT_TIMESTAMP),
  (5, 2, 2, 60.00, CURRENT_TIMESTAMP),
  (6, 2, 3, 60.00, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

INSERT INTO settlements (id, from_user_id, to_user_id, amount, month, year, status, paid_at, created_at)
VALUES
  (1, 3, 1, 120000.00, EXTRACT(MONTH FROM CURRENT_DATE), EXTRACT(YEAR FROM CURRENT_DATE), 'PENDING', NULL, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

SELECT setval('users_id_seq', COALESCE((SELECT MAX(id) FROM users), 1), true);
SELECT setval('expenses_id_seq', COALESCE((SELECT MAX(id) FROM expenses), 1), true);
SELECT setval('expense_shares_id_seq', COALESCE((SELECT MAX(id) FROM expense_shares), 1), true);
SELECT setval('settlements_id_seq', COALESCE((SELECT MAX(id) FROM settlements), 1), true);
