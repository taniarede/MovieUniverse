import { useEffect, useState } from "react";
import { RatingStars } from "./RatingStars";
import "./ExamplePlaylists.css";

type PublicPlaylist = { seedId: string; name: string; owner: string; movieCount: number };
type Option = { ref: string; name: string; owner: string; count?: number; personal: boolean };
type Movie = { tmdbId: number; title: string; posterPath: string | null; tmdbRating: number; tmdbVotes: number };
type ComparisonSide = { ref: string; name: string; owner: string; totalMovies: number; ratedMovies: number; excludedTmdbIds: number[]; averageRating: number | null };
type Comparison = { first: ComparisonSide; second: ComparisonSide; winnerRef: string | null; commonTmdbIds: number[] };
type Props = Readonly<{ mode: "lists" | "compare"; myPlaylists: { id: string; name: string }[]; username: string | null; onSelectMovie: (id: number) => void }>;

export function ExamplePlaylists({ mode, myPlaylists, username, onSelectMovie }: Props) {
  const [publicLists, setPublicLists] = useState<PublicPlaylist[]>([]);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Option | null>(null);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [moviesLoading, setMoviesLoading] = useState(false);
  const [moviesError, setMoviesError] = useState("");
  const [first, setFirst] = useState("");
  const [second, setSecond] = useState("");
  const [comparison, setComparison] = useState<Comparison | null>(null);
  const [compareError, setCompareError] = useState("");
  const [comparing, setComparing] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/playlists/examples").then(async (response) => {
      if (!response.ok) throw new Error();
      const data = (await response.json()) as { playlists: PublicPlaylist[] };
      if (active) setPublicLists(data.playlists);
    }).catch(() => { if (active) setError("Não foi possível carregar as playlists públicas."); });
    return () => { active = false; };
  }, []);

  const options: Option[] = [
    ...myPlaylists.map((item) => ({ ref: `mine:${item.id}`, name: item.name, owner: username ?? "Eu", personal: true })),
    ...publicLists.map((item) => ({ ref: item.seedId, name: item.name, owner: item.owner, count: item.movieCount, personal: false })),
  ];
  const firstRef = first || options[0]?.ref || "";
  const secondRef = second || options.find((item) => item.ref !== firstRef)?.ref || "";

  useEffect(() => {
    if (!selected) return;
    requestAnimationFrame(() => document.querySelector(".example-playlists__detail")?.scrollIntoView({ behavior: "smooth", block: "start" }));
    let active = true;
    async function load() {
      setMoviesLoading(true); setMoviesError(""); setMovies([]);
      try {
        const route = selected!.personal
          ? `/api/playlists/${selected!.ref.slice(5)}/movies`
          : `/api/playlists/examples/${selected!.ref}`;
        const response = await fetch(route);
        if (!response.ok) throw new Error();
        const data = (await response.json()) as { movies: { tmdbId: number }[] };
        const results = await Promise.allSettled(data.movies.map(async ({ tmdbId }) => {
          const detail = await fetch(`/api/movies/${tmdbId}`);
          if (!detail.ok) throw new Error();
          return (await detail.json()) as Movie;
        }));
        if (active) setMovies(results.map((result, index) => result.status === "fulfilled" ? result.value : { tmdbId: data.movies[index].tmdbId, title: `Filme ${data.movies[index].tmdbId}`, posterPath: null, tmdbRating: 0, tmdbVotes: 0 }));
      } catch { if (active) setMoviesError("Não foi possível abrir esta playlist."); }
      finally { if (active) setMoviesLoading(false); }
    }
    void load();
    return () => { active = false; };
  }, [selected]);

  async function handleCompare() {
    if (!firstRef || !secondRef || firstRef === secondRef) return;
    setComparing(true); setCompareError(""); setComparison(null);
    try {
      const params = new URLSearchParams({ first: firstRef, second: secondRef });
      const response = await fetch(`/api/playlists/compare?${params}`);
      if (!response.ok) throw new Error();
      setComparison((await response.json()) as Comparison);
    } catch { setCompareError("Não foi possível comparar estas playlists."); }
    finally { setComparing(false); }
  }

  return <section className="example-playlists" id={mode === "lists" ? "mu-lists" : "mu-compare"}>
    {mode === "lists" ? <>
      <span className="eyebrow">AS TUAS + PÚBLICAS</span><h2>Todas as <em>playlists.</em></h2>
      {error && <p role="alert">{error}</p>}
      {!error && options.length === 0 && <p>A carregar playlists…</p>}
      <ul className="example-playlists__list">{options.map((item, index) => <li key={item.ref}><button type="button" className="example-playlists__card" aria-expanded={selected?.ref === item.ref} onClick={() => setSelected(selected?.ref === item.ref ? null : item)}><span className={`example-playlists__art example-playlists__art--${index % 3}`} aria-hidden="true" /><strong>{item.name}</strong><small>{item.owner} · {item.personal ? "minha" : "pública"}{item.count !== undefined ? ` · ${item.count} filmes` : ""}</small><span>Ver filmes ↗</span></button></li>)}</ul>
      {selected && <section className="example-playlists__detail" aria-live="polite"><div className="section-heading"><h3>Filmes em {selected.name}</h3><button type="button" onClick={() => setSelected(null)}>Fechar lista ×</button></div>{moviesLoading && <p>A carregar filmes…</p>}{moviesError && <p role="alert">{moviesError}</p>}{!moviesLoading && !moviesError && movies.length === 0 && <p>Esta playlist ainda não tem filmes.</p>}<ul className="playlist-film-grid">{movies.map((movie) => <li key={movie.tmdbId}><button type="button" onClick={() => onSelectMovie(movie.tmdbId)} aria-label={`Ver detalhes de ${movie.title}`}>{movie.posterPath ? <img src={`https://image.tmdb.org/t/p/w342${movie.posterPath}`} alt="" loading="lazy" /> : <span className="playlist-film-grid__empty">Sem cartaz</span>}<strong>{movie.title}</strong><RatingStars score={movie.tmdbVotes ? movie.tmdbRating : null} /><small>{movie.tmdbVotes ? `${movie.tmdbRating.toFixed(1)}/10 · TMDB` : "Sem votos"}</small></button></li>)}</ul></section>}
    </> : <><span className="eyebrow">AS TUAS + PÚBLICAS</span><h2>Compara <em>playlists.</em></h2><p>Escolhe quaisquer duas playlists visíveis. As listas pessoais de outras pessoas permanecem privadas.</p>{error && <p role="alert">{error}</p>}<div className="example-playlists__comparison"><label htmlFor="first-playlist">Primeira playlist<select id="first-playlist" value={firstRef} onChange={(event) => { setFirst(event.target.value); setComparison(null); }}>{options.map((item) => <option key={item.ref} value={item.ref}>{item.name} — {item.owner}</option>)}</select></label><label htmlFor="second-playlist">Segunda playlist<select id="second-playlist" value={secondRef} onChange={(event) => { setSecond(event.target.value); setComparison(null); }}>{options.map((item) => <option key={item.ref} value={item.ref}>{item.name} — {item.owner}</option>)}</select></label><button type="button" disabled={comparing || !firstRef || !secondRef || firstRef === secondRef} onClick={() => void handleCompare()}>{comparing ? "A comparar…" : "Comparar ↗"}</button></div>{firstRef === secondRef && <p>Escolhe duas playlists diferentes.</p>}{compareError && <p role="alert">{compareError}</p>}{comparison && <div className="comparison-result" aria-live="polite"><h3>{comparison.winnerRef === null ? "Empate ou dados insuficientes" : `Vencedora: ${comparison.winnerRef === comparison.first.ref ? comparison.first.name : comparison.second.name}`}</h3><p>{comparison.first.name}: {comparison.first.averageRating?.toFixed(2) ?? "Sem nota"}/10 · {comparison.first.ratedMovies} de {comparison.first.totalMovies} filmes avaliados</p><p>{comparison.second.name}: {comparison.second.averageRating?.toFixed(2) ?? "Sem nota"}/10 · {comparison.second.ratedMovies} de {comparison.second.totalMovies} filmes avaliados</p><p>{comparison.commonTmdbIds.length} filmes em comum</p></div>}</>}
  </section>;
}
