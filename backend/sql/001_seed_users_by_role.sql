BEGIN;

-- Canonical role keys used by this project.
INSERT INTO roles (role_key, label, is_system)
VALUES
  ('admin', 'Admin', true),
  ('reception', 'Reception', true),
  ('triage_nurse', 'Triage Nurse', true),
  ('physician', 'Physician', true),
  ('lab', 'Laboratory', true),
  ('radiology', 'Radiology', true)
ON CONFLICT (role_key) DO UPDATE
SET
  label = EXCLUDED.label,
  is_system = EXCLUDED.is_system;

-- One active seed user per role.
INSERT INTO users (id, name, email, primary_role_key, department, active)
VALUES
  ('u1', 'Maria Santos', 'm.santos@hospital.org', 'reception', 'Emergency', true),
  ('u2', 'James Okafor', 'j.okafor@hospital.org', 'triage_nurse', 'Emergency', true),
  ('u3', 'Dr. Emily Chen', 'e.chen@hospital.org', 'physician', 'Emergency', true),
  ('u4', 'Carlos Rivera', 'c.rivera@hospital.org', 'lab', 'Laboratory', true),
  ('u5', 'Priya Nair', 'p.nair@hospital.org', 'radiology', 'Radiology', true),
  ('u6', 'Admin User', 'admin@hospital.org', 'admin', 'IT', true)
ON CONFLICT (email) DO UPDATE
SET
  name = EXCLUDED.name,
  primary_role_key = EXCLUDED.primary_role_key,
  department = EXCLUDED.department,
  active = EXCLUDED.active,
  updated_at = NOW();

-- Keep user_roles in sync with each user's primary role.
INSERT INTO user_roles (user_id, role_key, is_primary)
VALUES
  ('u1', 'reception', true),
  ('u2', 'triage_nurse', true),
  ('u3', 'physician', true),
  ('u4', 'lab', true),
  ('u5', 'radiology', true),
  ('u6', 'admin', true)
ON CONFLICT (user_id, role_key) DO UPDATE
SET
  is_primary = EXCLUDED.is_primary;

COMMIT;
