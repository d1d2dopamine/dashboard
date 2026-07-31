/* ============================================================
   Личный дашборд — версия под СДВГ
   Без зависимостей. Всё хранится в localStorage.

   Принципы:
   — одна задача на экране, остальное спрятано
   — время показывается физически, а не числом
   — пропуски никогда не наказываются
   — захват мысли в одно нажатие
   ============================================================ */

const KEY = "dashboard.v2";

const DEFAULTS = {
  login: "",
  university: "",
  theme: "light",
  sound: true,
  rotate: true,
  startMinutes: 5,
  breakMinutes: 90,
  energy: "mid",
  milestones: [],
  tasks: [],
  inbox: [],
  events: [],            // журнал для наблюдений: { t, hour, kind, minutes, dev }
  scalarsUpdatedAt: 0,   // когда менялись настройки — нужно для синхронизации
  log: {}                // log["2026-07-31"]["d7x2"] = { minutes: 40, tasks: ["..."] }
};

let state = loadState();
let github = null;      // данные GitHub
let currentId = null;   // задача в блоке «Сейчас»

// идентификатор устройства: минуты с телефона и с компьютера складываются, а не затираются
const DEV = (typeof Sync !== "undefined") ? Sync.device() : "local";

function loadState() {
  let s;
  try {
    const raw = localStorage.getItem(KEY);
    s = raw ? Object.assign({}, DEFAULTS, JSON.parse(raw)) : JSON.parse(JSON.stringify(DEFAULTS));
  } catch (e) {
    s = JSON.parse(JSON.stringify(DEFAULTS));
  }

  // перевод старого журнала в формат «по устройствам»
  Object.keys(s.log || {}).forEach((key) => {
    const rec = s.log[key];
    if (rec && (typeof rec.minutes === "number" || Array.isArray(rec.tasks))) {
      s.log[key] = { legacy: { minutes: rec.minutes || 0, tasks: rec.tasks || [] } };
    }
  });

  if (!Array.isArray(s.events)) s.events = [];
  return s;
}

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
}

function save() {
  persist();
  if (typeof Sync !== "undefined") Sync.schedule();
}

/* пометка времени на записи — по ней решается, чья версия свежее */
function touch(o) { o.updatedAt = Date.now(); return o; }

/* удаление — это флаг, а не исчезновение: иначе запись вернётся с другого устройства */
function removeItem(list, id) {
  const item = list.find((x) => x.id === id);
  if (item) { item.deleted = true; touch(item); }
}

function alive(list) {
  return (list || []).filter((x) => x && !x.deleted);
}

/* событие для блока «Наблюдения» */
function logEvent(kind, minutes) {
  if (!Array.isArray(state.events)) state.events = [];
  state.events.push({
    t: Date.now(), hour: new Date().getHours(),
    kind: kind, minutes: minutes || 0, dev: DEV
  });
  if (state.events.length > 600) state.events = state.events.slice(-600);
}

/* ---------- мелкие помощники ---------- */

const $ = (id) => document.getElementById(id);
const pad = (n) => String(n).padStart(2, "0");
const iso = (d) => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
const today = () => iso(new Date());
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const DAY = 86400000;

function plural(n, one, few, many) {
  const a = Math.abs(n) % 10, b = Math.abs(n) % 100;
  if (a === 1 && b !== 11) return one;
  if (a >= 2 && a <= 4 && (b < 10 || b >= 20)) return few;
  return many;
}

function daysBetween(from, to) {
  const a = new Date(from); a.setHours(0, 0, 0, 0);
  const b = new Date(to);   b.setHours(0, 0, 0, 0);
  return Math.round((b - a) / DAY);
}

function fmtDate(str) {
  return new Date(str + "T00:00:00").toLocaleDateString("ru-RU", {
    day: "numeric", month: "long", year: "numeric"
  });
}

/* запись этого устройства за день */
function dayLog(key) {
  if (!state.log[key] || typeof state.log[key] !== "object") state.log[key] = {};
  if (!state.log[key][DEV]) state.log[key][DEV] = { minutes: 0, tasks: [] };
  return state.log[key][DEV];
}

/* сумма по всем устройствам за день */
function dayTotals(key) {
  const out = { minutes: 0, tasks: [] };
  const rec = state.log[key];
  if (!rec) return out;

  Object.keys(rec).forEach((dev) => {
    const b = rec[dev];
    if (!b) return;
    out.minutes += b.minutes || 0;
    (b.tasks || []).forEach((t) => out.tasks.push(t));
  });

  return out;
}

/* ============================================================
   НОВИЗНА: цвет и челлендж меняются каждую неделю
   ============================================================ */

const ACCENTS_LIGHT = [
  ["#2783DE", "#E5F2FC"], ["#46A171", "#E8F1EC"], ["#D5803B", "#FBEBDE"],
  ["#7C6BD6", "#EEEAFB"], ["#C2557E", "#FBE8EF"], ["#2E9AA8", "#E3F3F5"]
];
const ACCENTS_DARK = [
  ["#5E9FE8", "rgba(94,159,232,.13)"], ["#72BC8F", "rgba(114,188,143,.13)"],
  ["#DE9255", "rgba(222,146,85,.13)"], ["#A08CF0", "rgba(160,140,240,.13)"],
  ["#DF84A8", "rgba(223,132,168,.13)"], ["#4FB9C9", "rgba(79,185,201,.13)"]
];

const CHALLENGES = [
  "Закрой две задачи до обеда",
  "Сегодня только мелкие задачи — бери те, что на пять минут",
  "Начни с самой противной задачи. Пять минут, потом можно бросить",
  "Сегодня ни одной новой задачи — только старые",
  "Три сессии по пять минут за день — больше ничего не надо",
  "Разбери входящие до нуля",
  "Вернись к тому, что давно не трогал — блок «Забытое» внизу",
  "Каждой новой задаче — конкретный первый шаг"
];

