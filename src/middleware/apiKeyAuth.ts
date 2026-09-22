import type { NextFunction, Request, Response } from "express";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.warn(
    "WARNING: API_KEY is not set — all requests are being accepted unauthenticated. Set API_KEY before exposing this publicly.",
  );
}

export function apiKeyAuth(req: Request, res: Response, next: NextFunction): void {
  if (!API_KEY) {
    next();
    return;
  }

  const provided = req.header("x-api-key");
  if (provided !== API_KEY) {
    res.status(401).json({ error: "Missing or invalid x-api-key header" });
    return;
  }

  next();
}
