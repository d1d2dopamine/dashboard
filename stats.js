/* ============================================================
   НАБЛЮДЕНИЯ — честная статистика без нейросетей

   Каждое наблюдение появляется только когда данных хватает.
   Нигде нет вероятностей вроде «ты это не сделаешь» — только факты
   и подсказки. Предсказание, которое звучит как приговор,
   заканчивается закрытой вкладкой.
   ============================================================ */

const Stats = (function () {

  function median(arr) {
    if (!arr.length) return 0;
    const s = arr.slice().sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  }

  function plural(n, one, few, many) {
    const a = Math.abs(n) % 10, b = Math.abs(n) % 100;
    if (a === 1 && b !== 11) return one;
    if (a >= 2 && a <= 4 && (b < 10 || b >= 20)) return few;
    return many;
  }

  const hh = (h) => String(h).padStart(2, "0") + ":00";

  /* ---------- 1. Когда ты реально работаешь ---------- */
  // Гистограмма по часам, скользящее окно в три часа.
  function workHours(events) {
    if (events.length < 4) return null;

    const bins = new Array(24).fill(0);
    events.forEach((e) => {
      const h = typeof e.hour === "number" ? e.hour : new Date(e.t).getHours();
      bins[h] += (e.minutes || 5);
    });

    let best = 0, bestSum = -1;
    for (let h = 0; h < 24; h++) {
      const sum = bins[h] + bins[(h + 1) % 24] + bins[(h + 2) % 24];
      if (sum > bestSum) { bestSum = sum; best = h; }
    }

    const total = bins.reduce((a, b) => a + b, 0);
    if (!total || bestSum / total < 0.28) return null;

    return {
      text: "Чаще всего ты работаешь между " + hh(best) + " и " + hh((best + 3) % 24),
      note: "Туда и стоит ставить самое тяжёлое"
    };
  }

  /* ---------- 2. Коэффициент искажения времени ---------- */
  // Медиана факт / оценка. При СДВГ обычно 2–3×,
  // и знать своё число полезнее, чем пытаться стать точнее.
  function distortion(tasks) {
    const pairs = tasks
      .filter((t) => t.done && t.estimate > 0 && t.spent > 0)
      .map((t) => t.spent / t.estimate);

    if (pairs.length < 2) return null;

    const k = median(pairs);
    if (k < 1.15 && k > 0.85) {
      return {
        text: "Твои оценки времени совпадают с фактом",
        note: "По " + pairs.length + " " + plural(pairs.length, "задаче", "задачам", "задачам")
      };
    }

    return {
      text: "Задачи занимают примерно в " + k.toFixed(1).replace(".", ",") + " раза больше, чем ты ставишь",
      note: "Можно просто умножать свою оценку на " + k.toFixed(1).replace(".", ",") +
            " · по " + pairs.length + " " + plural(pairs.length, "задаче", "задачам", "задачам"),
      k: k
    };
  }

  /* ---------- 3. Обычная длина захода ---------- */
  function sessionLength(events) {
    const mins = events.filter((e) => e.kind === "session" && e.minutes > 0).map((e) => e.minutes);
    if (mins.length < 2) return null;

    const m = Math.round(median(mins));
    return {
      text: "Обычный заход в работу — " + m + " " + plural(m, "минута", "минуты", "минут"),
      note: "Планировать блоками по " + m + " честнее, чем по часу"
    };
  }

  /* ---------- 4. Сколько реальных дней до этапа ---------- */
  // Календарные дни врут. Умножаем их на твой реальный ритм.
  function realDays(daysLeft, activeOf30) {
    if (daysLeft == null || daysLeft <= 0 || activeOf30 < 5) return null;

    const rate = activeOf30 / 30;
    const real = Math.max(1, Math.round(daysLeft * rate));

    return {
      text: "До этапа " + daysLeft + " " + plural(daysLeft, "календарный день", "календарных дня", "календарных дней") +
            ", но по твоему ритму это около " + real + " " + plural(real, "рабочего дня", "рабочих дней", "рабочих дней"),
      note: "Считано по активным дням за последний месяц"
    };
  }

  /* ---------- 5. Задачи, которые всё время откладываются ---------- */
  // Если задачу отложили три раза — дело обычно не в лени,
  // а в том, что она плохо сформулирована или не нужна.
  function stuck(tasks) {
    const list = tasks.filter((t) => !t.done && !t.archived && (t.snoozes || 0) >= 3);
    if (!list.length) return null;

    return {
      text: list.length + " " + plural(list.length, "задача откладывалась", "задачи откладывались", "задач откладывалось") + " три раза и больше",
      note: "Обычно значит, что задача плохо сформулирована или не нужна. Перепиши или удали"
    };
  }

  /* ---------- 6. Сколько ещё данных нужно ---------- */
  function progress(events) {
    if (!events.length) {
      return {
        text: "Наблюдения появятся после первого таймера",
        note: "Каждый запуск таймера и каждая закрытая задача что-то сюда добавляют"
      };
    }

    // сводка за неделю показывается с первого же дня — ждать десяти записей незачем
    const week = Date.now() - 7 * 86400000;
    const recent = events.filter((e) => e.t >= week);
    const minutes = recent.reduce((a, e) => a + (e.minutes || 0), 0);
    const done = recent.filter((e) => e.kind === "done").length;

    const parts = [];
    if (minutes) parts.push(minutes + " " + plural(minutes, "минута", "минуты", "минут") + " в фокусе");
    if (done) parts.push(done + " " + plural(done, "задача закрыта", "задачи закрыто", "задач закрыто"));

    return {
      text: parts.length ? "За неделю: " + parts.join(", ") : "За эту неделю пока пусто",
      note: events.length < 10
        ? "Записей всего " + events.length + " — чем больше, тем точнее остальные наблюдения"
        : "Считается по журналу за последние семь дней"
    };
  }

  /* ---------- сборка ---------- */

  function build(ctx) {
    const events = ctx.events || [];
    const tasks = ctx.tasks || [];

    return [
      progress(events),
      workHours(events),
      distortion(tasks),
      sessionLength(events),
      realDays(ctx.daysToMilestone, ctx.activeOf30 || 0),
      stuck(tasks)
    ].filter(Boolean);
  }

  // коэффициент для подсказки при вводе оценки
  function factor(tasks) {
    const d = distortion(tasks || []);
    return d && d.k ? d.k : null;
  }

  return { build, factor, median };
})();
