// server.js
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import parseJobHandler from "./api/parse-job.js";
// import otherHandler from "./api/other-endpoint.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(express.json({ limit: "1mb" }));

// Health check for the ALB target group
app.get("/health", (req, res) => res.status(200).send("ok"));

// Mount former Vercel functions as routes
app.post("/api/parse-job", (req, res) => parseJobHandler(req, res));
// app.post("/api/other-endpoint", (req, res) => otherHandler(req, res));

// Serve the built Vite frontend
app.use(express.static(path.join(__dirname, "dist")));

// SPA fallback — must come after API routes and static files
app.get("/*splat", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Job Tag listening on port ${port}`));