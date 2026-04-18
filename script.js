const timersContainer = document.getElementById("timers");
const emptyState = document.getElementById("emptyState");
const addBtn = document.getElementById("addTimer");
const exportBtn = document.getElementById("export");
const exportArchiveBtn = document.getElementById("exportArchive");
const clearArchiveBtn = document.getElementById("clearArchive");

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
});

// =====================
// TIME
// =====================

function formatTime(seconds) {
  const h = String(Math.floor(seconds / 3600)).padStart(2, "0");
  const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
  const s = String(seconds % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

function updateTimes() {
  timers.forEach(t => {
    const el = document.querySelector(`[data-id="${t.id}"] .timer-time`);
    if (el) el.textContent = formatTime(t.time);
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
    el.dataset.id = timer.id;

    if (timer.isRunning) el.classList.add("active");

    el.innerHTML = `
      <div class="timer-top">
        <input class="timer-name" value="${timer.name}" placeholder="Название"/>
        <button class="delete-btn">✕</button>
      </div>

      <div class="timer-time">${formatTime(timer.time)}</div>

      <div class="timer-type">
        <button class="type-btn ${timer.type === "main" ? "active" : ""}" data-type="main">Плановая</button>
        <button class="type-btn ${timer.type === "extra" ? "active" : ""}" data-type="extra">Дополнительная</button>
      </div>

      <button class="start-btn">
        ${timer.isRunning ? "❚❚" : "▶"}
      </button>
    `;

    const input = el.querySelector(".timer-name");

    // ===== START / STOP =====
    el.querySelector(".start-btn").onclick = () => {

      if (!timer.isRunning && !(timer.name || "").trim()) {
        showToast("Введите название задачи");
        input.focus();
        return;
      }

      if (!timer.isRunning) {
        const activeCount = timers.filter(t => t.isRunning).length;

        if (activeCount >= 2) {
          showToast(`Активно уже ${activeCount} таймера. Максимум — 2`);
          return;
        }

        timer.typeLocked = true;
      }

      if (timer.isRunning && timer.time > 0) {
        archive.push({
          date: new Date().toISOString().slice(0, 10),
          name: timer.name,
          duration: timer.time,
          type: timer.type
        });
        saveArchive();
      }

      timer.isRunning = !timer.isRunning;
      saveTimers();
      renderTimers();
    };

    // ===== DELETE =====
    el.querySelector(".delete-btn").onclick = () => {
      deletedTimers.push(timer);
      timers = timers.filter(t => t.id !== timer.id);
      saveTimers();
      renderTimers();
      showToast("Таймер удалён");
    };

    // ===== INPUT =====
    input.oninput = (e) => {
      timer.name = e.target.value;
      saveTimers();
    };

    // ===== TYPE =====
    const typeButtons = el.querySelectorAll(".type-btn");

    if (timer.typeLocked) {
      typeButtons.forEach(btn => btn.classList.add("disabled"));
    }

    typeButtons.forEach(btn => {
      btn.onclick = () => {
        if (timer.typeLocked) {
          showToast("Тип задачи зафиксирован");
          return;
        }

        timer.type = btn.dataset.type;
        saveTimers();
        renderTimers();
      };
    });

    timersContainer.appendChild(el);
  });

  emptyState.style.display = timers.length ? "none" : "flex";
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
// EXPORT ТЕКУЩИХ
// =====================

exportBtn.onclick = () => {
  if (timers.length === 0) {
    showToast("Нет данных для экспорта");
    return;
  }

  const main = timers.filter(t => t.type === "main");
  const extra = timers.filter(t => t.type === "extra");

  const data = [];

  data.push(["Плановые задачи"]);
  data.push(["Задача", "Время"]);

  main.forEach(t => data.push([t.name, formatTime(t.time)]));

  data.push([]);

  data.push(["Дополнительные задачи"]);
  data.push(["Задача", "Время"]);

  extra.forEach(t => data.push([t.name, formatTime(t.time)]));

  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(wb, ws, "Отчет");
  XLSX.writeFile(wb, "report.xlsx");
};

// =====================
// EXPORT ARCHIVE
// =====================

exportArchiveBtn.onclick = () => {
  if (!archive.length) {
    showToast("Архив пуст");
    return;
  }

  const now = new Date();
  const weekAgo = new Date();
  weekAgo.setDate(now.getDate() - 7);

  const filtered = archive.filter(i => {
    const d = new Date(i.date);
    return d >= weekAgo && d <= now;
  });

  if (!filtered.length) {
    showToast("Нет данных за 7 дней");
    return;
  }

  const main = filtered.filter(i => i.type === "main");
  const extra = filtered.filter(i => i.type === "extra");

  const data = [];

  data.push(["Плановые задачи"]);
  data.push(["Задача", "Время", "Дата"]);

  main.forEach(i => {
    data.push([i.name, formatTime(i.duration), i.date]);
  });

  data.push([]);

  data.push(["Дополнительные задачи"]);
  data.push(["Задача", "Время", "Дата"]);

  extra.forEach(i => {
    data.push([i.name, formatTime(i.duration), i.date]);
  });

  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(wb, ws, "Архив");
  XLSX.writeFile(wb, "archive.xlsx");
};

// =====================
// CLEAR ARCHIVE
// =====================

clearArchiveBtn.onclick = () => {
  if (!archive.length) {
    showToast("Архив уже пуст");
    return;
  }

  if (!confirm("Очистить весь архив?")) return;

  archive = [];
  saveArchive();

  showToast("Архив очищен");
};

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

settingsBtn.onclick = () => body.classList.add("show-settings");
backBtn.onclick = () => body.classList.remove("show-settings");

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