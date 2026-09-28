import { useEffect, useState } from "react";
import { RatingStars } from "./RatingStars";

type Entry = { tmdbId: number; addedAt: string };
type Movie = Entry & { title: string; posterPath: string | null; tmdbRating: number; tmdbVotes: number };
type Props = Readonly<{ playlistId: string; playlistName: string; onMembershipsChanged: () => void }>;

export function PlaylistMovies({ playlistId, playlistName, onMembershipsChanged }: Props) {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true); setError("");
      try {
        const response = await fetch(`/api/playlists/${playlistId}/movies`);
        if (!response.ok) throw new Error();
        const data = (await response.json()) as { movies: Entry[] };
        const results = await Promise.allSettled(data.movies.map(async (entry) => {
          const detail = await fetch(`/api/movies/${entry.tmdbId}`);
          if (!detail.ok) throw new Error();
          return { ...entry, ...(await detail.json() as Omit<Movie, "addedAt">) };
        }));
        if (active) setMovies(results.map((result, index) => result.status === "fulfilled" ? result.value : { ...data.movies[index], title: `Filme ${data.movies[index].tmdbId}`, posterPath: null, tmdbRating: 0, tmdbVotes: 0 }));
      } catch { if (active) setError("Não foi possível carregar os filmes da playlist."); }
      finally { if (active) setLoading(false); }
    }
    void load();
    return () => { active = false; };
  }, [playlistId]);

  async function handleRemove(tmdbId: number) {
    setRemovingId(tmdbId); setMessage("");
    try {
      const response = await fetch(`/api/playlists/${playlistId}/movies/${tmdbId}`, { method: "DELETE" });
      if (!response.ok) throw new Error();
      setMovies((current) => current.filter((movie) => movie.tmdbId !== tmdbId));
      onMembershipsChanged(); setMessage("Filme removido da playlist.");
    } catch { setMessage("Não foi possível remover o filme."); }
    finally { setRemovingId(null); }
  }

  return <section className="playlist-movies"><h3>Filmes em {playlistName}</h3>{loading && <p>A carregar filmes…</p>}{error && <p role="alert">{error}</p>}{!loading && !error && movies.length === 0 && <p>Esta playlist ainda não tem filmes.</p>}{message && <output>{message}</output>}<ul>{movies.map((movie) => <li key={movie.tmdbId}>{movie.posterPath ? <img src={`https://image.tmdb.org/t/p/w185${movie.posterPath}`} alt={`Cartaz de ${movie.title}`} loading="lazy" /> : <span className="playlist-movies__empty">Sem cartaz</span>}<strong>{movie.title}</strong><RatingStars score={movie.tmdbVotes ? movie.tmdbRating : null} /><small>{movie.tmdbVotes ? `${movie.tmdbRating.toFixed(1)}/10 · TMDB` : "Sem votos"}</small><button type="button" disabled={removingId !== null} onClick={() => void handleRemove(movie.tmdbId)}>{removingId === movie.tmdbId ? "A remover…" : "Remover"}</button></li>)}</ul></section>;
}
