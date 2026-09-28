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

type MovieDetail = Movie & {
  appAverage: number | null;
  appVotes: number;
  combinedRating: number | null;
  runtimeMinutes: number | null;
  genres: string[];
};

type SearchResponse = {
  page: number;
  totalPages: number;
  totalResults: number;
  movies: Movie[];
};

type PlaylistOption = {
  id: string;
  name: string;
};

type Membership = {
  playlistId: string;
  tmdbId: number;
};

type View = "home" | "search" | "lists" | "compare";

function App() {
  const [view, setView] = useState<View>("home");
  const [query, setQuery] = useState("");
  const [sectionQuery, setSectionQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [movies, setMovies] = useState<Movie[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalResults, setTotalResults] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedMovie, setSelectedMovie] = useState<MovieDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [session, setSession] = useState<LoginSession | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [authMode, setAuthMode] = useState<"login" | "register" | null>(null);
  const [authNotice, setAuthNotice] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [myPlaylists, setMyPlaylists] = useState<PlaylistOption[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [membershipVersion, setMembershipVersion] = useState(0);

  const handlePlaylistsChange = useCallback(
    (items: PlaylistOption[]) =>
      setMyPlaylists(items.map(({ id, name }) => ({ id, name }))),
    [],
  );

  const refreshMemberships = useCallback(
    () => setMembershipVersion((value) => value + 1),
    [],
  );

  useEffect(() => {
    let active = true;

    fetch("/api/me")
      .then(async (response) => {
        if (response.ok && active) {
          const data = (await response.json()) as LoginSession;
          setSession(data);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setSessionLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!session) return;

    let active = true;

    fetch("/api/playlists/memberships")
      .then(async (response) => {
        if (!response.ok) throw new Error();
        return (await response.json()) as { memberships: Membership[] };
      })
      .then((data) => {
        if (active) setMemberships(data.memberships);
      })
      .catch(() => {
        if (active) setMemberships([]);
      });

    return () => {
      active = false;
    };
  }, [session, membershipVersion]);

  function navigate(next: View) {
    setView(next);
    setSelectedMovie(null);
    setDrawerOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function loadPage(term: string, requestedPage: number) {
    setView("search");
    setLoading(true);
    setError("");
    setSelectedMovie(null);

    try {
      const params = new URLSearchParams({
        query: term,
        page: String(requestedPage),
      });
      const response = await fetch(`/api/movies/search?${params}`);

      if (!response.ok) throw new Error();

      const data = (await response.json()) as SearchResponse;

      setMovies(data.movies);
      setTotalResults(data.totalResults);
      setPage(data.page);
      setTotalPages(data.totalPages);
      setActiveQuery(term);
    } catch {
      setError(
        "Não foi possível pesquisar filmes. Confirma que o backend está ligado.",
      );
      setMovies([]);
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(
    event: SubmitEvent<HTMLFormElement>,
    source: "header" | "section",
  ) {
    event.preventDefault();

    const term = (source === "header" ? query : sectionQuery).trim();

    if (term) {
      setQuery(term);
      void loadPage(term, 1);
    }
  }

  async function handleSelectMovie(tmdbId: number) {
    setDetailLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/movies/${tmdbId}`);

      if (!response.ok) throw new Error();

      setSelectedMovie((await response.json()) as MovieDetail);

      requestAnimationFrame(() =>
        document
          .getElementById("movie-detail")
          ?.scrollIntoView({ behavior: "smooth", block: "start" }),
      );
    } catch {
      setError("Não foi possível carregar os detalhes do filme.");
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleLogout() {
    try {
      await fetch("/api/logout", { method: "POST" });
    } finally {
      setSession(null);
      setMyPlaylists([]);
      setMemberships([]);
      setDrawerOpen(false);
      navigate("home");
    }
  }

  return (
    <div className="app" id="mu-top">
      <header className="site-header">
        <a
          className="site-brand"
          href="#mu-top"
          onClick={(event) => {
            event.preventDefault();
            navigate("home");
          }}
          aria-label="MovieUniverse Hub — início"
        >
          <img
            src="/movieuniverse-logo.png"
            alt=""
            className="site-brand__icon"
          />
          <span>
            MovieUniverse <b>Hub</b>
          </span>
        </a>

        <form
          className="header-search"
          role="search"
          onSubmit={(event) => handleSearch(event, "header")}
        >
          <label htmlFor="header-movie-query" className="visually-hidden">
            Pesquisar filmes
          </label>
          <input
            id="header-movie-query"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Pesquisar filmes…"
            required
          />
          <button
            type="submit"
            disabled={loading}
            aria-label="Pesquisar filmes"
          >
            ⌕
          </button>
        </form>

        <nav className="site-nav" aria-label="Navegação principal">
          <button
            type="button"
            onClick={() =>
              session ? setDrawerOpen(true) : setAuthMode("login")
            }
          >
            Minhas Playlists
          </button>
          <a
            href="#mu-lists"
            onClick={(event) => {
              event.preventDefault();
              navigate("lists");
            }}
          >
            Playlists
          </a>
          <a
            href="#mu-compare"
            onClick={(event) => {
              event.preventDefault();
              navigate("compare");
            }}
          >
            Comparar
          </a>
        </nav>

        <div className="header-account">
          {session ? (
            <button
              type="button"
              className="account-avatar"
              onClick={() => setDrawerOpen(true)}
              aria-label={`Conta de ${session.user.username}`}
            >
              {session.user.username.slice(0, 1).toUpperCase()}
            </button>
          ) : (
            !sessionLoading && (
              <>
                <button
                  type="button"
                  onClick={() => setAuthMode("login")}
                >
                  Entrar
                </button>
                <button
                  type="button"
                  className="account-join"
                  onClick={() => setAuthMode("register")}
                >
                  Criar conta
                </button>
              </>
            )
          )}
        </div>
      </header>

      {authMode && !session && (
        <div
          className="auth-scrim"
          onClick={() => setAuthMode(null)}
        >
          <section
            className="auth-panel"
            role="dialog"
            aria-modal="true"
            aria-label={
              authMode === "login" ? "Iniciar sessão" : "Criar conta"
            }
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="auth-close"
              onClick={() => setAuthMode(null)}
              aria-label="Fechar"
            >
              ×
            </button>

            {authNotice && <output>{authNotice}</output>}

            {authMode === "login" ? (
              <>
                <LoginForm
                  onLogin={(next) => {
                    setSession(next);
                    setAuthMode(null);
                    setAuthNotice("");
                  }}
                />
                <p>
                  Ainda não tens conta?{" "}
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => setAuthMode("register")}
                  >
                    Criar conta
                  </button>
                </p>
              </>
            ) : (
              <>
                <RegisterForm
                  onRegistered={() => {
                    setAuthNotice("Conta criada. Já podes entrar.");
                    setAuthMode("login");
                  }}
                />
                <p>
                  Já tens conta?{" "}
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => setAuthMode("login")}
                  >
                    Entrar
                  </button>
                </p>
              </>
            )}
          </section>
        </div>
      )}

      {session && (
        <>
          <div
            className="drawer-scrim"
            hidden={!drawerOpen}
            onClick={() => setDrawerOpen(false)}
          />
          <aside
            className="playlist-drawer"
            hidden={!drawerOpen}
            aria-label="Minhas Playlists"
          >
            <div className="drawer-heading">
              <h2>Minhas Playlists</h2>
              <button
                type="button"
                aria-label="Fechar menu"
                onClick={() => setDrawerOpen(false)}
              >
                ×
              </button>
            </div>
            <PlaylistsPanel
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
            <button
              type="button"
              className="drawer-logout"
              onClick={() => void handleLogout()}
            >
              Sair da conta
            </button>
          </aside>
        </>
      )}

      <main>
        {view === "home" && (
          <>
            <section
              className="hero"
              id="discover"
              aria-labelledby="hero-title"
            >
              <div className="hero__copy">
                <span className="hero__eyebrow">
                  DESCOBRE · AVALIA · ORGANIZA
                </span>
                <h1 id="hero-title">
                  Encontra o teu
                  <br />
                  <em>próximo filme.</em>
                </h1>
                <p>
                  Pesquisa filmes, guarda os favoritos e compara as tuas
                  playlists com outras pessoas.
                </p>
                <a className="hero-cta" href="#discover-search">
                  Pesquisar ↗
                </a>
              </div>
              <div className="hero__art" aria-hidden="true">
                <img src="/movieuniverse-logo.png" alt="" />
                <strong>
                  MovieUniverse <span>Hub</span>
                </strong>
                <small>FILMES · PLAYLISTS · NOTAS</small>
              </div>
            </section>

            <TopMovies onSelectMovie={handleSelectMovie} />

            <section
              className="discover-search"
              id="discover-search"
            >
              <span className="eyebrow">DESCOBRIR</span>
              <h2>
                Pesquisa <em>um filme.</em>
              </h2>
              <form
                className="search-form"
                role="search"
                onSubmit={(event) => handleSearch(event, "section")}
              >
                <label htmlFor="movie-query">Nome do filme</label>
                <div>
                  <input
                    id="movie-query"
                    type="search"
                    value={sectionQuery}
                    onChange={(event) =>
                      setSectionQuery(event.target.value)
                    }
                    placeholder="Ex.: Matrix"
                    required
                  />
                  <button type="submit" disabled={loading}>
                    Pesquisar ↗
                  </button>
                </div>
              </form>
            </section>
          </>
        )}

        {error && (
          <p className="page-error" role="alert">
            {error}
          </p>
        )}
        {detailLoading && (
          <p className="page-error">A carregar detalhes…</p>
        )}

        {selectedMovie && (
          <section
            id="movie-detail"
            className="movie-detail"
            tabIndex={-1}
          >
            {selectedMovie.posterPath && (
              <img
                className="movie-detail-poster"
                src={`https://image.tmdb.org/t/p/w342${selectedMovie.posterPath}`}
                alt={`Cartaz de ${selectedMovie.title}`}
              />
            )}
            <h2>{selectedMovie.title}</h2>
            <p>
              {selectedMovie.genres.join(", ") ||
                "Género não disponível"}{" "}
              ·{" "}
              {selectedMovie.runtimeMinutes
                ? `${selectedMovie.runtimeMinutes} min`
                : "Duração indisponível"}
            </p>
            <p>
              {selectedMovie.overview || "Sem sinopse disponível."}
            </p>
            <div className="movie-detail__ratings">
              <div>
                <strong>TMDB</strong>
                <RatingStars
                  score={
                    selectedMovie.tmdbVotes
                      ? selectedMovie.tmdbRating
                      : null
                  }
                />
                <span>
                  {selectedMovie.tmdbVotes
                    ? `${selectedMovie.tmdbRating.toFixed(1)}/10 · ${selectedMovie.tmdbVotes} votos`
                    : "Sem votos"}
                </span>
              </div>
              <div>
                <strong>MovieUniverse</strong>
                <RatingStars score={selectedMovie.appAverage} />
                <span>
                  {selectedMovie.appVotes
                    ? `${selectedMovie.appAverage?.toFixed(1)}/10 · ${selectedMovie.appVotes} votos`
                    : "Sem votos"}
                </span>
              </div>
              <div>
                <strong>Nota combinada</strong>
                <span>
                  {selectedMovie.combinedRating === null
                    ? "Informação insuficiente"
                    : `${selectedMovie.combinedRating.toFixed(2)}/10`}
                </span>
              </div>
            </div>
            {session ? (
              <RatingForm
                key={selectedMovie.tmdbId}
                tmdbId={selectedMovie.tmdbId}
                onSaved={() =>
                  void handleSelectMovie(selectedMovie.tmdbId)
                }
              />
            ) : (
              <button
                type="button"
                onClick={() => setAuthMode("login")}
              >
                Entrar para avaliar
              </button>
            )}
          </section>
        )}

        {view === "search" && (
          <section className="results" id="search-results">
            <div className="section-heading">
              <div>
                <span className="eyebrow">
                  RESULTADOS · {activeQuery.toUpperCase()}
                </span>
                <h2>
                  Resultados de <em>filmes.</em>
                </h2>
              </div>
              {!loading && !error && (
                <span>
                  {totalResults} resultados · Página {page} de{" "}
                  {totalPages || 1}
                </span>
              )}
            </div>

            {loading && <p>A pesquisar filmes…</p>}

            {!loading && !error && (
              <>
                {totalResults === 0 && (
                  <p>
                    Não foram encontrados filmes para esta pesquisa.
                  </p>
                )}
                <ul className="movie-list">
                  {movies.map((movie) => (
                    <li key={movie.tmdbId}>
                      <button
                        type="button"
                        className="movie-poster-button"
                        onClick={() =>
                          void handleSelectMovie(movie.tmdbId)
                        }
                        aria-label={`Ver detalhes de ${movie.title}`}
                      >
                        {movie.posterPath ? (
                          <img
                            className="movie-poster"
                            src={`https://image.tmdb.org/t/p/w342${movie.posterPath}`}
                            alt=""
                            loading="lazy"
                          />
                        ) : (
                          <span className="movie-poster-placeholder">
                            Cartaz indisponível
                          </span>
                        )}
                      </button>

                      <div className="movie-list__heading">
                        <h3>{movie.title}</h3>
                        {session && (
                          <PlaylistStar
                            key={`${session.user.id}-${movie.tmdbId}`}
                            movie={{
                              tmdbId: movie.tmdbId,
                              title: movie.title,
                            }}
                            playlists={myPlaylists}
                            includedIds={memberships
                              .filter(
                                (item) =>
                                  item.tmdbId === movie.tmdbId,
                              )
                              .map((item) => item.playlistId)}
                            onChanged={refreshMemberships}
                          />
                        )}
                      </div>

                      <small>
                        {movie.releaseDate?.slice(0, 4) ||
                          "Data por anunciar"}
                      </small>
                      <div className="movie-list__rating">
                        <RatingStars
                          score={
                            movie.tmdbVotes
                              ? movie.tmdbRating
                              : null
                          }
                        />
                        <strong>
                          {movie.tmdbVotes
                            ? movie.tmdbRating.toFixed(1)
                            : "Sem votos"}
                        </strong>
                      </div>
                      <small>
                        TMDB ·{" "}
                        {movie.tmdbVotes
                          ? `${new Intl.NumberFormat("pt-PT").format(movie.tmdbVotes)} votos`
                          : "Sem votos"}
                      </small>
                      <button
                        type="button"
                        className="movie-list__details"
                        onClick={() =>
                          void handleSelectMovie(movie.tmdbId)
                        }
                      >
                        Ver detalhes ↗
                      </button>
                    </li>
                  ))}
                </ul>

                {totalPages > 1 && (
                  <nav
                    className="pagination"
                    aria-label="Páginas dos resultados"
                  >
                    <button
                      type="button"
                      disabled={page <= 1}
                      onClick={() =>
                        void loadPage(activeQuery, page - 1)
                      }
                    >
                      ← Anterior
                    </button>
                    <span>
                      Página {page} de {totalPages}
                    </span>
                    <button
                      type="button"
                      disabled={page >= totalPages}
                      onClick={() =>
                        void loadPage(activeQuery, page + 1)
                      }
                    >
                      Seguinte →
                    </button>
                  </nav>
                )}
              </>
            )}
          </section>
        )}

        {(view === "lists" || view === "compare") && (
          <ExamplePlaylists
            mode={view}
            myPlaylists={myPlaylists}
            username={session?.user.username ?? null}
            onSelectMovie={handleSelectMovie}
          />
        )}
      </main>

      <footer id="about" className="credits">
        <a
          href="https://www.themoviedb.org/"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Visitar o site oficial do TMDB"
        >
          <img src="/themoviedb.svg" alt="The Movie Database" />
        </a>
        <p>
          Os dados dos filmes são fornecidos pelo TMDB.
          <br />
          This product uses the TMDB API but is not endorsed or
          certified by TMDB.
        </p>
      </footer>
    </div>
  );
}

export default App;