// タスク詳細の画面の E2E テスト（開く・閉じる・編集・ステータス）
import { expect, test } from "@playwright/test";
import { addCard, cardIn, openBoard, uniqueTitle } from "./helpers";

test.beforeEach(async ({ page }) => {
  await openBoard(page);
});

test("カードを押すと詳細が開き、編集して保存すると、詳細とボードの両方に出る", async ({ page }) => {
  const title = uniqueTitle("詳細");
  const card = await addCard(page, title, "2026-11-30");
  const dialog = page.locator(".detail-dialog");

  await card.locator(".card-text").click();
  await expect(dialog.locator(".detail-title")).toHaveText(title);
  await expect(dialog).toContainText("2026年11月30日");

  await dialog.getByRole("button", { name: "編集" }).click();
  const edited = `${title}（編集）`;
  await dialog.getByLabel("タイトル").fill(edited);
  await dialog.getByLabel("説明").fill("1行目\n2行目");
  await dialog.getByLabel("優先度").selectOption("high");
  await dialog.getByRole("button", { name: "保存" }).click();

  await expect(dialog.locator(".detail-title")).toHaveText(edited);
  await expect(dialog.locator(".detail-text").first()).toHaveText("1行目\n2行目");
  await expect(dialog.locator(".priority-badge")).toHaveText("高");
  await dialog.getByRole("button", { name: "閉じる" }).click();
  await expect(cardIn(page, "todo-cards", edited)).toBeVisible();

  await page.reload();
  await cardIn(page, "todo-cards", edited).locator(".card-text").click();
  await expect(dialog.locator(".priority-badge")).toHaveText("高");
});

test("編集中に閉じると保存されず、開き直すと見る表示から始まる", async ({ page }) => {
  const title = uniqueTitle("閉じる");
  const card = await addCard(page, title);
  const dialog = page.locator(".detail-dialog");

  await card.locator(".card-text").click();
  await dialog.getByRole("button", { name: "編集" }).click();
  await dialog.getByLabel("タイトル").fill("保存しない文字");
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();

  await card.getByRole("button", { name: "詳細" }).click();
  await expect(dialog.locator(".detail-title")).toHaveText(title);
  await expect(dialog.getByLabel("タイトル")).toHaveCount(0);
});

test("タイトルを空にして保存すると、入力を促し、送らない", async ({ page }) => {
  const title = uniqueTitle("空のタイトル");
  const card = await addCard(page, title);
  const dialog = page.locator(".detail-dialog");

  await card.locator(".card-text").click();
  await dialog.getByRole("button", { name: "編集" }).click();
  await dialog.getByLabel("タイトル").fill("   ");
  await dialog.getByRole("button", { name: "保存" }).click();
  await expect(dialog.getByRole("alert")).toHaveText("タイトルを入力してください。");
});

test("ステータスのボタンで、その列の末尾へ移る", async ({ page }) => {
  const title = uniqueTitle("ステータス");
  const card = await addCard(page, title);
  const dialog = page.locator(".detail-dialog");

  await card.locator(".card-text").click();
  await dialog.getByRole("button", { name: "進行中" }).click();
  await expect(dialog.getByRole("button", { name: "進行中" })).toHaveAttribute("aria-pressed", "true");
  await dialog.getByRole("button", { name: "閉じる" }).click();
  await expect(cardIn(page, "doing-cards", title)).toBeVisible();
});
