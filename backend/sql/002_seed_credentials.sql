BEGIN;

-- Temporary seed credentials aligned with mockData.json.
-- NOTE: replace plain values with bcrypt hashes before production use.
INSERT INTO credentials (user_id, email, password_hash, hash_algorithm)
VALUES
  ('u1', 'm.santos@hospital.org', 'demo123', 'plain_seed'),
  ('u2', 'j.okafor@hospital.org', 'demo123', 'plain_seed'),
  ('u3', 'e.chen@hospital.org', 'demo123', 'plain_seed'),
  ('u4', 'c.rivera@hospital.org', 'demo123', 'plain_seed'),
  ('u5', 'p.nair@hospital.org', 'demo123', 'plain_seed'),
  ('u6', 'admin@hospital.org', 'admin123', 'plain_seed')
ON CONFLICT (email) DO UPDATE
SET
  user_id = EXCLUDED.user_id,
  password_hash = EXCLUDED.password_hash,
  hash_algorithm = EXCLUDED.hash_algorithm,
  password_updated_at = NOW();

COMMIT;