function weekIndex() {
  const d = new Date();
  const jan = new Date(d.getFullYear(), 0, 1);
  return Math.floor((d - jan) / DAY / 7) + d.getFullYear() * 53;
}

function applyTheme() {
  document.documentElement.setAttribute("data-theme", state.theme);

  const list = state.theme === "dark" ? ACCENTS_DARK : ACCENTS_LIGHT;
  const root = document.documentElement;

  if (state.rotate) {
    const pair = list[weekIndex() % list.length];
    root.style.setProperty("--accent", pair[0]);
    root.style.setProperty("--accent-soft", pair[1]);
  } else {
    root.style.removeProperty("--accent");
    root.style.removeProperty("--accent-soft");
  }
}

/* ============================================================
   ЗВУК И ТОСТЫ — мгновенная обратная связь
   ============================================================ */

let audioCtx = null;

function blip(up) {
  if (!state.sound) return;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const t = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(up ? 660 : 440, t);
    osc.frequency.exponentialRampToValueAtTime(up ? 990 : 330, t + 0.12);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.12, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + 0.26);
  } catch (e) {}
}

let toastTimer = null;
function toast(text) {
  const el = $("toast");
  el.textContent = text;
  el.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add("hidden"), 2600);
}

function banner(text) {
  if (!text) { $("banner").classList.add("hidden"); return; }
  $("bannerText").textContent = text;
  $("banner").classList.remove("hidden");
}

function pop(el) {
  el.classList.remove("pop");
  void el.offsetWidth;
  el.classList.add("pop");
}

/* ============================================================
   ДАННЫЕ GITHUB
   data.json -> /api/github -> публичный REST
   ============================================================ */

function isDemo() {
  if (window.__DEMO === true) return true;
  try { return new URLSearchParams(location.search).get("demo") === "1"; }
  catch (e) { return false; }
}

async function fetchGithub(login) {
  if (isDemo()) return demoData();

  const fromFile = await tryGraphQL("./data.json");
  if (fromFile) return fromFile;

  const fromApi = await tryGraphQL("/api/github");
  if (fromApi) return fromApi;

  if (!login) return null;
  return fromRest(login);
}

async function tryGraphQL(url) {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const json = await res.json();
    const user = json && json.data && json.data.user;
    if (!user) return null;

    const days = new Map();
    const cal = user.contributionsCollection &&
                user.contributionsCollection.contributionCalendar;
    if (cal && cal.weeks) {
      cal.weeks.forEach((w) => w.contributionDays.forEach(
        (d) => days.set(d.date, d.contributionCount)
      ));
    }

    const repos = ((user.repositories && user.repositories.nodes) || []).map((r) => ({
      name: r.name,
      url: r.url,
      stars: r.stargazerCount || 0,
      language: r.primaryLanguage ? r.primaryLanguage.name : null,
      pushedAt: r.pushedAt
    }));

    return {
      profile: {
        login: user.login,
        name: user.name,
        avatar: user.avatarUrl,
        repoCount: user.repositories ? user.repositories.totalCount : repos.length
      },
      days, repos,
      exact: true,
      source: url === "./data.json" ? "data.json" : "Worker API"
    };
  } catch (e) {
    return null;
  }
}

async function fromRest(login) {
  const base = "https://api.github.com/users/" + encodeURIComponent(login);
  const [profRes, repoRes, evRes] = await Promise.all([
    fetch(base),
    fetch(base + "/repos?sort=pushed&per_page=100"),
    fetch(base + "/events/public?per_page=100")
  ]);

  if (profRes.status === 404) throw new Error("Пользователь «" + login + "» не найден на GitHub");
  if (profRes.status === 403) throw new Error("GitHub ограничил запросы. Попробуй через час");
  if (!profRes.ok) throw new Error("GitHub ответил ошибкой " + profRes.status);

  const prof = await profRes.json();
  const repoList = repoRes.ok ? await repoRes.json() : [];
  const events = evRes.ok ? await evRes.json() : [];

  const days = new Map();
  events.forEach((ev) => {
    const date = String(ev.created_at).slice(0, 10);
    let w = 1;
    if (ev.type === "PushEvent" && ev.payload && ev.payload.commits) {
      w = ev.payload.commits.length || 1;
    }
    days.set(date, (days.get(date) || 0) + w);
  });

  return {
    profile: {
      login: prof.login, name: prof.name,
      avatar: prof.avatar_url, repoCount: prof.public_repos
    },
    days,
    repos: repoList.filter((r) => !r.fork).map((r) => ({
      name: r.name, url: r.html_url, stars: r.stargazers_count || 0,
      language: r.language, pushedAt: r.pushed_at
    })),
    exact: false,
    source: "публичный API"
  };
}

function demoData() {
  const days = new Map();
  const now = new Date();
  let seed = 11;
  const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };

  for (let i = 364; i >= 0; i--) {
    const d = new Date(now); d.setDate(d.getDate() - i);
    const weekend = d.getDay() === 0 || d.getDay() === 6;
    const r = rnd();
    let v = 0;
    if (r > (weekend ? 0.6 : 0.3)) v = Math.floor(rnd() * (weekend ? 5 : 10)) + 1;
    days.set(iso(d), v);
  }
  days.set(today(), 3);

  return {
    profile: { login: "d1d2dopamine", name: "d1d2dopamine", avatar: null, repoCount: 17 },
    days,
    repos: [
      { name: "personal-dashboard", url: "#", stars: 24, language: "TypeScript", pushedAt: iso(now) },
      { name: "earth-strategy", url: "#", stars: 11, language: "TypeScript", pushedAt: "2026-07-28" },
      { name: "creatures-clone", url: "#", stars: 8, language: "TypeScript", pushedAt: "2026-06-19" },
      { name: "algo-training", url: "#", stars: 3, language: "Python", pushedAt: "2026-07-14" },
      { name: "neural-sandbox", url: "#", stars: 0, language: "Python", pushedAt: "2026-05-30" }
    ],
    exact: true,
    source: "демо-режим"
  };
}

