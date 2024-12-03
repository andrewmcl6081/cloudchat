// import { createServer as createHttpServer } from "http";
// import { createRequestHandler } from "@remix-run/express";
// import compression from "compression";
// import express from "express";
// import morgan from "morgan";
// import { socketServer } from "../services/socket/socket.server";
// import { ServerBuild } from "@remix-run/node";
// import { configService } from "~/services/config/environment.server";
// import path from "path";

// async function initializeApplication() {
//   const app = express();
//   const config = await configService.getConfig();
//   const isProduction = configService.isProdEnvironment(config);
//   const port = isProduction ? process.env.PORT! : config.PORT;

//   const httpServer = createHttpServer(app);

//   // Initialize the socket server with our HTTP server
//   await socketServer.initialize(httpServer);

//   const viteDevServer = isProduction
//     ? undefined
//     : await import("vite").then((vite) =>
//         vite.createServer({
//           server: { middlewareMode: true },
//           appType: "custom",
//         }),
//       );

//   const remixHandler = createRequestHandler({
//     build: viteDevServer
//       ? async () =>
//           (await viteDevServer.ssrLoadModule(
//             "virtual:remix/server-build",
//           )) as ServerBuild
//       : ((await import(
//           path.resolve(__dirname, "../../build/server/index.js")
//         )) as ServerBuild),
//   });

//   app.use(compression());
//   app.disable("x-powered-by");

//   // handle asset requests
//   if (viteDevServer) {
//     app.use(viteDevServer.middlewares);
//   } else {
//     // Vite fingerprints its assets so we can cache forever.
//     app.use(
//       "/assets",
//       express.static("build/client/assets", { immutable: true, maxAge: "1y" }),
//     );
//   }

//   app.use(express.static("../../build/client", { maxAge: "1h" }));
//   app.use(morgan("dev"));

//   // handle SSR requests
//   app.all("*", remixHandler);

//   // For prod process.env.PORT is set by EC2
//   console.log("PORT BEING USED BY HTTPSERVER:", port);
//   httpServer.listen(port, () =>
//     console.log(`Express server listening at http://localhost:${port}`),
//   );
// }

// initializeApplication().catch((error) => {
//   console.error("Failed to initialize application:", error);
//   process.exit(1);
// });

import { createServer } from "http";
import { createRequestHandler } from "@remix-run/express";
import compression from "compression";
import express from "express";
import morgan from "morgan";
import { socketServer } from "../services/socket/socket.server";
import { ServerBuild } from "@remix-run/node";
import { configService } from "~/services/config/environment.server";
import path from "path";

async function initializeApplication() {
  const app = express();
  const httpServer = createServer(app);
  const config = await configService.getConfig();
  const isProduction = configService.isProdEnvironment(config);
  const port = isProduction ? process.env.PORT! : config.PORT;

  // Initialize Socket.IO first
  const io = await socketServer.initialize(httpServer);

  app.use(compression());
  app.disable("x-powered-by");

  // handle asset requests
  if (!isProduction) {
    const viteDevServer = await import("vite").then((vite) =>
      vite.createServer({
        server: { middlewareMode: true },
        appType: "custom",
      }),
    );
    app.use(viteDevServer.middlewares);
  } else {
    app.use(
      "/assets",
      express.static("build/client/assets", { immutable: true, maxAge: "1y" }),
    );
  }

  app.use(express.static("../../build/client", { maxAge: "1h" }));
  app.use(morgan("tiny"));

  // Handle SSR requests AFTER Socket.IO middleware is set up
  const remixHandler = createRequestHandler({
    build: (await import(
      path.resolve(__dirname, "../../build/server/index.js")
    )) as ServerBuild,
  });

  // Handle all other routes with Remix
  app.all("*", remixHandler);

  console.log("PORT BEING USED BY HTTPSERVER:", port);
  httpServer.listen(port, () =>
    console.log(`Express server listening at http://localhost:${port}`),
  );
}

initializeApplication().catch((error) => {
  console.error("Failed to initialize application:", error);
  process.exit(1);
});
