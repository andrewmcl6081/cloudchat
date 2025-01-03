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

import { createServer as createHttpServer } from "http";
import { createRequestHandler } from "@remix-run/express";
import compression from "compression";
import express from "express";
import morgan from "morgan";
import { socketServer } from "../services/socket/socket.server";
import { configService } from "~/services/config/environment.server";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function initializeApplication() {
  const app = express();
  const config = await configService.getConfig();
  const isProduction = configService.isProdEnvironment(config);
  const port = parseInt(config.PORT);
  const MODE = isProduction ? "production" : "development";

  const httpServer = createHttpServer(app);

  // Initialize the socket server with our HTTP server
  await socketServer.initialize(httpServer);

  app.use(compression());
  app.use(
    "/build",
    express.static(path.join(__dirname, "../../public/build"), {
      maxAge: "1h",
    }),
  );
  app.use(
    express.static(path.join(__dirname, "../../public"), {
      immutable: true,
      maxAge: "1y",
    }),
  );
  app.use(morgan("tiny"));

  const remixBuild = require("../../build");
  app.use(createRequestHandler({ build: remixBuild, mode: MODE }));

  // For prod process.env.PORT is set by EC2
  console.log("PORT BEING USED BY HTTPSERVER:", port);
  httpServer.listen(port, () =>
    console.log(`Express server listening at http://localhost:${port}`),
  );
}

initializeApplication().catch((error) => {
  console.error("Failed to initialize application:", error);
  process.exit(1);
});