/* ============================================================
   БЛОК «СЕЙЧАС» — одна задача, без выбора
   ============================================================ */

const ENERGY_ORDER = { low: 1, mid: 2, high: 3 };
const ENERGY_NAME = { low: "пять минут", mid: "полчаса", high: "надо разгоняться" };

function eligible() {
  const t = today();
  const cap = ENERGY_ORDER[state.energy] || 3;
  return state.tasks.filter((task) =>
    !task.done && !task.archived && !task.deleted &&
    (!task.snooze || task.snooze <= t) &&
    ENERGY_ORDER[task.energy || "mid"] <= cap
  );
}

function pickTask(avoidSame) {
  const list = eligible();
  if (!list.length) { currentId = null; return; }

  let pool = list;
  if (avoidSame && list.length > 1) pool = list.filter((t) => t.id !== currentId);

  currentId = pool[Math.floor(Math.random() * pool.length)].id;
}

function currentTask() {
  return state.tasks.find((t) => t.id === currentId) || null;
}

function renderNow() {
  const task = currentTask();

  document.querySelectorAll(".chip").forEach((c) => {
    c.classList.toggle("on", c.dataset.energy === state.energy);
  });

  const acts = ["btnStart", "btnDone", "btnOther", "btnSnooze"];

  if (!task) {
    const anyTasks = state.tasks.some((t) => !t.done && !t.archived && !t.deleted);
    $("nowTask").textContent = anyTasks
      ? "Под этот уровень сил задач нет"
      : "Задач пока нет";
    $("nowStep").textContent = anyTasks
      ? "Переключи «Сил» выше — или отдохни, это тоже вариант"
      : "Нажми N и запиши первую мысль";
    acts.forEach((id) => { $(id).disabled = true; });
    $("nowHint").textContent = "";
    return;
  }

  acts.forEach((id) => { $(id).disabled = false; });
  $("nowTask").textContent = task.text;
  $("nowStep").textContent = task.step ? "Первый шаг: " + task.step : "";
  $("nowHint").textContent = "Можно бросить через " + state.startMinutes +
    " " + plural(state.startMinutes, "минуту", "минуты", "минут") + ". Это разрешено.";
}

/* ============================================================
   ТАЙМЕР И ЗАЩИТА ОТ ГИПЕРФОКУСА
   ============================================================ */

const RING = 213.6;
let timerId = null, remaining = 0, totalSec = 0;
let chainMinutes = 0, lastEnd = 0;
let timerTaskId = null;   // какой задаче записать минуты

function paintRing(fraction, label) {
  $("ringFg").style.strokeDashoffset = RING * (1 - fraction);
  $("ringLabel").textContent = label;
}

function resetRing() {
  $("ringWrap").classList.add("idle");
  paintRing(1, state.startMinutes + ":00");
  $("btnStart").textContent = state.startMinutes + " " +
    plural(state.startMinutes, "минута", "минуты", "минут");
}

function startTimer() {
  if (timerId) { stopTimer(true); return; }

  totalSec = Math.max(1, state.startMinutes) * 60;
  remaining = totalSec;
  timerTaskId = currentId;
  $("ringWrap").classList.remove("idle");
  $("btnStart").textContent = "Стоп";
  tick();
  timerId = setInterval(tick, 1000);
}

function tick() {
  const m = Math.floor(remaining / 60), s = remaining % 60;
  paintRing(remaining / totalSec, m + ":" + pad(s));

  if (remaining <= 0) { stopTimer(false); return; }
  remaining--;
}

function stopTimer(manual) {
  clearInterval(timerId);
  timerId = null;

  const spent = Math.max(0, Math.round((totalSec - remaining) / 60));
  if (spent > 0) {
    dayLog(today()).minutes += spent;

    // минуты прилипают к задаче — из этого потом считается искажение времени
    const owner = state.tasks.find((t) => t.id === timerTaskId);
    if (owner) { owner.spent = (owner.spent || 0) + spent; touch(owner); }

    logEvent("session", spent);
    save();
    renderToday();
    renderRhythm();
    renderInsights();

    // цепочка работы: перерыв больше 20 минут её обнуляет
    if (lastEnd && Date.now() - lastEnd > 20 * 60000) chainMinutes = 0;
    chainMinutes += spent;
    lastEnd = Date.now();

    if (chainMinutes >= state.breakMinutes) {
      banner("Ты в работе " + chainMinutes + " " +
        plural(chainMinutes, "минуту", "минуты", "минут") +
        " подряд. Встань, пройдись, попей воды.");
      chainMinutes = 0;
    }
  }

  if (!manual) {
    blip(true);
    toast("Время вышло. Можно бросить — или запустить ещё раз");
  }

  resetRing();
}

/* ============================================================
   СДЕЛАНО СЕГОДНЯ — доказательства, а не план
   ============================================================ */

