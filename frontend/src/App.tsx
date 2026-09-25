import { useState, type SubmitEvent } from "react";
import "./App.css";

type Movie = {
  tmdbId: number;
  title: string;
  releaseDate?: string;
  overview: string;
  tmdbRating: number;
};

type SearchResponse = {
  totalResults: number;
  movies: Movie[];
};


type MovieDetail = Movie & {
  tmdbVotes: number;
  appAverage: number | null;
  appVotes: number;
  combinedRating: number | null;
  runtimeMinutes: number | null;
  genres: string[];
};


function App() {
  const [query, setQuery] = useState("");
  const [movies, setMovies] = useState<Movie[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedMovie, setSelectedMovie] = useState<MovieDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  async function handleSearch(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    const term = query.trim();
    if (!term) return;

    setLoading(true);
    setError("");
    setSelectedMovie(null);

    try {
      const params = new URLSearchParams({ query: term });
      const response = await fetch(`/api/movies/search?${params}`);

      if (!response.ok) {
        throw new Error("A pesquisa falhou.");
      }

      const data = (await response.json()) as SearchResponse;
      setMovies(data.movies);
      setTotalResults(data.totalResults);
    } catch {
      setError("Não foi possível pesquisar filmes. Confirma que o backend está ligado.");
    } finally {
      setLoading(false);
    }
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


  return (
    <main className="app">
      <h1>MovieUniverse</h1>
      <p>Pesquisa filmes e descobre as suas avaliações.</p>

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

      {error && <p role="alert">{error}</p>}


      {detailLoading && <p>A carregar detalhes…</p>}

      {selectedMovie && (
        <section className="movie-detail">
          {/* Aqui fica o conteúdo dos detalhes da mensagem anterior */}
        </section>
      )}


      {movies.length > 0 && (
        <p>Encontrados {totalResults} resultados. A mostrar a primeira página.</p>
      )}

      <ul className="movie-list">
        {movies.map((movie) => (
          <li key={movie.tmdbId}>
            <h2>{movie.title}</h2>
            <p>
              Lançamento: {movie.releaseDate || "Por anunciar"} ·
              TMDB: {movie.tmdbRating.toFixed(1)}/10
            </p>
            <p>{movie.overview || "Sem sinopse disponível."}</p>
            <button type="button" onClick={() => handleSelectMovie(movie.tmdbId)}>
              Ver detalhes
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}

export default App;