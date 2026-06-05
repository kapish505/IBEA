import { startKeeper } from "./keeper.js";
import http from "http";

startKeeper().catch((err) => {
  console.error("KeeperHub failed to start:", err);
  process.exit(1);
});

// Dummy HTTP server required for Render Free Tier (Web Services must bind to a PORT)
const PORT = process.env.PORT || 8080;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('KeeperHub is awake\\n');
}).listen(PORT, () => {
  console.log(`KeeperHub health check server listening on port ${PORT}`);
});
