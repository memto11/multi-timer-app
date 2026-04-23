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
const toggleThemeBtn = document.getElementById("toggleTheme");
const openStatsBtn = document.getElementById("openStats");
const statsScreen = document.getElementById("statsScreen");
const backFromStats = document.getElementById("backFromStats");
const toMainFromStats = document.getElementById("toMainFromStats");
const exitBtn = document.getElementById("exitApp");

let timers = [];
let archive = [];

// =====================
// STORAGE
// =====================

function loadTimers() {
  try {
    const data = localStorage.getItem("timers");
    if (!data) return;

    const parsed = JSON.parse(data);

    if (Array.isArray(parsed)) {
      timers = parsed;
    } else {
      timers = [];
    }
  } catch (e) {
    console.error("Ошибка чтения timers:", e);
    timers = [];
  }
}

function saveTimers() {
  try {
    localStorage.setItem("timers", JSON.stringify(timers));
  } catch (e) {
    console.error("Ошибка сохранения timers:", e);
  }
}

function loadArchive() {
  try {
    const data = localStorage.getItem("archive");
    if (!data) return;

    const parsed = JSON.parse(data);

    if (Array.isArray(parsed)) {
      archive = parsed;
    } else {
      archive = [];
    }
  } catch (e) {
    console.error("Ошибка чтения archive:", e);
    archive = [];
  }
}

function saveArchive() {
  try {
    localStorage.setItem("archive", JSON.stringify(archive));
  } catch (e) {
    console.error("Ошибка сохранения archive:", e);
  }
}

// =====================
// CREATE TIMER
// =====================

function updateAddButtonState() {
  const isLimit = timers.length >= 12;
  addBtn.classList.toggle("limit", isLimit);
}

