import { useEffect, useState } from "react";
import "./ExamplePlaylists.css";

type ExamplePlaylist = {
  seedId: string;
  name: string;
  owner: string;
  movieCount: number;
};

type PlaylistEntry = {
  tmdbId: number;
  position: number;
};

type PlaylistDetailResponse = {
  playlist: {
    seedId: string;
    name: string;
    owner: string;
  };
  movies: PlaylistEntry[];
};

type MovieInfo = {
  tmdbId: number;
  title: string;
  posterPath: string | null;
};

type DisplayMovie = PlaylistEntry & {
  title: string;
  posterPath: string | null;
};

type ComparisonSide = {
  seedId: string;
  name: string;
  owner: string;
  totalMovies: number;
  ratedMovies: number;
  excludedTmdbIds: number[];
  averageRating: number | null;
};

type Comparison = {
  first: ComparisonSide;
  second: ComparisonSide;
  winnerSeedId: string | null;
  commonTmdbIds: number[];
};

type CommonMovie = {
  tmdbId: number;
  title: string;
};

async function getMovieInfo(tmdbId: number): Promise<MovieInfo> {
  const response = await fetch(`/api/movies/${tmdbId}`);

  if (!response.ok) {
    throw new Error("Falha ao consultar filme");
  }

  const movie = (await response.json()) as MovieInfo;

  return {
    tmdbId,
    title: movie.title,
    posterPath: movie.posterPath,
  };
}

