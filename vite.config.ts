import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { writeFileSync } from "fs";

// При всеки build записва version.json в dist – за автоматична проверка за нова версия
function versionPlugin() {
  return {
    name: "version-file",
    closeBundle() {
      const outDir = path.resolve(__dirname, "dist");
      const version = {
        buildTime: new Date().toISOString(),
        version: Date.now().toString(),
      };
      writeFileSync(path.join(outDir, "version.json"), JSON.stringify(version, null, 0));
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const supabaseUrl = (env.VITE_SUPABASE_URL || "").trim().replace(/\/$/, "");
  const devEdgeProxy: Record<string, import("vite").ProxyOptions> = {};
  if (supabaseUrl.startsWith("https://") && supabaseUrl.includes("supabase.co")) {
    // Локален dev: заявката остава same-origin → няма CORS preflight към *.supabase.co
    devEdgeProxy["/__sb-fn/list-discord-role-members"] = {
      target: supabaseUrl,
      changeOrigin: true,
      secure: true,
      rewrite: () => "/functions/v1/list-discord-role-members",
    };
  }

  return {
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    proxy: devEdgeProxy,
  },
  plugins: [react(), versionPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    target: "esnext",
    minify: "esbuild",
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          // Тежки библиотеки — отделни файлове, за по-малък начален download
          if (id.includes("recharts")) return "vendor-recharts";
          if (id.includes("@supabase/supabase-js")) return "vendor-supabase";
          if (id.includes("@tanstack/react-query")) return "vendor-react-query";
        },
      },
    },
  },
  esbuild: mode === "production" ? { drop: ["debugger"] } : {},
};
});
