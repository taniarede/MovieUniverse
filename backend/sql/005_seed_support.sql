BEGIN;

ALTER TABLE users
  ALTER COLUMN email DROP NOT NULL,
  ALTER COLUMN password_hash DROP NOT NULL,
  ADD COLUMN seed_name VARCHAR(50),
  ADD CONSTRAINT users_seed_name_key UNIQUE (seed_name),
  ADD CONSTRAINT users_account_kind_check CHECK (
    (seed_name IS NULL AND email IS NOT NULL AND password_hash IS NOT NULL)
    OR
    (seed_name IS NOT NULL AND email IS NULL AND password_hash IS NULL)
  );

ALTER TABLE playlists
  ADD COLUMN seed_id VARCHAR(20),
  ADD CONSTRAINT playlists_seed_id_key UNIQUE (seed_id);

ALTER TABLE playlist_movies
  ADD COLUMN position INTEGER,
  ADD CONSTRAINT playlist_movies_position_check CHECK (position > 0),
  ADD CONSTRAINT playlist_movies_position_key UNIQUE (playlist_id, position);

COMMIT;