function renderToday() {
  const key = today();
  const log = dayTotals(key);
  const commits = github ? (github.days.get(key) || 0) : 0;

  $("tCommits").textContent = commits;
  $("tTasks").textContent = log.tasks.length;
  $("tMinutes").textContent = log.minutes;

  const ul = $("doneList");
  ul.innerHTML = "";

  if (!log.tasks.length && !log.minutes && !commits) {
    ul.innerHTML = '<li>День ещё не закончился. Пять минут тоже считаются.</li>';
    return;
  }

  log.tasks.slice(-6).reverse().forEach((t) => {
    const li = document.createElement("li");
    li.textContent = "✓ " + t;
    ul.appendChild(li);
  });
}

/* ============================================================
   РИТМ — дней из 30, без сгорающих стриков
   ============================================================ */

function wasActive(key) {
  const log = dayTotals(key);
  if (log.minutes > 0 || log.tasks.length > 0) return true;
  if (github && (github.days.get(key) || 0) > 0) return true;
  return false;
}

function renderRhythm() {
  const box = $("dots");
  box.innerHTML = "";

  const now = new Date();
  let count = 0;

  for (let i = 29; i >= 0; i--) {
    const d = new Date(now); d.setDate(d.getDate() - i);
    const key = iso(d);
    const on = wasActive(key);
    if (on) count++;

    const dot = document.createElement("span");
    dot.className = "dot" + (on ? " on" : "") + (i === 0 ? " today" : "");
    dot.title = key + (on ? " — была активность" : "");
    box.appendChild(dot);
  }

  $("rhythmCount").textContent = count;

  // заморозки: два пропуска в месяц — это норма, а не сбой
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  let missed = 0;
  for (let d = new Date(first); d <= now; d.setDate(d.getDate() + 1)) {
    if (!wasActive(iso(d))) missed++;
  }
  const left = Math.max(0, 2 - missed);
  $("freezeInfo").textContent = left > 0
    ? "заморозки: " + left + " из 2"
    : "заморозки потрачены — ничего страшного";

  $("challenge").textContent = "На эту неделю: " + CHALLENGES[weekIndex() % CHALLENGES.length];
}

/* ============================================================
   ЭТАПЫ — близкая точка вместо далёкой цели
   ============================================================ */

function renderMilestones() {
  const list = alive(state.milestones).slice().sort((a, b) => a.date.localeCompare(b.date));
  const next = list.find((m) => !m.done);

  $("goalEyebrow").textContent = state.university
    ? "Ближайший этап · " + state.university
    : "Ближайший этап";

  if (next) {
    const left = daysBetween(new Date(), next.date + "T00:00:00");
    $("msTitle").textContent = next.text;

    if (left > 0) {
      $("msNum").textContent = left;
      $("msLbl").textContent = plural(left, "день", "дня", "дней");
    } else if (left === 0) {
      $("msNum").textContent = "0";
      $("msLbl").textContent = "сегодня";
    } else {
      $("msNum").textContent = Math.abs(left);
      $("msLbl").textContent = plural(left, "день назад", "дня назад", "дней назад");
    }

    // переводим абстрактные дни в считаемые объекты
    let units = "до " + fmtDate(next.date);
    if (left >= 14) {
      const we = Math.floor(left / 7);
      units = "это примерно " + we + " " +
        plural(we, "выходные", "выходных", "выходных") + " · до " + fmtDate(next.date);
    }
    $("msUnits").textContent = units;

    const total = Math.max(1, daysBetween(next.created || next.date, next.date));
    const passed = Math.max(0, daysBetween(next.created || next.date, new Date()));
    const rest = Math.max(0, Math.min(1, 1 - passed / total));
    $("drain").style.width = (rest * 100).toFixed(1) + "%";
  } else {
    $("msTitle").textContent = list.length ? "Все этапы закрыты" : "Этапов нет";
    $("msUnits").textContent = list.length
      ? "Можно добавить следующий"
      : "Добавь первый этап — близкая точка работает лучше далёкой цели";
    $("msNum").textContent = "—";
    $("msLbl").textContent = "";
    $("drain").style.width = "0%";
  }

  const ul = $("msList");
  ul.innerHTML = "";

  list.forEach((m) => {
    const li = document.createElement("li");
    if (m.done) li.className = "done";

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = !!m.done;
    cb.id = "ms-" + m.id;
    cb.addEventListener("change", () => {
      m.done = cb.checked;
      touch(m);
      if (m.done) { blip(true); toast("Этап закрыт"); }
      save(); renderMilestones(); renderInsights();
    });

    const label = document.createElement("label");
    label.className = "t";
    label.htmlFor = cb.id;
    label.textContent = m.text;

    const when = document.createElement("span");
    when.className = "when";
    const dObj = new Date(m.date + "T00:00:00");
    const sameYear = dObj.getFullYear() === new Date().getFullYear();
    when.textContent = dObj.toLocaleDateString("ru-RU", sameYear
      ? { day: "numeric", month: "short" }
      : { day: "numeric", month: "short", year: "2-digit" });

    const del = document.createElement("button");
    del.className = "del"; del.type = "button";
    del.innerHTML = "&times;";
    del.setAttribute("aria-label", "Удалить этап");
    del.addEventListener("click", () => {
      removeItem(state.milestones, m.id);
      save(); renderMilestones(); renderInsights();
    });

    li.append(cb, label, when, del);
    ul.appendChild(li);
  });
}

/* ============================================================
   ВХОДЯЩИЕ — внешняя рабочая память
   ============================================================ */

