// 画面の設定。ここを書き換えると、画面の動きを切り替えられる

// 削除の前の確認の出し方
// - "dialog"  … アプリ内の確認画面（アプリと同じ見た目。消すカードの文章も出す）
// - "browser" … ブラウザ標準の確認（window.confirm。見た目はブラウザごとに違い、変えられない）
export const confirmStyle: "dialog" | "browser" = "dialog";
