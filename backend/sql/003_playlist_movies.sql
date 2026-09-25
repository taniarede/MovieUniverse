CREATE TABLE playlist_movies (
  playlist_id BIGINT NOT NULL REFERENCES playlists(id),
  tmdb_id INTEGER NOT NULL CHECK (tmdb_id > 0),
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (playlist_id, tmdb_id)
);