function renderInbox() {
  const card = $("inboxCard"), ul = $("inboxList");
  ul.innerHTML = "";

  const items = alive(state.inbox);
  if (!items.length) { card.classList.add("hidden"); return; }
  card.classList.remove("hidden");

  items.slice().reverse().forEach((item) => {
    const li = document.createElement("li");

    const t = document.createElement("span");
    t.className = "t";
    t.textContent = item.text;

    const toTask = document.createElement("button");
    toTask.className = "mini"; toTask.type = "button";
    toTask.textContent = "в задачи";
    toTask.addEventListener("click", () => {
      addTask(item.text, "", "mid", 0);
      removeItem(state.inbox, item.id);
      save(); renderInbox(); renderTasks(); renderNow();
      toast("Переехало в задачи");
    });

    const del = document.createElement("button");
    del.className = "del"; del.type = "button";
    del.innerHTML = "&times;";
    del.setAttribute("aria-label", "Удалить");
    del.addEventListener("click", () => {
      removeItem(state.inbox, item.id);
      save(); renderInbox();
    });

    li.append(t, toTask, del);
    ul.appendChild(li);
  });
}

/* ============================================================
   ЗАДАЧИ — список спрятан, чтобы не давил
   ============================================================ */

function addTask(text, step, energy, estimate) {
  state.tasks.push(touch({
    id: uid(), text: text, step: step || "", energy: energy || "mid",
    estimate: estimate || 0, spent: 0, snoozes: 0,
    done: false, archived: false, deleted: false,
    snooze: "", created: Date.now(), doneAt: 0
  }));
}

function autoArchive() {
  const limit = Date.now() - 30 * DAY;
  state.tasks.forEach((t) => {
    if (!t.done && !t.archived && !t.deleted && t.created < limit) { t.archived = true; touch(t); }
  });
}

function completeTask(task) {
  task.done = true;
  task.doneAt = Date.now();
  touch(task);
  dayLog(today()).tasks.push(task.text);
  logEvent("done", task.spent || 0);
  save();

  blip(true);
  pop($("tTasks"));
  toast("Готово");

  renderToday(); renderRhythm(); renderTasks(); renderForgotten(); renderInsights();
}

function renderTasks() {
  const active = state.tasks.filter((t) => !t.done && !t.archived && !t.deleted);
  $("tasksCount").textContent = active.length;

  const ul = $("taskList");
  ul.innerHTML = "";

  if (!active.length) {
    ul.innerHTML = '<li class="empty">Пусто. Это тоже нормальное состояние.</li>';
  }

  const t0 = today();

  active.forEach((task) => {
    const li = document.createElement("li");

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.id = "t-" + task.id;
    cb.addEventListener("change", () => {
      completeTask(task);
      if (task.id === currentId) { pickTask(false); renderNow(); }
    });

    const body = document.createElement("div");
    body.className = "body";

    const label = document.createElement("label");
    label.className = "t";
    label.htmlFor = cb.id;
    label.textContent = task.text;

    const sub = document.createElement("div");
    sub.className = "sub";

    const tag = document.createElement("span");
    tag.className = "tag";
    tag.textContent = ENERGY_NAME[task.energy || "mid"];
    sub.appendChild(tag);

    const extra = [];
    if (task.step) extra.push(task.step);
    if (task.estimate) extra.push("оценка " + task.estimate + " мин");
    if (task.spent) extra.push("вложено " + task.spent + " мин");
    if (task.snooze && task.snooze > t0) extra.push("отложено до " + task.snooze.slice(8) + "." + task.snooze.slice(5, 7));
    sub.appendChild(document.createTextNode(extra.join(" · ")));

    body.append(label, sub);

    const del = document.createElement("button");
    del.className = "del"; del.type = "button";
    del.innerHTML = "&times;";
    del.setAttribute("aria-label", "Удалить");
    del.addEventListener("click", () => {
      removeItem(state.tasks, task.id);
      if (task.id === currentId) pickTask(false);
      save(); renderTasks(); renderNow(); renderForgotten(); renderInsights();
    });

    li.append(cb, body, del);
    ul.appendChild(li);
  });

  // архив — без чувства вины
  const arch = state.tasks.filter((t) => t.archived && !t.done && !t.deleted);
  const box = $("archiveBox");
  box.innerHTML = "";

  if (arch.length) {
    const txt = document.createElement("span");
    txt.textContent = arch.length + " " +
      plural(arch.length, "задача ушла", "задачи ушли", "задач ушло") +
      " в архив — они не потерялись";

    const btn = document.createElement("button");
    btn.className = "mini"; btn.type = "button";
    btn.textContent = "вернуть все";
    btn.addEventListener("click", () => {
      arch.forEach((t) => { t.archived = false; t.created = Date.now(); touch(t); });
      save(); renderTasks(); renderNow();
      toast("Вернулись");
    });

    box.append(txt, btn);
  }
}

/* ============================================================
   ЗАБЫТОЕ — то, что пропало из виду
   ============================================================ */

function renderForgotten() {
  const ul = $("forgotList");
  ul.innerHTML = "";
  const items = [];

  state.tasks.filter((t) => !t.done && !t.archived && !t.deleted).forEach((t) => {
    const d = Math.floor((Date.now() - t.created) / DAY);
    if (d >= 7) items.push({ text: t.text, days: d, kind: "задача" });
  });

  if (github) {
    github.repos.forEach((r) => {
      if (!r.pushedAt) return;
      const d = Math.floor((Date.now() - new Date(r.pushedAt).getTime()) / DAY);
      if (d >= 10) items.push({ text: r.name, days: d, kind: "проект" });
    });
  }

  if (!items.length) {
    ul.innerHTML = '<li class="empty">Пока ничего не потерялось</li>';
    return;
  }

  items.sort((a, b) => b.days - a.days).slice(0, 4).forEach((i) => {
    const li = document.createElement("li");

    const t = document.createElement("span");
    t.className = "t";
    t.textContent = i.text;

    const w = document.createElement("span");
    w.className = "when";
    w.textContent = i.kind + " · " + i.days + " " + plural(i.days, "день", "дня", "дней");

    li.append(t, w);
    ul.appendChild(li);
  });
}

