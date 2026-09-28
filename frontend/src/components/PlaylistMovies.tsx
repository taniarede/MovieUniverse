import { useEffect, useState } from "react";

type PlaylistMovie = {
  tmdbId: number;
  addedAt: string;
};

type PlaylistMoviesResponse = {
  movies: PlaylistMovie[];
};

type MovieDetail = {
  tmdbId: number;
  title: string;
};

type DisplayMovie = PlaylistMovie & {
  title: string;
};

type PlaylistMoviesProps = Readonly<{
  token: string;
  playlistId: string;
  playlistName: string;
  onMembershipsChanged: () => void;
}>;

export function PlaylistMovies({
  token,
  playlistId,
  playlistName,
  onMembershipsChanged,
}: PlaylistMoviesProps) {
  const [movies, setMovies] = useState<DisplayMovie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function loadMovies() {
      try {
        const response = await fetch(`/api/playlists/${playlistId}/movies`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          throw new Error("Falha ao consultar playlist");
        }

        const data = (await response.json()) as PlaylistMoviesResponse;

        const details = await Promise.all(
          data.movies.map(async (movie) => {
            const detailResponse = await fetch(`/api/movies/${movie.tmdbId}`);
            if (!detailResponse.ok) {
              throw new Error("Falha ao consultar filme");
            }

            const detail = (await detailResponse.json()) as MovieDetail;
            return { ...movie, title: detail.title };
          }),
        );

        if (active) setMovies(details);
      } catch {
        if (active) setError("Não foi possível carregar os filmes da playlist.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadMovies();

    return () => {
      active = false;
    };
  }, [token, playlistId]);


  async function handleRemove(tmdbId: number) {
  setRemovingId(tmdbId);
  setMessage("");

  try {
    const response = await fetch(
      `/api/playlists/${playlistId}/movies/${tmdbId}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    if (!response.ok) {
      throw new Error("Falha ao remover filme");
    }

    setMovies((current) =>
      current.filter((movie) => movie.tmdbId !== tmdbId),
    );
    onMembershipsChanged();
    setMessage("Filme removido da playlist.");
  } catch {
    setMessage("Não foi possível remover o filme.");
  } finally {
    setRemovingId(null);
  }
}


  return (
    <section className="playlist-movies">
      <h3>Filmes em {playlistName}</h3>
      {loading && <p>A carregar filmes…</p>}
      {error && <p role="alert">{error}</p>}
      {!loading && !error && movies.length === 0 && (
        <p>Esta playlist ainda não tem filmes.</p>
      )}

      {message && <output>{message}</output>}

      <ul>
        {movies.map((movie) => (
          <li key={movie.tmdbId}>
            {movie.title} (TMDB ID: {movie.tmdbId})
            <button
              type="button"
              disabled={removingId !== null}
              onClick={() => handleRemove(movie.tmdbId)}
            >
              {removingId === movie.tmdbId ? "A remover…" : "Remover"}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}