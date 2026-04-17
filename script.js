const timersContainer = document.getElementById("timers");
const addBtn = document.getElementById("addTimer");
const exportBtn = document.getElementById("export");

// экраны
const body = document.body;
const settingsBtn = document.getElementById("settings");
const backBtn = document.getElementById("backBtn");

// настройки
const clearAllBtn = document.getElementById("clearAll");
const toggleThemeBtn = document.getElementById("toggleTheme");

let timers = [];

// =====================
// STORAGE
// =====================

function loadTimers() {
  const data = localStorage.getItem("timers");
  if (data) {
    timers = JSON.parse(data);
  }
}

function saveTimers() {
  localStorage.setItem("timers", JSON.stringify(timers));
}

function loadTheme() {
  const theme = localStorage.getItem("theme");
  if (theme === "dark") {
    document.body.classList.add("dark");
  }
}

// =====================
// CREATE TIMER
// =====================

addBtn.addEventListener("click", () => {
  if (timers.length >= 10) {
    showToast("Максимум 10 таймеров");
    return;
  }

  createTimer(true);
});

function createTimer(isNew = false) {
  const timer = {
    id: Date.now(),
    name: "Название",
    time: 0,
    isRunning: false,
    isNew: isNew
  };

  timers.push(timer);
  saveTimers();
  renderTimers();
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
    const timeEl = document.querySelector(
      `[data-id="${timer.id}"] .timer-time`
    );

    if (timeEl) {
      timeEl.textContent = formatTime(timer.time);
    }
  });
}

// =====================
// RENDER
// =====================

function renderTimers() {
  timersContainer.innerHTML = "";

  timers.forEach(timer => {
    const timerEl = document.createElement("div");
    timerEl.className = "timer";
    timerEl.setAttribute("data-id", timer.id);

    // активный таймер
    if (timer.isRunning) {
      timerEl.classList.add("active");
    }

    timerEl.innerHTML = `
      <div class="timer-top">
        <input class="timer-name" value="${timer.name}" />
        <button class="delete-btn">✕</button>
      </div>

      <div class="timer-time">${formatTime(timer.time)}</div>

      <button class="start-btn ${timer.isRunning ? "pause" : ""}">
        ${timer.isRunning ? "❚❚" : "▶"}
      </button>
    `;

    // ▶ старт / пауза
    const startBtn = timerEl.querySelector(".start-btn");
    startBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      timer.isRunning = !timer.isRunning;
      saveTimers();
      renderTimers();
    });

    // ❌ удаление (МГНОВЕННО)
    const deleteBtn = timerEl.querySelector(".delete-btn");
    deleteBtn.addEventListener("click", (e) => {
      e.stopPropagation();

      timers = timers.filter(t => t.id !== timer.id);
      saveTimers();
      renderTimers();
    });

    // 📝 изменение названия
    const nameInput = timerEl.querySelector(".timer-name");

    nameInput.addEventListener("click", (e) => {
      e.stopPropagation();
    });

    nameInput.addEventListener("input", (e) => {
      timer.name = e.target.value;
      saveTimers();
    });

    timersContainer.appendChild(timerEl);
  });
}

// =====================
// GLOBAL TIMER
// =====================

setInterval(() => {
  timers.forEach(timer => {
    if (timer.isRunning) {
      timer.time += 1;
    }
  });

  updateTimes();
  saveTimers();
}, 1000);

// =====================
// EXPORT EXCEL
// =====================

exportBtn.addEventListener("click", () => {
  const data = timers.map(timer => ({
    "Название": timer.name,
    "Время": formatTime(timer.time)
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, worksheet, "Таймеры");

  XLSX.writeFile(workbook, "timers.xlsx");
});

// =====================
// SETTINGS
// =====================

settingsBtn.addEventListener("click", () => {
  body.classList.add("show-settings");
});

backBtn.addEventListener("click", () => {
  body.classList.remove("show-settings");
});

clearAllBtn.addEventListener("click", () => {
  if (confirm("Удалить все таймеры?")) {
    timers = [];
    saveTimers();
    renderTimers();
  }
});

toggleThemeBtn.addEventListener("click", () => {
  document.body.classList.toggle("dark");

  localStorage.setItem(
    "theme",
    document.body.classList.contains("dark") ? "dark" : "light"
  );
});
function showToast(message) {
  const toast = document.getElementById("toast");

  toast.textContent = message;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 2000);
}

// =====================
// INIT
// =====================

loadTimers();
loadTheme();
renderTimers();