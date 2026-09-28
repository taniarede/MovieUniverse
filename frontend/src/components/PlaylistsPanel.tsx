import { useEffect, useState, type SubmitEvent } from "react";
import { PlaylistMovies } from "./PlaylistMovies";

type Playlist = {
  id: string;
  name: string;
  description: string | null;
};

type PlaylistsResponse = {
  playlists: Playlist[];
};

type PlaylistsPanelProps = Readonly<{
  selectedMovie: { tmdbId: number; title: string } | null;
  onPlaylistsChange: (playlists: Playlist[]) => void;
  onMembershipsChanged: () => void;
}>;

export function PlaylistsPanel({
  selectedMovie,
  onPlaylistsChange,
  onMembershipsChanged,

}: PlaylistsPanelProps) {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [createError, setCreateError] = useState("");
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [movieMessage, setMovieMessage] = useState("");
  const [openPlaylistId, setOpenPlaylistId] = useState<string | null>(null);
  const [listVersion, setListVersion] = useState(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteMessage, setDeleteMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function loadPlaylists() {
      try {
        const response = await fetch("/api/playlists", {
          
        });

        if (!response.ok) {
          throw new Error("Falha ao consultar playlists");
        }

        const data = (await response.json()) as PlaylistsResponse;

        if (active) {
          setPlaylists(data.playlists);
          onPlaylistsChange(data.playlists);
        }
      } catch {
        if (active) setError("Não foi possível carregar as playlists.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadPlaylists();

    return () => {
      active = false;
    };
  }, [onPlaylistsChange]);

  async function handleCreate(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    setCreateError("");

    try {
      const response = await fetch("/api/playlists", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error("Falha ao criar playlist");
      }

      const created = (await response.json()) as Playlist;
      const updated = [created, ...playlists];

      setPlaylists(updated);
      onPlaylistsChange(updated);
      setName("");
      setDescription("");
    } catch {
      setCreateError("Não foi possível criar a playlist.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddMovie(playlistId: string) {
    if (!selectedMovie) return;

    setAddingTo(playlistId);
    setMovieMessage("");

    try {
      const response = await fetch(`/api/playlists/${playlistId}/movies`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tmdbId: selectedMovie.tmdbId }),
      });

      if (response.status === 409) {
        setMovieMessage(`${selectedMovie.title} já está nesta playlist.`);
        return;
      }

      if (!response.ok) {
        throw new Error("Falha ao adicionar filme");
      }

      setListVersion((current) => current + 1);
      onMembershipsChanged();

      const playlist = playlists.find((item) => item.id === playlistId);
      setMovieMessage(
        `${selectedMovie.title} foi adicionado a ${playlist?.name ?? "playlist"}.`,
      );
    } catch {
      setMovieMessage("Não foi possível adicionar o filme à playlist.");
    } finally {
      setAddingTo(null);
    }
  }

  async function handleDeletePlaylist(playlistId: string) {
    setDeletingId(playlistId);
    setDeleteMessage("");

    try {
      const response = await fetch(`/api/playlists/${playlistId}`, {
        method: "DELETE",
        
      });

      if (!response.ok) {
        throw new Error("Falha ao apagar playlist");
      }

      const updated = playlists.filter(
        (playlist) => playlist.id !== playlistId,
      );

      setPlaylists(updated);
      onPlaylistsChange(updated);
      onMembershipsChanged();
      setOpenPlaylistId((current) =>
        current === playlistId ? null : current,
      );
      setDeleteMessage("Playlist apagada.");
    } catch {
      setDeleteMessage("Não foi possível apagar a playlist.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section id="my-playlists" className="playlists-panel">
      <h2>As minhas playlists</h2>

      <form onSubmit={handleCreate} className="playlist-form">
        <label htmlFor="playlist-name">Nome da nova playlist</label>
        <input
          id="playlist-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={100}
          required
        />

        <label htmlFor="playlist-description">Descrição (opcional)</label>
        <input
          id="playlist-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          maxLength={1000}
        />

        <button type="submit" disabled={saving}>
          {saving ? "A criar…" : "Criar playlist"}
        </button>
        {createError && <p role="alert">{createError}</p>}
      </form>

      {loading && <p>A carregar…</p>}
      {error && <p role="alert">{error}</p>}

      {selectedMovie && (
        <p>
          Filme selecionado: <strong>{selectedMovie.title}</strong>
        </p>
      )}
      {movieMessage && <output>{movieMessage}</output>}
      {deleteMessage && <output>{deleteMessage}</output>}

      <ul>
        {playlists.map((playlist) => (
          <li key={playlist.id}>
            <strong>{playlist.name}</strong>
            {playlist.description && <p>{playlist.description}</p>}

            <button
              type="button"
              onClick={() =>
                setOpenPlaylistId((current) =>
                  current === playlist.id ? null : playlist.id,
                )
              }
            >
              {openPlaylistId === playlist.id
                ? "Ocultar filmes"
                : "Ver filmes"}
            </button>

            {selectedMovie && (
              <button
                type="button"
                disabled={addingTo !== null}
                onClick={() => handleAddMovie(playlist.id)}
              >
                {addingTo === playlist.id
                  ? "A adicionar…"
                  : "Adicionar filme"}
              </button>
            )}

            <button
              type="button"
              disabled={deletingId !== null}
              onClick={() => handleDeletePlaylist(playlist.id)}
            >
              {deletingId === playlist.id
                ? "A apagar…"
                : "Apagar playlist"}
            </button>
          </li>
        ))}
      </ul>

      {openPlaylistId && (
        <PlaylistMovies
          key={`${openPlaylistId}-${listVersion}`}
          playlistId={openPlaylistId}
          playlistName={
            playlists.find((playlist) => playlist.id === openPlaylistId)
              ?.name ?? "playlist"
          }
          onMembershipsChanged={onMembershipsChanged}
        />
      )}

      {!loading && !error && playlists.length === 0 && (
        <p>Ainda não criaste nenhuma playlist.</p>
      )}
    </section>
  );
}
