const timersContainer = document.getElementById("timers");
const addBtn = document.getElementById("addTimer");
const exportBtn = document.getElementById("export");

// экраны
const body = document.body;
const settingsBtn = document.getElementById("settings");
const backBtn = document.getElementById("backBtn");

// настройки
const clearAllBtn = document.getElementById("clearAll");

const MAX_TIMERS = 10;

let timers = [];

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
    type: "main"
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
        <input 
          class="timer-name" 
          value="${timer.name}" 
          placeholder="Название"
        />
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

    // ===== DRAG =====

    el.addEventListener("dragstart", () => {
      el.classList.add("dragging");
    });

    el.addEventListener("dragend", () => {
      el.classList.remove("dragging");

      updateTimersOrder();
      saveTimers();
    });

    // ===== ЛОГИКА =====

    el.querySelector(".start-btn").onclick = (e) => {
      e.stopPropagation();
      timer.isRunning = !timer.isRunning;
      saveTimers();
      renderTimers();
    };

    el.querySelector(".delete-btn").onclick = (e) => {
      e.stopPropagation();
      timers = timers.filter(t => t.id !== timer.id);
      saveTimers();
      renderTimers();
    };

    const input = el.querySelector(".timer-name");

    input.onclick = (e) => e.stopPropagation();

    input.oninput = (e) => {
      timer.name = e.target.value;
      saveTimers();
    };

    const typeButtons = el.querySelectorAll(".type-btn");

    typeButtons.forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();

        timer.type = btn.dataset.type;

        saveTimers();
        renderTimers();
      });
    });

    timersContainer.appendChild(el);
  });
}

// =====================
// DRAG CONTAINER
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
// UPDATE ORDER
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
// EXPORT
// =====================

exportBtn.addEventListener("click", () => {
  const mainTasks = timers.filter(t => t.type === "main");
  const extraTasks = timers.filter(t => t.type === "extra");

  const data = [];

  data.push(["Основные задачи"]);
  mainTasks.forEach(t => {
    data.push([t.name || "Без названия", formatTime(t.time)]);
  });

  data.push([]);

  data.push(["Дополнительные задачи"]);
  extraTasks.forEach(t => {
    data.push([t.name || "Без названия", formatTime(t.time)]);
  });

  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(wb, ws, "Отчет");
  XLSX.writeFile(wb, "weekly-report.xlsx");
});

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
renderTimers();