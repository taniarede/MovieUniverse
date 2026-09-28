import { Router } from "express";
import argon2 from "argon2";
import jwt from "jsonwebtoken";
import { pool } from "../db";
import { requireAuth } from "../middleware/auth";

export const usersRouter = Router();

const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret) {
  throw new Error("JWT_SECRET não está configurado no .env");
}

usersRouter.post("/users", async (req, res) => {
  const { username, email, password } = req.body ?? {};

  if (
    typeof username !== "string" ||
    username.trim().length < 3 ||
    username.trim().length > 50 ||
    typeof email !== "string" ||
    email.trim().length > 255 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
    typeof password !== "string" ||
    password.length < 12 ||
    password.length > 128
  ) {
    res.status(400).json({
      message: "Indica um nome de 3 a 50 caracteres, um email válido e uma palavra-passe de 12 a 128 caracteres",
    });
    return;
  }

  try {
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });

    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, username, email`,
      [username.trim(), email.trim().toLowerCase(), passwordHash],
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "23505"
    ) {
      res.status(409).json({ message: "Nome de utilizador ou email já existente" });
      return;
    }

    console.error("Erro ao criar utilizador:", error);
    res.status(500).json({ message: "Não foi possível criar o utilizador" });
  }
});


usersRouter.post("/login", async (req, res) => {
  const { email, password } = req.body ?? {};

  if (typeof email !== "string" || typeof password !== "string") {
    res.status(400).json({ message: "Indica email e palavra-passe" });
    return;
  }

  try {
    const result = await pool.query(
      "SELECT id, username, password_hash FROM users WHERE email = $1",
      [email.trim().toLowerCase()],
    );

    const user = result.rows[0] as
      | { id: string; username: string; password_hash: string }
      | undefined;

    if (!user || !(await argon2.verify(user.password_hash, password))) {
      res.status(401).json({ message: "Email ou palavra-passe incorretos" });
      return;
    }

    const token = jwt.sign(
      { sub: user.id },
      jwtSecret,
      { algorithm: "HS256", expiresIn: "1h" },
    );

    res.cookie("mu_session", token, {
      httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 1000, path: "/",
    });
    res.json({ user: { id: user.id, username: user.username } });
  } catch (error) {
    console.error("Erro no login:", error);
    res.status(500).json({ message: "Não foi possível iniciar sessão" });
  }
});


usersRouter.get("/me", requireAuth, async (_req, res) => {
  try {
    const result = await pool.query(
      "SELECT id::text AS id, username FROM users WHERE id = $1 AND seed_name IS NULL",
      [res.locals.userId],
    );
    if (!result.rows[0]) { res.status(401).json({ message: "Sessão inválida" }); return; }
    res.json({ user: result.rows[0] });
  } catch {
    res.status(500).json({ message: "Não foi possível recuperar a sessão" });
  }
});

usersRouter.post("/logout", (_req, res) => {
  res.clearCookie("mu_session", { httpOnly: true, sameSite: "lax", path: "/", secure: process.env.NODE_ENV === "production" });
  res.status(204).send();
});
