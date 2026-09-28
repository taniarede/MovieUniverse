import "dotenv/config";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pool } from "../db";

type SeedFile = {
  versao: string;
  utilizadores: Array<{ nome: string }>;
  playlists: Array<{
    id: string;
    nome: string;
    utilizador: string;
    apagada: boolean;
    filmes: Array<{ tmdb_id: number; ordem: number }>;
  }>;
  notas: Array<{
    utilizador: string;
    tmdb_id: number;
    estrelas: number;
    data: string;
  }>;
};

async function main() {
  const filePath = resolve(
    process.cwd(),
    "seed_playlists",
    "seed_playlists.json",
  );

  const contents = await readFile(filePath, "utf8");
  const seed = JSON.parse(contents) as SeedFile;

  if (
    seed.versao !== "1.0" ||
    !Array.isArray(seed.utilizadores) ||
    !Array.isArray(seed.playlists) ||
    !Array.isArray(seed.notas)
  ) {
    throw new Error("O ficheiro seed não tem o formato esperado");
  }

  const client = await pool.connect();
  const userIds = new Map<string, string>();
  let importedMovies = 0;

  try {
    await client.query("BEGIN");

    for (const user of seed.utilizadores) {
      const result = await client.query<{ id: string }>(
        `INSERT INTO users (username, seed_name)
         VALUES ($1, $2)
         ON CONFLICT (seed_name)
         DO UPDATE SET username = EXCLUDED.username
         RETURNING id`,
        [`seed__${user.nome}`, user.nome],
      );

      userIds.set(user.nome, result.rows[0].id);
    }

    for (const playlist of seed.playlists) {
      const userId = userIds.get(playlist.utilizador);

      if (!userId) {
        throw new Error(`Utilizador desconhecido: ${playlist.utilizador}`);
      }

      const result = await client.query<{ id: string }>(
        `INSERT INTO playlists (user_id, name, is_deleted, seed_id)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (seed_id)
         DO UPDATE SET
           user_id = EXCLUDED.user_id,
           name = EXCLUDED.name,
           is_deleted = EXCLUDED.is_deleted
         RETURNING id`,
        [userId, playlist.nome, playlist.apagada, playlist.id],
      );

      const playlistId = result.rows[0].id;
      const seenMovies = new Set<number>();

      const orderedMovies = [...playlist.filmes].sort(
        (a, b) => a.ordem - b.ordem,
      );

      for (const movie of orderedMovies) {
        if (seenMovies.has(movie.tmdb_id)) {
          continue;
        }

        seenMovies.add(movie.tmdb_id);

        await client.query(
          `INSERT INTO playlist_movies (playlist_id, tmdb_id, position)
           VALUES ($1, $2, $3)
           ON CONFLICT (playlist_id, tmdb_id)
           DO UPDATE SET position = EXCLUDED.position`,
          [playlistId, movie.tmdb_id, movie.ordem],
        );

        importedMovies++;
      }
    }

    for (const rating of seed.notas) {
      const userId = userIds.get(rating.utilizador);

      if (!userId) {
        throw new Error(`Utilizador desconhecido: ${rating.utilizador}`);
      }

      await client.query(
        `INSERT INTO ratings (user_id, tmdb_id, score, created_at)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, tmdb_id)
         DO UPDATE SET
           score = EXCLUDED.score,
           created_at = EXCLUDED.created_at`,
        [
          userId,
          rating.tmdb_id,
          rating.estrelas,
          `${rating.data}T00:00:00Z`,
        ],
      );
    }

    await client.query("COMMIT");

    console.log(
      `Importados: ${seed.utilizadores.length} utilizadores, ` +
        `${seed.playlists.length} playlists, ` +
        `${importedMovies} associações de filmes e ` +
        `${seed.notas.length} notas.`,
    );
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

main()
  .catch((error) => {
    console.error("Erro ao importar os dados de exemplo:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });