-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  tg_id BIGINT NOT NULL UNIQUE,
  username TEXT,
  lang VARCHAR(2) NOT NULL DEFAULT 'en',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Wallets table
CREATE TABLE IF NOT EXISTS wallets (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ton_address TEXT NOT NULL,
  is_connected BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Rooms table
CREATE TABLE IF NOT EXISTS rooms (
  id SERIAL PRIMARY KEY,
  game TEXT NOT NULL,
  rules_json JSONB,
  stake_ton NUMERIC NOT NULL,
  preset NUMERIC,
  privacy TEXT NOT NULL,
  pin_hash TEXT,
  status TEXT NOT NULL,
  owner_id INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Room members table
CREATE TABLE IF NOT EXISTS room_members (
  id SERIAL PRIMARY KEY,
  room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (room_id, user_id)
);

-- Matches table
CREATE TABLE IF NOT EXISTS matches (
  id SERIAL PRIMARY KEY,
  room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  game_state_json JSONB,
  status TEXT NOT NULL DEFAULT 'active',
  winner_user_id INTEGER REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMP
);

-- Moves table
CREATE TABLE IF NOT EXISTS moves (
  id SERIAL PRIMARY KEY,
  match_id INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  move_json JSONB NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- RPS commit table
CREATE TABLE IF NOT EXISTS rps_commits (
  id SERIAL PRIMARY KEY,
  match_id INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  commit_hash TEXT NOT NULL,
  revealed_move TEXT,
  revealed_salt TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (match_id, user_id)
);

-- Escrow table
CREATE TABLE IF NOT EXISTS escrow (
  id SERIAL PRIMARY KEY,
  match_id INTEGER NOT NULL UNIQUE REFERENCES matches(id) ON DELETE CASCADE,
  admin_fee_bps INTEGER NOT NULL,
  pot_ton NUMERIC NOT NULL,
  state TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  tx_hash_deposit TEXT,
  tx_hash_payout TEXT,
  tx_hash_refund TEXT
);

-- Disputes table
CREATE TABLE IF NOT EXISTS disputes (
  id SERIAL PRIMARY KEY,
  match_id INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  details_json JSONB,
  state TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);