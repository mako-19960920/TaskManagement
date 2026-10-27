// ページにあるすべての「カードを追加」フォームを取り出す
const forms = document.querySelectorAll(".add-form");

// フォーム1つずつに、同じ処理を設定する
forms.forEach((form) => {
  const input = form.querySelector(".add-input");

  // 入力欄に文字を打ち始めたら、エラー表示を消す
  input.addEventListener("input", () => {
    form.classList.remove("is-error");
  });

  // ボタンが押されたとき（フォームが送信されたとき）の処理
  form.addEventListener("submit", (event) => {
    // ページが再読み込みされるのを止める
    event.preventDefault();

    // 入力欄の文字を取り出す（前後の空白は取り除く）
    const title = input.value.trim();

    // 何も入力されていなければ、エラーを表示して終わる
    if (title === "") {
      form.classList.add("is-error");
      input.focus();
      return;
    }

    // 新しいカードを作る
    const card = document.createElement("div");
    card.className = "card";
    card.textContent = title;

    // このフォームと同じリストの、カード置き場に入れる
    const cards = form.closest(".list").querySelector(".cards");
    cards.appendChild(card);

    // 入力欄を空にする
    input.value = "";
  });
});
