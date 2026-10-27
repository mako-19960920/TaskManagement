const addForm = document.querySelector("#add-form");
const addInput = document.querySelector("#add-input");
const addDate = document.querySelector("#add-date");
const todoCards = document.querySelector("#todo-cards");
const board = document.querySelector(".board");

const moveLabels = {
  "todo-cards": "やることへ",
  "doing-cards": "進行中へ",
  "done-cards": "完了へ",
};

function createMoveButtons() {
  const moves = document.createElement("div");
  moves.className = "card-moves";

  for (const [id, label] of Object.entries(moveLabels)) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "move-button";
    button.dataset.target = id;
    button.textContent = label;
    moves.append(button);
  }

  return moves;
}

function refreshMoveButtons(card) {
  const currentId = card.parentElement.id;
  card.querySelectorAll(".move-button").forEach((button) => {
    button.hidden = button.dataset.target === currentId;
  });
}

let draggedCard = null;

function clearDropTarget() {
  document.querySelectorAll(".list").forEach((list) => {
    list.classList.remove("is-drop-target");
  });
}

function listAtPoint(x, y) {
  const card = draggedCard;
  if (card) {
    card.style.pointerEvents = "none";
  }
  const element = document.elementFromPoint(x, y);
  if (card) {
    card.style.pointerEvents = "";
  }
  return element ? element.closest(".list") : null;
}

function endDrag(card) {
  card.classList.remove("is-dragging");
  if (draggedCard === card) {
    draggedCard = null;
  }
  clearDropTarget();
}

function enableDrag(card) {
  card.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || event.target.closest("button, input")) {
      return;
    }

    event.preventDefault();
    draggedCard = card;
    card.classList.add("is-dragging");
    card.setPointerCapture(event.pointerId);
  });

  card.addEventListener("pointermove", (event) => {
    if (draggedCard !== card) {
      return;
    }

    const list = listAtPoint(event.clientX, event.clientY);
    document.querySelectorAll(".list").forEach((item) => {
      item.classList.toggle("is-drop-target", item === list);
    });
  });

  card.addEventListener("pointerup", (event) => {
    if (draggedCard !== card) {
      return;
    }

    const list = listAtPoint(event.clientX, event.clientY);
    if (list) {
      const cards = list.querySelector(".cards");
      const afterCard = cardAfterCursor(cards, event.clientY);
      if (afterCard) {
        cards.insertBefore(card, afterCard);
      } else {
        cards.appendChild(card);
      }
      refreshMoveButtons(card);
      saveBoard();
    }
    endDrag(card);
  });

  card.addEventListener("pointercancel", () => {
    endDrag(card);
  });
}

function cardAfterCursor(list, y) {
  const cards = [...list.querySelectorAll(".card:not(.is-dragging)")];
  for (const card of cards) {
    const box = card.getBoundingClientRect();
    const middle = box.top + box.height / 2;
    if (y < middle) {
      return card;
    }
  }
  return null;
}

function formatCardDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return "";
  }
  return `${match[1]}年${Number(match[2])}月${Number(match[3])}日`;
}

function ensureCardMain(card) {
  const existing = card.querySelector(".card-main");
  if (existing) {
    return existing;
  }

  const text = card.querySelector(".card-text");
  const main = document.createElement("div");
  main.className = "card-main";
  text.replaceWith(main);
  main.append(text);
  return main;
}

function applyCardDate(card, date) {
  const valid = formatCardDate(date) ? date : "";
  const input = card.querySelector(".card-date-input");
  if (input && input.value !== valid) {
    input.value = valid;
  }

  let cardDate = card.querySelector(".card-date");
  if (!valid) {
    if (cardDate) {
      cardDate.remove();
    }
    return;
  }

  if (!cardDate) {
    cardDate = document.createElement("time");
    cardDate.className = "card-date";
    input.before(cardDate);
  }
  cardDate.dateTime = valid;
  cardDate.textContent = formatCardDate(valid);
}

