// E2E テスト（Playwright）の設定。本物のブラウザで画面を操作し、画面・API・データベースがつながって動くかを確かめる。
// サーバーは Playwright では起動しない（ポートは 8080・5173 に決まっているため）。
// 手元では scripts/e2e.ps1、CI では .github/workflows/ci.yml の e2e のジョブが、E2E 用のデータベースでサーバーを起動してから動かす。
import { defineConfig, devices } from "@playwright/test";

const ci = Boolean(process.env.CI);

export default defineConfig({
  testDir: "e2e",
  // Vitest のテスト（*.test.ts）と分けるため、E2E は *.e2e.ts にする
  testMatch: "**/*.e2e.ts",
  // つないだ先が、作り直したばかりの E2E 用のデータベースかを確かめる（違えば止める）
  globalSetup: "./e2e/global-setup.ts",
  // データベースを共有するので、テストは1つずつ順に動かす
  fullyParallel: false,
  workers: 1,
  // CI では、たまたまの失敗に備えて1回だけやり直す
  retries: ci ? 1 : 0,
  reporter: ci ? [["github"], ["html", { open: "never" }]] : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:5173",
    // 失敗したときだけ、操作の記録と画面の写真を残す（playwright-report で見られる）
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      // 手元では PC に入っている Edge を使う（ダウンロード不要）。CI では Chromium を使う
      name: ci ? "chromium" : "msedge",
      use: {
        ...devices["Desktop Chrome"],
        channel: ci ? undefined : "msedge",
        viewport: { width: 1280, height: 1200 },
      },
    },
  ],
});