/* ============================================================
   НАБЛЮДЕНИЯ — статистика по своему журналу
   ============================================================ */

function activeDaysOf30() {
  const now = new Date();
  let n = 0;
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now); d.setDate(d.getDate() - i);
    if (wasActive(iso(d))) n++;
  }
  return n;
}

function renderInsights() {
  const ul = $("insights");
  if (!ul) return;
  ul.innerHTML = "";

  const next = alive(state.milestones)
    .filter((m) => !m.done)
    .sort((a, b) => a.date.localeCompare(b.date))[0];

  const items = Stats.build({
    events: state.events || [],
    tasks: alive(state.tasks),
    daysToMilestone: next ? daysBetween(new Date(), next.date + "T00:00:00") : null,
    activeOf30: activeDaysOf30()
  });

  items.forEach((i) => {
    const li = document.createElement("li");

    const t = document.createElement("span");
    t.className = "t";
    t.textContent = i.text;

    const n = document.createElement("span");
    n.className = "note";
    n.textContent = i.note;

    li.append(t, n);
    ul.appendChild(li);
  });

  // подсказка в форме задачи
  const k = Stats.factor(alive(state.tasks));
  const hint = $("estimateHint");
  if (hint) {
    hint.textContent = k
      ? "По твоей истории реальное время — примерно оценка × " + k.toFixed(1).replace(".", ",")
      : "Оценка необязательна. Но если ставить — сайт посчитает, во сколько раз ты обычно ошибаешься";
  }
}

/* ============================================================
   GITHUB-БЛОКИ
   ============================================================ */

function renderProfile() {
  const dateStr = new Date().toLocaleDateString("ru-RU", {
    weekday: "long", day: "numeric", month: "long"
  });

  if (github && github.profile) {
    const p = github.profile;
    $("userName").textContent = p.name || p.login;
    const av = $("avatar");
    if (p.avatar) av.style.backgroundImage = "url(" + p.avatar + ")";
    else av.textContent = (p.login || "?").slice(0, 1).toUpperCase();
  } else {
    $("avatar").textContent = "—";
  }

  $("userMeta").textContent = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
}

function renderRepos() {
  const ul = $("repos");
  ul.innerHTML = "";

  if (!github || !github.repos.length) {
    ul.innerHTML = '<li class="empty">Подключи GitHub в настройках</li>';
    return;
  }

  github.repos.slice(0, 5).forEach((r) => {
    const li = document.createElement("li");

    const a = document.createElement("a");
    a.href = r.url; a.target = "_blank"; a.rel = "noopener";
    a.textContent = r.name;

    const meta = document.createElement("span");
    meta.className = "repo-meta";
    const parts = [];
    if (r.language) parts.push(r.language);
    if (r.stars) parts.push("★ " + r.stars);
    if (r.pushedAt) {
      const d = Math.floor((Date.now() - new Date(r.pushedAt).getTime()) / DAY);
      parts.push(d <= 0 ? "сегодня" : d + " " + plural(d, "день", "дня", "дней") + " назад");
    }
    meta.textContent = parts.join(" · ");

    li.append(a, meta);
    ul.appendChild(li);
  });
}

function renderHeat() {
  const grid = $("heat");
  grid.innerHTML = "";
  if (!github) return;

  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - 364);
  start.setDate(start.getDate() - start.getDay());

  let max = 0;
  github.days.forEach((v) => { if (v > max) max = v; });

  const frag = document.createDocumentFragment();
  for (let c = new Date(start); c <= now; c.setDate(c.getDate() + 1)) {
    const key = iso(c);
    const v = github.days.get(key) || 0;
    const cell = document.createElement("i");
    cell.className = "cell lvl" + level(v, max);
    cell.title = key + ": " + v;
    frag.appendChild(cell);
  }
  let tail = 6 - now.getDay();
  while (tail-- > 0) {
    const cell = document.createElement("i");
    cell.className = "cell pad";
    frag.appendChild(cell);
  }
  grid.appendChild(frag);

  const active = [...github.days.values()].filter((v) => v > 0).length;
  $("heatSummary").textContent = "· " + active + " " +
    plural(active, "активный день", "активных дня", "активных дней");
}

function level(v, max) {
  if (v <= 0) return 0;
  if (max <= 4) return Math.min(4, v);
  const q = v / max;
  return q <= 0.25 ? 1 : q <= 0.5 ? 2 : q <= 0.75 ? 3 : 4;
}

/* ============================================================
   СОБЫТИЯ
   ============================================================ */

/* --- блок Сейчас --- */

document.querySelectorAll(".chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    state.energy = chip.dataset.energy;
    save();
    pickTask(false);
    renderNow();
  });
});

$("btnStart").addEventListener("click", startTimer);

$("btnDone").addEventListener("click", () => {
  const task = currentTask();
  if (!task) return;
  completeTask(task);
  pickTask(false);
  renderNow();
});

$("btnOther").addEventListener("click", () => {
  pickTask(true);
  renderNow();
});

$("btnSnooze").addEventListener("click", () => {
  const task = currentTask();
  if (!task) return;
  const t = new Date(); t.setDate(t.getDate() + 1);
  task.snooze = iso(t);
  task.snoozes = (task.snoozes || 0) + 1;
  touch(task);
  save();
  toast("Отложено до завтра");
  pickTask(false);
  renderNow(); renderTasks(); renderInsights();
});

/* --- быстрая запись --- */

function openCapture() {
  $("captureOverlay").classList.remove("hidden");
  $("captureInput").value = "";
  $("captureInput").focus();
}

