import express from "express";

const app = express();

const PORT = Number(process.env.PORT) || 3000;

app.get("/", (_req, res) => {
  res.status(200).send("Welcome to FreshWay Management Bot dashboard.");
});

app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "online",
    timestamp: new Date().toISOString,
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`[Health] Server listening on port ${PORT}`);
});
