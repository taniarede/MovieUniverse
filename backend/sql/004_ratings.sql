CREATE TABLE ratings (
  user_id BIGINT NOT NULL REFERENCES users(id),
  tmdb_id INTEGER NOT NULL CHECK (tmdb_id > 0),
  score NUMERIC(3, 1) NOT NULL CHECK (score >= 0 AND score <= 10),
  review TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, tmdb_id)
);