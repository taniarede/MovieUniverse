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
  const [authMode, setAuthMode] = useState<"login" | "register" | null>(null);
  const [authNotice, setAuthNotice] = useState("");
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
      requestAnimationFrame(() => {
        document.getElementById("movie-detail")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
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
    setAuthMode(null);
  }

  return (
    <main className="app">
      <header className="site-header">
        <a className="site-brand" href="#discover" aria-label="MovieUniverse Hub — início">
          <img src="/movieuniverse-logo.png" alt="" className="site-brand__icon" />
          <span>MovieUniverse <b>Hub</b></span>
        </a>
        <nav className="site-nav" aria-label="Navegação principal">
          <a href="#discover">Descobrir</a>
          {session ? <a href="#my-playlists">Playlists</a> : <button type="button" onClick={() => setAuthMode("login")}>Playlists</button>}
          <a href="#examples">Comparar listas</a>
          <a href="#about">Sobre</a>
        </nav>
        <div className="header-account">
          {session ? (
            <>
              <span className="account-avatar" title={session.user.username}>
                {session.user.username.slice(0, 1).toUpperCase()}
              </span>
              <button type="button" onClick={handleLogout}>Sair</button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => { setAuthMode("login"); setAuthNotice(""); }}>
                Entrar
              </button>
              <button type="button" className="account-join" onClick={() => { setAuthMode("register"); setAuthNotice(""); }}>
                Criar conta
              </button>
            </>
          )}
        </div>
      </header>

      {!session && authMode && (
        <section className="auth-panel" aria-label={authMode === "login" ? "Iniciar sessão" : "Criar conta"}>
          <button type="button" className="auth-close" onClick={() => setAuthMode(null)} aria-label="Fechar formulário">×</button>
          {authNotice && <output>{authNotice}</output>}
          {authMode === "login" ? (
            <>
              <LoginForm onLogin={(nextSession) => { setSession(nextSession); setAuthMode(null); setAuthNotice(""); }} />
              <p>Ainda não tens conta? <button type="button" className="text-button" onClick={() => setAuthMode("register")}>Criar conta</button></p>
            </>
          ) : (
            <>
              <RegisterForm onRegistered={() => { setAuthNotice("Conta criada. Já podes iniciar sessão."); setAuthMode("login"); }} />
              <p>Já tens conta? <button type="button" className="text-button" onClick={() => setAuthMode("login")}>Entrar</button></p>
            </>
          )}
        </section>
      )}

      <section className="hero" id="discover" aria-labelledby="hero-title">
        <div className="hero__copy">
          <span className="hero__eyebrow">DESCOBRE · AVALIA · ORGANIZA</span>
          <h1 id="hero-title">O teu universo<br /><em>de cinema.</em></h1>
          <p>Pesquisa filmes, guarda os teus favoritos e compara as tuas playlists com outras pessoas.</p>
          <form onSubmit={handleSearch} className="search-form" role="search">
            <label htmlFor="movie-query" className="visually-hidden">Nome do filme</label>
            <input id="movie-query" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Pesquisa um filme, por exemplo Matrix" required />
            <button type="submit" disabled={loading}>{loading ? "A pesquisar…" : "Pesquisar ↗"}</button>
          </form>
        </div>
        <div className="hero__art" aria-hidden="true">
          <img src="/movieuniverse-logo.png" alt="" />
          <strong>MovieUniverse <span>Hub</span></strong>
          <small>FILMES · PLAYLISTS · NOTAS</small>
        </div>
      </section>

      <section className="featured" aria-labelledby="featured-title">
        <div className="section-heading">
          <div><span className="eyebrow">AS TUAS LISTAS, SEMPRE À MÃO</span><h2 id="featured-title">Continua de onde <em>ficaste.</em></h2></div>
          {session && <a href="#my-playlists">Ver todas ↗</a>}
        </div>
        <div className="featured__grid">
          {session ? myPlaylists.slice(0, 2).map((playlist, index) => (
            <a key={playlist.id} className="featured-card" href="#my-playlists">
              <span className={`featured-card__art featured-card__art--${index + 1}`} aria-hidden="true" />
              <strong>{playlist.name} ↗</strong>
              <small>Playlist pessoal · {memberships.filter((item) => item.playlistId === playlist.id).length} filmes</small>
            </a>
          )) : (
            <div className="featured-card featured-card--guest">
              <span className="featured-card__art featured-card__art--1" aria-hidden="true" />
              <strong>As tuas playlists começam aqui.</strong>
              <button type="button" onClick={() => setAuthMode("register")}>Criar conta grátis ↗</button>
            </div>
          )}
          {session && myPlaylists.length === 0 && (
            <a className="featured-card featured-card--guest" href="#my-playlists">Cria a tua primeira playlist ↗</a>
          )}
          <a className="featured-card featured-card--compare" href="#examples">
            <span>COMPARA AS TUAS ESCOLHAS</span>
            <strong>Qual lista tem os filmes melhor avaliados?</strong>
            <small>Comparar playlists ↗</small>
          </a>
        </div>
      </section>

      {error && <p role="alert">{error}</p>}
      {detailLoading && <p>A carregar detalhes…</p>}
      {selectedMovie && (
        <section id="movie-detail" className="movie-detail" tabIndex={-1}>
          {selectedMovie.posterPath && <img className="movie-detail-poster" src={`https://image.tmdb.org/t/p/w342${selectedMovie.posterPath}`} alt={`Cartaz de ${selectedMovie.title}`} />}
          <h2>{selectedMovie.title}</h2>
          <p>{selectedMovie.genres.join(", ") || "Género não disponível"} · {selectedMovie.runtimeMinutes ? `${selectedMovie.runtimeMinutes} min` : "duração não disponível"}</p>
          <p>{selectedMovie.overview || "Sem sinopse disponível."}</p>
          <div className="movie-detail__ratings">
            <div><strong>TMDB</strong><RatingStars score={selectedMovie.tmdbVotes > 0 ? selectedMovie.tmdbRating : null} /><span>{selectedMovie.tmdbVotes > 0 ? `${selectedMovie.tmdbRating.toFixed(1)}/10 · ${new Intl.NumberFormat("pt-PT").format(selectedMovie.tmdbVotes)} votos` : "sem votos"}</span></div>
            <div><strong>MovieUniverse</strong><RatingStars score={selectedMovie.appVotes > 0 ? selectedMovie.appAverage : null} /><span>{selectedMovie.appVotes > 0 && selectedMovie.appAverage !== null ? `${selectedMovie.appAverage.toFixed(1)}/10 · ${selectedMovie.appVotes} votos` : "sem votos"}</span></div>
            <div><strong>Nota combinada</strong><span>{selectedMovie.combinedRating === null ? "informação insuficiente" : `${selectedMovie.combinedRating.toFixed(2)}/10`}</span><small>Base: {selectedMovie.tmdbVotes} votos TMDB e {selectedMovie.appVotes} avaliações MovieUniverse.</small></div>
          </div>
          {session ? <RatingForm key={selectedMovie.tmdbId} token={session.token} tmdbId={selectedMovie.tmdbId} onSaved={() => handleSelectMovie(selectedMovie.tmdbId)} /> : <p>Queres avaliar este filme? <button type="button" onClick={() => setAuthMode("login")}>Iniciar sessão</button></p>}
        </section>
      )}

      {hasSearched && (
        <section className="results" aria-labelledby="results-title">
          <div className="section-heading"><div><span className="eyebrow">RESULTADOS · {activeQuery.toUpperCase()}</span><h2 id="results-title">Filmes para <em>explorar.</em></h2></div><span>{totalResults} resultados · Página {page} de {totalPages || 1}</span></div>
          {totalResults === 0 && <p>Não foram encontrados filmes para esta pesquisa.</p>}
          <ul className="movie-list">
            {movies.map((movie) => (
              <li key={movie.tmdbId}>
                <button type="button" className="movie-poster-button" onClick={() => handleSelectMovie(movie.tmdbId)} aria-label={`Ver detalhes de ${movie.title}`}>
                  {movie.posterPath ? <img className="movie-poster" src={`https://image.tmdb.org/t/p/w342${movie.posterPath}`} alt="" loading="lazy" /> : <span className="movie-poster-placeholder">Cartaz indisponível</span>}
                </button>
                <div className="movie-list__heading"><h3>{movie.title}</h3>{session && <PlaylistStar key={`${session.user.username}-${movie.tmdbId}`} token={session.token} movie={{ tmdbId: movie.tmdbId, title: movie.title }} playlists={myPlaylists} includedIds={memberships.filter((item) => item.tmdbId === movie.tmdbId).map((item) => item.playlistId)} onChanged={refreshMemberships} />}</div>
                <small>{movie.releaseDate?.slice(0, 4) || "Data por anunciar"}</small>
                <div className="movie-list__rating"><RatingStars score={movie.tmdbVotes > 0 ? movie.tmdbRating : null} /><strong>{movie.tmdbVotes > 0 ? movie.tmdbRating.toFixed(1) : "Sem votos"}</strong></div>
                <small>TMDB · {movie.tmdbVotes > 0 ? `${new Intl.NumberFormat("pt-PT").format(movie.tmdbVotes)} votos` : "sem votos"}</small>
                <button type="button" className="movie-list__details" onClick={() => handleSelectMovie(movie.tmdbId)}>Ver detalhes ↗</button>
              </li>
            ))}
          </ul>
          {totalPages > 1 && <nav className="pagination" aria-label="Páginas dos resultados"><button type="button" disabled={loading || page <= 1} onClick={() => loadPage(activeQuery, page - 1)}>← Anterior</button><span>Página {page} de {totalPages}</span><button type="button" disabled={loading || page >= totalPages} onClick={() => loadPage(activeQuery, page + 1)}>Seguinte →</button></nav>}
        </section>
      )}

      <TopMovies onSelectMovie={handleSelectMovie} />
      {session && <PlaylistsPanel token={session.token} selectedMovie={selectedMovie ? { tmdbId: selectedMovie.tmdbId, title: selectedMovie.title } : null} onPlaylistsChange={handlePlaylistsChange} onMembershipsChanged={refreshMemberships} />}
      <ExamplePlaylists />
      <footer id="about" className="credits"><strong>MovieUniverse <span>Hub</span></strong><p>Os dados dos filmes são fornecidos pelo TMDB. This product uses the TMDB API but is not endorsed or certified by TMDB.</p><a href="https://www.themoviedb.org/" target="_blank" rel="noopener noreferrer">Visitar o TMDB ↗</a></footer>
    </main>
  );
}

export default App;
