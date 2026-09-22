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

  // Accept the key via header (proper API usage) or query param (so it's
  // testable by just pasting a URL in a browser).
  const provided = req.header("x-api-key") ?? req.query.api_key;
  if (provided !== API_KEY) {
    res.status(401).json({ error: "Missing or invalid API key (x-api-key header or ?api_key=)" });
    return;
  }

  next();
}
