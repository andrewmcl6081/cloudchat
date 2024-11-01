import { createServer } from "http";
import { createRequestHandler } from "@remix-run/express";
import compression from "compression";
import express from "express";
import morgan from "morgan";
import { socketServer } from "./socket.server";
import { ServerBuild } from "@remix-run/node";
import path from "path";

const isProduction = process.env.NODE_ENV === "production";
const app = express();
const httpServer = createServer(app);

// Initialize the socket server with our HTTP server
socketServer.initialize(httpServer);

const viteDevServer = isProduction
  ? undefined
  : await import("vite").then((vite) =>
      vite.createServer({
        server: { middlewareMode: true },
      })
    );

const remixHandler = createRequestHandler({
  build: viteDevServer
    ? async () => (await viteDevServer.ssrLoadModule("virtual:remix/server-build")) as ServerBuild
    : (await import(path.resolve(__dirname, "../../build/server/index.js"))) as ServerBuild,
});

app.use(compression());
app.disable("x-powered-by");

// handle asset requests
if (viteDevServer) {
  app.use(viteDevServer.middlewares);
} else {
  // Vite fingerprints its assets so we can cache forever.
  app.use(
    "/assets",
    express.static("build/client/assets", { immutable: true, maxAge: "1y" })
  );
}

app.use(express.static("../../build/client", { maxAge: "1h" }));
app.use(morgan("tiny"));

// handle SSR requests
app.all("*", remixHandler);

const port = process.env.PORT || 3000;
httpServer.listen(port, () =>
  console.log(`Express server listening at http://localhost:${port}`)
);