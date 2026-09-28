import { useState } from "react";

type Playlist = {
  id: string;
  name: string;
};

type PlaylistStarProps = Readonly<{
  token: string;
  movie: { tmdbId: number; title: string };
  playlists: Playlist[];
}>;

export function PlaylistStar({
  token,
  movie,
  playlists,
}: PlaylistStarProps) {
  const [open, setOpen] = useState(false);
  const [includedIds, setIncludedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [changingId, setChangingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function handleOpen() {
    if (open) {
      setOpen(false);
      return;
    }

    setOpen(true);
    setLoading(true);
    setError("");

    try {
      const ids = await Promise.all(
        playlists.map(async (playlist) => {
          const response = await fetch(
            `/api/playlists/${playlist.id}/movies`,
            { headers: { Authorization: `Bearer ${token}` } },
          );

          if (!response.ok) {
            throw new Error("Não foi possível consultar a playlist");
          }

          const data = (await response.json()) as {
            movies: { tmdbId: number }[];
          };

          return data.movies.some(
            (item) => item.tmdbId === movie.tmdbId,
          )
            ? playlist.id
            : null;
        }),
      );

      setIncludedIds(ids.filter((id): id is string => id !== null));
    } catch {
      setError("Não foi possível consultar as playlists.");
    } finally {
      setLoading(false);
    }
  }

  async function handleToggle(playlistId: string) {
    const included = includedIds.includes(playlistId);
    setChangingId(playlistId);
    setError("");

    try {
      const response = await fetch(
        included
          ? `/api/playlists/${playlistId}/movies/${movie.tmdbId}`
          : `/api/playlists/${playlistId}/movies`,
        {
          method: included ? "DELETE" : "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            ...(!included && { "Content-Type": "application/json" }),
          },
          ...(!included && {
            body: JSON.stringify({ tmdbId: movie.tmdbId }),
          }),
        },
      );

      if (!response.ok) {
        throw new Error("Não foi possível alterar a playlist");
      }

      setIncludedIds((current) =>
        included
          ? current.filter((id) => id !== playlistId)
          : [...current, playlistId],
      );
    } catch {
      setError("Não foi possível alterar esta playlist.");
    } finally {
      setChangingId(null);
    }
  }

  return (
    <div className="playlist-star">
      <button
        type="button"
        onClick={handleOpen}
        aria-expanded={open}
        aria-label={`Gerir playlists de ${movie.title}`}
      >
        {includedIds.length > 0 ? "★" : "☆"} Playlists
      </button>

      {open && (
        <div className="playlist-star-menu">
          {loading && <p>A consultar playlists…</p>}
          {error && <p role="alert">{error}</p>}

          {!loading && !error && playlists.length === 0 && (
            <p>Cria primeiro uma playlist.</p>
          )}

          {!loading && !error && playlists.map((playlist) => {
            const included = includedIds.includes(playlist.id);

            return (
              <button
                key={playlist.id}
                type="button"
                disabled={changingId !== null}
                onClick={() => handleToggle(playlist.id)}
                aria-label={`${included ? "Remover" : "Adicionar"} ${
                  movie.title
                } ${included ? "de" : "a"} ${playlist.name}`}
              >
                {included ? "★" : "☆"} {playlist.name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}