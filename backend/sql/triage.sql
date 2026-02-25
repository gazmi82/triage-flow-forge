-- Run this inside your `triage` database.
-- Example: psql -d triage -f schema.sql

BEGIN;

CREATE EXTENSION IF NOT EXISTS citext;

-- =========================================================
-- RBAC
-- =========================================================

CREATE TABLE roles (
  role_key        TEXT PRIMARY KEY,
  label           TEXT NOT NULL,
  is_system       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (role_key IN ('admin','reception','triage_nurse','physician','lab','radiology'))
);

CREATE TABLE permissions (
  permission_key  TEXT PRIMARY KEY,
  description     TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE role_permissions (
  role_key        TEXT NOT NULL REFERENCES roles(role_key) ON DELETE CASCADE,
  permission_key  TEXT NOT NULL REFERENCES permissions(permission_key) ON DELETE CASCADE,
  granted_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (role_key, permission_key)
);

-- =========================================================
-- Users + Credentials
-- =========================================================

CREATE TABLE users (
  id                  TEXT PRIMARY KEY, -- matches current app ids like u1, u2...
  name                VARCHAR(120) NOT NULL,
  email               CITEXT NOT NULL UNIQUE,
  primary_role_key    TEXT NOT NULL REFERENCES roles(role_key) ON DELETE RESTRICT,
  department          VARCHAR(120) NOT NULL,
  active              BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (char_length(name) >= 2),
  CHECK (char_length(department) >= 2)
);

CREATE TABLE user_roles (
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_key        TEXT NOT NULL REFERENCES roles(role_key) ON DELETE CASCADE,
  is_primary      BOOLEAN NOT NULL DEFAULT FALSE,
  assigned_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, role_key)
);

-- only one primary role per user
CREATE UNIQUE INDEX uq_user_roles_primary
  ON user_roles (user_id)
  WHERE is_primary = TRUE;

