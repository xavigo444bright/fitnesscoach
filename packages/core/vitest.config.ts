import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      // 只统计核心逻辑（排除类型、夹具、桶文件），见 VT-P1-009
      include: ["src/**/*.ts"],
      exclude: [
        "src/**/*.test.ts",
        "src/types.ts",
        "src/index.ts",
        "src/fixtures/**",
      ],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
  },
});