function createDateInput(date) {
  const input = document.createElement("input");
  input.className = "card-date-input";
  input.type = "date";
  input.setAttribute("aria-label", "日付");
  if (formatCardDate(date)) {
    input.value = date;
  }
  input.addEventListener("pointerdown", (event) => {
    event.stopPropagation();
  });
  input.addEventListener("change", () => {
    const card = input.closest(".card");
    applyCardDate(card, input.value);
    saveBoard();
  });
  return input;
}

function mountCardDate(card, date) {
  const main = ensureCardMain(card);
  if (!main.querySelector(".card-date-input")) {
    main.append(createDateInput(date));
  }
  applyCardDate(card, date);
}

function createCard(text, date) {
  const card = document.createElement("li");
  card.className = "card";

  const cardTop = document.createElement("div");
  cardTop.className = "card-top";

  const cardMain = document.createElement("div");
  cardMain.className = "card-main";

  const cardText = document.createElement("span");
  cardText.className = "card-text";
  cardText.textContent = text;
  cardMain.append(cardText);

  const deleteButton = document.createElement("button");
  deleteButton.className = "delete-button";
  deleteButton.type = "button";
  deleteButton.textContent = "削除";

  cardTop.append(cardMain, deleteButton);
  card.append(cardTop, createMoveButtons());
  mountCardDate(card, date);
  enableDrag(card);
  return card;
}

const storageKey = "task-board";

function boardDataFromPage() {
  const boardData = {};
  for (const id of Object.keys(moveLabels)) {
    const list = document.querySelector("#" + id);
    boardData[id] = [...list.querySelectorAll(".card")].map((card) => {
      const input = card.querySelector(".card-date-input");
      const dateNode = card.querySelector(".card-date");
      const raw = input ? input.value : dateNode ? dateNode.dateTime : "";
      return {
        text: card.querySelector(".card-text").textContent,
        date: formatCardDate(raw) ? raw : "",
      };
    });
  }
  return boardData;
}

function saveBoard() {
  localStorage.setItem(storageKey, JSON.stringify(boardDataFromPage()));
}

function renderBoard(boardData) {
  for (const id of Object.keys(moveLabels)) {
    const list = document.querySelector("#" + id);
    list.replaceChildren();
    const items = Array.isArray(boardData[id]) ? boardData[id] : [];
    for (const item of items) {
      const cardData = cardFromSaved(item);
      if (!cardData) {
        continue;
      }
      const card = createCard(cardData.text, cardData.date);
      list.appendChild(card);
      refreshMoveButtons(card);
    }
  }
}

function cardFromSaved(item) {
  if (typeof item === "string") {
    return { text: item, date: "" };
  }
  if (!item || typeof item !== "object" || typeof item.text !== "string") {
    return null;
  }
  const date = formatCardDate(item.date) ? item.date : "";
  return { text: item.text, date };
}

function setupInitialCards() {
  document.querySelectorAll(".card").forEach((card) => {
    mountCardDate(card, "");
    card.append(createMoveButtons());
    refreshMoveButtons(card);
    enableDrag(card);
  });
}

function loadBoard() {
  const saved = localStorage.getItem(storageKey);
  if (!saved) {
    setupInitialCards();
    return;
  }

  try {
    const boardData = JSON.parse(saved);
    if (!boardData || typeof boardData !== "object") {
      setupInitialCards();
      return;
    }
    renderBoard(boardData);
  } catch {
    setupInitialCards();
  }
}

loadBoard();

addForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const text = addInput.value.trim();
  if (text === "") {
    return;
  }

  const card = createCard(text, addDate.value);
  todoCards.appendChild(card);
  refreshMoveButtons(card);
  saveBoard();

  addInput.value = "";
  addDate.value = "";
  addInput.focus();
});

board.addEventListener("click", (event) => {
  const deleteButton = event.target.closest(".delete-button");
  if (deleteButton) {
    deleteButton.closest(".card").remove();
    saveBoard();
    return;
  }

  const moveButton = event.target.closest(".move-button");
  if (!moveButton) {
    return;
  }

  const card = moveButton.closest(".card");
  const destination = document.querySelector("#" + moveButton.dataset.target);
  destination.appendChild(card);
  refreshMoveButtons(card);
  saveBoard();
});