export function ExamplePlaylists() {
  const [playlists, setPlaylists] = useState<ExamplePlaylist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedId, setSelectedId] = useState("");
  const [selectedMovies, setSelectedMovies] = useState<DisplayMovie[]>([]);
  const [moviesLoading, setMoviesLoading] = useState(false);
  const [moviesError, setMoviesError] = useState("");

  const [firstId, setFirstId] = useState("");
  const [secondId, setSecondId] = useState("");
  const [comparison, setComparison] = useState<Comparison | null>(null);
  const [commonMovies, setCommonMovies] = useState<CommonMovie[]>([]);
  const [comparing, setComparing] = useState(false);
  const [compareError, setCompareError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadExamples() {
      try {
        const response = await fetch("/api/playlists/examples");

        if (!response.ok) {
          throw new Error("Falha ao obter playlists");
        }

        const data = (await response.json()) as {
          playlists: ExamplePlaylist[];
        };

        if (active) {
          setPlaylists(data.playlists);
          setFirstId(data.playlists[0]?.seedId ?? "");
          setSecondId(data.playlists[1]?.seedId ?? "");
        }
      } catch {
        if (active) {
          setError("Não foi possível carregar as playlists de exemplo.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadExamples();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedId) return;

    let active = true;

    async function loadSelectedPlaylist() {
      setMoviesLoading(true);
      setMoviesError("");
      setSelectedMovies([]);

      try {
        const response = await fetch(
          `/api/playlists/examples/${encodeURIComponent(selectedId)}`,
        );

        if (!response.ok) {
          throw new Error("Falha ao consultar playlist");
        }

        const data =
          (await response.json()) as PlaylistDetailResponse;

        const results = await Promise.allSettled(
          data.movies.map((entry) => getMovieInfo(entry.tmdbId)),
        );

        const movies = data.movies.map((entry, index) => {
          const result = results[index];

          return {
            ...entry,
            title:
              result.status === "fulfilled"
                ? result.value.title
                : `Filme ${entry.tmdbId}`,
            posterPath:
              result.status === "fulfilled"
                ? result.value.posterPath
                : null,
          };
        });

        if (active) setSelectedMovies(movies);
      } catch {
        if (active) {
          setMoviesError("Não foi possível carregar esta playlist.");
        }
      } finally {
        if (active) setMoviesLoading(false);
      }
    }

    loadSelectedPlaylist();

    return () => {
      active = false;
    };
  }, [selectedId]);

  async function handleCompare() {
    if (!firstId || !secondId || firstId === secondId) return;

    setComparing(true);
    setCompareError("");
    setComparison(null);
    setCommonMovies([]);

    try {
      const params = new URLSearchParams({
        first: firstId,
        second: secondId,
      });

      const response = await fetch(
        `/api/playlists/examples/compare?${params}`,
      );

      if (!response.ok) {
        throw new Error("Falha ao comparar playlists");
      }

      const result = (await response.json()) as Comparison;

      const movieResults = await Promise.allSettled(
        result.commonTmdbIds.map(getMovieInfo),
      );

      const names = result.commonTmdbIds.map((tmdbId, index) => {
        const movieResult = movieResults[index];

        return {
          tmdbId,
          title:
            movieResult.status === "fulfilled"
              ? movieResult.value.title
              : `Filme ${tmdbId}`,
        };
      });

      setComparison(result);
      setCommonMovies(names);
    } catch {
      setCompareError("Não foi possível comparar as playlists.");
    } finally {
      setComparing(false);
    }
  }

  function clearComparison() {
    setComparison(null);
    setCommonMovies([]);
  }

  let resultMessage = "";

  if (comparison) {
    if (
      comparison.first.averageRating === null ||
      comparison.second.averageRating === null
    ) {
      resultMessage = "Não há notas suficientes para escolher uma vencedora.";
    } else if (comparison.winnerSeedId === null) {
      resultMessage = "As playlists estão empatadas.";
    } else {
      const winner =
        comparison.winnerSeedId === comparison.first.seedId
          ? comparison.first
          : comparison.second;

      resultMessage = `Vencedora: ${winner.name}, de ${winner.owner}.`;
    }
  }

  const selectedPlaylist = playlists.find(
    (playlist) => playlist.seedId === selectedId,
  );

  return (
    <section id="examples" className="example-playlists">
      <h2>Playlists de exemplo</h2>
      <p>Listas importadas para explorar e comparar.</p>

      {loading && <p>A carregar playlists…</p>}
      {error && <p role="alert">{error}</p>}

      {!loading && !error && (
        <>
          <ul className="example-playlists__list">
            {playlists.map((playlist) => (
              <li key={playlist.seedId}>
                <h3>{playlist.name}</h3>
                <p>
                  Por {playlist.owner} · {playlist.movieCount} filmes
                </p>
                <button
                  type="button"
                  aria-expanded={selectedId === playlist.seedId}
                  onClick={() =>
                    setSelectedId((current) =>
                      current === playlist.seedId
                        ? ""
                        : playlist.seedId,
                    )
                  }
                >
                  {selectedId === playlist.seedId
                    ? "Ocultar filmes"
                    : "Ver filmes"}
                </button>
              </li>
            ))}
          </ul>

          {selectedId && (
            <section className="example-playlists__detail">
              <h3>Filmes em {selectedPlaylist?.name ?? "playlist"}</h3>

              {moviesLoading && <p>A carregar filmes…</p>}
              {moviesError && <p role="alert">{moviesError}</p>}

              {!moviesLoading && !moviesError && (
                <ol className="example-playlists__movies">
                  {selectedMovies.map((movie) => (
                    <li key={movie.tmdbId}>
                      {movie.posterPath ? (
                        <img
                          src={`https://image.tmdb.org/t/p/w185${movie.posterPath}`}
                          alt={`Cartaz de ${movie.title}`}
                          loading="lazy"
                        />
                      ) : (
                        <span className="example-playlists__no-poster">
                          Sem cartaz
                        </span>
                      )}
                      <span>{movie.title}</span>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          )}

          {playlists.length >= 2 && (
            <div className="example-playlists__comparison">
              <h3>Comparar duas playlists</h3>

              <label htmlFor="first-example">Primeira playlist</label>
              <select
                id="first-example"
                value={firstId}
                disabled={comparing}
                onChange={(event) => {
                  setFirstId(event.target.value);
                  clearComparison();
                }}
              >
                {playlists.map((playlist) => (
                  <option key={playlist.seedId} value={playlist.seedId}>
                    {playlist.name} — {playlist.owner}
                  </option>
                ))}
              </select>

              <label htmlFor="second-example">Segunda playlist</label>
              <select
                id="second-example"
                value={secondId}
                disabled={comparing}
                onChange={(event) => {
                  setSecondId(event.target.value);
                  clearComparison();
                }}
              >
                {playlists.map((playlist) => (
                  <option key={playlist.seedId} value={playlist.seedId}>
                    {playlist.name} — {playlist.owner}
                  </option>
                ))}
              </select>

              <button
                type="button"
                disabled={
                  comparing ||
                  !firstId ||
                  !secondId ||
                  firstId === secondId
                }
                onClick={handleCompare}
              >
                {comparing ? "A comparar…" : "Comparar"}
              </button>

              {firstId === secondId && (
                <p>Escolhe duas playlists diferentes.</p>
              )}
              {compareError && <p role="alert">{compareError}</p>}

              {comparison && (
                <div aria-live="polite">
                  <h4>{resultMessage}</h4>

                  <p>
                    {comparison.first.name}:{" "}
                    {comparison.first.averageRating === null
                      ? "Sem nota"
                      : `${comparison.first.averageRating.toFixed(2)}/10`}
                    {" · "}
                    {comparison.first.ratedMovies} de{" "}
                    {comparison.first.totalMovies} filmes com nota
                  </p>

                  <p>
                    {comparison.second.name}:{" "}
                    {comparison.second.averageRating === null
                      ? "Sem nota"
                      : `${comparison.second.averageRating.toFixed(2)}/10`}
                    {" · "}
                    {comparison.second.ratedMovies} de{" "}
                    {comparison.second.totalMovies} filmes com nota
                  </p>

                  <p>Filmes em comum: {commonMovies.length}</p>

                  {commonMovies.length > 0 && (
                    <ul>
                      {commonMovies.map((movie) => (
                        <li key={movie.tmdbId}>{movie.title}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
