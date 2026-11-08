/* KALOS — מבחן כושר כניסה: 4–5 בדיקות מקסימום, רמה לכל דפוס תנועה, המלצת תוכנית ושלב פתיחה בכל מסלול */
(function () {
  'use strict';
  const KX = window.KX;
  const { $, $$, esc, icon } = KX.ui;

  /* ---------- הגדרות הבדיקות ---------- */
  const TESTS = {
    push: { ex: 'pushup', kind: 'push', unit: 'reps', max: 150, name: 'שכיבות סמיכה', title: 'כמה שכיבות סמיכה ברצף?',
      how: 'בצעו כמה שיותר חזרות נקיות ברצף, בלי מנוחה. חזרה נספרת רק אם החזה יורד עד כאגרוף מהרצפה והידיים ננעלות למעלה.',
      cues: ['גוף ישר כקרש, מהעקבים ועד הראש', 'מרפקים בכ־45° מהגוף', 'האגן "נשבר" או הטווח מתקצר? הסט נגמר'] },
    pull: { ex: 'pullup', kind: 'pull', unit: 'reps', max: 60, name: 'מתח', title: 'כמה עליות מתח ברצף?',
      how: 'מתלייה מלאה עם ידיים ישרות ועד שהסנטר מעל המוט. בלי נדנוד ובלי קיפינג.',
      cues: ['כל חזרה מתחילה מידיים ישרות לגמרי', 'סנטר מעל המוט, לא רק "מתקרב"', '0 זו תוצאה לגיטימית לגמרי. מכאן מתחילים'] },
    dip: { ex: 'dip', kind: 'dip', unit: 'reps', max: 80, name: 'מקבילים', title: 'כמה דיפס ברצף?',
      how: 'ירידה עד שהכתף בגובה המרפק (בערך 90° במרפק) ונעילה מלאה למעלה.',
      cues: ['כתפיים למטה, רחוק מהאוזניים', 'כאב בקדמת הכתף? עצרו ורשמו את מה שהספקתם', 'נעילה מלאה בכל חזרה'] },
    plank: { ex: 'plank', unit: 'sec', max: 1200, name: 'פלאנק', title: 'כמה זמן בפלאנק?',
      how: 'פלאנק על האמות. מפעילים את השעון, וכשהאגן שוקע או מתרומם, עוצרים. זו התוצאה.',
      cues: ['אגן ניטרלי: לא "בננה" ולא "פירמידה"', 'בטן וישבן מכווצים, נושמים רגיל', 'עוצרים כשהטכניקה נשברת, לא כשנגמר הכוח לגמרי'] },
    squat: { ex: 'squat', kind: 'squat', unit: 'reps', max: 300, name: 'סקוואט', title: 'כמה סקוואטים ברצף?',
      how: 'סקוואט במשקל גוף, ירידה עד שהירך מקבילה לרצפה לפחות, בקצב קבוע וללא עצירות ארוכות.',
      cues: ['עקבים צמודים לרצפה', 'ברכיים בכיוון האצבעות, לא קורסות פנימה', 'גב ניטרלי, חזה גאה'] },
  };

  /* ציון 0–3 לכל דפוס (תואם לספים של מחולל התוכניות) */
  const band = (v, th) => (v >= th[2] ? 3 : v >= th[1] ? 2 : v >= th[0] ? 1 : 0);
  const SCORE = {
    push: (v) => band(v, [5, 15, 25]),
    pull: (v) => band(v, [1, 6, 12]),
    dip: (v) => band(v, [1, 6, 15]),
    squat: (v) => band(v, [10, 25, 40]),
    plank: (v) => band(v, [30, 60, 120]),
  };
  const plankLabel = (s) => (s >= 120 ? 'מתקדם' : s >= 60 ? 'בינוני' : s >= 30 ? 'בסיס טוב' : 'מתחיל');
  const label = (k, v) => (k === 'plank' ? plankLabel(v) : KX.builder.levelLabel(TESTS[k].kind, v));
  const OVERALL = ['מתחיל מוחלט', 'מתחיל', 'בינוני', 'מתקדם'];

  /* כמה שלבים נחשבים "הושגו" בכל מסלול לפי תוצאות המבחן — מיפוי שמרני (רק מה שהמבחן מוכיח בבירור).
     השלב הבא (index = reached) הוא שלב הפתיחה המומלץ.
     push : קיר(0) שיפוע(1) שכ״ס 3×10–15(2) יהלום(3)...  0→0 · 1–4→1 · 5–14→2 · 15+→3
     pull : חתירה(0) תלייה(1) שליליים(2) מתח 3×8(3) חזה־למוט(4)...  ללא מוט→0 · 0→0 · 1–4→2 · 5–11→3 · 12+→4
     legs : סקוואט עם אחיזה(0) סקוואט 3×20(1) לאנג׳(2)...  <15→0 · 15–29→1 · 30+→2
     hs   : פלאנק גבוה + פייק(0) פייק פוש־אפ(1)...  שכ״ס 10+ ופלאנק 45+→1, אחרת 0
     core : פלאנק 3×60(0) הולו(1)...  פלאנק 90+→1, אחרת 0
     fl   : תלייה פעילה(0) הרמות רגליים(1)...  מתח 5+→1, אחרת 0 */
  function trackReach(r) {
    return {
      push: r.push >= 15 ? 3 : r.push >= 5 ? 2 : r.push >= 1 ? 1 : 0,
      pull: !r.bar ? 0 : r.pull >= 12 ? 4 : r.pull >= 5 ? 3 : r.pull >= 1 ? 2 : 0,
      legs: r.squat >= 30 ? 2 : r.squat >= 15 ? 1 : 0,
      hs: r.push >= 10 && r.plank >= 45 ? 1 : 0,
      core: r.plank >= 90 ? 1 : 0,
      fl: r.bar && r.pull >= 5 ? 1 : 0,
    };
  }

  /* תוכנית מומלצת לפי רמה כללית וציוד */
  function recommend(overall, bar, dips) {
    const order = overall >= 3 ? ['ppl', 'og', 'ul', 'rr', 'fb'] : overall === 2 ? ['ul', 'rr', 'fb'] : overall === 1 ? ['rr', 'fb'] : ['fb'];
    const ok = { ppl: bar && dips, og: bar && dips, ul: bar && dips, rr: bar, fb: true };
    const id = order.find((x) => ok[x]) || 'fb';
    const i = KX.programs.findIndex((p) => p.id === id);
    return { i, p: KX.programs[i] };
  }

  /* ---------- dialog ---------- */
  const dlg = document.createElement('dialog');
  dlg.className = 'ft';
  dlg.id = 'ftDialog';
  dlg.setAttribute('aria-labelledby', 'ftTitle');
  dlg.innerHTML = `
    <div class="ft-shell">
      <header class="ft-top">
        <div class="ft-titles"><p class="ft-eyebrow">${icon('i-test')} מבחן כושר</p><h3 id="ftTitle">מבחן כושר כניסה</h3></div>
        <ol class="ft-steps" aria-hidden="true"></ol>
        <button class="icon-btn ft-x" data-ft-close aria-label="סגור את המבחן">${icon('i-x')}</button>
      </header>
      <div class="ft-body" tabindex="-1"></div>
      <footer class="ft-nav">
        <button class="btn btn-ghost" data-ft-back>${icon('i-chev-r')} חזרה</button>
        <span class="ft-count" aria-live="polite"></span>
        <button class="btn btn-accent" data-ft-next>המשך ${icon('i-arrow')}</button>
      </footer>
    </div>`;
  document.body.appendChild(dlg);
  const body = $('.ft-body', dlg), stepsEl = $('.ft-steps', dlg);

  let S = null; /* מצב הריצה */
  let fig = null, sw = null, rest = null;

  function fresh() {
    return { step: 0, bar: true, dips: true, v: { push: 0, pull: 0, dip: 0, plank: 0, squat: 0 }, touched: {}, saved: false, marked: false, prev: null };
  }
  const flow = () => ['intro', 'equip', 'push'].concat(S.bar ? ['pull'] : [], S.dips ? ['dip'] : [], ['plank', 'squat', 'result']);

  function stopAll() {
    if (fig) { fig.pause(); fig = null; }
    if (sw) { clearInterval(sw.id); sw = null; }
    if (rest) { clearInterval(rest.id); rest = null; }
    KX.fx.wake(false);
  }

  function open() {
    S = fresh();
    const t = KX.data.tests();
    S.prev = t.length ? t[t.length - 1] : null;
    if (S.prev) { S.bar = S.prev.bar !== false; S.dips = S.prev.dips !== false; }
    if (KX.app && KX.app.closeEx) KX.app.closeEx();
    show();
    if (!dlg.open) dlg.showModal();
  }

  function show() {
    stopAll();
    const f = flow(), key = f[S.step];
    const testKeys = f.filter((k) => TESTS[k]);
    stepsEl.innerHTML = f.map((k, i) => `<li class="${i < S.step ? 'done' : i === S.step ? 'on' : ''}"></li>`).join('');
    const ti = testKeys.indexOf(key);
    $('.ft-count', dlg).textContent = ti > -1 ? `בדיקה ${ti + 1} מתוך ${testKeys.length}` : '';
    $('[data-ft-back]', dlg).style.visibility = S.step === 0 ? 'hidden' : '';
    const next = $('[data-ft-next]', dlg);
    next.hidden = key === 'result';
    next.innerHTML = key === 'intro' ? `בואו נתחיל ${icon('i-arrow')}` : f[S.step + 1] === 'result' ? `לתוצאות ${icon('i-bolt')}` : `המשך ${icon('i-arrow')}`;
    if (key === 'intro') renderIntro();
    else if (key === 'equip') renderEquip();
    else if (key === 'result') renderResult();
    else renderTest(key, testKeys);
    body.scrollTop = 0;
    body.classList.remove('ft-anim'); void body.offsetWidth; body.classList.add('ft-anim');
    const focusEl = $('[data-autofocus]', body) || body;
    focusEl.focus({ preventScroll: true });
  }

  function renderIntro() {
    body.innerHTML = `
      <div class="ft-intro">
        <div>
          <h4 data-autofocus tabindex="-1">כמה דקות, ונדע בדיוק מאיפה להתחיל</h4>
          <p class="ft-lead">המבחן בודק את דפוסי התנועה הבסיסיים: דחיפה, משיכה, ליבה ורגליים. בסופו תקבלו רמה לכל דפוס, תוכנית מומלצת ושלב פתיחה בכל מסלול התקדמות.</p>
          <ul class="ft-list">
            <li>${icon('i-check')}<span><b>שכיבות סמיכה</b>, <b>מתח</b> ו<b>מקבילים</b> (אם יש ציוד): מקסימום חזרות נקיות ברצף</span></li>
            <li>${icon('i-check')}<span><b>פלאנק</b>: החזקה מקסימלית, עם שעון מובנה</span></li>
            <li>${icon('i-check')}<span><b>סקוואט</b>: מקסימום חזרות ברצף</span></li>
          </ul>
        </div>
        <div class="ft-side">
          <div class="ft-note">${icon('i-timer')}<span><b>נוחו 2–3 דקות בין בדיקה לבדיקה.</b> בכל מסך יש כפתור לטיימר מנוחה.</span></div>
          <div class="ft-note">${icon('i-flex')}<span>התחממו קודם 5–10 דקות. החימום המודרך נמצא בסעיף העקרונות.</span></div>
          <div class="ft-note warn">${icon('i-info')}<span>עצרו בכל כאב חד. המבחן לא מחליף ייעוץ רפואי, ואם יש לכם פציעה או מצב רפואי, התייעצו קודם עם רופא.</span></div>
          ${S.prev ? `<div class="ft-note">${icon('i-chart')}<span>המבחן הקודם שלכם: ${esc(S.prev.date)}. בסוף נשווה את התוצאות.</span></div>` : ''}
        </div>
      </div>`;
  }

  function renderEquip() {
    body.innerHTML = `
      <h4 class="ft-q" data-autofocus tabindex="-1">איזה ציוד יש לכם עכשיו?</h4>
      <p class="ft-sub">בדיקות בלי ציוד מתאים פשוט ידולגו.</p>
      <div class="ft-eq">
        <label class="ft-opt"><input type="checkbox" data-eq="bar" ${S.bar ? 'checked' : ''} /><span>${icon('i-bar')}<b>מוט מתח</b><small>בדלת, בפארק או בחדר כושר</small></span></label>
        <label class="ft-opt"><input type="checkbox" data-eq="dips" ${S.dips ? 'checked' : ''} /><span>${icon('i-dip')}<b>מקבילים</b><small>או שני כיסאות יציבים מאוד</small></span></label>
      </div>`;
    $$('[data-eq]', body).forEach((c) => c.addEventListener('change', () => { S[c.dataset.eq] = c.checked; stepsEl.innerHTML = flow().map((k, i) => `<li class="${i < S.step ? 'done' : i === S.step ? 'on' : ''}"></li>`).join(''); }));
  }

  function renderTest(key) {
    const T = TESTS[key], ex = KX.exMap[T.ex], c = KX.cats[ex.cat].color, v = S.v[key];
    const isSec = T.unit === 'sec';
    body.innerHTML = `
      <div class="ft-test" style="--c:${c}">
        <div class="ft-stage"><svg role="img" aria-label="הדגמה: ${esc(ex.name)}"></svg><span class="ft-stage-cap">${esc(ex.name)}</span></div>
        <div class="ft-main">
          <h4 data-autofocus tabindex="-1">${esc(T.title)}</h4>
          <p class="ft-how">${esc(T.how)}</p>
          <ul class="ft-cues">${T.cues.map((x) => `<li>${icon('i-check')}<span>${esc(x)}</span></li>`).join('')}</ul>
          ${isSec ? `
            <div class="ft-sw">
              <output class="ft-big" id="ftSw" aria-live="off">${KX.fx.fmt(v)}</output>
              <div class="ft-sw-btns">
                <button class="btn btn-accent" data-sw>${icon('i-play')} התחילו</button>
                <button class="btn btn-ghost btn-sm" data-sw-reset>${icon('i-refresh')} איפוס</button>
              </div>
              <label class="ft-manual">או הזינו ידנית (שניות): <input type="number" inputmode="numeric" min="0" max="${T.max}" step="1" value="${v}" data-val /></label>
            </div>` : `
            <div class="ft-counter">
              <button class="icon-btn ft-pm" data-d="-1" aria-label="פחות">${icon('i-minus')}</button>
              <label class="ft-num"><span class="sr">מספר חזרות</span><input type="number" inputmode="numeric" min="0" max="${T.max}" step="1" value="${v}" data-val aria-label="מספר חזרות: ${esc(T.name)}" /></label>
              <button class="icon-btn ft-pm" data-d="1" aria-label="יותר">${icon('i-plus')}</button>
            </div>
            <div class="ft-quick">${[1, 5, 10].map((n) => `<button class="chip" data-d="${n}">+${n}</button>`).join('')}<button class="chip" data-zero>0</button></div>`}
          <p class="ft-level" aria-live="polite"></p>
          <p class="ft-err" role="alert" hidden></p>
          <button class="btn btn-ghost btn-sm ft-rest" data-rest>${icon('i-timer')} <span>טיימר מנוחה 2:00</span></button>
        </div>
      </div>`;
    const svg = $('.ft-stage svg', body);
    fig = KX.ui.makeFig(svg, ex, { fit: 1.3 });
    if (!KX.ui.reduce) fig.play(); else fig.showFrame(1);
    const inp = $('[data-val]', body);
    const set = (n) => {
      n = Math.max(0, Math.min(T.max, Math.round(+n || 0)));
      S.v[key] = n; S.touched[key] = true;
      if (document.activeElement !== inp || +inp.value !== n) inp.value = n;
      if (isSec) $('#ftSw', body).textContent = KX.fx.fmt(n);
      $('.ft-level', body).innerHTML = `רמה: <b>${esc(label(key, n))}</b>`;
      $('.ft-err', body).hidden = true;
    };
    set(v);
    inp.addEventListener('input', () => { if (inp.value !== '') set(inp.value); });
    inp.addEventListener('blur', () => set(inp.value));
    $$('[data-d]', body).forEach((b) => b.addEventListener('click', () => set(S.v[key] + +b.dataset.d)));
    const z = $('[data-zero]', body); if (z) z.addEventListener('click', () => set(0));
    if (isSec) {
      const btn = $('[data-sw]', body);
      const paint = () => { btn.innerHTML = sw && sw.run ? `${icon('i-pause')} עצרו` : sw && sw.count ? `${icon('i-x')} ביטול` : `${icon('i-play')} ${S.v[key] ? 'שוב מההתחלה' : 'התחילו'}`; };
      btn.addEventListener('click', () => {
        if (sw && (sw.run || sw.count)) { /* עצירה */
          clearInterval(sw.id);
          const wasRun = sw.run; sw = null;
          KX.fx.wake(false);
          if (wasRun) { KX.fx.beep('done'); KX.fx.speak('עצרתם. ' + S.v[key] + ' שניות'); KX.ui.toast('נרשם: ' + KX.fx.fmt(S.v[key])); }
          paint(); return;
        }
        KX.fx.audio();
        sw = { count: 3, run: false, id: null };
        KX.fx.wake(true);
        $('#ftSw', body).textContent = '3'; KX.fx.beep('tick');
        paint();
        sw.id = setInterval(() => {
          if (!sw) return;
          sw.count--;
          if (sw.count > 0) { $('#ftSw', body).textContent = String(sw.count); KX.fx.beep('tick'); return; }
          clearInterval(sw.id);
          sw.count = 0; sw.run = true; sw.t0 = performance.now();
          KX.fx.beep('go'); set(0); paint();
          sw.id = setInterval(() => { if (sw && sw.run) set((performance.now() - sw.t0) / 1000); }, 250);
        }, 1000);
      });
      $('[data-sw-reset]', body).addEventListener('click', () => { if (sw) { clearInterval(sw.id); sw = null; KX.fx.wake(false); } set(0); paint(); });
    }
    $('[data-rest]', body).addEventListener('click', (e) => {
      const b = e.currentTarget, sp = $('span', b);
      if (rest) { clearInterval(rest.id); rest = null; sp.textContent = 'טיימר מנוחה 2:00'; b.classList.remove('on'); return; }
      KX.fx.audio();
      rest = { left: 120, id: null }; b.classList.add('on');
      sp.textContent = 'מנוחה ' + KX.fx.fmt(rest.left);
      rest.id = setInterval(() => {
        rest.left--;
        sp.textContent = 'מנוחה ' + KX.fx.fmt(rest.left);
        if (rest.left <= 0) { clearInterval(rest.id); rest = null; KX.fx.beep('done'); KX.fx.speak('המנוחה הסתיימה'); sp.textContent = 'מוכנים! טיימר מנוחה 2:00'; b.classList.remove('on'); }
      }, 1000);
    });
  }

  function validate() {
    const key = flow()[S.step];
    if (!TESTS[key]) return true;
    if (sw && (sw.run || sw.count)) { const er = $('.ft-err', body); er.textContent = 'עצרו קודם את השעון.'; er.hidden = false; return false; }
    const inp = $('[data-val]', body);
    const n = +inp.value;
    if (inp.value === '' || !isFinite(n) || n < 0 || n > TESTS[key].max || Math.round(n) !== n) {
      const er = $('.ft-err', body);
      er.textContent = `הזינו מספר שלם בין 0 ל־${TESTS[key].max}.`;
      er.hidden = false; inp.focus();
      return false;
    }
    S.v[key] = n;
    return true;
  }

  function result() {
    const r = { push: S.v.push, pull: S.bar ? S.v.pull : 0, dip: S.dips ? S.v.dip : 0, squat: S.v.squat, plank: S.v.plank, bar: S.bar, dips: S.dips };
    const keys = ['push'].concat(S.bar ? ['pull'] : [], S.dips ? ['dip'] : [], ['plank', 'squat']);
    const scores = keys.map((k) => SCORE[k](r[k]));
    const overall = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    return { r, keys, overall, rec: recommend(overall, S.bar, S.dips), reach: trackReach(r) };
  }

  function renderResult() {
    const { r, keys, overall, rec, reach } = result();
    const prev = S.prev;
    const fmtV = (k, v) => (TESTS[k].unit === 'sec' ? KX.fx.fmt(v) : v);
    const delta = (k) => {
      if (!prev || prev[k] == null || (k === 'pull' && prev.bar === false) || (k === 'dip' && prev.dips === false)) return '';
      const d = r[k] - prev[k];
      if (!d) return '<span class="ft-d eq">= ללא שינוי</span>';
      return `<span class="ft-d ${d > 0 ? 'up' : 'down'}">${d > 0 ? '↑' : '↓'} ${TESTS[k].unit === 'sec' ? KX.fx.fmt(Math.abs(d)) : Math.abs(d)}</span>`;
    };
    const cur = KX.data.skills();
    const canMark = KX.progressions.some((t) => (reach[t.id] || 0) > (cur[t.id] || 0));
    body.innerHTML = `
      <div class="ft-res">
        <div class="ft-res-head">
          <div class="ft-badge" style="--lv:${overall}"><small>הרמה הכללית שלכם</small><b data-autofocus tabindex="-1">${OVERALL[overall]}</b>
            <span class="ft-meter" aria-hidden="true">${[0, 1, 2, 3].map((i) => `<i class="${i <= overall ? 'on' : ''}"></i>`).join('')}</span></div>
          <div class="ft-reco" style="--img:url('${KX.img(rec.p.img, 700)}')">
            <small>התוכנית המומלצת</small><b>${esc(rec.p.title)}</b><span>${esc(rec.p.freq)} · ${esc(rec.p.level)} · ${esc(rec.p.equip)}</span>
            <button class="btn btn-ghost btn-sm" data-ft-prog>לתוכנית ${icon('i-arrow')}</button>
          </div>
        </div>
        <h4 class="ft-h">התוצאות שלכם${prev ? ` <small>בהשוואה למבחן מ־${esc(prev.date)}</small>` : ''}</h4>
        <ul class="ft-bars">${keys.map((k) => {
          const c = KX.cats[KX.exMap[TESTS[k].ex].cat].color, sc = SCORE[k](r[k]);
          return `<li style="--c:${c}"><span class="nm">${esc(TESTS[k].name)}</span><b class="val">${fmtV(k, r[k])}</b>${delta(k)}
            <span class="tr" aria-hidden="true"><span style="width:${((sc + 1) / 4) * 100}%"></span></span><span class="lv">${esc(label(k, r[k]))}</span></li>`;
        }).join('')}</ul>
        <h4 class="ft-h">איפה להתחיל בכל מסלול</h4>
        <div class="ft-start">${KX.progressions.map((t) => {
          const n = Math.min(reach[t.id] || 0, t.steps.length - 1), s = t.steps[n];
          return `<div class="ft-st" style="--c:${KX.cats[t.cat].color}"><small>${esc(t.title)} · שלב ${n + 1}/${t.steps.length}</small><b>${esc(s.n)}</b><span>יעד: ${esc(s.c)}</span></div>`;
        }).join('')}</div>
        <p class="ft-retest">${icon('i-cal')}<span>חזרו על המבחן כל 4–6 שבועות כדי לראות כמה התקדמתם.</span></p>
        <div class="ft-actions">
          <button class="btn btn-accent" data-ft-build>${icon('i-bolt')} בנו לי תוכנית מהתוצאות</button>
          <button class="btn btn-ghost" data-ft-save ${S.saved ? 'disabled' : ''}>${icon('i-save')} ${S.saved ? 'התוצאות נשמרו' : 'שמרו את התוצאות'}</button>
          ${canMark || S.marked ? `<button class="btn btn-ghost" data-ft-mark ${S.marked ? 'disabled' : ''}>${icon('i-tree')} ${S.marked ? 'סומן בעץ הסקילים' : 'סמנו בעץ הסקילים'}</button>` : ''}
          <button class="btn btn-ghost btn-sm" data-ft-again>${icon('i-refresh')} מבחן חדש</button>
        </div>
      </div>`;
  }

  /* ---------- events ---------- */
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-open-test]');
    if (b) { e.preventDefault(); open(); }
  });
  dlg.addEventListener('click', (e) => {
    if (e.target === dlg || e.target.closest('[data-ft-close]')) { dlg.close(); return; }
    if (e.target.closest('[data-ft-next]')) { if (validate() && S.step < flow().length - 1) { S.step++; show(); } return; }
    if (e.target.closest('[data-ft-back]')) { if (S.step > 0) { S.step--; show(); } return; }
    if (e.target.closest('[data-ft-again]')) { const p = S.prev; S = fresh(); S.prev = p; show(); return; }
    const R = () => result();
    if (e.target.closest('[data-ft-save]')) {
      const { r } = R();
      KX.data.addTest(r);
      S.saved = true;
      KX.ui.toast('תוצאות המבחן נשמרו ✓');
      const sb = e.target.closest('[data-ft-save]'); sb.disabled = true; sb.innerHTML = icon('i-save') + ' התוצאות נשמרו';
      return;
    }
    if (e.target.closest('[data-ft-mark]')) {
      const { reach } = R(), cur = KX.data.skills();
      let n = 0;
      KX.progressions.forEach((t) => { const v = Math.min(reach[t.id] || 0, t.steps.length); if (v > (cur[t.id] || 0)) { KX.data.setSkill(t.id, v); n++; } });
      S.marked = true;
      KX.ui.toast(n ? `סומנו שלבים ב־${n} ענפים בעץ הסקילים` : 'העץ כבר מעודכן');
      const mb = e.target.closest('[data-ft-mark]'); mb.disabled = true; mb.innerHTML = icon('i-tree') + ' סומן בעץ הסקילים';
      return;
    }
    if (e.target.closest('[data-ft-build]')) {
      const { r } = R();
      dlg.close();
      if (KX.app) KX.app.fillBuilder({ push: Math.min(50, r.push), pull: Math.min(20, r.pull), dip: Math.min(25, r.dip), squat: Math.min(100, Math.round(r.squat / 5) * 5), equip: { floor: true, bar: r.bar, dip: r.dips, rings: false } }, true);
      return;
    }
    if (e.target.closest('[data-ft-prog]')) {
      const { rec } = R();
      dlg.close();
      if (KX.app) KX.app.selectProgram(rec.i);
      const sec = $('#programs'); if (sec) sec.scrollIntoView({ behavior: KX.ui.reduce ? 'auto' : 'smooth', block: 'start' });
    }
  });
  dlg.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.matches('input[data-val]')) { e.preventDefault(); $('[data-ft-next]', dlg).click(); }
  });
  dlg.addEventListener('close', () => {
    stopAll();
    const opener = $('[data-open-test]');
    if (document.activeElement === document.body && opener) opener.focus({ preventScroll: true });
  });

  KX.assess = { open, trackReach, score: SCORE };
})();
