import { defineConfig } from "vitest/config";

export default defineConfig({
  // os testes ponta a ponta (pasta e2e) são do Playwright, não do vitest
  test: { exclude: ["e2e/**", "node_modules/**", ".next*/**"] },
});
