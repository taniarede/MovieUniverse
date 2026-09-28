import { Router } from "express";
import { pool } from "../db";
import { requireAuth } from "../middleware/auth";
import {
  compareSeedPlaylists,
  TmdbComparisonError,
} from "../services/compareSeedPlaylists";

export const playlistsRouter = Router();

playlistsRouter.get("/examples", async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         p.seed_id AS "seedId",
         p.name,
         u.seed_name AS "owner",
         COUNT(pm.tmdb_id)::int AS "movieCount"
       FROM playlists AS p
       JOIN users AS u ON u.id = p.user_id
       LEFT JOIN playlist_movies AS pm ON pm.playlist_id = p.id
       WHERE p.seed_id IS NOT NULL
         AND p.is_deleted = FALSE
       GROUP BY p.id, p.seed_id, p.name, u.seed_name
       ORDER BY p.seed_id`,
    );

    res.json({ playlists: result.rows });
  } catch (error) {
    console.error("Erro ao listar playlists de exemplo:", error);
    res.status(500).json({
      message: "Não foi possível listar as playlists de exemplo",
    });
  }
});


playlistsRouter.get("/examples/compare", async (req, res) => {
  const first = req.query.first;
  const second = req.query.second;

  if (
    typeof first !== "string" ||
    typeof second !== "string" ||
    !/^pl-\d{2}$/.test(first) ||
    !/^pl-\d{2}$/.test(second) ||
    first === second
  ) {
    res.status(400).json({
      message: "Indica duas playlists de exemplo diferentes",
    });
    return;
  }

  const token = process.env.TMDB_READ_TOKEN;

  if (!token) {
    res.status(500).json({ message: "Token do TMDB não configurado" });
    return;
  }

  try {
    const comparison = await compareSeedPlaylists(first, second, token);

    if (!comparison) {
      res.status(404).json({ message: "Playlist não encontrada" });
      return;
    }

    res.json(comparison);
  } catch (error) {
    console.error("Erro ao comparar playlists:", error);

    if (error instanceof TmdbComparisonError) {
      res.status(502).json({ message: "Falha ao consultar o TMDB" });
      return;
    }

    res.status(500).json({ message: "Não foi possível comparar as playlists" });
  }
});


playlistsRouter.get("/examples/:seedId", async (req, res) => {
  const seedId = req.params.seedId;

  if (!/^pl-\d{2}$/.test(seedId)) {
    res.status(400).json({ message: "ID da playlist de exemplo inválido" });
    return;
  }

  try {
    const playlistResult = await pool.query(
      `SELECT
         p.id,
         p.seed_id AS "seedId",
         p.name,
         u.seed_name AS "owner"
       FROM playlists AS p
       JOIN users AS u ON u.id = p.user_id
       WHERE p.seed_id = $1
         AND p.is_deleted = FALSE`,
      [seedId],
    );

    if (playlistResult.rowCount === 0) {
      res.status(404).json({ message: "Playlist não encontrada" });
      return;
    }

    const playlist = playlistResult.rows[0];

    const moviesResult = await pool.query(
      `SELECT
         tmdb_id AS "tmdbId",
         position
       FROM playlist_movies
       WHERE playlist_id = $1
       ORDER BY position ASC, tmdb_id ASC`,
      [playlist.id],
    );

    res.json({
      playlist: {
        seedId: playlist.seedId,
        name: playlist.name,
        owner: playlist.owner,
      },
      movies: moviesResult.rows,
    });
  } catch (error) {
    console.error("Erro ao consultar playlist de exemplo:", error);
    res.status(500).json({
      message: "Não foi possível consultar a playlist de exemplo",
    });
  }
});



playlistsRouter.get("/", requireAuth, async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, description, created_at
       FROM playlists
       WHERE user_id = $1 AND is_deleted = FALSE
       ORDER BY created_at DESC, id DESC`,
      [res.locals.userId],
    );

    res.json({ playlists: result.rows });
  } catch (error) {
    console.error("Erro ao listar playlists:", error);
    res.status(500).json({ message: "Não foi possível listar as playlists" });
  }
});


playlistsRouter.post("/", requireAuth, async (req, res) => {
  const { name, description } = req.body ?? {};

  if (
    typeof name !== "string" ||
    name.trim().length < 1 ||
    name.trim().length > 100 ||
    (description !== undefined &&
      description !== null &&
      (typeof description !== "string" || description.length > 1000))
  ) {
    res.status(400).json({
      message: "Indica um nome de 1 a 100 caracteres e uma descrição até 1000 caracteres",
    });
    return;
  }

  try {
    const result = await pool.query(
      `INSERT INTO playlists (user_id, name, description)
       VALUES ($1, $2, $3)
       RETURNING id, name, description, created_at`,
      [
        res.locals.userId,
        name.trim(),
        typeof description === "string" ? description.trim() : null,
      ],
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Erro ao criar playlist:", error);
    res.status(500).json({ message: "Não foi possível criar a playlist" });
  }
});



playlistsRouter.post("/:playlistId/movies", requireAuth, async (req, res) => {
  const playlistId = Number(req.params.playlistId);
  const tmdbId = req.body?.tmdbId;

  if (
    !Number.isSafeInteger(playlistId) ||
    playlistId <= 0 ||
    !Number.isSafeInteger(tmdbId) ||
    tmdbId <= 0
  ) {
    res.status(400).json({ message: "IDs da playlist e do filme inválidos" });
    return;
  }

  try {
    const playlist = await pool.query(
      `SELECT id FROM playlists
       WHERE id = $1 AND user_id = $2 AND is_deleted = FALSE`,
      [playlistId, res.locals.userId],
    );

        if (playlist.rowCount === 0) {
      res.status(404).json({ message: "Playlist não encontrada" });
      return;
    }

    const token = process.env.TMDB_READ_TOKEN;

    if (!token) {
      res.status(500).json({ message: "Token do TMDB não configurado" });
      return;
    }

    const movieResponse = await fetch(
      `https://api.themoviedb.org/3/movie/${tmdbId}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );

    if (movieResponse.status === 404) {
      res.status(404).json({ message: "Filme não encontrado no TMDB" });
      return;
    }

    if (!movieResponse.ok) {
      res.status(502).json({ message: "Não foi possível verificar o filme no TMDB" });
      return;
    }

    const result = await pool.query(
      `INSERT INTO playlist_movies (playlist_id, tmdb_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING
       RETURNING playlist_id, tmdb_id, added_at`,
      [playlistId, tmdbId],
    );


    if (result.rowCount === 0) {
      res.status(409).json({ message: "Este filme já está na playlist" });
      return;
    }

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Erro ao adicionar filme à playlist:", error);
    res.status(500).json({ message: "Não foi possível adicionar o filme" });
  }
});


playlistsRouter.get("/:playlistId/movies", requireAuth, async (req, res) => {
  const playlistId = Number(req.params.playlistId);

  if (!Number.isSafeInteger(playlistId) || playlistId <= 0) {
    res.status(400).json({ message: "ID da playlist inválido" });
    return;
  }

  try {
    const playlist = await pool.query(
      `SELECT id, name FROM playlists
       WHERE id = $1 AND user_id = $2 AND is_deleted = FALSE`,
      [playlistId, res.locals.userId],
    );

    if (playlist.rowCount === 0) {
      res.status(404).json({ message: "Playlist não encontrada" });
      return;
    }

    const result = await pool.query(
      `SELECT tmdb_id, added_at FROM playlist_movies
       WHERE playlist_id = $1
       ORDER BY added_at DESC, tmdb_id DESC`,
      [playlistId],
    );

    res.json({
      playlist: playlist.rows[0],
      movies: result.rows.map((row) => ({
        tmdbId: row.tmdb_id,
        addedAt: row.added_at,
      })),
    });
  } catch (error) {
    console.error("Erro ao listar filmes da playlist:", error);
    res.status(500).json({ message: "Não foi possível listar os filmes" });
  }
});

playlistsRouter.delete(
  "/:playlistId/movies/:tmdbId",
  requireAuth,
  async (req, res) => {
    const playlistId = Number(req.params.playlistId);
    const tmdbId = Number(req.params.tmdbId);

    if (
      !Number.isSafeInteger(playlistId) ||
      playlistId <= 0 ||
      !Number.isSafeInteger(tmdbId) ||
      tmdbId <= 0
    ) {
      res.status(400).json({ message: "IDs da playlist e do filme inválidos" });
      return;
    }

    try {
      const result = await pool.query(
        `DELETE FROM playlist_movies AS pm
         USING playlists AS p
         WHERE pm.playlist_id = p.id
           AND p.id = $1
           AND p.user_id = $2
           AND p.is_deleted = FALSE
           AND pm.tmdb_id = $3
         RETURNING pm.tmdb_id`,
        [playlistId, res.locals.userId, tmdbId],
      );

      if (result.rowCount === 0) {
        res.status(404).json({ message: "Filme não encontrado nesta playlist" });
        return;
      }

      res.status(204).send();
    } catch (error) {
      console.error("Erro ao remover filme da playlist:", error);
      res.status(500).json({ message: "Não foi possível remover o filme" });
    }
  },
);

playlistsRouter.delete("/:playlistId", requireAuth, async (req, res) => {
  const playlistId = Number(req.params.playlistId);

  if (!Number.isSafeInteger(playlistId) || playlistId <= 0) {
    res.status(400).json({ message: "ID da playlist inválido" });
    return;
  }

  try {
    const result = await pool.query(
      `UPDATE playlists
       SET is_deleted = TRUE
       WHERE id = $1 AND user_id = $2 AND is_deleted = FALSE
       RETURNING id`,
      [playlistId, res.locals.userId],
    );

    if (result.rowCount === 0) {
      res.status(404).json({ message: "Playlist não encontrada" });
      return;
    }

    res.status(204).send();
  } catch (error) {
    console.error("Erro ao apagar playlist:", error);
    res.status(500).json({ message: "Não foi possível apagar a playlist" });
  }
});