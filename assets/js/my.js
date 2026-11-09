/* KALOS — המדריכים (Cali ו־Stheni) והאזור האישי
   - #coaches: הכרות עם המדריכים, הדגמה חיה של התרגילים שלהם, ובחירת מדריך מועדף
   - האזור האישי (נפתח מהכפתור בסרגל העליון, או ב־#my): הסטים שלי, מועדפים, המדריך שלי
   - סט = רשימת תרגילים שהמשתמש בחר (מהמועדפים או מהספרייה), עם סטים, יעד ומנוחה לכל תרגיל.
     מבצעים אותו כאימון מודרך, וכל ביצוע נשמר ביומן (src:'set', meta.set) — משם נבנה מעקב ההתקדמות.
   נטען אחרי tracker.js ו־workout.js, ולפני app.js. */
(function () {
  'use strict';
  const KX = window.KX;
  const { $, $$, esc, icon, toast, reduce } = KX.ui;
  const D = KX.data, dt = KX.date;
  const exName = (id) => (KX.exMap[id] ? KX.exMap[id].name : id);
  const catColor = (id) => (KX.exMap[id] ? KX.cats[KX.exMap[id].cat].color : 'var(--accent)');
  const nf = (n) => Number(n || 0).toLocaleString(KX.loc);
  const uid = () => 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const unitWord = (u) => (u === 'sec' ? 'שנ׳' : 'חזרות');
  /* שם ברירת מחדל לסט חדש — בשפת הממשק (שם הסט נשמר כטקסט חופשי ולא מתורגם) */
  const defName = () => (KX.isEn ? 'My set' : 'הסט שלי');
  const sessWord = (n) => (n === 1 ? 'ביצוע אחד' : n + ' ביצועים');

  /* ================= המדריכים ================= */
  const INFO = {
    cali: {
      role: 'מדריכת סקילים ושליטה בגוף',
      bio: 'Cali מתמחה בעמידות ידיים, בהחזקות סטטיות ובמוביליות. היא מאמינה שטכניקה נקייה קודמת לכל חזרה נוספת, ושכל סקיל מתחיל מהחזקה טובה.',
      tags: ['עמידת ידיים', 'ליבה', 'רגל אחת', 'מוביליות'],
      quote: 'איכות לפני כמות. חזרה נקייה אחת שווה יותר מחמש עקומות.',
      show: ['handstand', 'lsit', 'pistol', 'hollow'],
      tips: [
        'נשמו החוצה במאמץ, ושמרו על הצלעות סגורות.',
        'בהחזקות, ספרו נשימות ולא שניות. זה מרגיע ומאריך את הזמן.',
        'חימום של מפרקי הידיים לפני כל עבודה על הידיים, גם כשממהרים.',
        'צלמו את עצמכם מהצד פעם בשבוע. המצלמה רואה מה שהגוף לא מרגיש.',
        'ירידה איטית של 3 שניות בונה כוח מהר יותר מעוד חזרה מהירה.',
        'ימי מנוחה הם חלק מהתוכנית. השריר נבנה בזמן ההתאוששות.',
      ],
    },
    stheni: {
      role: 'מדריך כוח, משיכות ודחיפות',
      bio: 'Stheni אחראי על הבסיס: מתח, מקבילים, שכיבות סמיכה וסקוואט. הוא בונה כוח בהדרגה, עם עומס עולה ומעקב צמוד אחרי כל סט.',
      tags: ['מתח', 'מקבילים', 'עליית כוח', 'כוח בסיסי'],
      quote: 'עוד חזרה אחת מהפעם הקודמת. ככה בונים כוח.',
      show: ['pullup', 'muscleup', 'dip', 'pushup'],
      tips: [
        'כשעמדתם ביעד בכל הסטים, העלו חזרה אחת בפעם הבאה.',
        'שכמות למטה ולאחור לפני כל משיכה. הכתפיים יודו לכם.',
        'מנוחה של 2–3 דקות בין סטים כבדים, ו־60–90 שניות בעבודת נפח.',
        'אגן נעול ובטן פעילה, גם בתרגילי ידיים.',
        'רשמו כל אימון. מה שנמדד, משתפר.',
        'שינה של 7–9 שעות היא תוסף הכוח הכי זול שיש.',
      ],
    },
  };
  KX.coachInfo = INFO;
  const pref = () => KX.coachPref();
  /* המדריך של היום (במצב "מתחלפים": לסירוגין לפי יום) */
  const todaysCoach = () => {
    const p = pref();
    if (p !== 'auto') return p;
    const d = new Date(), day = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 864e5);
    return day % 2 ? 'cali' : 'stheni';
  };
  const coachName = (id) => KX.coaches[id].name;
  const verb = (id, f, m) => KX.coachVerb(id, f, m);
  const exCount = (id) => KX.exercises.filter((e) => KX.coachFor(e) === id).length;
  function setCoach(v) {
    D.setPref('coach', v === 'auto' ? null : v);
    KX.refreshCoaches();
    syncCoachTags();
    renderCoaches();
    if (dlg && dlg.open) render();
    toast(v === 'auto' ? 'Cali ו־Stheni יתחלפו ביניהם בהדגמות' : `${coachName(v)} ${verb(v, 'תדגים', 'ידגים')} מעכשיו את כל התרגילים`);
  }
  /* תגית "Cali מדגימה" במודאל התרגיל — אחרי החלפת מדריך */
  function syncCoachTags() {
    $$('[data-coach-tag]').forEach((t) => {
      const ex = KX.exMap[t.dataset.coachTag]; if (!ex) return;
      const c = KX.coaches[KX.coachFor(ex)];
      t.style.setProperty('--coach', c.color);
      t.innerHTML = `<i aria-hidden="true"></i>${c.name} ${verb(c.id, 'מדגימה', 'מדגים')}`;
    });
  }

  /* --- #coaches: כרטיס לכל מדריך, עם הדגמה שמתחלפת בין התרגילים שלו --- */
  const stagePlayers = [];
  function renderCoaches() {
    const g = $('#coachGrid'); if (!g) return;
    const p = pref();
    stagePlayers.forEach((x) => x.stop());
    stagePlayers.length = 0;
    g.innerHTML = ['cali', 'stheni'].map((id) => {
      const c = KX.coaches[id], I = INFO[id];
      return `<article class="coach-card reveal in" style="--coach:${c.color}" data-coach="${id}">
        <div class="coach-stage stage-dark"><svg aria-hidden="true"></svg><p class="coach-now"><span class="live"><i></i></span><span data-now></span></p></div>
        <div class="coach-body">
          <p class="coach-role">${esc(I.role)}</p>
          <h3 data-no-i18n>${c.name}</h3>
          <p class="coach-bio">${esc(I.bio)}</p>
          <ul class="coach-tags">${I.tags.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
          <blockquote class="coach-q">${esc(I.quote)}</blockquote>
          <div class="coach-acts">
            <button type="button" class="btn btn-sm ${p === id ? 'btn-accent' : 'btn-ghost'}" data-pick-coach="${id}" aria-pressed="${p === id}">${p === id ? icon('i-check') + ' ' + (c.g === 'f' ? 'המדריכה שלי' : 'המדריך שלי') : (c.g === 'f' ? 'בחרו ב־Cali כמדריכה' : 'בחרו ב־Stheni כמדריך')}</button>
            <span class="coach-count">${verb(id, 'מדגימה', 'מדגים')} <b>${exCount(id)}</b> תרגילים</span>
          </div>
        </div>
      </article>`;
    }).join('') + `<div class="coach-both"><button type="button" class="btn btn-sm ${p === 'auto' ? 'btn-accent' : 'btn-ghost'}" data-pick-coach="auto" aria-pressed="${p === 'auto'}">${p === 'auto' ? icon('i-check') + ' ' : ''}שניהם, לסירוגין</button><span>${p === 'auto' ? 'עכשיו: כל מדריך מדגים חצי מהתרגילים בכל קטגוריה' : 'כל מדריך מדגים חצי מהתרגילים בכל קטגוריה'}</span></div>`;
    $$('.coach-card', g).forEach((card) => stagePlayers.push(coachStage(card, card.dataset.coach)));
  }
  /* הדגמה מתחלפת: כל תרגיל 2 מחזורים, ואז הבא. מתנגנת רק כשהכרטיס במסך */
  function coachStage(card, id) {
    const svg = $('svg', card), now = $('[data-now]', card);
    const list = INFO[id].show.filter((x) => KX.exMap[x]);
    let i = 0, player = null, t = null, on = false;
    const show = () => {
      const ex = KX.exMap[list[i]];
      if (player) player.pause();
      svg.style.setProperty('--hl', KX.cats[ex.cat].color);
      player = new KX.fig.Player(svg, ex, { fit: 16 / 9, coach: id });
      now.textContent = ex.name;
      if (on && !reduce) player.play(); else player.showFrame(1);
      clearTimeout(t);
      if (on && !reduce) t = setTimeout(() => { i = (i + 1) % list.length; show(); }, Math.max(4200, player.total() * 2));
    };
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      on = e.isIntersecting;
      if (on) show(); else { clearTimeout(t); if (player) player.pause(); }
    }), { threshold: 0.35 });
    io.observe(card);
    show();
    return { stop: () => { io.disconnect(); clearTimeout(t); if (player) player.pause(); } };
  }
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-pick-coach]');
    if (b) setCoach(b.dataset.pickCoach);
  });

  /* ================= הסטים שלי (נתונים) =================
     sets: [{ id, name, created, items: [{ ex, sets, target, unit:'reps'|'sec', rest }] }] */
  const MAX_ITEMS = 12;
  const sets = {
    list: () => (KX.store.get('sets', []) || []).filter((s) => s && s.id && Array.isArray(s.items)),
    get: (id) => sets.list().find((s) => s.id === id) || null,
    save(set) {
      const l = sets.list(), i = l.findIndex((s) => s.id === set.id);
      set.items = set.items.filter((it) => KX.exMap[it.ex]).slice(0, MAX_ITEMS);
      if (i > -1) l[i] = set; else l.push(set);
      KX.store.set('sets', l);
      return set;
    },
    remove(id) { KX.store.set('sets', sets.list().filter((s) => s.id !== id)); },
    /* פריט ברירת מחדל לפי המינון המומלץ של התרגיל */
    item(exId) {
      const ex = KX.exMap[exId], r = KX.parseRx(ex.rx);
      const target = r.target || (r.unit === 'sec' ? 30 : 8);
      return { ex: exId, sets: Math.max(1, Math.min(5, r.sets || 3)), target, unit: r.unit, rest: ex.cat === 'core' || ex.cat === 'cardio' ? 60 : ex.level >= 3 ? 120 : 90 };
    },
    /* ביצועים של הסט מהיומן, מהישן לחדש */
    sessions: (id) => D.workouts().filter((w) => w.meta && w.meta.set === id).sort((a, b) => a.ts - b.ts),
  };
  KX.sets = sets;

  /* התקדמות לכל תרגיל בסט: הסט הטוב בכל ביצוע, האם עמדו ביעד בכל הסטים, והצעה להעלות יעד */
  function progressOf(set) {
    const ss = sets.sessions(set.id);
    const items = set.items.map((it) => {
      const hist = ss.map((w) => { const x = (w.items || []).find((y) => y.ex === it.ex && y.unit === it.unit); return x && x.sets.length ? { date: w.date, sets: x.sets.map(Number) } : null; }).filter(Boolean);
      const last = hist[hist.length - 1] || null;
      const best = hist.reduce((a, h) => Math.max(a, ...h.sets), 0);
      const hit = (h) => h && h.sets.length >= it.sets && h.sets.slice(0, it.sets).every((v) => v >= it.target);
      /* עמידה ביעד בשני הביצועים האחרונים — הגיע הזמן להעלות (עומס הדרגתי) */
      const ready = hist.length >= 2 ? hit(hist[hist.length - 1]) && hit(hist[hist.length - 2]) : hist.length === 1 && hit(last) && last.sets.slice(0, it.sets).every((v) => v >= it.target + (it.unit === 'sec' ? 5 : 2));
      const pct = last ? Math.min(1, last.sets.slice(0, it.sets).reduce((a, v) => a + Math.min(v, it.target), 0) / (it.sets * it.target)) : 0;
      return { it, hist, last, best, hit: hit(last), ready, pct, series: hist.map((h) => Math.max(...h.sets)) };
    });
    const vol = ss.map((w) => (w.items || []).reduce((a, x) => a + (x.sets || []).reduce((p, v) => p + (+v || 0), 0), 0));
    return { ss, items, vol, pct: items.length ? items.reduce((a, x) => a + x.pct, 0) / items.length : 0 };
  }
  const step = (u) => (u === 'sec' ? 5 : 1);

  /* אימון מודרך מסט */
  function startSet(id) {
    const set = sets.get(id); if (!set || !set.items.length || !KX.workout) return;
    const session = {
      title: set.name, sub: 'הסט שלי · ' + set.items.length + ' תרגילים', src: 'set', meta: { set: set.id },
      items: set.items.filter((it) => KX.exMap[it.ex]).map((it) => ({ ex: it.ex, n: exName(it.ex), unit: it.unit, target: it.target, label: String(it.target), sets: it.sets, rest: it.rest, note: /לכל/.test(KX.exMap[it.ex].rx) ? 'לכל צד' : '' })),
      onSave: () => { if (dlg && dlg.open) render(); },
    };
    if (dlg && dlg.open) dlg.close();
    KX.workout.start(session);
  }

  /* ================= האזור האישי (דיאלוג) ================= */
  let dlg = null;
  const V = { tab: 'sets', view: 'list', edit: null, prog: null, pick: null };
  const sparkSVG = (vals, w, h) => {
    if (!vals || vals.length < 2) return '';
    const mx = Math.max(...vals), mn = Math.min(...vals), r = mx - mn || 1;
    const pts = vals.map((v, i) => `${((i / (vals.length - 1)) * (w - 6) + 3).toFixed(1)},${(h - 3 - ((v - mn) / r) * (h - 6)).toFixed(1)}`);
    return `<svg class="my-spark" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true"><polyline points="${pts.join(' ')}"/><circle r="2.6" cx="${pts[pts.length - 1].split(',')[0]}" cy="${pts[pts.length - 1].split(',')[1]}"/></svg>`;
  };
  const relDay = (k) => {
    const n = Math.round((dt.fromDk(dt.today()) - dt.fromDk(k)) / 864e5);
    return n <= 0 ? 'היום' : n === 1 ? 'אתמול' : `לפני ${n} ימים`;
  };
  function ensure() {
    if (dlg) return dlg;
    dlg = document.createElement('dialog');
    dlg.className = 'my';
    dlg.id = 'myArea';
    dlg.setAttribute('aria-labelledby', 'myTitle');
    dlg.innerHTML = `<div class="my-shell">
      <header class="my-top">
        <div class="my-av stage-dark" aria-hidden="true"><svg></svg></div>
        <div class="my-hello"><p class="eyebrow">האזור האישי</p><h2 id="myTitle"></h2><p class="my-tip" id="myTip"></p></div>
        <button type="button" class="icon-btn my-x" data-my="close" aria-label="סגור את האזור האישי">${icon('i-x')}</button>
      </header>
      <div class="my-kpis" id="myKpis"></div>
      <div class="tabs my-tabs" role="tablist" aria-label="האזור האישי">
        <button role="tab" id="myT-sets" aria-controls="myPane" data-my-tab="sets">${icon('i-flag')} הסטים שלי</button>
        <button role="tab" id="myT-favs" aria-controls="myPane" data-my-tab="favs">${icon('i-star')} מועדפים</button>
        <button role="tab" id="myT-coach" aria-controls="myPane" data-my-tab="coach">${icon('i-user')} המדריך שלי</button>
      </div>
      <div class="my-pane" id="myPane" role="tabpanel" tabindex="-1"></div>
      <footer class="my-foot">
        <button type="button" class="btn btn-ghost btn-sm" data-my="journal">${icon('i-chart')} ליומן המלא</button>
        <button type="button" class="btn btn-ghost btn-sm" data-my="timer">${icon('i-timer')} שעון</button>
      </footer>
    </div>`;
    document.body.appendChild(dlg);
    $('#navMe').setAttribute('aria-controls', 'myArea'); /* רק אחרי שהחלון קיים — אחרת זו הפניה שבורה */
    dlg.addEventListener('click', onClick);
    dlg.addEventListener('change', onChange);
    dlg.addEventListener('input', onInput);
    dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); }); /* קליק על הרקע */
    dlg.addEventListener('close', () => {
      if (avatar) avatar.pause();
      $('#navMe').setAttribute('aria-expanded', 'false');
      if (location.hash === '#my') history.replaceState(null, '', location.pathname + location.search);
    });
    $('[role="tablist"]', dlg).addEventListener('keydown', (e) => {
      if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].indexOf(e.key) < 0) return;
      e.preventDefault();
      const tabs = $$('[data-my-tab]', dlg), cur = tabs.findIndex((t) => t.dataset.myTab === V.tab);
      const rtl = !KX.isEn, fwd = (e.key === 'ArrowLeft') === rtl;
      const n = e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : (cur + (fwd ? 1 : -1) + tabs.length) % tabs.length;
      go(tabs[n].dataset.myTab, 'list'); tabs[n].focus();
    });
    return dlg;
  }
  let avatar = null;
  /* דיוקן: המדריך עומד (התנוחה הגבוהה ביותר בסקוואט), חתוך סביב הראש והכתפיים. תמונה סטטית */
  function portrait(svg, id) {
    const ex = KX.exMap.squat;
    const p = new KX.fig.Player(svg, ex, { fit: 1, coach: id });
    let best = 0, by = Infinity;
    p.good.forEach((f, i) => { const y = KX.fig.solve(f.p).head[1]; if (y < by) { by = y; best = i; } });
    p.showFrame(best);
    const k = p.sk;
    svg.setAttribute('viewBox', [k.head[0] - 36, k.head[1] - 26, 72, 72].map((n) => Math.round(n)).join(' '));
    return p;
  }
  function open(opts) {
    ensure();
    opts = opts || {};
    if (opts.tab) { V.tab = opts.tab; V.view = opts.view || 'list'; }
    if (opts.pick) { V.tab = 'sets'; V.view = 'pick'; V.pick = opts.pick; }
    if (KX.app && KX.app.closeEx && opts.pick) KX.app.closeEx();
    render();
    if (!dlg.open) dlg.showModal();
    $('#navMe').setAttribute('aria-expanded', 'true');
    const f = $('.my-pane [autofocus]', dlg) || $(`[data-my-tab="${V.tab}"]`, dlg);
    if (f) f.focus();
  }
  function go(tab, view, extra) {
    V.tab = tab; V.view = view || 'list';
    Object.assign(V, extra || {});
    render();
    const pane = $('#myPane');
    if (pane) pane.scrollTop = 0;
  }

  function render() {
    if (!dlg) return;
    const c = todaysCoach(), C = KX.coaches[c], I = INFO[c];
    dlg.style.setProperty('--coach', C.color);
    /* אווטאר: דיוקן של המדריך (פלג גוף עליון) */
    if (!avatar || avatar.coach !== c) avatar = portrait($('.my-av svg', dlg), c);
    const st = D.streak(), ws = D.workouts();
    const wk = dt.weekStart(dt.today()), thisWeek = ws.filter((w) => w.date >= wk).length;
    $('#myTitle').innerHTML = `שלום! אני <span data-no-i18n>${C.name}</span>, ${C.g === 'f' ? 'המדריכה שלכם' : 'המדריך שלכם'}`;
    const tipI = Math.floor(Date.now() / 864e5) % I.tips.length;
    $('#myTip').textContent = (st.activeToday ? 'כל הכבוד על האימון היום! ' : '') + I.tips[tipI];
    $('#myKpis').innerHTML = [
      ['i-fire', 'רצף ימים', nf(st.days)],
      ['i-cal', 'אימונים השבוע', nf(thisWeek)],
      ['i-flag', 'סטים שמורים', nf(sets.list().length)],
      ['i-trophy', 'אימונים ביומן', nf(ws.length)],
    ].map(([ic, l, v]) => `<div class="my-kpi">${icon(ic)}<b>${v}</b><span>${l}</span></div>`).join('');
    $$('[data-my-tab]', dlg).forEach((t) => { const on = t.dataset.myTab === V.tab; t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1; });
    $('#myPane').setAttribute('aria-labelledby', 'myT-' + V.tab);
    const pane = $('#myPane');
    if (V.tab === 'favs') pane.innerHTML = favsHTML();
    else if (V.tab === 'coach') pane.innerHTML = coachHTML();
    else if (V.view === 'edit') pane.innerHTML = editHTML();
    else if (V.view === 'prog') pane.innerHTML = progHTML();
    else if (V.view === 'pick') pane.innerHTML = pickHTML();
    else pane.innerHTML = listHTML();
    $$('svg[data-myfig]', pane).forEach((svg) => { const ex = KX.exMap[svg.dataset.myfig]; if (ex) KX.ui.makeFig(svg, ex, { fit: 1.25 }).showFrame(1); });
  }

  /* --- רשימת הסטים --- */
  function listHTML() {
    const l = sets.list(), favs = D.favs().ex.filter((id) => KX.exMap[id]);
    const head = `<div class="my-h"><div><h3>הסטים שלי</h3><p>בחרו תרגילים, קבעו סטים ויעד, ובצעו כאימון מודרך. כל ביצוע נשמר, ופה רואים את ההתקדמות.</p></div>
      <button type="button" class="btn btn-accent btn-sm" data-my="new">${icon('i-plus')} סט חדש</button></div>`;
    if (!l.length) {
      return head + `<div class="my-empty">
        <p><b>עוד אין לכם סט שמור.</b> ${favs.length ? `יש לכם ${favs.length} תרגילים במועדפים, ואפשר להפוך אותם לסט בלחיצה אחת.` : 'סמנו ☆ על תרגילים בספרייה, או בנו סט מהספרייה כאן.'}</p>
        <div class="my-row">${favs.length ? `<button type="button" class="btn btn-accent btn-sm" data-my="from-favs">${icon('i-star')} סט מהמועדפים</button>` : `<a class="btn btn-ghost btn-sm" href="#exercises" data-my="to-lib">${icon('i-search')} לספריית התרגילים</a>`}
        <button type="button" class="btn btn-ghost btn-sm" data-my="new">${icon('i-plus')} סט ריק</button></div></div>`;
    }
    return head + `<ul class="my-sets">${l.map((s) => {
      const P = progressOf(s), last = P.ss[P.ss.length - 1];
      const ready = P.items.filter((x) => x.ready).length;
      return `<li class="my-set">
        <div class="my-set-h">
          <h4>${esc(s.name)}</h4>
          <p class="my-sub">${s.items.length} תרגילים · ${P.ss.length ? `${sessWord(P.ss.length)} · אחרון ${relDay(last.date)}` : 'עוד לא בוצע'}</p>
        </div>
        <p class="my-chips">${s.items.map((it) => `<span style="--c:${catColor(it.ex)}"><i></i>${esc(exName(it.ex))} <small>${KX.bidi(it.sets + '×' + it.target)}${it.unit === 'sec' ? ' שנ׳' : ''}</small></span>`).join('')}</p>
        ${P.ss.length ? `<div class="my-meter"><span class="my-bar" role="progressbar" aria-label="עמידה ביעד בביצוע האחרון" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(P.pct * 100)}"><i style="width:${Math.round(P.pct * 100)}%"></i></span><b>${Math.round(P.pct * 100)}%</b><span>מהיעד בביצוע האחרון</span>${sparkSVG(P.vol.slice(-10), 74, 24)}</div>` : ''}
        ${ready ? `<p class="my-ready">${icon('i-bolt')} ${ready === 1 ? 'תרגיל אחד מוכן' : ready + ' תרגילים מוכנים'} להעלאת יעד</p>` : ''}
        <div class="my-acts">
          <button type="button" class="btn btn-accent btn-sm" data-my="start" data-id="${s.id}" ${s.items.length ? '' : 'disabled'}>${icon('i-play')} התחילו</button>
          <button type="button" class="btn btn-ghost btn-sm" data-my="prog" data-id="${s.id}">${icon('i-chart')} מעקב התקדמות</button>
          <button type="button" class="btn btn-ghost btn-sm" data-my="edit" data-id="${s.id}">${icon('i-edit')} עריכה</button>
        </div>
      </li>`;
    }).join('')}</ul>`;
  }

  /* --- עורך סט --- */
  function draft() {
    if (!V.edit) V.edit = { id: uid(), name: defName(), created: Date.now(), items: [], isNew: true };
    return V.edit;
  }
  function editHTML() {
    const s = draft();
    const inSet = new Set(s.items.map((it) => it.ex));
    const favs = D.favs().ex.filter((id) => KX.exMap[id] && !inSet.has(id));
    const full = s.items.length >= MAX_ITEMS;
    const opts = Object.keys(KX.cats).map((cat) => {
      const l = KX.exercises.filter((e) => e.cat === cat && !inSet.has(e.id));
      return l.length ? `<optgroup label="${esc(KX.cats[cat].name)}">${l.map((e) => `<option value="${e.id}">${esc(e.name)}</option>`).join('')}</optgroup>` : '';
    }).join('');
    const rests = [30, 45, 60, 90, 120, 180];
    return `<div class="my-h"><div><h3>${s.isNew ? 'סט חדש' : 'עריכת סט'}</h3><p>לכל תרגיל: מספר סטים, יעד לסט ומנוחה אחריו.</p></div>
      <button type="button" class="btn btn-ghost btn-sm" data-my="back">${icon('i-chev-r')} חזרה</button></div>
      <label class="my-field"><span>שם הסט</span><input type="text" id="mySetName" maxlength="40" value="${esc(s.name)}" autocomplete="off" autofocus /></label>
      ${s.items.length ? `<ol class="my-items">${s.items.map((it, i) => `<li style="--c:${catColor(it.ex)}">
        <svg class="my-ifig stage-dark" data-myfig="${it.ex}" aria-hidden="true"></svg>
        <div class="my-in">
          <b>${esc(exName(it.ex))}</b>
          <div class="my-nums">
            <label><span>סטים</span><input type="number" inputmode="numeric" min="1" max="10" value="${it.sets}" data-f="sets" data-i="${i}" aria-label="סטים: ${esc(exName(it.ex))}" /></label>
            <label><span>יעד</span><input type="number" inputmode="numeric" min="1" max="999" value="${it.target}" data-f="target" data-i="${i}" aria-label="יעד לסט: ${esc(exName(it.ex))}" /></label>
            <label><span>יחידה</span><select data-f="unit" data-i="${i}" aria-label="יחידה: ${esc(exName(it.ex))}"><option value="reps" ${it.unit === 'reps' ? 'selected' : ''}>חזרות</option><option value="sec" ${it.unit === 'sec' ? 'selected' : ''}>שניות</option></select></label>
            <label><span>מנוחה</span><select data-f="rest" data-i="${i}" aria-label="מנוחה: ${esc(exName(it.ex))}">${rests.map((r) => `<option value="${r}" ${+it.rest === r ? 'selected' : ''}>${r < 120 ? r + ' שנ׳' : r / 60 + ' דק׳'}</option>`).join('')}</select></label>
          </div>
        </div>
        <div class="my-ord">
          <button type="button" class="icon-btn" data-my="up" data-i="${i}" aria-label="הזזה למעלה: ${esc(exName(it.ex))}" ${i === 0 ? 'disabled' : ''}>${icon('i-chev-u')}</button>
          <button type="button" class="icon-btn" data-my="down" data-i="${i}" aria-label="הזזה למטה: ${esc(exName(it.ex))}" ${i === s.items.length - 1 ? 'disabled' : ''}>${icon('i-chev-d')}</button>
          <button type="button" class="icon-btn" data-my="rm" data-i="${i}" aria-label="הסרת תרגיל ${esc(exName(it.ex))}">${icon('i-trash')}</button>
        </div>
      </li>`).join('')}</ol>` : '<p class="my-empty-s">הסט ריק. הוסיפו תרגילים מהמועדפים או מהספרייה.</p>'}
      ${full ? `<p class="my-note">אפשר עד ${MAX_ITEMS} תרגילים בסט.</p>` : `<div class="my-add">
        <p class="my-l">${icon('i-star')} הוספה מהמועדפים</p>
        ${favs.length ? `<div class="my-favadd">${favs.map((id) => `<button type="button" data-my="add" data-ex="${id}" style="--c:${catColor(id)}">${icon('i-plus')} ${esc(exName(id))}</button>`).join('')}</div>`
          : `<p class="my-empty-s">${D.favs().ex.length ? 'כל המועדפים כבר בסט.' : 'אין מועדפים עדיין. סמנו ☆ על תרגיל בספרייה.'}</p>`}
        <p class="my-l">${icon('i-search')} הוספה מהספרייה</p>
        <div class="my-row"><label class="sr-only" for="myLib">בחירת תרגיל מהספרייה</label><select id="myLib"><option value="">בחרו תרגיל…</option>${opts}</select>
        <button type="button" class="btn btn-ghost btn-sm" data-my="add-lib">${icon('i-plus')} הוספה</button></div>
      </div>`}
      <div class="my-acts my-save">
        <button type="button" class="btn btn-accent btn-sm" data-my="save" ${s.items.length ? '' : 'disabled'}>${icon('i-save')} שמירת הסט</button>
        ${s.isNew ? '' : `<button type="button" class="btn btn-ghost btn-sm my-del" data-my="del">${icon('i-trash')} מחיקת הסט</button>`}
      </div>`;
  }

  /* --- התקדמות של סט --- */
  function progHTML() {
    const s = sets.get(V.prog);
    if (!s) { V.view = 'list'; return listHTML(); }
    const P = progressOf(s);
    return `<div class="my-h"><div><h3>${esc(s.name)} · מעקב התקדמות</h3><p>${P.ss.length ? `${sessWord(P.ss.length)}, הראשון ${relDay(P.ss[0].date)}` : 'כשתבצעו את הסט, תראו כאן את ההתקדמות בכל תרגיל.'}</p></div>
      <button type="button" class="btn btn-ghost btn-sm" data-my="back">${icon('i-chev-r')} חזרה</button></div>
      ${P.vol.length >= 2 ? `<div class="my-vol"><span>נפח כולל בכל ביצוע (חזרות + שניות)</span>${sparkSVG(P.vol.slice(-16), 260, 56)}<b>${nf(P.vol[P.vol.length - 1])}</b></div>` : ''}
      <ul class="my-prog">${P.items.map((x) => {
        const it = x.it, u = unitWord(it.unit);
        return `<li style="--c:${catColor(it.ex)}">
          <div class="my-pg-h"><b>${esc(exName(it.ex))}</b><span class="my-sub">יעד: ${KX.bidi(it.sets + '×' + it.target)} ${u}</span></div>
          <div class="my-pg-b">
            <span class="my-bar" role="progressbar" aria-label="עמידה ביעד: ${esc(exName(it.ex))}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(x.pct * 100)}"><i style="width:${Math.round(x.pct * 100)}%"></i></span>
            ${sparkSVG(x.series.slice(-12), 90, 26)}
          </div>
          <p class="my-pg-s">${x.last ? `אחרון: <span class="tnum" dir="ltr">${x.last.sets.join(' · ')}</span> ${u} · שיא: <b class="tnum">${x.best}</b>${x.hit ? ` · <span class="ok">${icon('i-check')} ביעד</span>` : ''}` : 'עוד לא בוצע'}</p>
          ${x.ready ? `<button type="button" class="btn btn-accent btn-sm my-bump" data-my="bump" data-ex="${it.ex}">${icon('i-bolt')} עמדתם ביעד, העלו ל־${it.target + step(it.unit)} ${u}</button>` : ''}
        </li>`;
      }).join('')}</ul>
      <div class="my-acts"><button type="button" class="btn btn-accent btn-sm" data-my="start" data-id="${s.id}">${icon('i-play')} התחילו את הסט</button><button type="button" class="btn btn-ghost btn-sm" data-my="edit" data-id="${s.id}">${icon('i-edit')} עריכה</button></div>`;
  }

  /* --- הוספת תרגיל (מהמודאל) לסט --- */
  function pickHTML() {
    const ex = KX.exMap[V.pick]; if (!ex) { V.view = 'list'; return listHTML(); }
    const l = sets.list();
    return `<div class="my-h"><div><h3>הוספה לסט: ${esc(ex.name)}</h3><p>${l.length ? 'בחרו לאיזה סט להוסיף, או פתחו סט חדש.' : 'עוד אין לכם סטים. פתחו סט חדש עם התרגיל.'}</p></div>
      <button type="button" class="btn btn-ghost btn-sm" data-my="back">${icon('i-chev-r')} לסטים</button></div>
      <ul class="my-picks">${l.map((s) => {
        const has = s.items.some((it) => it.ex === ex.id), full = s.items.length >= MAX_ITEMS;
        return `<li><span><b>${esc(s.name)}</b><small>${s.items.length} תרגילים</small></span>${has ? `<span class="my-sub">${icon('i-check')} כבר בסט</span>` : `<button type="button" class="btn btn-ghost btn-sm" data-my="pick-to" data-id="${s.id}" ${full ? 'disabled' : ''}>${icon('i-plus')} הוספה</button>`}</li>`;
      }).join('')}</ul>
      <button type="button" class="btn btn-accent btn-sm" data-my="pick-new" autofocus>${icon('i-plus')} סט חדש עם ${esc(ex.name)}</button>`;
  }

  /* --- מועדפים --- */
  function favsHTML() {
    const f = D.favs().ex.filter((id) => KX.exMap[id]);
    if (!f.length) return `<div class="my-h"><div><h3>המועדפים שלי</h3><p>סמנו ☆ על כרטיס תרגיל או במודאל של התרגיל, והוא יופיע כאן.</p></div></div>
      <a class="btn btn-ghost btn-sm" href="#exercises" data-my="to-lib">${icon('i-search')} לספריית התרגילים</a>`;
    return `<div class="my-h"><div><h3>המועדפים שלי</h3><p>${f.length} תרגילים. הוסיפו אותם לסט, או צפו בהדגמה.</p></div>
      <button type="button" class="btn btn-accent btn-sm" data-my="from-favs">${icon('i-flag')} סט מכל המועדפים</button></div>
      <ul class="my-favs">${f.map((id) => {
        const ex = KX.exMap[id];
        return `<li style="--c:${catColor(id)}">
          <svg class="my-ifig stage-dark" data-myfig="${id}" aria-hidden="true"></svg>
          <span class="my-fv-t"><b>${esc(ex.name)}</b><small>${esc(KX.cats[ex.cat].name)} · ${esc(KX.bidi(ex.rx))}</small></span>
          <span class="my-fv-a">
            <button type="button" class="btn btn-ghost btn-sm" data-my="fav-demo" data-ex="${id}">${icon('i-play')} הדגמה</button>
            <button type="button" class="btn btn-ghost btn-sm" data-my="fav-set" data-ex="${id}">${icon('i-plus')} לסט</button>
            <button type="button" class="fav-btn fav-inline on" data-fav="ex:${id}" aria-pressed="true" aria-label="הסר ממועדפים: ${esc(ex.name)}">${icon('i-star-f')}</button>
          </span>
        </li>`;
      }).join('')}</ul>`;
  }

  /* --- המדריך שלי --- */
  function coachHTML() {
    const p = pref();
    const opt = (v, title, sub) => `<button type="button" class="my-copt${p === v ? ' on' : ''}" data-pick-coach="${v}" role="radio" aria-checked="${p === v}" ${v !== 'auto' ? `style="--coach:${KX.coaches[v].color}"` : ''}>
      <span class="my-cdot" aria-hidden="true">${v === 'auto' ? '⇄' : KX.coaches[v].name[0]}</span><span><b>${title}</b><small>${sub}</small></span></button>`;
    return `<div class="my-h"><div><h3>מי מדגים לכם?</h3><p>המדריך שתבחרו יופיע בכל ההדגמות, בסרטוני ההדרכה ובאימונים המודרכים.</p></div></div>
      <div class="my-copts" role="radiogroup" aria-label="המדריך שלי">
        ${opt('cali', 'Cali', INFO.cali.role)}
        ${opt('stheni', 'Stheni', INFO.stheni.role)}
        ${opt('auto', 'שניהם, לסירוגין', 'כל מדריך מדגים חצי מהתרגילים בכל קטגוריה')}
      </div>
      <a class="btn btn-ghost btn-sm" href="#coaches" data-my="to-coaches">${icon('i-user')} להכיר את המדריכים</a>`;
  }

  /* ================= אירועים ================= */
  function syncDraft() {
    const s = V.edit; if (!s) return;
    const n = $('#mySetName', dlg);
    if (n) s.name = n.value.trim().slice(0, 40) || defName();
  }
  function onInput(e) {
    const t = e.target;
    if (t.id === 'mySetName' && V.edit) V.edit.name = t.value.slice(0, 40);
  }
  function onChange(e) {
    const t = e.target, s = V.edit;
    if (!s || t.dataset.i == null) return;
    const it = s.items[+t.dataset.i]; if (!it) return;
    const f = t.dataset.f;
    if (f === 'unit') { it.unit = t.value; it.target = t.value === 'sec' ? Math.max(10, it.target) : Math.min(it.target, 50); render(); return; }
    const lim = { sets: [1, 10], target: [1, 999], rest: [0, 600] }[f];
    const v = Math.max(lim[0], Math.min(lim[1], Math.round(+t.value || lim[0])));
    it[f] = v;
    if (String(v) !== t.value) t.value = v;
  }
  function addToDraft(exId) {
    const s = draft();
    if (!KX.exMap[exId] || s.items.some((x) => x.ex === exId) || s.items.length >= MAX_ITEMS) return false;
    syncDraft();
    s.items.push(sets.item(exId));
    render();
    return true;
  }
  function onClick(e) {
    const tab = e.target.closest('[data-my-tab]');
    if (tab) { go(tab.dataset.myTab, 'list'); return; }
    const b = e.target.closest('[data-my]'); if (!b) return;
    const a = b.dataset.my, id = b.dataset.id;
    switch (a) {
      case 'close': dlg.close(); break;
      case 'journal': dlg.close(); $('#me').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); break;
      case 'timer': dlg.close(); if (KX.timer) KX.timer.open('rest'); break;
      case 'to-lib': case 'to-coaches': dlg.close(); break; /* הקישור עצמו גולל לאזור */
      case 'new': V.edit = null; draft(); go('sets', 'edit'); break;
      case 'from-favs': {
        const f = D.favs().ex.filter((x) => KX.exMap[x]).slice(0, MAX_ITEMS);
        if (!f.length) break;
        V.edit = { id: uid(), name: KX.isEn ? 'My favorites' : 'המועדפים שלי', created: Date.now(), items: f.map(sets.item), isNew: true };
        go('sets', 'edit');
        toast('נוצר סט מ־' + f.length + ' מועדפים. בדקו ושמרו');
        break;
      }
      case 'edit': { const s = sets.get(id); if (s) { V.edit = JSON.parse(JSON.stringify(s)); go('sets', 'edit'); } break; }
      case 'prog': go('sets', 'prog', { prog: id }); break;
      case 'start': startSet(id); break;
      case 'back': V.edit = null; go('sets', 'list'); break;
      case 'add': addToDraft(b.dataset.ex); break;
      case 'add-lib': { const sel = $('#myLib', dlg); if (sel && sel.value) { addToDraft(sel.value); const n = $('#myLib', dlg); if (n) n.focus(); } else if (sel) sel.focus(); break; }
      case 'up': case 'down': case 'rm': {
        syncDraft();
        const s = V.edit, i = +b.dataset.i;
        if (a === 'rm') s.items.splice(i, 1);
        else { const j = a === 'up' ? i - 1 : i + 1; if (j < 0 || j >= s.items.length) break; [s.items[i], s.items[j]] = [s.items[j], s.items[i]]; }
        render();
        const again = $(`[data-my="${a}"][data-i="${a === 'rm' ? Math.max(0, i - 1) : a === 'up' ? i - 1 : i + 1}"]`, dlg) || $('[data-my="save"]', dlg);
        if (again && !again.disabled) again.focus();
        break;
      }
      case 'save': {
        syncDraft();
        const s = V.edit; if (!s || !s.items.length) break;
        const out = { id: s.id, name: s.name, created: s.created || Date.now(), items: s.items.map((it) => ({ ex: it.ex, sets: it.sets, target: it.target, unit: it.unit, rest: it.rest })) };
        sets.save(out);
        V.edit = null;
        go('sets', 'list');
        toast('הסט נשמר ✓');
        break;
      }
      case 'del': {
        if (!b.dataset.sure) { b.dataset.sure = '1'; b.lastChild.textContent = ' בטוחים? לחצו שוב'; setTimeout(() => { if (b.isConnected) { delete b.dataset.sure; b.lastChild.textContent = ' מחיקת הסט'; } }, 5000); break; }
        sets.remove(V.edit.id); V.edit = null; go('sets', 'list'); toast('הסט נמחק (האימונים שבוצעו נשארים ביומן)');
        break;
      }
      case 'bump': {
        const s = sets.get(V.prog); if (!s) break;
        const it = s.items.find((x) => x.ex === b.dataset.ex); if (!it) break;
        it.target += step(it.unit);
        sets.save(s); render();
        toast(`היעד עודכן: ${exName(it.ex)} · ${it.target} ${unitWord(it.unit)}`);
        break;
      }
      case 'pick-to': {
        const s = sets.get(id), ex = V.pick; if (!s || !KX.exMap[ex]) break;
        if (!s.items.some((x) => x.ex === ex)) { s.items.push(sets.item(ex)); sets.save(s); }
        toast(`${exName(ex)} נוסף ל"${s.name}"`);
        V.pick = null; go('sets', 'list');
        break;
      }
      case 'pick-new': { const ex = V.pick; V.pick = null; V.edit = null; draft().items.push(sets.item(ex)); go('sets', 'edit'); break; }
      case 'fav-demo': dlg.close(); if (KX.app) KX.app.openEx(b.dataset.ex); break;
      case 'fav-set': go('sets', 'pick', { pick: b.dataset.ex }); break;
    }
  }

  /* ================= חיבורים לעמוד ================= */
  const navMe = $('#navMe');
  if (navMe) navMe.addEventListener('click', () => open());
  /* כפתור "לסט שלי" במודאל התרגיל */
  const mf = $('#exModal .m-foot');
  if (mf) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn btn-ghost btn-sm m-toset';
    b.innerHTML = `${icon('i-plus')} לסט שלי`;
    b.addEventListener('click', () => { const ex = KX.app && KX.app.currentEx(); if (ex) open({ pick: ex.id }); });
    const start = $('.m-start', mf);
    mf.insertBefore(b, start ? start.nextSibling : mf.lastElementChild);
  }
  /* #my בכתובת (למשל קיצור דרך מהאפליקציה המותקנת) */
  const fromHash = () => { if (location.hash === '#my') open(); };
  window.addEventListener('hashchange', fromHash);
  KX.on('appready', fromHash);
  /* עדכון כשהנתונים משתנים (אימון נשמר, מועדף, ייבוא) */
  const refresh = () => { if (dlg && dlg.open && V.view !== 'edit') render(); };
  KX.on('fav', refresh);
  KX.on('workout', refresh);
  KX.on('import', () => { V.edit = null; refresh(); KX.refreshCoaches(); syncCoachTags(); renderCoaches(); });

  renderCoaches();
  KX.my = { open, sets, startSet, setCoach };
})();
