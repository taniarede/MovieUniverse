import { pool } from "../db";
import { calculateCombinedRating } from "./combinedRating";

type PlaylistRow = {
  id: string;
  ref: string;
  name: string;
  owner: string;
};

type MovieRow = {
  playlistId: string;
  tmdbId: number;
};

type RatingRow = {
  tmdbId: number;
  appVotes: number;
  appAverage: number | null;
};

export class TmdbComparisonError extends Error {}

export async function comparePlaylists(
  firstRef: string,
  secondRef: string,
  token: string,
  userId: string | null = null,
) {
  const playlistsResult = await pool.query<PlaylistRow>(
    `SELECT
       p.id::text AS id,
       CASE WHEN p.seed_id IS NOT NULL THEN p.seed_id ELSE 'mine:' || p.id::text END AS ref,
       p.name,
       COALESCE(u.seed_name, u.username) AS "owner"
     FROM playlists AS p
     JOIN users AS u ON u.id = p.user_id
     WHERE p.is_deleted = FALSE
       AND ((p.seed_id = ANY($1::text[])) OR (p.user_id = $2 AND ('mine:' || p.id::text) = ANY($1::text[])))`,
    [[firstRef, secondRef], userId],
  );

  const byRef = new Map(
    playlistsResult.rows.map((playlist) => [playlist.ref, playlist]),
  );

  const first = byRef.get(firstRef);
  const second = byRef.get(secondRef);

  if (!first || !second) {
    return null;
  }

  const moviesResult = await pool.query<MovieRow>(
    `SELECT
       playlist_id::text AS "playlistId",
       tmdb_id AS "tmdbId"
     FROM playlist_movies
     WHERE playlist_id = ANY($1::bigint[])`,
    [[first.id, second.id]],
  );

  const firstMovieIds = moviesResult.rows
    .filter((movie) => movie.playlistId === first.id)
    .map((movie) => movie.tmdbId);

  const secondMovieIds = moviesResult.rows
    .filter((movie) => movie.playlistId === second.id)
    .map((movie) => movie.tmdbId);

  const uniqueMovieIds = [
    ...new Set([...firstMovieIds, ...secondMovieIds]),
  ];

  const ratingsResult = await pool.query<RatingRow>(
    `SELECT
       tmdb_id AS "tmdbId",
       COUNT(*)::int AS "appVotes",
       ROUND(AVG(score), 1)::float AS "appAverage"
     FROM ratings
     WHERE tmdb_id = ANY($1::int[])
     GROUP BY tmdb_id`,
    [uniqueMovieIds],
  );

  const ratingsByMovie = new Map(
    ratingsResult.rows.map((rating) => [rating.tmdbId, rating]),
  );

  const scoreByMovie = new Map<number, number | null>();

  
  for (const tmdbId of uniqueMovieIds) {
    const response = await fetch(
      `https://api.themoviedb.org/3/movie/${tmdbId}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );

    if (response.status === 404) {
      scoreByMovie.set(tmdbId, null);
      continue;
    }

    if (!response.ok) {
      throw new TmdbComparisonError(
        `O TMDB respondeu com o estado ${response.status}`,
      );
    }

    const movie = (await response.json()) as {
      vote_average: number;
      vote_count: number;
    };

    const local = ratingsByMovie.get(tmdbId);

    scoreByMovie.set(
      tmdbId,
      calculateCombinedRating({
        tmdbRating: movie.vote_average,
        tmdbVotes: movie.vote_count,
        appAverage: local?.appAverage ?? null,
        appVotes: local?.appVotes ?? 0,
      }),
    );
  }

  function summarize(playlist: PlaylistRow, movieIds: number[]) {
    const validScores = movieIds
      .map((tmdbId) => scoreByMovie.get(tmdbId))
      .filter((score): score is number => score !== null && score !== undefined);

    const excludedTmdbIds = movieIds.filter(
      (tmdbId) => scoreByMovie.get(tmdbId) == null,
    );

    const averageRating =
      validScores.length === 0
        ? null
        : Math.round(
            (validScores.reduce((sum, score) => sum + score, 0) /
              validScores.length) *
              100,
          ) / 100;

    return {
      ref: playlist.ref,
      name: playlist.name,
      owner: playlist.owner,
      totalMovies: movieIds.length,
      ratedMovies: validScores.length,
      excludedTmdbIds,
      averageRating,
    };
  }

  const firstSummary = summarize(first, firstMovieIds);
  const secondSummary = summarize(second, secondMovieIds);

  let winnerRef: string | null = null;

  if (
    firstSummary.averageRating !== null &&
    secondSummary.averageRating !== null
  ) {
    if (firstSummary.averageRating > secondSummary.averageRating) {
      winnerRef = first.ref;
    } else if (secondSummary.averageRating > firstSummary.averageRating) {
      winnerRef = second.ref;
    }
  }

  const secondMovieSet = new Set(secondMovieIds);
  const commonTmdbIds = firstMovieIds.filter((tmdbId) =>
    secondMovieSet.has(tmdbId),
  );

  return {
    first: firstSummary,
    second: secondSummary,
    winnerRef,
    commonTmdbIds,
  };
}