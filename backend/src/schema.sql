-- Minimal schema for devices and events

CREATE TABLE devices (
  id TEXT PRIMARY KEY,
  name TEXT,
  owner_user_id TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE events (
  id SERIAL PRIMARY KEY,
  device_id TEXT REFERENCES devices(id),
  ts TIMESTAMP,
  event_type TEXT,
  payload JSONB
);
