import { vitePlugin as remix } from "@remix-run/dev";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    remix({
      future: {
        v3_fetcherPersist: true,
        v3_relativeSplatPath: true,
        v3_throwAbortReason: true,
      },
    }),
    tsconfigPaths(),
  ],
  server: {
    host: "0.0.0.0",
    strictPort: true,
    port: Number(process.env.PORT2),
    hmr: {
      clientPort: Number(process.env.PORT2),
    },
  },
});