addBtn.onclick = () => {
  if (timers.length >= 12) {
    showToast("Максимум 12 таймеров");
    return;
  }

  const timer = {
    id: Date.now(),
    name: "",
    time: 0,
    isRunning: false,
    type: "main",
    lastStartTime: null,
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
  timers.forEach((t) => {
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
  const activeElement = document.activeElement;
  const activeId = activeElement?.closest(".timer")?.dataset?.id;
  const cursorPos = activeElement?.selectionStart;

  timersContainer.innerHTML = "";

  timers.forEach((timer) => {
    const el = document.createElement("div");
    el.className = "timer";
    el.dataset.id = timer.id;
    el.setAttribute("data-type", timer.type);
    el.draggable = false;

    if (timer.isRunning) el.classList.add("active");

    el.innerHTML = `
  <input class="timer-name" placeholder="Название"/>
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
    input.value = timer.name || "";

    // ===== START / STOP =====
    el.querySelector(".start-btn").onclick = () => {
      if (!timer.isRunning && !(timer.name || "").trim()) {
        showToast("Введите название задачи");
        input.focus();
        return;
      }

      // разрешаем максимум 2 активных таймера
      if (!timer.isRunning) {
        const runningTimers = timers.filter(
          (t) => t.isRunning && t.id !== timer.id,
        );

        if (runningTimers.length >= 2) {
          // ставим на паузу последний запущенный активный таймер
          const lastStartedTimer = runningTimers.reduce((latest, current) => {
            if (!latest) return current;
            return (current.lastStartTime || 0) > (latest.lastStartTime || 0)
              ? current
              : latest;
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

      if (activeId) {
        const input = document.querySelector(
          `[data-id="${activeId}"] .timer-name`,
        );

        if (input) {
          input.focus();
          if (cursorPos !== null) {
            input.setSelectionRange(cursorPos, cursorPos);
          }
        }
      }
    };

    // ===== DELETE =====
    el.querySelector(".delete-btn").onclick = () => {
      if (timer.time > 0) {
        archive.push({
          date: new Date().toISOString().slice(0, 10),
          name: timer.name,
          duration: timer.time,
          type: timer.type,
        });
        saveArchive();
        showToast("Таймер добавлен в архив");
      }

      timers = timers.filter((t) => t.id !== timer.id);
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
      typeButtons.forEach((btn) => btn.classList.add("disabled"));
    }

    typeButtons.forEach((btn) => {
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
  updateAddButtonState();
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

    const main = timers.filter((t) => t.type === "main");
    const extra = timers.filter((t) => t.type === "extra");

    const data = [];

    data.push(["Плановые задачи"]);
    data.push(["Задача", "Время"]);

    main.forEach((t) => {
      data.push([t.name || "Без названия", formatTime(getCurrentTime(t))]);
    });

    data.push([]);
    data.push(["Дополнительные задачи"]);
    data.push(["Задача", "Время"]);

    extra.forEach((t) => {
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
    const data = archive.map((i) => ({
      Дата: new Date(i.date).toLocaleDateString("ru-RU"),
      Задача: i.name || "Без названия",
      Время: formatTime(i.duration),
      Тип: i.type === "main" ? "Плановая" : "Дополнительная",
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
  if (!archive.length) {
    showToast("Архив пуст");
    return;
  }

  showClearArchiveModal();
};

function showClearArchiveModal() {
  const modal = document.createElement("div");
  modal.className = "update-modal";

  modal.innerHTML = `
    <div class="update-box">
      <div class="update-text">
        Очистить архив?
        <br><br>
        <span class="modal-warning">
          Все записи будут удалены без возможности восстановления
        </span>
      </div>
      <div class="update-actions">
        <button id="archiveYes">Удалить</button>
        <button id="archiveNo">Отмена</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  document.getElementById("archiveNo").onclick = () => {
    modal.remove();
  };

  document.getElementById("archiveYes").onclick = () => {
    archive = [];
    saveArchive();
    modal.remove();
    showToast("Архив очищен");
  };
}

// =====================
// SETTINGS
// =====================

settingsBtn.onclick = () => {
  body.classList.add("show-settings");
};

openStatsBtn.onclick = () => {
  body.classList.add("show-stats");
  renderStats();
};

backFromStats.onclick = () => {
  body.classList.remove("show-stats");
};

toMainFromStats.onclick = () => {
  body.classList.remove("show-stats");
  body.classList.remove("show-settings");
};

backBtn.onclick = () => {
  body.classList.remove("show-settings");
};

clearAllBtn.onclick = () => {
  if (!timers.length) {
    showToast("Нет таймеров для удаления");
    return;
  }

  showClearAllModal();
};

function renderStats() {
  const container = document.getElementById("statsContent");

  let total = 0;
  let main = 0;
  let extra = 0;

  archive.forEach((item) => {
    total += item.duration;
    if (item.type === "main") main += item.duration;
    else extra += item.duration;
  });

  container.innerHTML = `
    <div class="stat-block">
      <div class="stat-title">Всего</div>
      <div class="stat-value">${formatTime(total)}</div>
    </div>

    <div class="stat-block">
      <div class="stat-title">Плановые</div>
      <div class="stat-value">${formatTime(main)}</div>
    </div>

    <div class="stat-block">
      <div class="stat-title">Дополнительные</div>
      <div class="stat-value">${formatTime(extra)}</div>
    </div>
  `;
}

function showClearAllModal() {
  const modal = document.createElement("div");
  modal.className = "update-modal";

  modal.innerHTML = `
    <div class="update-box">
      <div class="update-text">
        Удалить все таймеры?
        <br><br>
        <span class="modal-warning">
          Таймеры будут удалены без сохранения в архив.
        </span>
      </div>
      <div class="update-actions">
        <button id="clearAllYes">Удалить</button>
        <button id="clearAllNo">Отмена</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  document.getElementById("clearAllNo").onclick = () => {
    modal.remove();
  };

  document.getElementById("clearAllYes").onclick = () => {
    timers = [];
    saveTimers();
    renderTimers();
    modal.remove();
    showToast("Все таймеры удалены");
  };
}

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

const offUpdateAvailable = window.electronAPI.onUpdateAvailable(() => {
  showUpdateModal("Доступно обновление. Установить?", true);
});

const offUpdateNotAvailable = window.electronAPI.onUpdateNotAvailable(() => {
  showToast("Обновлений нет");
});

const offUpdateDownloaded = window.electronAPI.onUpdateDownloaded(() => {
  showUpdateModal("Обновление скачано. Перезапустить приложение?", false);
});

const offUpdateError = window.electronAPI.onUpdateError((err) => {
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
exitBtn.onclick = () => {
  window.electronAPI.exitApp();
};

function applyTheme(theme) {
  if (theme === "light") {
    document.body.classList.add("light");
  } else {
    document.body.classList.remove("light");
  }
  updateThemeButton();
}

function loadTheme() {
  const saved = localStorage.getItem("theme") || "dark";
  applyTheme(saved);
}

function toggleTheme() {
  const fade = document.getElementById("themeFade");

  fade.classList.add("active");

  setTimeout(() => {
    const isLight = document.body.classList.contains("light");
    const newTheme = isLight ? "dark" : "light";

    localStorage.setItem("theme", newTheme);
    applyTheme(newTheme);

    fade.classList.remove("active");
  }, 150);
}

function updateThemeButton() {
  const isLight = document.body.classList.contains("light");
  toggleThemeBtn.textContent = isLight ? "Темная тема" : "Светлая тема";
}

toggleThemeBtn.onclick = toggleTheme;

// =====================
// INIT
// =====================

loadTimers();
loadArchive();
renderTimers();

loadTheme();

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
