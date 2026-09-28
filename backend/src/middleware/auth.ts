import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";

const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret) {
  throw new Error("JWT_SECRET não está configurado no .env");
}

function getUserId(req: Parameters<RequestHandler>[0]): string | null {
  const token = req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.slice(7)
    : req.headers.cookie?.split(";").map((part) => part.trim())
        .find((part) => part.startsWith("mu_session="))?.slice("mu_session=".length);
  if (!token) return null;
  try {
    const payload = jwt.verify(token, jwtSecret!, {
      algorithms: ["HS256"],
    });
    return typeof payload !== "string" && /^[1-9]\d*$/.test(payload.sub ?? "")
      ? payload.sub! : null;
  } catch {
    return null;
  }
}

export const optionalAuth: RequestHandler = (req, res, next) => {
  const userId = getUserId(req);
  if (userId) res.locals.userId = userId;
  next();
};

export const requireAuth: RequestHandler = (req, res, next) => {
  const userId = getUserId(req);
  if (!userId) {
    res.status(401).json({ message: "É necessário iniciar sessão" });
    return;
  }
  res.locals.userId = userId;
  next();
};
