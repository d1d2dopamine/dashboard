/* ============================================================
   СИНХРОНИЗАЦИЯ МЕЖДУ УСТРОЙСТВАМИ

   Сервера нет. Хранилище — приватный gist на GitHub.
   На каждом устройстве один раз вставляется токен — и всё.

   Работает оффлайн: изменения ложатся в localStorage сразу,
   а при появлении сети сливаются с тем, что накопилось на другом устройстве.

   Слияние поэлементное, а не «кто последний — тот и прав»:
   — задачи, этапы, входящие: побеждает более свежая версия каждой записи
   — удалённое помечается флагом, а не исчезает (иначе воскреснет)
   — минуты и события считаются отдельно по каждому устройству и складываются
   ============================================================ */

const Sync = (function () {
  const TOKEN_KEY = "dashboard.token";
  const GIST_KEY  = "dashboard.gist";
  const DEV_KEY   = "dashboard.device";
  const FILE      = "dashboard.json";
  const DESC      = "dashboard-sync — личный дашборд, не удалять";

  const SCALARS = ["login", "university", "startMinutes", "breakMinutes", "sound", "rotate"];
  const LISTS   = ["tasks", "milestones", "inbox"];

  let get = null, set = null, onStatus = null;
  let timer = null, loopId = null, busy = false;
  let status = { state: "off", text: "Синхронизация выключена", at: 0 };

  /* ---------- хранилище ключей ---------- */

  function ls(key, value) {
    try {
      if (value === undefined) return localStorage.getItem(key);
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    } catch (e) {}
    return null;
  }

  function token() { return ls(TOKEN_KEY) || ""; }
  function gistId() { return ls(GIST_KEY) || ""; }

  function device() {
    let id = ls(DEV_KEY);
    if (!id) {
      id = "d" + Math.random().toString(36).slice(2, 9);
      ls(DEV_KEY, id);
    }
    return id;
  }

  function isOn() { return !!token() && !!gistId(); }

  function report(stateName, text) {
    status = { state: stateName, text: text, at: Date.now() };
    if (onStatus) onStatus(status);
  }

  /* ---------- сеть ---------- */

  async function api(path, options) {
    const res = await fetch("https://api.github.com" + path, Object.assign({
      headers: {
        "Authorization": "Bearer " + token(),
        "Accept": "application/vnd.github+json",
        "Content-Type": "application/json"
      }
    }, options || {}));

    if (res.status === 401) throw new Error("Токен не подходит. Нужен токен с правом gist");
    if (res.status === 403) throw new Error("GitHub ограничил запросы, попробуем позже");
    if (res.status === 404) throw new Error("Хранилище не найдено");
    if (!res.ok) throw new Error("GitHub ответил ошибкой " + res.status);

    return res.json();
  }

  /* ---------- подключение ---------- */

  async function connect(newToken) {
    ls(TOKEN_KEY, newToken.trim());
    ls(GIST_KEY, null);
    report("syncing", "Ищу хранилище…");

    // если хранилище уже создано на другом устройстве — найдём его
    const list = await api("/gists?per_page=100");
    const found = list.find((g) => g.files && g.files[FILE]);

    if (found) {
      ls(GIST_KEY, found.id);
    } else {
      const created = await api("/gists", {
        method: "POST",
        body: JSON.stringify({
          description: DESC,
          public: false,
          files: { [FILE]: { content: JSON.stringify(clean(get())) } }
        })
      });
      ls(GIST_KEY, created.id);
    }

    await run(true);
    startLoop();
    return gistId();
  }

  function disconnect() {
    ls(TOKEN_KEY, null);
    ls(GIST_KEY, null);
    clearInterval(loopId);
    report("off", "Синхронизация выключена");
  }

  /* ---------- слияние ---------- */

  // что уезжает в облако: тема и текущий уровень сил остаются локальными
  function clean(s) {
    const out = { v: 2, log: s.log || {}, events: s.events || [], scalarsUpdatedAt: s.scalarsUpdatedAt || 0 };
    LISTS.forEach((k) => { out[k] = s[k] || []; });
    SCALARS.forEach((k) => { out[k] = s[k]; });
    return out;
  }

  function mergeList(mine, theirs) {
    const map = new Map();
    (mine || []).forEach((x) => { if (x && x.id) map.set(x.id, x); });

    (theirs || []).forEach((x) => {
      if (!x || !x.id) return;
      const have = map.get(x.id);
      if (!have) { map.set(x.id, x); return; }
      if ((x.updatedAt || 0) > (have.updatedAt || 0)) map.set(x.id, x);
    });

    return [...map.values()];
  }

  // минуты и закрытые задачи копятся отдельно по каждому устройству:
  // телефон не затирает то, что насидел компьютер, и наоборот
  function mergeLog(mine, theirs) {
    const out = {};
    const dates = new Set([...Object.keys(mine || {}), ...Object.keys(theirs || {})]);

    dates.forEach((date) => {
      const a = (mine || {})[date] || {};
      const b = (theirs || {})[date] || {};
      const devices = new Set([...Object.keys(a), ...Object.keys(b)]);
      out[date] = {};

      devices.forEach((dev) => {
        const x = a[dev] || { minutes: 0, tasks: [] };
        const y = b[dev] || { minutes: 0, tasks: [] };
        out[date][dev] = {
          minutes: Math.max(x.minutes || 0, y.minutes || 0),
          tasks: (x.tasks || []).length >= (y.tasks || []).length ? (x.tasks || []) : (y.tasks || [])
        };
      });
    });

    return out;
  }

  function mergeEvents(mine, theirs) {
    const map = new Map();
    [...(mine || []), ...(theirs || [])].forEach((e) => {
      if (e && e.t) map.set(e.t + ":" + (e.kind || "") + ":" + (e.dev || ""), e);
    });
    return [...map.values()].sort((a, b) => a.t - b.t).slice(-600);
  }

  function merge(mine, theirs) {
    if (!theirs || typeof theirs !== "object") return mine;

    const out = Object.assign({}, mine);

    LISTS.forEach((k) => { out[k] = mergeList(mine[k], theirs[k]); });
    out.log = mergeLog(mine.log, theirs.log);
    out.events = mergeEvents(mine.events, theirs.events);

    if ((theirs.scalarsUpdatedAt || 0) > (mine.scalarsUpdatedAt || 0)) {
      SCALARS.forEach((k) => {
        if (theirs[k] !== undefined) out[k] = theirs[k];
      });
      out.scalarsUpdatedAt = theirs.scalarsUpdatedAt;
    }

    return out;
  }

  /* ---------- основной цикл ---------- */

  function same(a, b) {
    try { return JSON.stringify(a) === JSON.stringify(b); } catch (e) { return false; }
  }

  async function run(force) {
    if (!isOn() || busy) return;
    if (!navigator.onLine) { report("offline", "Оффлайн — сохранено на устройстве"); return; }

    busy = true;
    report("syncing", "Синхронизация…");

    try {
      const gist = await api("/gists/" + gistId());
      const file = gist.files && gist.files[FILE];

      let remote = null;
      if (file) {
        // большие файлы GitHub отдаёт ссылкой, а не текстом
        const raw = file.truncated
          ? await (await fetch(file.raw_url)).text()
          : file.content;
        try { remote = JSON.parse(raw); } catch (e) { remote = null; }
      }

      const mineClean = clean(get());
      const merged = merge(mineClean, remote);

      if (!same(merged, mineClean)) set(merged);

      if (force || !same(merged, remote)) {
        await api("/gists/" + gistId(), {
          method: "PATCH",
          body: JSON.stringify({ files: { [FILE]: { content: JSON.stringify(merged) } } })
        });
      }

      report("ok", "Синхронизировано " + new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }));
    } catch (err) {
      const offline = !navigator.onLine || /Failed to fetch|NetworkError/i.test(err.message);
      report(offline ? "offline" : "error", offline ? "Оффлайн — сохранено на устройстве" : err.message);
    } finally {
      busy = false;
    }
  }

  function schedule() {
    if (!isOn()) return;
    clearTimeout(timer);
    timer = setTimeout(() => run(false), 2500);
  }

  function startLoop() {
    clearInterval(loopId);
    loopId = setInterval(() => run(false), 60000);
  }

  /* ---------- старт ---------- */

  function init(opts) {
    get = opts.get;
    set = opts.set;
    onStatus = opts.onStatus;

    if (!isOn()) { report("off", "Только на этом устройстве"); return; }

    run(false);
    startLoop();

    window.addEventListener("online", () => run(false));
    window.addEventListener("offline", () => report("offline", "Оффлайн — сохранено на устройстве"));
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") run(false);
    });
  }

  return {
    init, connect, disconnect, schedule, isOn, device,
    now: () => run(true),
    status: () => status,
    hasToken: () => !!token()
  };
})();
