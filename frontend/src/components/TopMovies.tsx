import { useEffect, useState } from "react";
import "./TopMovies.css";
import { RatingStars } from "./RatingStars";

type TopMovie = {
  tmdbId: number;
  title: string;
  posterPath: string | null;
  tmdbRating: number;
  tmdbVotes: number;
};

type TopMoviesProps = Readonly<{
  onSelectMovie: (tmdbId: number) => void;
}>;

export function TopMovies({ onSelectMovie }: TopMoviesProps) {
  const [movies, setMovies] = useState<TopMovie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadTop() {
      try {
        const response = await fetch("/api/movies/top");

        if (!response.ok) {
          throw new Error("Falha ao consultar o Top TMDB");
        }

        const data = (await response.json()) as {
          movies: TopMovie[];
        };

        if (active) setMovies(data.movies);
      } catch {
        if (active) setError("Não foi possível carregar o Top TMDB.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadTop();

    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="top-movies" aria-labelledby="top-movies-title">
      <h2 id="top-movies-title">Top TMDB</h2>
      <p>Filmes mais bem classificados no TMDB.</p>

      {loading && <p>A carregar filmes…</p>}
      {error && <p role="alert">{error}</p>}

      {!loading && !error && (
        <ol className="top-movies__list">
          {movies.map((movie) => (
            <li key={movie.tmdbId}>
              {movie.posterPath ? (
                <img
                  src={`https://image.tmdb.org/t/p/w185${movie.posterPath}`}
                  alt={`Cartaz de ${movie.title}`}
                  loading="lazy"
                />
              ) : (
                <div className="top-movies__placeholder">
                  Sem cartaz
                </div>
              )}

              <h3>{movie.title}</h3>

              <RatingStars
                score={movie.tmdbVotes > 0 ? movie.tmdbRating : null}
              />

              <p>
                {movie.tmdbVotes > 0
                  ? `${movie.tmdbRating.toFixed(1)}/10 · ${new Intl.NumberFormat("pt-PT").format(movie.tmdbVotes)} votos`
                  : "Sem votos"}
              </p>

              <button
                type="button"
                onClick={() => onSelectMovie(movie.tmdbId)}
              >
                Ver detalhes
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}