// ボードの操作の E2E テスト（追加、移動ボタン、ドラッグ、非表示、削除、検索、2つのタブ）
import { expect, test, type Page } from "@playwright/test";
import { addCard, cardIn, openBoard, textsIn, uniqueTitle } from "./helpers";

// 1件の保存（PUT・DELETE /api/tasks/...）が終わるのを待つ。再読み込みの前に呼ぶ
function savedResponse(page: Page, method: "PUT" | "DELETE") {
  return page.waitForResponse(
    (response) => response.request().method() === method && /\/api\/tasks\/\d+/.test(response.url())
  );
}

test.beforeEach(async ({ page }) => {
  await openBoard(page);
});

test.describe("追加", () => {
  test("文章と日付を入れて追加すると、やることの末尾に出て、入力欄が空になる", async ({ page }) => {
    const title = uniqueTitle("請求書を送る");
    const card = await addCard(page, title, "2026-11-30");

    await expect(card.locator(".card-date")).toHaveText("2026年11月30日");
    await expect(textsIn(page, "todo-cards").last()).toHaveText(title);
    await expect(page.getByPlaceholder("カードを追加")).toHaveValue("");

    await page.reload();
    await expect(cardIn(page, "todo-cards", title)).toBeVisible();
  });

  test("文章は 255 文字までしか入力できない", async ({ page }) => {
    const input = page.getByPlaceholder("カードを追加");
    await input.click();
    await page.keyboard.insertText("あ".repeat(300));
    await expect(input).toHaveValue("あ".repeat(255));
  });
});

test.describe("移動", () => {
  test("移動ボタンで、行き先の列の末尾へ移り、その列へのボタンが消える", async ({ page }) => {
    const title = uniqueTitle("移動ボタン");
    const card = await addCard(page, title);

    const saved = savedResponse(page, "PUT");
    await card.getByRole("button", { name: "完了へ" }).click();
    await saved;

    const moved = cardIn(page, "done-cards", title);
    await expect(moved).toBeVisible();
    await expect(textsIn(page, "done-cards").last()).toHaveText(title);
    await expect(moved.getByRole("button", { name: "完了へ" })).toHaveCount(0);

    await page.reload();
    await expect(textsIn(page, "done-cards").last()).toHaveText(title);
  });

  test("カードをドラッグして、別の列へ移せる", async ({ page }) => {
    const title = uniqueTitle("ドラッグ");
    const card = await addCard(page, title);

    // カードの文章をつかみ、少しずつ動かして（4px 以上でドラッグが始まる）、進行中の列の下のほうで離す
    const from = await card.locator(".card-text").boundingBox();
    const column = await page.locator('section[data-column="doing-cards"]').boundingBox();
    if (!from || !column) {
      throw new Error("カードか列の位置が分かりません");
    }
    const saved = savedResponse(page, "PUT");
    await page.mouse.move(from.x + 10, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(from.x + 20, from.y + from.height / 2, { steps: 5 });
    await page.mouse.move(column.x + column.width / 2, column.y + column.height - 10, { steps: 20 });
    await page.mouse.up();
    await saved;

    await expect(cardIn(page, "doing-cards", title)).toBeVisible();
    await expect(cardIn(page, "todo-cards", title)).toHaveCount(0);

    await page.reload();
    await expect(cardIn(page, "doing-cards", title)).toBeVisible();
  });
});

test.describe("非表示", () => {
  test("非表示にするとボードから消えて非表示欄に移り、表示に戻すと元の列に戻る", async ({ page }) => {
    const title = uniqueTitle("非表示");
    const card = await addCard(page, title);

    const hidden = savedResponse(page, "PUT");
    await card.getByRole("button", { name: "非表示" }).click();
    await hidden;
    await expect(cardIn(page, "todo-cards", title)).toHaveCount(0);

    await page.reload();
    await page.locator(".hidden-summary").click();
    const item = page.locator(".hidden-item", { hasText: title });
    await expect(item).toContainText("やること");

    const shown = savedResponse(page, "PUT");
    await item.getByRole("button", { name: "表示に戻す" }).click();
    await shown;
    await expect(cardIn(page, "todo-cards", title)).toBeVisible();
    await expect(page.locator(".hidden-item", { hasText: title })).toHaveCount(0);
  });
});

test.describe("削除", () => {
  test("削除は確認を出し、「やめる」なら残り、「削除する」なら消える", async ({ page }) => {
    const title = uniqueTitle("削除");
    const card = await addCard(page, title);
    const dialog = page.locator(".confirm-dialog");

    await card.getByRole("button", { name: "削除" }).click();
    await expect(dialog).toContainText("削除していいですか？");
    await expect(dialog).toContainText(title);
    await dialog.getByRole("button", { name: "やめる" }).click();
    await expect(cardIn(page, "todo-cards", title)).toBeVisible();

    await card.getByRole("button", { name: "削除" }).click();
    const deleted = savedResponse(page, "DELETE");
    await dialog.getByRole("button", { name: "削除する" }).click();
    await deleted;
    await expect(cardIn(page, "todo-cards", title)).toHaveCount(0);

    await page.reload();
    await expect(page.locator("#todo-cards")).toBeVisible();
    await expect(cardIn(page, "todo-cards", title)).toHaveCount(0);
  });
});

test.describe("検索", () => {
  test("キーワードで探すと、合うカードだけと件数が出て、解除で元に戻る", async ({ page }) => {
    const word = uniqueTitle("検索語");
    await addCard(page, `${word} その1`);
    await addCard(page, `${word} その2`);

    await page.getByLabel("キーワード").fill(word);
    await page.getByRole("button", { name: "検索", exact: true }).click();
    await expect(page.locator(".search-status")).toHaveText(
      "検索結果：2件（検索中は列の移動、非表示、削除ができます）"
    );
    await expect(textsIn(page, "todo-cards")).toHaveText([`${word} その1`, `${word} その2`]);
    // 検索中は追加欄を出さない
    await expect(page.getByPlaceholder("カードを追加")).toHaveCount(0);

    await page.getByRole("button", { name: "解除", exact: true }).click();
    await expect(page.locator(".search-status")).toHaveCount(0);
    await expect(page.getByPlaceholder("カードを追加")).toBeVisible();
    // 検索に合わない初期データのカードも、また出る
    await expect(cardIn(page, "todo-cards", "メールを返す")).toBeVisible();
  });

  test("期限の範囲が逆なら、サーバーが返した理由を出す", async ({ page }) => {
    await page.getByLabel("期限（から）").fill("2026-12-31");
    await page.getByLabel("期限（まで）").fill("2026-12-01");
    await page.getByRole("button", { name: "検索", exact: true }).click();
    await expect(page.locator(".board-error")).toHaveText(
      "検索できませんでした。期限（から）が期限（まで）より後です（2026-12-31 〜 2026-12-01）。"
    );
  });
});

test.describe("2つのタブ", () => {
  test("2つのタブでそれぞれ追加しても、どちらのカードも消えない", async ({ page, context }) => {
    const other = await context.newPage();
    await openBoard(other);

    const first = uniqueTitle("タブ1");
    const second = uniqueTitle("タブ2");
    await addCard(page, first);
    // もう一方のタブは、まだ first を知らないまま追加する
    await addCard(other, second);

    await page.reload();
    await expect(cardIn(page, "todo-cards", first)).toBeVisible();
    await expect(cardIn(page, "todo-cards", second)).toBeVisible();
  });
});
