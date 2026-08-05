import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    // DB を使うテストは1ファイルにつき1つの一時ファイルを持つ。
    // ワーカーごとにプロセスが分かれるので、テスト間で状態が混ざらない。
    include: ["tests/**/*.test.ts"],
  },
});
