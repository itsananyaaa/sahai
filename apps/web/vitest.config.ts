import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@sahai/mvi-spec": path.resolve(__dirname, "../../packages/mvi-spec")
    }
  }
});
