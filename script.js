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
const checkUpdateBtn = document.getElementById("checkUpdates");

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
    lastStartTime: null 
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
    if (!el) return;

    const displayTime = getCurrentTime(t);
    el.textContent = formatTime(displayTime);
  });
}

function getCurrentTime(timer) {
  let result = timer.time;

  if (timer.isRunning && timer.lastStartTime) {
    result += Math.floor((Date.now() - timer.lastStartTime) / 1000);
  }

  return result;
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
    el.draggable = false;

    if (timer.isRunning) el.classList.add("active");

    el.innerHTML = `
      <input class="timer-name" value="${timer.name}" placeholder="Название"/>
      <div class="timer-time">${formatTime(getCurrentTime(timer))}</div>

      <div class="timer-type">
        <button class="type-btn ${timer.type === "main" ? "active" : ""}" data-type="main">Плановая</button>
        <button class="type-btn ${timer.type === "extra" ? "active" : ""}" data-type="extra">Дополнительная</button>
      </div>

      <button class="start-btn ${timer.isRunning ? "pause" : ""}">
        ${timer.isRunning ? "❚❚" : "▶"}
      </button>

      <button class="delete-btn">✕</button>
    `;

    const input = el.querySelector(".timer-name");
  
    // ===== START / STOP =====
    el.querySelector(".start-btn").onclick = () => {

      if (!timer.isRunning && !(timer.name || "").trim()) {
        showToast("Введите название задачи");
        input.focus();
        return;
      }

       // разрешаем максимум 2 активных таймера
      if (!timer.isRunning) {
        const runningTimers = timers.filter(t => t.isRunning && t.id !== timer.id);

        if (runningTimers.length >= 2) {
          // ставим на паузу последний запущенный активный таймер
          const lastStartedTimer = runningTimers.reduce((latest, current) => {
            if (!latest) return current;
            return (current.lastStartTime || 0) > (latest.lastStartTime || 0) ? current : latest;
          }, null);

          if (lastStartedTimer) {
  lastStartedTimer.time = getCurrentTime(lastStartedTimer);
  lastStartedTimer.isRunning = false;
  lastStartedTimer.lastStartTime = null;
}
        }

        timer.lastStartTime = Date.now();
      } else {
  if (timer.lastStartTime) {
    timer.time += Math.floor((Date.now() - timer.lastStartTime) / 1000);
  }
  timer.lastStartTime = null;
}

      timer.isRunning = !timer.isRunning;

      saveTimers();
      renderTimers();
    };

        // ===== DELETE =====
    el.querySelector(".delete-btn").onclick = () => {
      if (timer.time > 0) {
        archive.push({
          date: new Date().toISOString().slice(0, 10),
          name: timer.name,
          duration: timer.time,
          type: timer.type
        });
        saveArchive();
        showToast("Таймер добавлен в архив");
      }

      timers = timers.filter(t => t.id !== timer.id);
      saveTimers();
      renderTimers();
    };

    // ===== INPUT =====
    input.oninput = (e) => {
      timer.name = e.target.value;
      saveTimers();
    };

    // ===== TYPE =====
    const typeButtons = el.querySelectorAll(".type-btn");

    if (timer.isRunning) {
      typeButtons.forEach(btn => btn.classList.add("disabled"));
    }

    typeButtons.forEach(btn => {
      btn.onclick = () => {
        if (timer.isRunning) {
          showToast("Нельзя менять тип активного таймера");
          return;
        }

        timer.type = btn.dataset.type;
        saveTimers();
        renderTimers();
      };
    });

    timersContainer.appendChild(el);
  });

  emptyState.classList.toggle("show", timers.length === 0);
}
// =====================
// TIMER LOOP
// =====================

setInterval(() => {
  updateTimes();
}, 100);

// =====================
// EXPORT
// =====================

exportBtn.onclick = async () => {
  try {
    if (!timers.length) {
      showToast("Нет данных для экспорта");
      return;
    }

    const filePath = await window.electronAPI.saveFile("report.xlsx");

    if (!filePath) return; // отмена

    const main = timers.filter(t => t.type === "main");
    const extra = timers.filter(t => t.type === "extra");

    const data = [];

    data.push(["Плановые задачи"]);
    data.push(["Задача", "Время"]);

    main.forEach(t => {
      data.push([t.name || "Без названия", formatTime(getCurrentTime(t))]);
    });

    data.push([]);
    data.push(["Дополнительные задачи"]);
    data.push(["Задача", "Время"]);

    extra.forEach(t => {
      data.push([t.name || "Без названия", formatTime(getCurrentTime(t))]);
    });
    
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(wb, ws, "Отчет");

    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });

    await window.electronAPI.writeFile(filePath, wbout);

  } catch (e) {
    console.error(e);
    showToast("Ошибка экспорта");
  }
};
exportArchiveBtn.onclick = async () => {
  try {
    if (!archive.length) {
      showToast("Архив пуст");
      return;
    }

    const filePath = await window.electronAPI.saveFile("archive.xlsx");
    if (!filePath) return;

    // 🔥 ПРЕОБРАЗОВАНИЕ В РУССКИЙ
    const data = archive.map(i => ({
      "Дата": new Date(i.date).toLocaleDateString("ru-RU"),
      "Задача": i.name || "Без названия",
      "Время": formatTime(i.duration),
      "Тип": i.type === "main" ? "Плановая" : "Дополнительная"
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(wb, ws, "Архив");

    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });

await window.electronAPI.writeFile(filePath, wbout);

  } catch (e) {
    console.error(e);
    showToast("Ошибка архива");
  }
};

// =====================
// CLEAR ARCHIVE
// =====================

clearArchiveBtn.onclick = () => {
  if (!archive.length) return showToast("Архив пуст");

  if (!confirm("Очистить архив?")) return;

  archive = [];
  saveArchive();
  showToast("Архив очищен");
};

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
// TOAST
// =====================

function showToast(msg) {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.classList.add("show");

  setTimeout(() => toast.classList.remove("show"), 2000);
}

// =====================
// UPDATE UI
// =====================

window.electronAPI.onUpdateAvailable(() => {
  showUpdateModal("Доступно обновление. Установить?", true);
});

window.electronAPI.onUpdateNotAvailable(() => {
  showToast("Обновлений нет");
});

window.electronAPI.onUpdateDownloaded(() => {
  showUpdateModal("Обновление скачано. Перезапустить приложение?", false);
});

window.electronAPI.onUpdateError((_, err) => {
  showToast("Ошибка обновления: " + err);
});

function showUpdateModal(text, isDownloadStep) {
  const modal = document.createElement("div");
  modal.className = "update-modal";

  modal.innerHTML = `
    <div class="update-box">
      <div class="update-text">${text}</div>
      <div class="update-actions">
        <button id="updateYes">Да</button>
        <button id="updateNo">Нет</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  document.getElementById("updateNo").onclick = () => {
    modal.remove();
  };

  document.getElementById("updateYes").onclick = () => {
    modal.remove();

    if (isDownloadStep) {
      window.electronAPI.startUpdate();
      showToast("Скачивание...");
    } else {
      window.electronAPI.installUpdate();
    }
  };
}

checkUpdateBtn.onclick = () => {
  window.electronAPI.checkUpdates();
  showToast("Проверка обновлений...");
};

// =====================
// INIT
// =====================

loadTimers();
loadArchive();
renderTimers();

// =====================
// FIX: возврат в окно / разблокировка
// =====================

window.addEventListener("focus", () => {
  updateTimes();
});

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    updateTimes();
  }
});