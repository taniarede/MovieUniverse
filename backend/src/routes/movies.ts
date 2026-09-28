import { Router } from "express";
import { pool } from "../db";
import { calculateCombinedRating } from "../services/combinedRating";

export const moviesRouter = Router();


moviesRouter.get("/search", async (req, res) => {
  const query = req.query.query;
  const page = Number(req.query.page ?? 1);

  if (typeof query !== "string" || query.trim() === "") {
    res.status(400).json({ message: "Indica o nome de um filme em ?query=" });
    return;
  }


  if (!Number.isSafeInteger(page) || page < 1 || page > 500) {
  res.status(400).json({ message: "A página deve ser um inteiro entre 1 e 500" });
  return;
  }


  const token = process.env.TMDB_READ_TOKEN;

  if (!token) {
    res.status(500).json({ message: "Token do TMDB não configurado" });
    return;
  }

  const url = new URL("https://api.themoviedb.org/3/search/movie");
  url.searchParams.set("query", query.trim());
  url.searchParams.set("language", "pt-PT");
  url.searchParams.set("page", String(page));

  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      res.status(502).json({ message: "O TMDB não respondeu com sucesso" });
      return;
    }

    const data = (await response.json()) as {
      page: number;
      total_results: number;
      total_pages: number;
      results: Array<{
        id: number;
        title: string;
        release_date?: string;
        overview: string;
        poster_path: string | null;
        vote_average: number;
        vote_count: number;
      }>;
    };

res.json({
  page: data.page,
  totalResults: data.total_results,
  totalPages: data.total_pages,
  movies: data.results.map((movie) => ({
    tmdbId: movie.id,
    title: movie.title,
    releaseDate: movie.release_date,
    overview: movie.overview,
    posterPath: movie.poster_path,
    tmdbRating: movie.vote_average,
    tmdbVotes: movie.vote_count,
  })),
});
  } catch (error) {
    console.error("Erro ao contactar o TMDB:", error);
    res.status(502).json({ message: "Não foi possível contactar o TMDB" });
  }
});

moviesRouter.get("/top", async (_req, res) => {
  const token = process.env.TMDB_READ_TOKEN;

  if (!token) {
    res.status(500).json({ message: "Token do TMDB não configurado" });
    return;
  }

  const url = new URL("https://api.themoviedb.org/3/movie/top_rated");
  url.searchParams.set("language", "pt-PT");
  url.searchParams.set("page", "1");

  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      res.status(502).json({ message: "O TMDB não respondeu com sucesso" });
      return;
    }

    const data = (await response.json()) as {
      results: Array<{
        id: number;
        title: string;
        poster_path: string | null;
        vote_average: number;
        vote_count: number;
      }>;
    };

    res.json({
      source: "TMDB",
      movies: data.results.slice(0, 10).map((movie) => ({
        tmdbId: movie.id,
        title: movie.title,
        posterPath: movie.poster_path,
        tmdbRating: movie.vote_average,
        tmdbVotes: movie.vote_count,
      })),
    });
  } catch (error) {
    console.error("Erro ao consultar o Top TMDB:", error);
    res.status(502).json({
      message: "Não foi possível consultar o Top TMDB",
    });
  }
});

moviesRouter.get("/:tmdbId", async (req, res) => {
  const tmdbId = Number(req.params.tmdbId);

  if (!Number.isSafeInteger(tmdbId) || tmdbId <= 0) {
    res.status(400).json({ message: "ID do filme inválido" });
    return;
  }

  const token = process.env.TMDB_READ_TOKEN;

  if (!token) {
    res.status(500).json({ message: "Token do TMDB não configurado" });
    return;
  }

  const url = new URL(`https://api.themoviedb.org/3/movie/${tmdbId}`);
  url.searchParams.set("language", "pt-PT");

  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.status === 404) {
      res.status(404).json({ message: "Filme não encontrado" });
      return;
    }

    if (!response.ok) {
      res.status(502).json({ message: "O TMDB não respondeu com sucesso" });
      return;
    }

    const movie = (await response.json()) as {
      id: number;
      title: string;
      release_date: string;
      overview: string;
      poster_path: string | null;
      vote_average: number;
      vote_count: number;
      runtime: number | null;
      genres: Array<{ id: number; name: string }>;
    };

    
    let appVotes: number;
    let appAverage: number | null;

    try {
      const ratings = await pool.query(
        `SELECT
           COUNT(*)::int AS app_votes,
           ROUND(AVG(score), 1)::float AS app_average
         FROM ratings
         WHERE tmdb_id = $1`,
        [tmdbId],
      );

      appVotes = ratings.rows[0].app_votes;
      appAverage = ratings.rows[0].app_average;
    } catch (error) {
      console.error("Erro ao consultar avaliações do filme:", error);
      res.status(500).json({ message: "Não foi possível consultar as avaliações" });
      return;
    }

    const combinedRating = calculateCombinedRating({
      tmdbRating: movie.vote_average,
      tmdbVotes: movie.vote_count,
      appAverage,
      appVotes,
    });



    res.json({
      tmdbId: movie.id,
      title: movie.title,
      releaseDate: movie.release_date,
      overview: movie.overview,
      posterPath: movie.poster_path,
      tmdbRating: movie.vote_average,
      tmdbVotes: movie.vote_count,
      appAverage,
      appVotes,
      combinedRating,
      runtimeMinutes: movie.runtime,
      genres: movie.genres.map((genre) => genre.name),
    });
  } catch (error) {
    console.error("Erro ao contactar o TMDB:", error);
    res.status(502).json({ message: "Não foi possível contactar o TMDB" });
  }
});