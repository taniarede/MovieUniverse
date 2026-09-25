import "dotenv/config";
import express from "express";
import { pool } from "./db";
import { moviesRouter } from "./routes/movies";
import { usersRouter } from "./routes/users";
import { playlistsRouter } from "./routes/playlists";
import { ratingsRouter } from "./routes/ratings";


const app = express();
app.use(express.json({ limit: "16kb" }));
const port = 3000;



app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/db-health", async (_req, res) => {
  try {
    const result = await pool.query("SELECT current_database() AS database");
    res.json({ status: "ok", database: result.rows[0].database });
  } catch (error) {
    console.error("Erro ao ligar ao PostgreSQL:", error);
    res.status(500).json({ status: "error", message: "Falha na ligação à base de dados" });
  }
});






app.use("/movies", moviesRouter);
app.use(usersRouter);
app.use("/playlists", playlistsRouter);
app.use("/ratings", ratingsRouter);

app.listen(port, () => {
  console.log(`Servidor disponível em http://localhost:${port}`);
});