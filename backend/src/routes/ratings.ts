import { Router } from "express";
import { pool } from "../db";
import { requireAuth } from "../middleware/auth";

export const ratingsRouter = Router();

ratingsRouter.put("/:tmdbId", requireAuth, async (req, res) => {
  const tmdbId = Number(req.params.tmdbId);
  const { score, review } = req.body ?? {};

  if (
    !Number.isSafeInteger(tmdbId) ||
    tmdbId <= 0 ||
    typeof score !== "number" ||
    score < 0 ||
    score > 10 ||
    !Number.isInteger(score * 10) ||
    (review !== undefined &&
      review !== null &&
      (typeof review !== "string" || review.length > 2000))
  ) {
    res.status(400).json({
      message: "Indica um ID válido, uma nota de 0 a 10 com uma casa decimal e um comentário até 2000 caracteres",
    });
    return;
  }

  try {
    const result = await pool.query(
      `INSERT INTO ratings (user_id, tmdb_id, score, review)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, tmdb_id)
       DO UPDATE SET score = EXCLUDED.score, review = EXCLUDED.review
       RETURNING user_id, tmdb_id, score, review, created_at`,
      [
        res.locals.userId,
        tmdbId,
        score,
        typeof review === "string" ? review.trim() : null,
      ],
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Erro ao guardar avaliação:", error);
    res.status(500).json({ message: "Não foi possível guardar a avaliação" });
  }
});


ratingsRouter.get("/:tmdbId", requireAuth, async (req, res) => {
  const tmdbId = Number(req.params.tmdbId);

  if (!Number.isSafeInteger(tmdbId) || tmdbId <= 0) {
    res.status(400).json({ message: "ID do filme inválido" });
    return;
  }

  try {
    const summary = await pool.query(
      `SELECT
         COUNT(*)::int AS vote_count,
         ROUND(AVG(score), 1)::float AS average
       FROM ratings
       WHERE tmdb_id = $1`,
      [tmdbId],
    );

    const mine = await pool.query(
      `SELECT score, review, created_at
       FROM ratings
       WHERE tmdb_id = $1 AND user_id = $2`,
      [tmdbId, res.locals.userId],
    );

    res.json({
      tmdbId,
      appVotes: summary.rows[0].vote_count,
      appAverage: summary.rows[0].average,
      myRating: mine.rows[0] ?? null,
    });
  } catch (error) {
    console.error("Erro ao consultar avaliações:", error);
    res.status(500).json({ message: "Não foi possível consultar as avaliações" });
  }
});