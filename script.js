const timersContainer = document.getElementById("timers");
const emptyState = document.getElementById("emptyState");
const addBtn = document.getElementById("addTimer");
const exportBtn = document.getElementById("export");
const exportArchiveBtn = document.getElementById("exportArchive");

// экраны
const body = document.body;
const settingsBtn = document.getElementById("settings");
const backBtn = document.getElementById("backBtn");

// настройки
const clearAllBtn = document.getElementById("clearAll");

const MAX_TIMERS = 10;

let timers = [];
let deletedTimers = [];
let archive = [];

// =====================
// STORAGE
// =====================

function loadTimers() {
  const data = localStorage.getItem("timers");
  if (data) timers = JSON.parse(data);
}

function saveTimers() {
  localStorage.setItem("timers", JSON.stringify(timers));
}

function loadArchive() {
  const data = localStorage.getItem("archive");
  if (data) archive = JSON.parse(data);
}

function saveArchive() {
  localStorage.setItem("archive", JSON.stringify(archive));
}

// =====================
// CREATE TIMER
// =====================

addBtn.addEventListener("click", () => {
  if (timers.length >= MAX_TIMERS) {
    showToast(`Максимум ${MAX_TIMERS} таймеров`);
    return;
  }
  createTimer();
});

function createTimer() {
  const timer = {
    id: Date.now(),
    name: "",
    time: 0,
    isRunning: false,
    type: "main",
    typeLocked: false
  };

  timers.push(timer);
  saveTimers();
  renderTimers();

  setTimeout(() => {
    const input = document.querySelector(`[data-id="${timer.id}"] .timer-name`);
    if (input) input.focus();
  }, 0);
}

// =====================
// TIME
// =====================

function formatTime(seconds) {
  const hrs = String(Math.floor(seconds / 3600)).padStart(2, "0");
  const mins = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
  const secs = String(seconds % 60).padStart(2, "0");

  return `${hrs}:${mins}:${secs}`;
}

function updateTimes() {
  timers.forEach(timer => {
    const el = document.querySelector(`[data-id="${timer.id}"] .timer-time`);
    if (el) el.textContent = formatTime(timer.time);
  });
}

// =====================
// RENDER
// =====================

function renderTimers() {
  timersContainer.innerHTML = "";

  timers.forEach(timer => {
    const el = document.createElement("div");
    el.className = "timer";
    el.setAttribute("data-id", timer.id);
    el.setAttribute("data-type", timer.type);
    el.draggable = true;

    if (timer.isRunning) el.classList.add("active");

    el.innerHTML = `
      <div class="timer-top">
        <input class="timer-name" value="${timer.name}" placeholder="Название"/>
        <button class="delete-btn">✕</button>
      </div>

      <div class="timer-time">${formatTime(timer.time)}</div>

      <div class="timer-type">
        <button class="type-btn ${timer.type === "main" ? "active" : ""}" data-type="main">
          Плановая
        </button>
        <button class="type-btn ${timer.type === "extra" ? "active" : ""}" data-type="extra">
          Дополнительная
        </button>
      </div>

      <button class="start-btn ${timer.isRunning ? "pause" : ""}">
        ${timer.isRunning ? "❚❚" : "▶"}
      </button>
    `;

    // DRAG
    el.addEventListener("dragstart", () => {
      el.classList.add("dragging");
    });

    el.addEventListener("dragend", () => {
      el.classList.remove("dragging");
      updateTimersOrder();
      saveTimers();
    });

    // СТАРТ / ПАУЗА
    el.querySelector(".start-btn").onclick = (e) => {
      e.stopPropagation();

      // 🔥 ПРОВЕРКА ЛИМИТА
      if (!timer.isRunning) {
        const activeCount = timers.filter(t => t.isRunning).length;

        if (activeCount >= 2) {
          showToast(`Активно уже ${activeCount} таймера. Максимум — 2`);
          return;
        }

        // 🔒 фиксируем тип при первом старте
        if (!timer.typeLocked) {
          timer.typeLocked = true;
        }
      }

      // запись в архив при остановке
      if (timer.isRunning && timer.time > 0) {
        archive.push({
          date: new Date().toISOString().slice(0, 10),
          name: timer.name || "Без названия",
          duration: timer.time,
          type: timer.type
        });
        saveArchive();
      }

      timer.isRunning = !timer.isRunning;

      saveTimers();
      renderTimers();
    };

    // УДАЛЕНИЕ
    el.querySelector(".delete-btn").onclick = (e) => {
      e.stopPropagation();

      deletedTimers.push(timer);
      timers = timers.filter(t => t.id !== timer.id);

      saveTimers();
      renderTimers();

      showToast("Таймер удалён (Ctrl + Z — отменить)");
    };

    // INPUT
    const input = el.querySelector(".timer-name");

    input.onclick = (e) => e.stopPropagation();

    input.oninput = (e) => {
      timer.name = e.target.value;
      saveTimers();
    };

    // ТИП
    const typeButtons = el.querySelectorAll(".type-btn");

    if (timer.typeLocked) {
      typeButtons.forEach(btn => btn.classList.add("disabled"));
    }

    typeButtons.forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();

        if (timer.typeLocked) {
          showToast("Тип задачи уже зафиксирован");
          return;
        }

        timer.type = btn.dataset.type;

        saveTimers();
        renderTimers();
      });
    });

    timersContainer.appendChild(el);
  });

  // EMPTY STATE
  if (timers.length === 0) {
    emptyState.classList.add("show");
  } else {
    emptyState.classList.remove("show");
  }
}

