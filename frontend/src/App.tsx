import { useCallback, useEffect, useState, type SubmitEvent } from "react";
import "./App.css";
import { LoginForm, type LoginSession } from "./components/LoginForm";
import { PlaylistsPanel } from "./components/PlaylistsPanel";
import { PlaylistStar } from "./components/PlaylistStar";
import { RatingForm } from "./components/RatingForm";
import { RegisterForm } from "./components/RegisterForm";
import { ExamplePlaylists } from "./components/ExamplePlaylists";
import { TopMovies } from "./components/TopMovies";
import { RatingStars } from "./components/RatingStars";

type Movie = {
  tmdbId: number;
  title: string;
  releaseDate?: string;
  overview: string;
  tmdbRating: number;
  posterPath: string | null;
  tmdbVotes: number;
};

type SearchResponse = {
  page: number;
  totalPages: number;
  totalResults: number;
  movies: Movie[];
};

type MovieDetail = Movie & {
  appAverage: number | null;
  appVotes: number;
  combinedRating: number | null;
  runtimeMinutes: number | null;
  genres: string[];
};

type PlaylistOption = {
  id: string;
  name: string;
};


type Membership = {
  playlistId: string;
  tmdbId: number;
};


function App() {
  const [query, setQuery] = useState("");
  const [movies, setMovies] = useState<Movie[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [activeQuery, setActiveQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedMovie, setSelectedMovie] = useState<MovieDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [session, setSession] = useState<LoginSession | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [myPlaylists, setMyPlaylists] = useState<PlaylistOption[]>([]);
  const handlePlaylistsChange = useCallback(
  (items: { id: string; name: string }[]) => {
    setMyPlaylists(items.map(({ id, name }) => ({ id, name })));
  },
  [],
);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [membershipVersion, setMembershipVersion] = useState(0);

  const refreshMemberships = useCallback(() => {
  setMembershipVersion((current) => current + 1);
}, []);

  useEffect(() => {
    const token = session?.token;

    if (!token) return;

    let active = true;

    async function loadMemberships() {
      try {
        const response = await fetch("/api/playlists/memberships", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          throw new Error("Falha ao consultar playlists");
        }

        const data = (await response.json()) as {
          memberships: Membership[];
        };

        if (active) setMemberships(data.memberships);
      } catch {
        if (active) setMemberships([]);
      }
    }

    loadMemberships();

    return () => {
      active = false;
    };
  }, [session?.token, membershipVersion]);


  async function loadPage(term: string, requestedPage: number) {
    setLoading(true);
    setError("");
    setSelectedMovie(null);
    setHasSearched(false);
    setMovies([]);
    setTotalPages(0);

    try {
      const params = new URLSearchParams({
        query: term,
        page: String(requestedPage),
      });

      const response = await fetch(`/api/movies/search?${params}`);

      if (!response.ok) {
        throw new Error("A pesquisa falhou.");
      }

      const data = (await response.json()) as SearchResponse;
      setMovies(data.movies);
      setTotalResults(data.totalResults);
      setPage(data.page);
      setTotalPages(data.totalPages);
      setActiveQuery(term);
      setHasSearched(true);
    } catch {
      setError(
        "Não foi possível pesquisar filmes. Confirma que o backend está ligado.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    const term = query.trim();
    if (!term) return;

    await loadPage(term, 1);
  }

  async function handleSelectMovie(tmdbId: number) {
    setDetailLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/movies/${tmdbId}`);

      if (!response.ok) {
        throw new Error("Falha ao consultar os detalhes.");
      }

      const data = (await response.json()) as MovieDetail;
      setSelectedMovie(data);
    } catch {
      setError("Não foi possível carregar os detalhes do filme.");
    } finally {
      setDetailLoading(false);
    }
  }

  function handleLogout() {
    setSession(null);
    setMyPlaylists([]);
    setMemberships([]);
  }

  return (
    <main className="app">
      <header className="site-header">
        <div className="site-brand">
          <img
            src="/movieuniverse-logo.png"
            alt=""
            className="site-brand__icon"
          />
          <div>
            <h1>MovieUniverse</h1>
            <p>O teu universo de filmes.</p>
          </div>
        </div>
      </header>

      {session ? (
        <div className="session-bar">
          <span>Sessão iniciada: {session.user.username}</span>
          <button type="button" onClick={handleLogout}>
            Sair
          </button>
        </div>
      ) : (
        <>
          <LoginForm onLogin={setSession} />
          <RegisterForm />
        </>
      )}

      {session && (
        <PlaylistsPanel
          token={session.token}
          selectedMovie={
            selectedMovie
              ? {
                  tmdbId: selectedMovie.tmdbId,
                  title: selectedMovie.title,
                }
              : null
          }
          onPlaylistsChange={handlePlaylistsChange}
          onMembershipsChanged={refreshMemberships}
        />
      )}

      <ExamplePlaylists />

      <form onSubmit={handleSearch} className="search-form">
        <label htmlFor="movie-query">Nome do filme</label>
        <input
          id="movie-query"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Ex.: Matrix"
        />
        <button type="submit" disabled={loading}>
          {loading ? "A pesquisar…" : "Pesquisar"}
        </button>
      </form>

      {error ? (
        <p role="alert">{error}</p>
      ) : hasSearched ? (
        <p>
          {totalResults === 0
            ? "Não foram encontrados filmes para esta pesquisa."
            : `Encontrados ${totalResults} resultados.`}
        </p>
      ) : null}

      {detailLoading && <p>A carregar detalhes…</p>}

      {selectedMovie && (
        <section className="movie-detail">
          <h2>{selectedMovie.title}</h2>

          <p>
            {selectedMovie.genres.join(", ") || "Género não disponível"} ·
            {selectedMovie.runtimeMinutes
              ? ` ${selectedMovie.runtimeMinutes} min`
              : " duração não disponível"}
          </p>

          <p>{selectedMovie.overview || "Sem sinopse disponível."}</p>
          
          <RatingStars
            score={
              selectedMovie.tmdbVotes > 0
                ? selectedMovie.tmdbRating
                : null
            }
          />

          <p>
            TMDB:{" "}
            {selectedMovie.tmdbVotes > 0
              ? `${selectedMovie.tmdbRating.toFixed(1)}/10 · ${new Intl.NumberFormat("pt-PT").format(selectedMovie.tmdbVotes)} votos`
              : "sem votos"}
          </p>

          <RatingStars
            score={
              selectedMovie.appVotes > 0
                ? selectedMovie.appAverage
                : null
            }
          />

          <p>
            MovieUniverse:{" "}
            {selectedMovie.appVotes > 0 &&
            selectedMovie.appAverage !== null
              ? `${selectedMovie.appAverage.toFixed(1)}/10 · ${selectedMovie.appVotes} votos`
              : "sem votos"}
          </p>

          <p>
            <strong>
              Nota combinada:{" "}
              {selectedMovie.combinedRating === null
                ? "informação insuficiente"
                : `${selectedMovie.combinedRating.toFixed(2)}/10`}
            </strong>
          </p>

          <p>
            Base da nota: {selectedMovie.tmdbVotes} votos no TMDB e{" "}
            {selectedMovie.appVotes} avaliações no MovieUniverse.
          </p>

          {session && (
            <RatingForm
              key={selectedMovie.tmdbId}
              token={session.token}
              tmdbId={selectedMovie.tmdbId}
              onSaved={() => handleSelectMovie(selectedMovie.tmdbId)}
            />
          )}
        </section>
      )}

      <TopMovies onSelectMovie={handleSelectMovie} />

      {totalPages > 1 && (
        <nav className="pagination" aria-label="Páginas dos resultados">
          <button
            type="button"
            disabled={loading || page <= 1}
            onClick={() => loadPage(activeQuery, page - 1)}
          >
            Anterior
          </button>

          <span>
            Página {page} de {totalPages}
          </span>

          <button
            type="button"
            disabled={loading || page >= totalPages}
            onClick={() => loadPage(activeQuery, page + 1)}
          >
            Seguinte
          </button>
        </nav>
      )}

      <ul className="movie-list">
        {movies.map((movie) => (
          <li key={movie.tmdbId}>
            {movie.posterPath ? (
              <img
                className="movie-poster"
                src={`https://image.tmdb.org/t/p/w342${movie.posterPath}`}
                alt={`Cartaz de ${movie.title}`}
                loading="lazy"
              />
            ) : (
              <div className="movie-poster-placeholder">
                Cartaz indisponível
              </div>
            )}

            <h2>{movie.title}</h2>
            <RatingStars
              score={movie.tmdbVotes > 0 ? movie.tmdbRating : null}
            />

            <p>
              Lançamento: {movie.releaseDate || "Por anunciar"} ·{" "}
              {movie.tmdbVotes > 0 ? (
                <>
                  TMDB: {movie.tmdbRating.toFixed(1)}/10 ·{" "}
                  {new Intl.NumberFormat("pt-PT").format(movie.tmdbVotes)}{" "}
                  votos
                </>
              ) : (
                <>TMDB: sem votos</>
              )}
            </p>

            <p>{movie.overview || "Sem sinopse disponível."}</p>

            <button
              type="button"
              onClick={() => handleSelectMovie(movie.tmdbId)}
            >
              Ver detalhes
            </button>

            {session && (
              <PlaylistStar
                key={`${session.user.username}-${movie.tmdbId}`}
                token={session.token}
                movie={{
                  tmdbId: movie.tmdbId,
                  title: movie.title,
                }}
                playlists={myPlaylists}
                includedIds={memberships
                  .filter((item) => item.tmdbId === movie.tmdbId)
                  .map((item) => item.playlistId)}
                onChanged={refreshMemberships}
              />
            )}
          </li>
        ))}
      </ul>

      <section className="credits" aria-labelledby="credits-title">
        <h2 id="credits-title">Créditos</h2>
        <img className="tmdb-logo" src="/themoviedb.svg" alt="TMDB" />
        <p>Os dados dos filmes são fornecidos pelo TMDB.</p>
        <p>
          This product uses the TMDB API but is not endorsed or certified
          by TMDB.
        </p>
        <a
          href="https://www.themoviedb.org/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Visitar o TMDB
        </a>
      </section>
    </main>
  );
}

export default App;