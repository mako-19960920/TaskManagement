// 安全装置。E2E はデータを追加・変更・削除するので、作り直したばかりの E2E 用のデータベース（初期データ6件だけ）でしか動かさない。
// いつものデータベースに間違ってつないだまま動かしても、何も書き換えずにここで止まる。
const INITIAL_TITLES = [
  "買い物リストを作る",
  "メールを返す",
  "企画書の下書き",
  "資料を読み直す",
  "会議室を予約する",
  "日程を共有する",
];

export default async function globalSetup() {
  let body: unknown;
  try {
    const response = await fetch("http://localhost:5173/api/tasks");
    body = await response.json();
  } catch {
    throw new Error("画面（5173）か API（8080）につながりません。scripts/e2e.ps1 から動かしてください。");
  }
  // 中身の形を確かめてから、タイトルだけを取り出す
  const titles = Array.isArray(body)
    ? body.map((task: unknown) => (task && typeof task === "object" && "title" in task ? String(task.title) : ""))
    : [];
  if (JSON.stringify(titles) !== JSON.stringify(INITIAL_TITLES)) {
    throw new Error(
      `つないだ先が、作り直したばかりの E2E 用のデータベースではありません（${titles.length} 件）。` +
        "いつものデータを書き換えないように止めました。scripts/e2e.ps1 から動かしてください。"
    );
  }
}