// =====================
// DRAG
// =====================

timersContainer.addEventListener("dragover", (e) => {
  e.preventDefault();

  const draggingEl = document.querySelector(".dragging");
  const elements = [...timersContainer.querySelectorAll(".timer:not(.dragging)")];

  const nextEl = elements.find(el => {
    const rect = el.getBoundingClientRect();
    return e.clientY < rect.top + rect.height / 2;
  });

  if (nextEl) {
    timersContainer.insertBefore(draggingEl, nextEl);
  } else {
    timersContainer.appendChild(draggingEl);
  }
});

// =====================
// ORDER
// =====================

function updateTimersOrder() {
  const newOrder = [];

  document.querySelectorAll(".timer").forEach(el => {
    const id = Number(el.dataset.id);
    const timer = timers.find(t => t.id === id);
    if (timer) newOrder.push(timer);
  });

  timers = newOrder;
}

// =====================
// GLOBAL TIMER
// =====================

setInterval(() => {
  timers.forEach(t => {
    if (t.isRunning) t.time++;
  });

  updateTimes();
  saveTimers();
}, 1000);

// =====================
// UNDO
// =====================

function undoDelete() {
  if (deletedTimers.length === 0) return;

  const last = deletedTimers.pop();
  timers.push(last);

  saveTimers();
  renderTimers();

  showToast("Таймер восстановлен");
}

document.addEventListener("keydown", (e) => {
  const isUndo = (e.ctrlKey || e.metaKey) && e.code === "KeyZ";

  if (!isUndo) return;

  const activeEl = document.activeElement;

  const isInputFocused =
    activeEl &&
    (
      activeEl.tagName === "INPUT" ||
      activeEl.tagName === "TEXTAREA" ||
      activeEl.isContentEditable
    );

  if (!isInputFocused) {
    e.preventDefault();
    undoDelete();
  }
}, true);

// =====================
// TOAST
// =====================

function showToast(message) {
  const toast = document.getElementById("toast");

  toast.textContent = message;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 2000);
}

// =====================
// SETTINGS
// =====================

settingsBtn.onclick = () => {
  body.classList.add("show-settings");
};

backBtn.onclick = () => {
  body.classList.remove("show-settings");
};

clearAllBtn.onclick = () => {
  if (confirm("Удалить все таймеры?")) {
    timers = [];
    saveTimers();
    renderTimers();
  }
};

// =====================
// INIT
// =====================

loadTimers();
loadArchive();
renderTimers();