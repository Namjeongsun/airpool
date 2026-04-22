'use strict';

const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, 'data.db');
const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Schema creation. Runs on every boot; CREATE IF NOT EXISTS keeps it idempotent.
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            TEXT PRIMARY KEY,
    name          TEXT NOT NULL,
    company       TEXT NOT NULL,
    role          TEXT NOT NULL,
    employee_id   TEXT NOT NULL UNIQUE,
    phone         TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    verified      INTEGER NOT NULL DEFAULT 0,
    rating        REAL    NOT NULL DEFAULT 5.0,
    created_at    INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS rides (
    id               TEXT PRIMARY KEY,
    creator_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    airport          TEXT NOT NULL CHECK(airport IN ('인천','김포')),
    terminal         TEXT,
    departure_area   TEXT NOT NULL,
    departure_detail TEXT NOT NULL,
    date             TEXT NOT NULL,
    time             TEXT NOT NULL,
    max_passengers   INTEGER NOT NULL CHECK(max_passengers BETWEEN 2 AND 4),
    estimated_fare   INTEGER NOT NULL,
    note             TEXT NOT NULL DEFAULT '',
    status           TEXT NOT NULL DEFAULT 'recruiting'
                        CHECK(status IN ('recruiting','full','cancelled','completed')),
    created_at       INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_rides_airport  ON rides(airport);
  CREATE INDEX IF NOT EXISTS idx_rides_date     ON rides(date);
  CREATE INDEX IF NOT EXISTS idx_rides_status   ON rides(status);

  CREATE TABLE IF NOT EXISTS ride_participants (
    ride_id   TEXT NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
    user_id   TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at INTEGER NOT NULL,
    PRIMARY KEY (ride_id, user_id)
  );

  CREATE INDEX IF NOT EXISTS idx_participants_user ON ride_participants(user_id);

  CREATE TABLE IF NOT EXISTS messages (
    id         TEXT PRIMARY KEY,
    ride_id    TEXT NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body       TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_messages_ride ON messages(ride_id, created_at);
`);

module.exports = db;