CREATE TABLE credentials (
  user_id             TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  email               CITEXT NOT NULL UNIQUE,
  password_hash       TEXT NOT NULL, -- store hash, never plain password
  hash_algorithm      TEXT NOT NULL DEFAULT 'bcrypt',
  password_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================================================
-- Workflow Definitions
-- =========================================================

CREATE TABLE process_definitions (
  id                  TEXT PRIMARY KEY, -- current seed uses def1, def2...
  definition_key      TEXT NOT NULL,
  name                TEXT NOT NULL,
  version             INTEGER NOT NULL,
  status              TEXT NOT NULL,
  description         TEXT NOT NULL DEFAULT '',
  lanes               TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  created_by_user_id  TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL,
  updated_at          TIMESTAMPTZ NOT NULL,
  instance_count      INTEGER NOT NULL DEFAULT 0,
  UNIQUE (definition_key, version),
  CHECK (version > 0),
  CHECK (status IN ('draft','published','archived')),
  CHECK (instance_count >= 0),
  CHECK (lanes <@ ARRAY['reception','triage_nurse','physician','lab','radiology']::TEXT[])
);

CREATE TABLE definition_graphs (
  definition_id       TEXT PRIMARY KEY REFERENCES process_definitions(id) ON DELETE CASCADE,
  graph_payload       JSONB NOT NULL, -- Designer graph (nodes/edges)
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE drafts (
  id                  TEXT PRIMARY KEY, -- draft-...
  definition_id       TEXT REFERENCES process_definitions(id) ON DELETE SET NULL,
  name                TEXT NOT NULL,
  version             INTEGER NOT NULL,
  saved_at            TIMESTAMPTZ NOT NULL,
  graph_payload       JSONB NOT NULL,
  CHECK (version > 0)
);

-- =========================================================
-- Runtime
-- =========================================================

CREATE TABLE process_instances (
  id                  TEXT PRIMARY KEY, -- pi-...
  definition_id       TEXT NOT NULL REFERENCES process_definitions(id) ON DELETE RESTRICT,
  status              TEXT NOT NULL,
  started_at          TIMESTAMPTZ NOT NULL,
  started_by_user_id  TEXT REFERENCES users(id) ON DELETE SET NULL,
  current_node        TEXT NOT NULL,
  priority            TEXT NOT NULL,
  patient_id          TEXT,
  patient_name        TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (status IN ('active','completed','suspended','error')),
  CHECK (priority IN ('low','medium','high','critical'))
);

CREATE TABLE tasks (
  id                    TEXT PRIMARY KEY, -- t-...
  node_id               TEXT,             -- designer node id
  instance_id           TEXT NOT NULL REFERENCES process_instances(id) ON DELETE CASCADE,
  definition_id         TEXT REFERENCES process_definitions(id) ON DELETE SET NULL,
  definition_name       TEXT NOT NULL,
  name                  TEXT NOT NULL,
  assignee_user_id      TEXT REFERENCES users(id) ON DELETE SET NULL,
  assignee_name         TEXT,
  role_key              TEXT NOT NULL REFERENCES roles(role_key) ON DELETE RESTRICT,
  status                TEXT NOT NULL,
  priority              TEXT NOT NULL,
  created_at            TIMESTAMPTZ NOT NULL,
  due_at                TIMESTAMPTZ NOT NULL,
  sla_minutes           INTEGER NOT NULL,
  minutes_remaining     INTEGER NOT NULL,
  patient_name          TEXT NOT NULL,
  patient_id            TEXT NOT NULL,
  form_fields           JSONB NOT NULL DEFAULT '[]'::JSONB,
  form_values           JSONB NOT NULL DEFAULT '{}'::JSONB,
  updated_at            TIMESTAMPTZ,
  triage_category       TEXT,
  triage_color          TEXT,
  CHECK (status IN ('pending','claimed','completed','overdue')),
  CHECK (priority IN ('low','medium','high','critical')),
  CHECK (sla_minutes >= 0),
  CHECK (minutes_remaining >= -1000000),
  CHECK (triage_category IS NULL OR triage_category IN ('urgent','non_urgent')),
  CHECK (triage_color IS NULL OR triage_color IN ('red','orange','yellow','green','blue'))
);

CREATE TABLE audit_events (
  id                  TEXT PRIMARY KEY, -- ae-...
  instance_id         TEXT NOT NULL REFERENCES process_instances(id) ON DELETE CASCADE,
  task_id             TEXT REFERENCES tasks(id) ON DELETE SET NULL,
  event_time          TIMESTAMPTZ NOT NULL,
  actor               TEXT NOT NULL,
  actor_user_id       TEXT REFERENCES users(id) ON DELETE SET NULL,
  role_key            TEXT REFERENCES roles(role_key) ON DELETE SET NULL,
  event_type          TEXT NOT NULL,
  node_id             TEXT NOT NULL,
  node_name           TEXT NOT NULL,
  payload             JSONB NOT NULL DEFAULT '{}'::JSONB,
  CHECK (event_type IN (
    'instance_started',
    'task_created',
    'task_claimed',
    'task_completed',
    'timer_fired',
    'message_received',
    'signal_received',
    'gateway_passed'
  ))
);

CREATE TABLE saved_tasks (
  task_id             TEXT PRIMARY KEY REFERENCES tasks(id) ON DELETE CASCADE,
  instance_id         TEXT NOT NULL REFERENCES process_instances(id) ON DELETE CASCADE,
  process_status      TEXT NOT NULL,
  snapshot            JSONB NOT NULL, -- denormalized latest task snapshot
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (process_status IN ('open','closed'))
);

-- =========================================================
-- Indexes (query-critical)
-- =========================================================

CREATE INDEX idx_users_role_active
  ON users (primary_role_key, active);

CREATE INDEX idx_instances_definition_status
  ON process_instances (definition_id, status);

CREATE INDEX idx_instances_started_at
  ON process_instances (started_at DESC);

CREATE INDEX idx_tasks_instance_status
  ON tasks (instance_id, status);

CREATE INDEX idx_tasks_role_status_due
  ON tasks (role_key, status, due_at);

CREATE INDEX idx_tasks_assignee_status
  ON tasks (assignee_user_id, status);

CREATE INDEX idx_tasks_priority_status
  ON tasks (priority, status);

CREATE INDEX idx_tasks_form_values_gin
  ON tasks USING GIN (form_values);

CREATE INDEX idx_audit_instance_time
  ON audit_events (instance_id, event_time DESC);

CREATE INDEX idx_audit_event_type_time
  ON audit_events (event_type, event_time DESC);

CREATE INDEX idx_saved_tasks_instance_status
  ON saved_tasks (instance_id, process_status);

COMMIT;






CREATE OR REPLACE VIEW v_open_tasks AS
SELECT
  t.id,
  t.node_id,
  t.instance_id,
  t.definition_id,
  t.definition_name,
  t.name,
  t.assignee_user_id,
  t.assignee_name,
  t.role_key,
  t.status,
  t.priority,
  t.created_at,
  t.due_at,
  t.sla_minutes,
  t.minutes_remaining,
  t.patient_name,
  t.patient_id,
  t.form_fields,
  t.form_values,
  t.updated_at,
  t.triage_category,
  t.triage_color
FROM tasks t
WHERE t.status <> 'completed';


CREATE OR REPLACE VIEW v_active_instances AS
SELECT
  i.id,
  i.definition_id,
  i.status,
  i.started_at,
  i.started_by_user_id,
  i.current_node,
  i.priority,
  i.patient_id,
  i.patient_name,
  i.created_at,
  i.updated_at,
  COUNT(t.id) FILTER (WHERE t.status <> 'completed') AS open_task_count
FROM process_instances i
LEFT JOIN tasks t
  ON t.instance_id = i.id
GROUP BY
  i.id,
  i.definition_id,
  i.status,
  i.started_at,
  i.started_by_user_id,
  i.current_node,
  i.priority,
  i.patient_id,
  i.patient_name,
  i.created_at,
  i.updated_at
HAVING COUNT(t.id) FILTER (WHERE t.status <> 'completed') > 0;