function closeCapture() {
  $("captureOverlay").classList.add("hidden");
}

$("captureBtn").addEventListener("click", openCapture);

$("captureForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const text = $("captureInput").value.trim();
  if (text) {
    state.inbox.push(touch({ id: uid(), text: text, created: Date.now(), deleted: false }));
    save();
    renderInbox();
    blip(false);
    toast("Записал");
  }
  closeCapture();
});

$("captureOverlay").addEventListener("click", (e) => {
  if (e.target === $("captureOverlay")) closeCapture();
});

document.addEventListener("keydown", (e) => {
  const tag = (e.target.tagName || "").toLowerCase();
  const typing = tag === "input" || tag === "textarea" || tag === "select";

  if (e.key === "Escape") {
    closeCapture();
    $("overlay").classList.add("hidden");
    return;
  }

  // Ctrl/Cmd + K — работает всегда
  if ((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "л")) {
    e.preventDefault();
    openCapture();
    return;
  }

  if (typing || e.ctrlKey || e.metaKey || e.altKey) return;

  // N в обеих раскладках
  if (e.key === "n" || e.key === "N" || e.key === "т" || e.key === "Т") {
    e.preventDefault();
    openCapture();
  }
});

/* --- этапы --- */

$("msForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const text = $("msText").value.trim();
  const date = $("msDate").value;
  if (!text || !date) { toast("Нужны название и дата"); return; }

  state.milestones.push(touch({ id: uid(), text: text, date: date, created: today(), done: false, deleted: false }));
  $("msText").value = ""; $("msDate").value = "";
  save();
  renderMilestones(); renderInsights();
});

/* --- задачи --- */

$("tasksToggle").addEventListener("click", () => {
  const open = $("tasksPanel").classList.toggle("hidden");
  $("tasksToggle").setAttribute("aria-expanded", String(!open));
});

$("heatToggle").addEventListener("click", () => {
  const open = $("heatPanel").classList.toggle("hidden");
  $("heatToggle").setAttribute("aria-expanded", String(!open));
});

$("taskForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const text = $("tText").value.trim();
  if (!text) return;

  const est = Math.min(600, Math.max(0, parseInt($("tEstimate").value, 10) || 0));
  addTask(text, $("tStep").value.trim(), $("tEnergy").value, est);
  $("tText").value = ""; $("tStep").value = ""; $("tEstimate").value = "";
  save();

  if (!currentId) pickTask(false);
  renderTasks(); renderNow(); renderInsights();
});

/* --- шапка и настройки --- */

$("bannerClose").addEventListener("click", () => banner(""));

$("themeBtn").addEventListener("click", () => {
  state.theme = state.theme === "dark" ? "light" : "dark";
  save();
  applyTheme();
});

$("settingsBtn").addEventListener("click", () => {
  $("fLogin").value = state.login;
  $("fUni").value = state.university;
  $("fStart").value = state.startMinutes;
  $("fBreak").value = state.breakMinutes;
  $("fSound").checked = state.sound;
  $("fRotate").checked = state.rotate;
  renderSync(Sync.status());
  $("overlay").classList.remove("hidden");
  $("fLogin").focus();
});

$("closeBtn").addEventListener("click", () => $("overlay").classList.add("hidden"));

$("overlay").addEventListener("click", (e) => {
  if (e.target === $("overlay")) $("overlay").classList.add("hidden");
});

$("settingsForm").addEventListener("submit", (e) => {
  e.preventDefault();
  state.login = $("fLogin").value.trim().replace(/^@/, "");
  state.university = $("fUni").value.trim();
  state.startMinutes = Math.min(60, Math.max(1, parseInt($("fStart").value, 10) || 5));
  state.breakMinutes = Math.min(240, Math.max(20, parseInt($("fBreak").value, 10) || 90));
  state.sound = $("fSound").checked;
  state.rotate = $("fRotate").checked;
  state.scalarsUpdatedAt = Date.now();
  save();

  $("overlay").classList.add("hidden");
  applyTheme();
  resetRing();
  renderMilestones();
  renderNow();
  boot();
});

$("resetBtn").addEventListener("click", () => {
  if (!confirm("Удалить всё: задачи, этапы, историю? Синхронизация тоже отключится")) return;
  Sync.disconnect();
  state = JSON.parse(JSON.stringify(DEFAULTS));
  persist();
  location.reload();
});

/* --- синхронизация --- */

function renderSync(st) {
  const btn = $("syncBtn"), label = $("syncStatus");
  if (btn) btn.className = "icon-btn sync-btn " + st.state;
  if (btn) btn.title = st.text;
  if (label) label.textContent = st.text;
}

// пришли данные с другого устройства — подмешиваем и перерисовываем
function applyRemote(merged) {
  const before = state.tasks.filter((t) => !t.done && !t.archived && !t.deleted).length
    + state.milestones.filter((m) => !m.deleted).length;

  Object.assign(state, merged);
  persist();

  const after = state.tasks.filter((t) => !t.done && !t.archived && !t.deleted).length
    + state.milestones.filter((m) => !m.deleted).length;

  if (after > before) toast("Приехало с другого устройства");

  const stillThere = state.tasks.some((t) => t.id === currentId && !t.done && !t.archived && !t.deleted);
  if (!stillThere) pickTask(false);

  renderNow(); renderToday(); renderRhythm(); renderMilestones();
  renderInbox(); renderTasks(); renderForgotten(); renderInsights();
}

Sync.init({
  get: () => state,
  set: applyRemote,
  onStatus: renderSync
});

