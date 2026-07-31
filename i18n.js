/* ============================================================
   ЯЗЫК
   Приложение внутри говорит по-русски. Этот файл переводит
   готовый DOM на английский. Переключение языка перезагружает
   страницу, поэтому обратный перевод не нужен.
   ============================================================ */

var Lang = (function () {
  var KEY = "dashboard.lang";
  var lang = "en";

  try {
    var saved = localStorage.getItem(KEY);
    if (saved === "ru" || saved === "en") lang = saved;
  } catch (e) {}

  /* --- точные фразы --- */
  var MAP = {
    /* шапка */
    "Сегодня": "Today",
    "Нажми N, чтобы записать мысль": "Press N to jot down a thought",
    "Записать": "Capture",
    "Синхронизация": "Sync",
    "Тема": "Theme",
    "Сменить тему": "Switch theme",
    "Настройки": "Settings",
    "Скрыть": "Hide",
    "Закрыть": "Close",

    /* сейчас */
    "Сейчас": "Now",
    "Сил:": "Energy:",
    "Сколько сейчас сил": "How much energy right now",
    "мало": "low",
    "средне": "medium",
    "много": "high",
    "Задач пока нет": "No tasks yet",
    "Под этот уровень сил задач нет": "Nothing matches this energy level",
    "Нажми N и запиши первую мысль": "Press N and write down your first thought",
    "Переключи «Сил» выше — или отдохни, это тоже вариант": "Raise the energy level — or rest, that counts too",
    "Пять минут": "Five minutes",
    "Сделано": "Done",
    "Другую": "Another",
    "Не сегодня": "Not today",
    "Стоп": "Stop",
    "Можно бросить через пять минут. Это разрешено.":
      "You can quit after five minutes. That is allowed.",
    "Время вышло. Можно бросить — или запустить ещё раз":
      "Time is up. Quit — or run it once more",

    /* сделано сегодня */
    "Сделано сегодня": "Done today",
    "коммитов": "commits",
    "задач": "tasks",
    "минут в фокусе": "minutes focused",

    /* ритм */
    "Ритм": "Rhythm",
    "дней из последних 30": "days out of the last 30",
    "заморозки потрачены — ничего страшного": "grace days spent — no big deal",
    "Начни с самой противной задачи. Пять минут, потом можно бросить":
      "Start with the nastiest task. Five minutes, then you may quit",
    "Закрой две задачи до обеда": "Close two tasks before lunch",
    "Разбери входящие до нуля": "Clear the inbox to zero",
    "Три сессии по пять минут за день — больше ничего не надо":
      "Three five-minute sessions today — nothing more is required",
    "Каждой новой задаче — конкретный первый шаг":
      "Give every new task a concrete first step",
    "Вернись к тому, что давно не трогал — блок «Забытое» внизу":
      "Go back to something untouched — see Forgotten below",
    "Сегодня только мелкие задачи — бери те, что на пять минут":
      "Small tasks only today — take the five-minute ones",
    "Сегодня ни одной новой задачи — только старые":
      "No new tasks today — old ones only",

    /* этапы */
    "Ближайший этап": "Next milestone",
    "Этапов нет": "No milestones",
    "Все этапы закрыты": "All milestones closed",
    "Можно добавить следующий": "You can add the next one",
    "Добавь первый этап — близкая точка работает лучше далёкой цели":
      "Add your first milestone — a near point beats a distant goal",
    "Остаток времени": "Time remaining",
    "Этап: пробник, олимпиада, подача документов":
      "Milestone: mock exam, olympiad, application",
    "Дата этапа": "Milestone date",
    "Добавить": "Add",
    "Нужны название и дата": "Title and date are both required",
    "Удалить этап": "Delete milestone",
    "Этап закрыт": "Milestone closed",
    "Этап": "Milestone",
    "свернуть": "collapse",
    "сегодня": "today",

    /* входящие */
    "Входящие": "Inbox",
    "Разберёшь когда-нибудь. Или не разберёшь":
      "You will sort it out someday. Or you will not",
    "в задачи": "to tasks",
    "Переехало в задачи": "Moved to tasks",
    "Записал": "Saved",
    "Запись": "Note",
    "Что в голове?": "What is on your mind?",
    "Enter — сохранить · Esc — закрыть": "Enter — save · Esc — close",
    "На главном экране: пробел — таймер, D — сделано, S — не сегодня, O — другую":
      "On the main screen: Space — timer, D — done, S — not today, O — another",

    /* задачи */
    "Все задачи": "All tasks",
    "Что надо сделать": "What needs doing",
    "Первый шаг: открыть файл, найти страницу…":
      "First step: open the file, find the page…",
    "Сколько сил нужно": "Energy needed",
    "Полчаса": "Half an hour",
    "Надо разгоняться": "Needs a run-up",
    "пять минут": "five minutes",
    "полчаса": "half an hour",
    "надо разгоняться": "needs a run-up",
    "Оценка, мин": "Estimate, min",
    "Сколько займёт, минут": "How long it takes, minutes",
    "Повторять": "Repeat",
    "без повтора": "no repeat",
    "каждый день": "every day",
    "раз в три дня": "every three days",
    "раз в неделю": "once a week",
    "раз в две недели": "every two weeks",
    "раз в месяц": "once a month",
    "Заметка: ссылки, обрывки мыслей — необязательно":
      "Note: links, scraps of thought — optional",
    "Ссылки, обрывки мыслей, где остановился":
      "Links, scraps of thought, where you stopped",
    "+ заметка": "+ note",
    "заметка": "note",
    "Оценка необязательна. Но если ставить — сайт посчитает, во сколько раз ты обычно ошибаешься":
      "The estimate is optional. But if you set one, the site works out how far off you usually are",
    "Задача": "Task",
    "Удалить": "Delete",
    "вернуть": "restore",
    "вернуть все": "restore all",
    "Вернулось": "Restored",
    "Вернулись": "Restored",
    "посмотреть": "show",
    "скрыть": "hide",
    "Отложено до завтра": "Postponed to tomorrow",
    "Готово": "Done",

    /* наблюдения */
    "Наблюдения": "Observations",
    "Считается по твоей истории, никуда не уходит":
      "Computed from your own history, never leaves this device",
    "Наблюдения появятся после первого таймера":
      "Observations appear after the first timer",
    "Каждый запуск таймера и каждая закрытая задача что-то сюда добавляют":
      "Every timer run and every closed task adds something here",
    "За эту неделю пока пусто": "Nothing this week yet",
    "Твои оценки времени совпадают с фактом":
      "Your time estimates match reality",
    "Считается по журналу за последние семь дней":
      "Counted from the log of the last seven days",
    "Считано по активным дням за последний месяц":
      "Counted from active days over the last month",
    "Туда и стоит ставить самое тяжёлое":
      "That is where the heaviest work belongs",
    "Обычно значит, что задача плохо сформулирована или не нужна. Перепиши или удали":
      "Usually that means the task is badly worded or unnecessary. Rewrite it or delete it",

    /* прочее на странице */
    "Забытое": "Forgotten",
    "Репозитории": "Repositories",
    "Год целиком": "The whole year",
    "проект": "project",
    "публичный API": "public API",
    "демо-режим": "demo mode",
    " · без токена видны только последние 90 дней":
      " · without a token only the last 90 days are visible",
    "GitHub не подключён · всё остальное работает без него":
      "GitHub is not connected · everything else works without it",
    "GitHub ограничил запросы. Попробуй через час":
      "GitHub rate-limited the requests. Try again in an hour",

    /* настройки */
    "Основное": "General",
    "Вид": "Look",
    "Устройства": "Devices",
    "Синхронизация устройств": "Device sync",
    "Данные": "Data",
    "Ник на GitHub": "GitHub username",
    "Вуз или большая цель": "University or big goal",
    "Длина короткого старта, минут": "Short start length, minutes",
    "Напоминать о перерыве через, минут": "Remind about a break after, minutes",
    "Звук при завершении задачи": "Sound when a task is finished",
    "Менять цвет каждую неделю": "Change the accent colour weekly",
    "Язык": "Language",
    "Русский": "Russian",
    "Английский": "English",
    "Тёмная тема": "Dark theme",
    "Светлая тема": "Light theme",
    "Сохранить": "Save",
    "Сбросить всё": "Reset everything",
    "Удалить всё: задачи, этапы, историю? Синхронизация тоже отключится":
      "Delete everything: tasks, milestones, history? Sync will be turned off too",
    "цвет метки у записей": "marker colour on entries",
    "У каждой задачи, этапа и записи слева точка — того цвета, где её добавили. Имя можно менять.":
      "Every task, milestone and note has a dot on the left in the colour of the device it came from. Names are editable.",
    "Пометить старые записи этим устройством":
      "Mark old entries as this device",
    "Записей без метки нет": "No unmarked entries",
    "это устройство": "this device",
    "Цвет метки": "Marker colour",
    "Устройство": "Device",
    "Компьютер": "Computer",
    "Телефон": "Phone",
    "Планшет": "Tablet",
    "устройство неизвестно — запись старее меток":
      "unknown device — the entry predates markers",
    "Копия файлом": "File backup",
    "на случай всего": "just in case",
    "Скачанный файл не зависит ни от браузера, ни от токена, ни от GitHub. Загрузка заменяет всё, что сейчас на этом устройстве.":
      "The downloaded file depends on no browser, no token and no GitHub. Loading one replaces everything currently on this device.",
    "Скачать копию": "Download a copy",
    "Загрузить копию": "Load a copy",
    "Копия скачана": "Copy downloaded",
    "Файл не прочитался": "The file could not be read",
    "Это не файл дашборда": "That is not a dashboard file",
    "Токен GitHub с одним правом": "A GitHub token with a single scope",
    "Подключить": "Connect",
    "Синхронизировать": "Sync now",
    "Отключить": "Disconnect",
    "Проверить": "Check",
    "Проверяю…": "Checking…",
    "Вставь токен с правом gist": "Paste a token with the gist scope",
    "Сначала подключи токен": "Connect a token first",
    "Подключаю синхронизацию…": "Connecting sync…",
    "Синхронизация включена": "Sync is on",
    "Синхронизация выключена": "Sync is off",
    "Синхронизация отключена. Данные остались на устройстве":
      "Sync disconnected. The data stayed on this device",
    "Только на этом устройстве": "This device only",
    "Оффлайн — сохранено на устройстве": "Offline — saved on the device",
    "Синхронизация…": "Syncing…",
    "Ищу хранилище…": "Looking for the store…",
    "Хранилище не найдено": "Store not found",
    "Токен не подходит. Нужен токен с правом gist":
      "That token will not do. It needs the gist scope",
    "GitHub ограничил запросы, попробуем позже":
      "GitHub rate-limited us, we will retry later",
    "Приехало с другого устройства": "Arrived from another device",
    "токен уже сохранён на этом устройстве":
      "a token is already saved on this device",
    "ghp_… — токена здесь нет": "ghp_… — no token here",
    "Открыть страницу проверки": "Open the check page",
    "— работает, даже если дашборд сломан":
      "— works even if the dashboard is broken",
    "НЕТ": "NO",
    "НЕ ВЫБРАНО": "NOT SELECTED",
    "есть, …": "present, …",
    "онлайн": "online",
    "оффлайн": "offline",
    "аккаунт": "account",
    "сеть": "network",
    "токен": "token",
    "устройство": "device",
    "хранилище": "store",
    "список хранилищ": "store list",
    "хранилищ на аккаунте": "stores on the account",
    "чтение облака": "cloud read",
    "облако обновлено": "cloud updated",
    "в облаке задач": "tasks in the cloud",
    "в облаке этапов": "milestones in the cloud",
    "здесь задач": "tasks here",
    "здесь этапов": "milestones here",

    "Синхронизация выключена": "Sync is off",
    "Выключена": "Off",
    "Только на этом устройстве": "This device only",
    "Ищу хранилище…": "Looking for the storage…",
    "Синхронизация…": "Syncing…",
    "Оффлайн — сохранено на устройстве": "Offline — saved on this device"
  };

  /* --- фразы с числами и хвостами --- */
  function pl(n, one, many) { return n + " " + (n === 1 ? one : many); }

  // единицы внутри хвостов, которые регулярка забрала целиком
  function units(s) {
    return String(s)
      .replace(/(\d+) (?:календарный день|календарных дня|календарных дней)/g,
        function (a, n) { return pl(+n, "calendar day", "calendar days"); })
      .replace(/(\d+) (?:рабочий день|рабочего дня|рабочих дней)/g,
        function (a, n) { return pl(+n, "working day", "working days"); })
      .replace(/(\d+) (?:минуту|минуты|минут)/g,
        function (a, n) { return pl(+n, "minute", "minutes"); })
      .replace(/(\d+) мин(?![а-я])/g, "$1 min")
      .replace(/(\d+) (?:день|дня|дней)/g,
        function (a, n) { return pl(+n, "day", "days"); })
      .replace(/(\d+) (?:задача|задачи|задач)/g,
        function (a, n) { return pl(+n, "task", "tasks"); })
      .replace(/(\d+) (?:выходные|выходных)/g,
        function (a, n) { return pl(+n, "weekend", "weekends"); });
  }

  var RX = [
    [/^Первый шаг: (.+)$/, function (m) { return "First step: " + m[1]; }],
    [/^Можно бросить через (\d+) [^.]+\. Это разрешено\.$/, function (m) {
      return "You can quit after " + pl(+m[1], "minute", "minutes") + ". That is allowed.";
    }],
    [/^Ты в работе (.+) подряд\. Встань, пройдись, попей воды\.$/, function (m) {
      return "You have been at it for " + units(m[1]) + " straight. Stand up, walk, drink water.";
    }],
    [/^(\d+) активн\S+ (день|дня|дней)$/, function (m) {
      return pl(+m[1], "active day", "active days");
    }],
    [/^заморозки: (\d+) из 2$/, function (m) { return "grace days: " + m[1] + " of 2"; }],
    [/^(\d+) (день|дня|дней)$/, function (m) { return pl(+m[1], "day", "days"); }],
    [/^(\d+) (минута|минуты|минут)$/, function (m) { return pl(+m[1], "minute", "minutes"); }],
    [/^(день|дня|дней) назад$/, function () { return "days ago"; }],
    [/^(\d+) (день|дня|дней) назад$/, function (m) {
      return pl(+m[1], "day", "days") + " ago";
    }],
    [/^до (.+)$/, function (m) { return "until " + units(m[1]); }],
    [/^отложено до (.+)$/, function (m) { return "postponed until " + m[1]; }],
    [/^Вернётся (.+)$/, function (m) { return "Comes back " + m[1]; }],
    [/^оценка (\d+) мин · по опыту выйдет (\d+)$/, function (m) {
      return "estimate " + m[1] + " min · experience says " + m[2];
    }],
    [/^оценка (\d+) мин$/, function (m) { return "estimate " + m[1] + " min"; }],
    [/^ещё (\d+)$/, function (m) { return m[1] + " more"; }],
    [/^вложено (.+)$/, function (m) { return "invested " + units(m[1]); }],
    [/^добавлено здесь: (.+)$/, function (m) {
      return "added here: " + (MAP[m[1]] || m[1]);
    }],
    [/^было видно (.+)$/, function (m) { return "last seen " + m[1]; }],
    [/^сборка (.+)$/, function (m) { return "build " + m[1]; }],
    [/^Синхронизировано (.+)$/, function (m) { return "Synced " + m[1]; }],
    [/^(.+) удалено$/, function (m) { return (MAP[m[1]] || m[1]) + " deleted"; }],
    [/^(\d+) (запись помечена|записи помечены|записей помечено)$/, function (m) {
      return pl(+m[1], "entry marked", "entries marked");
    }],
    [/^(\d+) (задача ушла|задачи ушли|задач ушло) в архив — они не потерялись$/, function (m) {
      return pl(+m[1], "task moved", "tasks moved") + " to the archive — nothing is lost";
    }],
    [/^За неделю: (\d+) [^,]+ в фокусе, (\d+) (задача закрыта|задачи закрыто|задач закрыто)$/,
      function (m) {
        return "This week: " + pl(+m[1], "minute", "minutes") + " focused, " +
          pl(+m[2], "task", "tasks") + " closed";
      }],
    [/^Записей всего (\d+) — чем больше, тем точнее ��стальные наблюдения$/, function (m) {
      return m[1] + " entries so far — the more there are, the sharper the rest of the observations";
    }],
    [/^Чаще всего ты работаешь между (.+) и (.+)$/, function (m) {
      return "You work most often between " + m[1] + " and " + m[2];
    }],
    [/^Задачи занимают примерно в (.+) раза больше, чем ты ставишь$/, function (m) {
      return "Tasks take roughly " + m[1] + " times longer than you plan";
    }],
    [/^Можно просто умножать свою оценку на (.+)$/, function (m) {
      return "Just multiply your own estimate by " + m[1];
    }],
    [/^Обычный заход в работу — (.+)$/, function (m) {
      return "A typical run at work is " + units(m[1]);
    }],
    [/^Планировать блоками по (.+) честнее, чем по часу$/, function (m) {
      return "Planning in blocks of " + units(m[1]) + " is more honest than hour-long ones";
    }],
    [/^До этапа (.+), но по твоему ритму это около (.+)$/, function (m) {
      return units(m[1]) + " until the milestone, but at your rhythm that is about " + units(m[2]);
    }],
    [/^По (.+) откладывал\S* (.+) три раза и больше$/, function (m) {
      return m[1] + " postponed three times or more";
    }],
    [/^Пользователь «(.+)» не найден на GitHub$/, function (m) {
      return "User “" + m[1] + "” was not found on GitHub";
    }],
    [/^GitHub ответил ошибкой (.+)$/, function (m) { return "GitHub replied with error " + m[1]; }],
    [/^Проверка сорвалась: (.+)$/, function (m) { return "The check failed: " + m[1]; }],
    [/^Заменить всё на этом устройстве содержимым файла\? В нём задач: (\d+)$/, function (m) {
      return "Replace everything on this device with the file? It holds " + m[1] + " tasks";
    }],

    /* --- склейки, которые раньше оставались по-русски --- */

    // челлендж недели: переводим и префикс, и сам текст
    [/^На эту неделю: (.+)$/, function (m) {
      return "This week: " + (MAP[m[1]] || m[1]);
    }],
    [/^Ближайший этап · (.+)$/, function (m) { return "Next milestone · " + m[1]; }],
    [/^это примерно (\d+) (выходные|выходных) · до (.+)$/, function (m) {
      return "about " + pl(+m[1], "weekend", "weekends") + " · until " + m[3];
    }],
    [/^· (\d+) активн\S+ (день|дня|дней)$/, function (m) {
      return "· " + pl(+m[1], "active day", "active days");
    }],
    [/^✓ (.+)$/, function (m) { return "✓ " + (MAP[m[1]] || m[1]); }],
    [/^★ (\d+)$/, function (m) { return "★ " + m[1]; }],
    [/^(\S+) · (\d+) (день|дня|дней)$/, function (m) {
      return (MAP[m[1]] || m[1]) + " · " + pl(+m[2], "day", "days");
    }],
    [/^По твоей истории реальное время — примерно оценка × (.+)$/, function (m) {
      return "Going by your history, real time is roughly estimate × " + m[1].replace(",", ".");
    }],
    [/^Сборка app\.js: (.+)$/i, function (m) { return "app.js build: " + m[1]; }],
    [/^GitHub: (.+)$/, function (m) { return "GitHub: " + (MAP[m[1]] || m[1]); }],
    [/^есть, …(\S+) \((\d+) симв\.\)$/, function (m) {
      return "yes, …" + m[1] + " (" + m[2] + " chars)";
    }],
    [/^статус: (.+)$/, function (m) { return "status: " + (MAP[m[1]] || m[1]); }],
    [/^ОШИБКА — (.+)$/, function (m) { return "ERROR — " + (MAP[m[1]] || m[1]); }]
  ];

  function one(raw) {
    var t = raw.trim();
    if (!t) return null;
    var out = MAP[t];
    if (out === undefined) {
      for (var i = 0; i < RX.length; i++) {
        var m = t.match(RX[i][0]);
        if (m) { out = RX[i][1](m); break; }
      }
    }
    if (out === undefined || out === t) return null;
    return raw.replace(t, out);
  }

  var ATTRS = ["placeholder", "title", "aria-label", "value"];

  function element(el) {
    for (var i = 0; i < ATTRS.length; i++) {
      var a = ATTRS[i];
      if (a === "value" && el.tagName !== "OPTION") continue;
      if (!el.hasAttribute || !el.hasAttribute(a)) continue;
      if (a === "value") continue;
      var v = one(el.getAttribute(a));
      if (v !== null) el.setAttribute(a, v);
    }
  }

  function walk(root) {
    if (lang !== "en" || !root) return;
    if (root.nodeType === 3) {
      var v = one(root.nodeValue);
      if (v !== null) root.nodeValue = v;
      return;
    }
    if (root.nodeType !== 1) return;
    if (root.tagName === "SCRIPT" || root.tagName === "STYLE") return;
    element(root);
    var kids = root.childNodes;
    for (var i = 0; i < kids.length; i++) walk(kids[i]);
  }

  function title() {
    if (lang !== "en") return;
    var v = one(document.title);
    if (v !== null) document.title = v;
  }

  function apply() {
    if (lang !== "en") return;
    walk(document.body);
    title();
  }

  function observe() {
    if (lang !== "en" || typeof MutationObserver === "undefined") return;
    var mo = new MutationObserver(function (recs) {
      mo.disconnect();
      for (var i = 0; i < recs.length; i++) {
        var r = recs[i];
        if (r.type === "characterData") walk(r.target);
        else for (var j = 0; j < r.addedNodes.length; j++) walk(r.addedNodes[j]);
      }
      title();
      start();
    });
    function start() {
      mo.observe(document.body, { childList: true, subtree: true, characterData: true });
    }
    start();
  }

  function get() { return lang; }

  // даты и часы тоже должны говорить на выбранном языке
  function locale() { return lang === "en" ? "en-GB" : "ru-RU"; }

  function set(l) {
    if (l !== "ru" && l !== "en") return;
    if (l === lang) return;
    try { localStorage.setItem(KEY, l); } catch (e) {}
    location.reload();
  }

  return { get: get, set: set, locale: locale, apply: apply, observe: observe, walk: walk, tr: one };
})();
