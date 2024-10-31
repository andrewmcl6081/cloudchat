import express from "express";
import { createServer } from "http";
import { socketServer } from './socket.server';
import { createRequestHandler } from "@remix-run/express";
import { installGlobals } from "@remix-run/node";
import type { ServerBuild } from "@remix-run/node";

// Initialize Remix Globals
installGlobals();

const app = express();
const httpServer = createServer(app);

// Initialize Socket.IO as singleton
socketServer.initialize(httpServer);


async function startServer() {
  // Dynamically import `build` and cast to `ServerBuild`
  const importedBuild = (await import("../../build")) as unknown as ServerBuild;

  // Use Remix’s request handler for all routes
  app.all(
    "*",
    createRequestHandler({
      build: importedBuild,
      mode: process.env.NODE_ENV
    })
  );

  // Start the server
  const port = process.env.PORT || 3000;
  httpServer.listen(port, () => console.log(`Server listening on port ${port}`));
}

startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
