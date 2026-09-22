import express from "express";
import { availabilityRouter } from "./routes/availability.js";

const PORT = process.env.PORT ?? 3000;

const app = express();

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api", availabilityRouter);

app.listen(PORT, () => {
  console.log(`tepuia-yonder-middleware listening on port ${PORT}`);
});
