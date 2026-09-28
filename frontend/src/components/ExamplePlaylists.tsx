import { useEffect, useState } from "react";

type ExamplePlaylist = {
  seedId: string;
  name: string;
  owner: string;
  movieCount: number;
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

export function ExamplePlaylists() {
  const [playlists, setPlaylists] = useState<ExamplePlaylist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [firstId, setFirstId] = useState("");
  const [secondId, setSecondId] = useState("");
  const [comparison, setComparison] = useState<Comparison | null>(null);
  const [comparing, setComparing] = useState(false);
  const [compareError, setCompareError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadExamples() {
      try {
        const response = await fetch("/api/playlists/examples");

        if (!response.ok) {
          throw new Error("Falha ao obter as playlists");
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

  async function handleCompare() {
    if (!firstId || !secondId || firstId === secondId) return;

    setComparing(true);
    setCompareError("");
    setComparison(null);

    try {
      const params = new URLSearchParams({
        first: firstId,
        second: secondId,
      });

      const response = await fetch(
        `/api/playlists/examples/compare?${params}`,
      );

      if (!response.ok) {
        throw new Error("Falha ao comparar as playlists");
      }

      setComparison((await response.json()) as Comparison);
    } catch {
      setCompareError("Não foi possível comparar as playlists.");
    } finally {
      setComparing(false);
    }
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

  return (
    <section className="example-playlists">
      <h2>Playlists de exemplo</h2>
      <p>Listas importadas para explorar e comparar.</p>

      {loading && <p>A carregar playlists…</p>}
      {error && <p role="alert">{error}</p>}

      {!loading && !error && (
        <>
          <ul>
            {playlists.map((playlist) => (
              <li key={playlist.seedId}>
                <strong>{playlist.name}</strong>
                {" · "}
                {playlist.owner}
                {" · "}
                {playlist.movieCount} filmes
              </li>
            ))}
          </ul>

          {playlists.length >= 2 && (
            <div className="playlist-comparison">
              <h3>Comparar duas playlists</h3>

              <label htmlFor="first-example">Primeira playlist</label>
              <select
                id="first-example"
                value={firstId}
                onChange={(event) => {
                  setFirstId(event.target.value);
                  setComparison(null);
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
                onChange={(event) => {
                  setSecondId(event.target.value);
                  setComparison(null);
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

                  <p>
                    Filmes em comum: {comparison.commonTmdbIds.length}
                    {comparison.commonTmdbIds.length > 0 &&
                      ` (IDs TMDB: ${comparison.commonTmdbIds.join(", ")})`}
                  </p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}