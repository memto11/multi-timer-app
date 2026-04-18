const timersContainer = document.getElementById("timers");
const emptyState = document.getElementById("emptyState");
const addBtn = document.getElementById("addTimer");
const exportBtn = document.getElementById("export");
const exportArchiveBtn = document.getElementById("exportArchive");
const clearArchiveBtn = document.getElementById("clearArchive");

const body = document.body;
const settingsBtn = document.getElementById("settings");
const backBtn = document.getElementById("backBtn");
const clearAllBtn = document.getElementById("clearAll");

let timers = [];
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

addBtn.onclick = () => {
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
};

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
    el.setAttribute("data-type", timer.type);
    el.draggable = true;

    if (timer.isRunning) el.classList.add("active");

    el.innerHTML = `
      <input class="timer-name" value="${timer.name}" placeholder="Название"/>
      <div class="timer-time">${formatTime(timer.time)}</div>

      <div class="timer-type">
        <button class="type-btn ${timer.type === "main" ? "active" : ""}" data-type="main">Плановая</button>
        <button class="type-btn ${timer.type === "extra" ? "active" : ""}" data-type="extra">Дополнительная</button>
      </div>

      <button class="start-btn">${timer.isRunning ? "❚❚" : "▶"}</button>
      <button class="delete-btn">✕</button>
    `;

    const input = el.querySelector(".timer-name");

    // START / STOP
    el.querySelector(".start-btn").onclick = () => {

      if (!timer.isRunning && !(timer.name || "").trim()) {
        showToast("Введите название задачи");
        input.focus();
        return;
      }

      // автопауза
      if (!timer.isRunning) {
        timers.forEach(t => {
          if (t.id !== timer.id && t.isRunning) {

            if (t.time > 0) {
              archive.push({
                date: new Date().toISOString().slice(0, 10),
                name: t.name,
                duration: t.time,
                type: t.type
              });
            }

            t.isRunning = false;
          }
        });

        saveArchive();
        timer.typeLocked = true;
      }

      // запись в архив
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

    // DELETE
    el.querySelector(".delete-btn").onclick = () => {
      timers = timers.filter(t => t.id !== timer.id);
      saveTimers();
      renderTimers();
    };

    // INPUT
    input.oninput = (e) => {
      timer.name = e.target.value;
      saveTimers();
    };

    // TYPE
    const typeButtons = el.querySelectorAll(".type-btn");

    if (timer.typeLocked) {
      typeButtons.forEach(btn => btn.classList.add("disabled"));
    }

    typeButtons.forEach(btn => {
      btn.onclick = () => {
        if (timer.typeLocked) {
          showToast("Тип зафиксирован");
          return;
        }

        timer.type = btn.dataset.type;
        saveTimers();
        renderTimers();
      };
    });

    // DRAG
    el.addEventListener("dragstart", () => {
      el.classList.add("dragging");
    });

    el.addEventListener("dragend", () => {
      el.classList.remove("dragging");
      updateTimersOrder();
      saveTimers();
    });

    timersContainer.appendChild(el);
  });

  emptyState.classList.toggle("show", timers.length === 0);
}

// =====================
// DRAG LOGIC
// =====================

timersContainer.addEventListener("dragover", (e) => {
  e.preventDefault();

  const dragging = document.querySelector(".dragging");
  const elements = [...timersContainer.querySelectorAll(".timer:not(.dragging)")];

  const next = elements.find(el => {
    const rect = el.getBoundingClientRect();
    return e.clientY < rect.top + rect.height / 2;
  });

  if (next) {
    timersContainer.insertBefore(dragging, next);
  } else {
    timersContainer.appendChild(dragging);
  }
});

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
// TIMER LOOP (FIXED)
// =====================

setInterval(() => {
  timers.forEach(t => {
    if (t.isRunning) t.time++;
  });

  updateTimes(); // 🔥 ВАЖНО: вместо renderTimers
  saveTimers();
}, 1000);

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
// TOAST
// =====================

function showToast(msg) {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.classList.add("show");

  setTimeout(() => toast.classList.remove("show"), 2000);
}

// =====================
// INIT
// =====================

loadTimers();
loadArchive();
renderTimers();