// E2E テストで使う補助の関数
import { expect, type Locator, type Page } from "@playwright/test";

export type ColumnId = "todo-cards" | "doing-cards" | "done-cards";

// テストごとに重ならないタイトル（ほかのテストのカードと混ざらないようにする）
export function uniqueTitle(label: string): string {
  return `${label} ${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

// 列の中の、そのタイトルのカード
export function cardIn(page: Page, column: ColumnId, title: string): Locator {
  return page.locator(`#${column} .card`, { hasText: title });
}

// 列のカードの文章（上から順）。expect(...).toHaveText などで確かめると、画面に出るまで自動で待つ
export function textsIn(page: Page, column: ColumnId): Locator {
  return page.locator(`#${column} .card .card-text`);
}

// 「やること」にカードを追加し、末尾に出るのを待つ
export async function addCard(page: Page, title: string, date = ""): Promise<Locator> {
  await page.getByPlaceholder("カードを追加").fill(title);
  if (date) {
    await page.locator(".add-date").fill(date);
  }
  await page.getByRole("button", { name: "追加", exact: true }).click();
  const card = cardIn(page, "todo-cards", title);
  await expect(card).toBeVisible();
  return card;
}

// ページを開き、ボードが出るのを待つ
export async function openBoard(page: Page): Promise<void> {
  await page.goto("/");
  await expect(page.locator("#todo-cards")).toBeVisible();
}