$("syncBtn").addEventListener("click", () => {
  if (!Sync.isOn()) {
    $("settingsBtn").click();
    $("fToken").focus();
    return;
  }
  toast(Sync.status().text);
  Sync.now();
});

$("syncConnect").addEventListener("click", async () => {
  const value = $("fToken").value.trim();
  if (!value) { toast("Вставь токен с правом gist"); return; }

  try {
    await Sync.connect(value);
    $("fToken").value = "";
    toast("Синхронизация включена");
  } catch (err) {
    toast(err.message);
  }
});

$("syncNow").addEventListener("click", () => {
  if (!Sync.isOn()) { toast("Сначала подключи токен"); return; }
  Sync.now();
});

$("syncOff").addEventListener("click", () => {
  Sync.disconnect();
  toast("Синхронизация отключена. Данные остались на устройстве");
});

/* ============================================================
   СТАРТ
   ============================================================ */

function seedDemo() {
  if (!isDemo() || state.tasks.length) return;

  state.university = "МФТИ, ФПМИ";
  state.milestones = [
    { id: uid(), text: "Пробный ЕГЭ по профильной математике", date: "2026-08-19", created: "2026-07-01", done: false, updatedAt: Date.now() },
    { id: uid(), text: "Регистрация на олимпиаду по программированию", date: "2026-09-15", created: "2026-07-01", done: false, updatedAt: Date.now() },
    { id: uid(), text: "Подача документов", date: "2027-07-20", created: "2026-07-01", done: false, updatedAt: Date.now() }
  ];
  state.tasks = [
    { id: uid(), text: "Разобрать вторую часть пробника", step: "открыть файл с разбором и найти задание 13", energy: "high", estimate: 40, spent: 0, snoozes: 3, done: false, archived: false, snooze: "", created: Date.now() - 3 * DAY, doneAt: 0, updatedAt: Date.now() },
    { id: uid(), text: "Дописать логистику в earth-strategy", step: "открыть supply.ts", energy: "mid", estimate: 30, spent: 0, snoozes: 0, done: false, archived: false, snooze: "", created: Date.now() - 9 * DAY, doneAt: 0, updatedAt: Date.now() },
    { id: uid(), text: "Отправить заявку на консультацию", step: "найти почту на сайте вуза", energy: "low", estimate: 10, spent: 0, snoozes: 0, done: false, archived: false, snooze: "", created: Date.now() - 1 * DAY, doneAt: 0, updatedAt: Date.now() },
    { id: uid(), text: "Прочитать главу про нейросети", step: "", energy: "mid", estimate: 25, spent: 0, snoozes: 0, done: false, archived: false, snooze: "", created: Date.now() - 12 * DAY, doneAt: 0, updatedAt: Date.now() },
    { id: uid(), text: "Решить вариант по стереометрии", step: "", energy: "mid", estimate: 30, spent: 75, snoozes: 0, done: true, archived: false, snooze: "", created: Date.now() - 20 * DAY, doneAt: Date.now() - 18 * DAY, updatedAt: Date.now() },
    { id: uid(), text: "Настроить деплой дашборда", step: "", energy: "mid", estimate: 20, spent: 45, snoozes: 0, done: true, archived: false, snooze: "", created: Date.now() - 16 * DAY, doneAt: Date.now() - 15 * DAY, updatedAt: Date.now() },
    { id: uid(), text: "Разобрать конспект по физике", step: "", energy: "low", estimate: 15, spent: 25, snoozes: 0, done: true, archived: false, snooze: "", created: Date.now() - 11 * DAY, doneAt: Date.now() - 10 * DAY, updatedAt: Date.now() },
    { id: uid(), text: "Повторить тригонометрию", step: "", energy: "mid", estimate: 20, spent: 50, snoozes: 0, done: true, archived: false, snooze: "", created: Date.now() - 6 * DAY, doneAt: Date.now() - 5 * DAY, updatedAt: Date.now() }
  ];
  state.inbox = [
    { id: uid(), text: "Посмотреть проходной балл за прошлый год", created: Date.now(), updatedAt: Date.now() },
    { id: uid(), text: "Спросить про дополнительные баллы за портфолио", created: Date.now(), updatedAt: Date.now() }
  ];
  state.log[today()] = { demo: { minutes: 25, tasks: ["Повторить производные"] } };

  // журнал событий — чтобы в демо было видно, как выглядят наблюдения
  const hours = [21, 22, 20, 23, 21, 22, 21, 19, 22, 20, 21, 15, 22, 23];
  const mins  = [18, 25, 12, 30, 15, 22, 18, 10, 28, 16, 20, 8, 24, 14];
  state.events = hours.map((h, i) => {
    const d = new Date(Date.now() - (14 - i) * DAY);
    d.setHours(h, 10, 0, 0);
    return { t: d.getTime(), hour: h, kind: i % 4 === 0 ? "done" : "session", minutes: mins[i], dev: "demo" };
  });
}

async function boot() {
  seedDemo();
  autoArchive();
  applyTheme();
  resetRing();

  if (!currentId) pickTask(false);

  renderProfile();
  renderNow();
  renderToday();
  renderRhythm();
  renderMilestones();
  renderInbox();
  renderTasks();
  renderForgotten();
  renderInsights();
  renderRepos();

  try {
    github = await fetchGithub(state.login);
  } catch (err) {
    banner(err.message);
  }

  if (github) {
    renderProfile();
    renderToday();
    renderRhythm();
    renderForgotten();
    renderInsights();
    renderRepos();
    renderHeat();
    $("source").textContent = "GitHub: " + github.source +
      (github.exact ? "" : " · без токена видны только последние 90 дней");
  } else {
    $("source").textContent = "GitHub не подключён · всё остальное работает без него";
  }
}

boot();
