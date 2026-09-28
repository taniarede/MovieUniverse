import { useState } from "react";

type Playlist = {
  id: string;
  name: string;
};

type PlaylistStarProps = Readonly<{
  token: string;
  movie: { tmdbId: number; title: string };
  playlists: Playlist[];
  includedIds: string[];
  onChanged: () => void;
}>;

export function PlaylistStar({
  token,
  movie,
  playlists,
  includedIds,
  onChanged,
}: PlaylistStarProps) {
  const [open, setOpen] = useState(false);
  const [changingId, setChangingId] = useState<string | null>(null);
  const [error, setError] = useState("");

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

      onChanged();
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
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-label={`Gerir playlists de ${movie.title}`}
      >
        {includedIds.length > 0 ? "★" : "☆"} Playlists
      </button>

      {open && (
        <div className="playlist-star-menu">
          {error && <p role="alert">{error}</p>}

          {playlists.length === 0 && (
            <p>Cria primeiro uma playlist.</p>
          )}

          {playlists.map((playlist) => {
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