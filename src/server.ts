import express from "express";
import { availabilityRouter } from "./routes/availability.js";
import { apiKeyAuth } from "./middleware/apiKeyAuth.js";

const PORT = process.env.PORT ?? 3000;

const app = express();

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api", apiKeyAuth, availabilityRouter);

app.listen(PORT, () => {
  console.log(`tepuia-yonder-middleware listening on port ${PORT}`);
});
