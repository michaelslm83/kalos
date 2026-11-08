/* KALOS — כלים: טיימר אינטרוולים, מחשבון כוח יחסי, מחשבון חלבון וקלוריות */
(function () {
  'use strict';
  const KX = window.KX;
  const mount = document.getElementById('toolsMount');
  if (!mount || !KX.ui) return;
  const { $, $$, esc, icon, toast } = KX.ui;
  const saved = KX.store.get('tools', {}) || {};
  const persist = (k, v) => { const t = KX.store.get('tools', {}) || {}; t[k] = v; KX.store.set('tools', t); };
  const num = (el) => { const v = parseFloat(String(el.value).replace(',', '.')); return isFinite(v) ? v : NaN; };
  const inRange = (el) => { const v = num(el); const ok = isFinite(v) && v >= +el.min && v <= +el.max; el.setAttribute('aria-invalid', !ok); return ok ? v : NaN; };
  const fmtN = (n, d) => Number(n).toLocaleString('he-IL', { maximumFractionDigits: d || 0, minimumFractionDigits: d || 0 });
  const field = (id, label, val, min, max, step, unit) =>
    `<label class="tl-field" for="${id}"><span>${label}</span><span class="tl-inp"><input type="number" inputmode="decimal" id="${id}" value="${val}" min="${min}" max="${max}" step="${step || 1}" />${unit ? `<small>${unit}</small>` : ''}</span></label>`;

  /* ================= מבנה ================= */
  mount.innerHTML = `
    <div class="tl reveal">
      <div class="tl-tabs" role="tablist" aria-label="כלים">
        <button role="tab" id="tlTab-timer" aria-controls="tlPane-timer" aria-selected="true">${icon('i-timer')} טיימר<span class="tl-long"> אינטרוולים</span></button>
        <button role="tab" id="tlTab-str" aria-controls="tlPane-str" aria-selected="false" tabindex="-1">${icon('i-bolt')} כוח יחסי</button>
        <button role="tab" id="tlTab-nut" aria-controls="tlPane-nut" aria-selected="false" tabindex="-1">${icon('i-calc')} חלבון<span class="tl-long"> וקלוריות</span></button>
      </div>
      <div class="tl-pane" id="tlPane-timer" role="tabpanel" aria-labelledby="tlTab-timer"></div>
      <div class="tl-pane" id="tlPane-str" role="tabpanel" aria-labelledby="tlTab-str" hidden></div>
      <div class="tl-pane" id="tlPane-nut" role="tabpanel" aria-labelledby="tlTab-nut" hidden></div>
    </div>`;
  const tabs = $$('.tl-tabs [role=tab]', mount);
  function selectTab(b) {
    tabs.forEach((t) => { const on = t === b; t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1; $('#' + t.getAttribute('aria-controls')).hidden = !on; });
  }
  tabs.forEach((t) => t.addEventListener('click', () => selectTab(t)));
  $('.tl-tabs', mount).addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    const i = tabs.indexOf(document.activeElement); if (i < 0) return;
    const n = tabs[(i + (e.key === 'ArrowLeft' ? 1 : -1) + tabs.length) % tabs.length]; /* RTL: שמאלה = הבא */
    selectTab(n); n.focus(); e.preventDefault();
  });

  /* ================= 1. טיימר אינטרוולים ================= */
  const MODES = {
    tabata: { name: 'Tabata', hint: '20 שנ׳ עבודה, 10 שנ׳ מנוחה, 8 סבבים. 4 דקות קשות במיוחד.' },
    emom: { name: 'EMOM', hint: 'בתחילת כל דקה מבצעים את החזרות, ונחים עד סוף הדקה.' },
    amrap: { name: 'AMRAP', hint: 'כמה שיותר סבבים בזמן קצוב. לחצו "סבב +1" בסוף כל סבב.' },
    custom: { name: 'מותאם', hint: 'עבודה, מנוחה, סבבים וסטים לבחירתכם.' },
  };
  const tDef = { mode: 'tabata', tW: 20, tR: 10, tN: 8, eN: 10, aT: 12, cW: 40, cR: 20, cN: 5, cS: 3, cSR: 90 };
  const tc = Object.assign({}, tDef, saved.timer || {});
  const C = 2 * Math.PI * 52;
  const P = $('#tlPane-timer');
  P.innerHTML = `
    <div class="tl-timer">
      <div class="tl-cfg card-glass">
        <div class="seg tl-modes" role="radiogroup" aria-label="סוג אימון">${Object.keys(MODES).map((k) => `<button role="radio" data-mode="${k}" aria-checked="${k === tc.mode}">${MODES[k].name}</button>`).join('')}</div>
        <p class="tl-hint" id="tlHint"></p>
        <div class="tl-grid" data-for="tabata">${field('tW', 'עבודה', tc.tW, 5, 300, 5, 'שנ׳')}${field('tR', 'מנוחה', tc.tR, 0, 300, 5, 'שנ׳')}${field('tN', 'סבבים', tc.tN, 1, 50, 1, '')}</div>
        <div class="tl-grid" data-for="emom">${field('eN', 'דקות', tc.eN, 1, 60, 1, 'דק׳')}</div>
        <div class="tl-grid" data-for="amrap">${field('aT', 'משך', tc.aT, 1, 90, 1, 'דק׳')}</div>
        <div class="tl-grid" data-for="custom">${field('cW', 'עבודה', tc.cW, 5, 600, 5, 'שנ׳')}${field('cR', 'מנוחה', tc.cR, 0, 600, 5, 'שנ׳')}${field('cN', 'סבבים בסט', tc.cN, 1, 50, 1, '')}${field('cS', 'סטים', tc.cS, 1, 20, 1, '')}${field('cSR', 'מנוחה בין סטים', tc.cSR, 0, 900, 15, 'שנ׳')}</div>
        <p class="tl-total" id="tlTotal"></p>
        <div class="tl-toggles">
          <button class="chip" id="tlVoice" aria-pressed="true">${icon('i-volume')} הנחיה קולית</button>
          <button class="chip" id="tlSound" aria-pressed="true">${icon('i-bolt')} צלילים</button>
        </div>
        <p class="tl-note" id="tlNoVoice" hidden>${icon('i-info')} לדפדפן הזה אין קול בעברית, לכן יושמעו רק צלילים.</p>
      </div>
      <div class="tl-stage" id="tlStage" data-phase="idle">
        <button class="icon-btn tl-fs" id="tlFs" aria-label="מסך מלא" title="מסך מלא">${icon('i-ext')}</button>
        <p class="tl-phase" id="tlPhase">מוכנים?</p>
        <div class="tl-ring"><svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="52" class="r-bg"/><circle cx="60" cy="60" r="52" class="r-fg" id="tlRing"/></svg>
          <div class="tl-ring-in"><b id="tlTime" aria-live="off">0:00</b><span id="tlRound"></span></div></div>
        <p class="tl-left" id="tlLeft"></p>
        <div class="tl-amrap" id="tlAmrap" hidden>
          <button class="btn btn-accent btn-lg" id="tlRoundAdd">${icon('i-plus')} סבב +1</button>
          <button class="icon-btn" id="tlRoundSub" aria-label="בטל סבב אחרון">${icon('i-minus')}</button>
          <span class="tl-rcount">סבבים: <b id="tlRounds">0</b></span>
        </div>
        <div class="tl-ctrl">
          <button class="btn btn-accent" id="tlGo">${icon('i-play')} התחל</button>
          <button class="btn btn-ghost" id="tlSkip" disabled>${icon('i-skip')} דלג</button>
          <button class="btn btn-ghost" id="tlReset" disabled>${icon('i-refresh')} איפוס</button>
        </div>
        <div class="tl-done" id="tlDone" hidden></div>
        <p class="sr-only" id="tlLive" aria-live="polite"></p>
      </div>
    </div>`;

  const ring = $('#tlRing', P); ring.style.strokeDasharray = C;
  const cfgInputs = $$('.tl-cfg input', P);
  function readCfg() {
    const v = {}; let ok = true;
    cfgInputs.forEach((el) => { if (el.closest('.tl-grid').dataset.for !== tc.mode) return; const x = inRange(el); if (!isFinite(x)) ok = false; v[el.id] = Math.round(x); });
    return ok ? v : null;
  }
  function buildPhases(m, v) {
    const ph = [{ type: 'prep', dur: 10 }];
    if (m === 'tabata') for (let r = 1; r <= v.tN; r++) { ph.push({ type: 'work', dur: v.tW, round: r, rounds: v.tN }); if (r < v.tN && v.tR > 0) ph.push({ type: 'rest', dur: v.tR, round: r, rounds: v.tN }); }
    if (m === 'emom') for (let r = 1; r <= v.eN; r++) ph.push({ type: 'work', dur: 60, round: r, rounds: v.eN, emom: true });
    if (m === 'amrap') ph.push({ type: 'work', dur: v.aT * 60, amrap: true });
    if (m === 'custom') for (let s = 1; s <= v.cS; s++) {
      for (let r = 1; r <= v.cN; r++) { ph.push({ type: 'work', dur: v.cW, round: r, rounds: v.cN, set: s, sets: v.cS }); if (r < v.cN && v.cR > 0) ph.push({ type: 'rest', dur: v.cR, round: r, rounds: v.cN, set: s, sets: v.cS }); }
      if (s < v.cS && v.cSR > 0) ph.push({ type: 'setrest', dur: v.cSR, set: s, sets: v.cS });
    }
    return ph;
  }
  function titleFor(m, v, dur) {
    const mins = Math.max(1, Math.round(dur / 60));
    if (m === 'tabata') return `Tabata · ${v.tW}/${v.tR} × ${v.tN} · ${mins} דק׳`;
    if (m === 'emom') return `EMOM · ${v.eN} דק׳`;
    if (m === 'amrap') return `AMRAP · ${v.aT} דק׳`;
    return `אינטרוולים · ${v.cS} סטים × ${v.cN} סבבים · ${mins} דק׳`;
  }
  function syncCfg() {
    $$('.tl-modes button', P).forEach((b) => b.setAttribute('aria-checked', b.dataset.mode === tc.mode));
    $$('.tl-grid', P).forEach((g) => (g.hidden = g.dataset.for !== tc.mode));
    $('#tlHint', P).textContent = MODES[tc.mode].hint;
    const v = readCfg();
    if (!v) { $('#tlTotal', P).textContent = 'הזינו ערכים בטווח התקין.'; $('#tlGo', P).disabled = true; return; }
    $('#tlGo', P).disabled = false;
    const tot = buildPhases(tc.mode, v).slice(1).reduce((a, p) => a + p.dur, 0);
    $('#tlTotal', P).innerHTML = `משך כולל: <b>${KX.fx.fmt(tot)}</b> <small>(+10 שנ׳ היכונו)</small>`;
    if (!T.phases) drawIdle(tot);
  }
  function syncPrefs() {
    const p = KX.data.prefs();
    $('#tlVoice', P).setAttribute('aria-pressed', !!p.voice);
    $('#tlSound', P).setAttribute('aria-pressed', !!p.sound);
    $('#tlNoVoice', P).hidden = !p.voice || KX.fx.hasVoice();
  }
  $('.tl-modes', P).addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b || T.phases) return;
    tc.mode = b.dataset.mode; persist('timer', tc); syncCfg();
  });
  cfgInputs.forEach((el) => el.addEventListener('input', () => { const v = readCfg(); if (v) { Object.assign(tc, v); persist('timer', tc); } syncCfg(); }));
  $('#tlVoice', P).addEventListener('click', () => { KX.data.setPref('voice', !KX.data.prefs().voice); syncPrefs(); });
  $('#tlSound', P).addEventListener('click', () => { KX.data.setPref('sound', !KX.data.prefs().sound); syncPrefs(); });
  if ('speechSynthesis' in window && speechSynthesis.addEventListener) speechSynthesis.addEventListener('voiceschanged', syncPrefs);

  /* --- מנוע זמן: מבוסס הפרשי performance.now, ללא סחיפה --- */
  const T = { phases: null, i: 0, left: 0, run: false, id: null, last: 0, work: 0, rounds: 0, lastSec: null, cfg: null, mode: null, done: false };
  const PH_LABEL = { prep: 'היכונו', work: 'עבודה', rest: 'מנוחה', setrest: 'מנוחה בין סטים' };
  const stage = $('#tlStage', P);
  const live = (t) => ($('#tlLive', P).textContent = t);
  function drawIdle(tot) {
    stage.dataset.phase = 'idle';
    $('#tlPhase', P).textContent = 'מוכנים?';
    $('#tlTime', P).textContent = KX.fx.fmt(tot);
    $('#tlRound', P).textContent = MODES[tc.mode].name;
    $('#tlLeft', P).textContent = '';
    ring.style.strokeDashoffset = 0;
    $('#tlAmrap', P).hidden = true;
  }
  const remainingTotal = () => T.left + T.phases.slice(T.i + 1).reduce((a, p) => a + p.dur, 0);
  function roundText(p) {
    if (p.amrap) return '';
    if (p.emom) return `דקה ${p.round} מתוך ${p.rounds}`;
    if (p.type === 'setrest') return `אחרי סט ${p.set} מתוך ${p.sets}`;
    if (p.round) return (p.sets > 1 ? `סט ${p.set}/${p.sets} · ` : '') + `סבב ${p.round} מתוך ${p.rounds}`;
    return '';
  }
  function draw() {
    const p = T.phases[T.i];
    stage.dataset.phase = p.type;
    $('#tlPhase', P).textContent = PH_LABEL[p.type];
    $('#tlTime', P).textContent = KX.fx.fmt(Math.ceil(Math.max(0, T.left)));
    $('#tlRound', P).textContent = roundText(p);
    $('#tlLeft', P).textContent = 'נותרו ' + KX.fx.fmt(Math.ceil(remainingTotal()));
    ring.style.strokeDashoffset = C * (1 - Math.max(0, T.left) / p.dur);
    $('#tlAmrap', P).hidden = !(p.amrap);
    $('#tlRounds', P).textContent = T.rounds;
  }
  function enterPhase() {
    const p = T.phases[T.i];
    T.lastSec = Math.ceil(T.left);
    if (p.type === 'work') {
      KX.fx.beep('go');
      const rt = p.amrap ? `${tc.aT} דקות. התחילו!` : p.emom ? `דקה ${p.round} מתוך ${p.rounds}` : `סבב ${p.round} מתוך ${p.rounds}. עבודה`;
      KX.fx.speak(p.amrap ? rt : rt);
      live(PH_LABEL.work + ' · ' + roundText(p));
    } else if (p.type === 'prep') {
      KX.fx.speak('היכונו'); live('היכונו');
    } else {
      KX.fx.speak(PH_LABEL[p.type]); live(PH_LABEL[p.type]);
    }
  }
  function cues() {
    const p = T.phases[T.i], s = Math.ceil(T.left);
    if (s === T.lastSec) return;
    T.lastSec = s;
    if (s <= 3 && s >= 1 && p.dur > 3) KX.fx.beep('tick');
    if (p.type === 'work' && s === 10 && p.dur >= 25) KX.fx.speak('עוד 10 שניות');
    if (p.type === 'work' && p.amrap && s === 60 && p.dur >= 120) KX.fx.speak('דקה אחרונה');
    if (p.type !== 'work' && s === 3 && p.dur > 3 && T.phases[T.i + 1]) { /* צליל בלבד */ }
  }
  function tick() {
    const now = performance.now();
    let dt = (now - T.last) / 1000; T.last = now;
    while (dt > 0 && T.phases) {
      const p = T.phases[T.i];
      const use = Math.min(dt, T.left);
      T.left -= use; dt -= use;
      if (p.type !== 'prep') T.work += use;
      if (T.left <= 1e-6) {
        if (T.i >= T.phases.length - 1) { finish(); return; }
        T.i++; T.left = T.phases[T.i].dur; enterPhase();
      }
    }
    cues(); draw();
  }
  function start() {
    if (!T.phases) {
      const v = readCfg(); if (!v) return;
      KX.fx.audio(); /* פתיחת האודיו במחווה של המשתמש */
      T.cfg = v; T.mode = tc.mode; T.phases = buildPhases(tc.mode, v); T.i = 0; T.left = T.phases[0].dur; T.work = 0; T.rounds = 0; T.done = false;
      $('#tlDone', P).hidden = true;
      P.classList.add('is-on');
      enterPhase();
    }
    T.run = true; T.last = performance.now();
    clearInterval(T.id); T.id = setInterval(tick, 100);
    KX.fx.wake(true);
    syncCtrl(); draw();
  }
  function pause() { T.run = false; clearInterval(T.id); if ('speechSynthesis' in window) speechSynthesis.cancel(); KX.fx.wake(false); syncCtrl(); }
  function reset() {
    pause(); T.phases = null; T.done = false;
    P.classList.remove('is-on');
    $('#tlDone', P).hidden = true;
    syncCtrl(); syncCfg();
  }
  function skip() {
    if (!T.phases) return;
    if (T.i >= T.phases.length - 1) { finish(); return; }
    T.i++; T.left = T.phases[T.i].dur; T.last = performance.now(); enterPhase(); draw();
  }
  function finish() {
    clearInterval(T.id); T.run = false; KX.fx.wake(false);
    T.done = true;
    KX.fx.beep('done'); KX.fx.speak('סיימתם!'); live('סיימתם!');
    const dur = Math.round(T.work), m = T.mode, v = T.cfg;
    stage.dataset.phase = 'done';
    $('#tlPhase', P).textContent = 'סיימתם! 💪';
    $('#tlTime', P).textContent = KX.fx.fmt(dur);
    $('#tlRound', P).textContent = 'זמן אימון';
    $('#tlLeft', P).textContent = '';
    ring.style.strokeDashoffset = 0;
    $('#tlAmrap', P).hidden = true;
    const rounds = T.rounds;
    const box = $('#tlDone', P);
    box.innerHTML = `<p>${esc(titleFor(m, v, dur))}${m === 'amrap' ? ` · <b>${rounds}</b> סבבים` : ''}</p>
      <div class="tl-ctrl"><button class="btn btn-accent" id="tlSave">${icon('i-save')} שמור ביומן</button><button class="btn btn-ghost" id="tlAgain">${icon('i-refresh')} שוב</button></div>`;
    box.hidden = false;
    $('#tlSave', box).addEventListener('click', (e) => {
      KX.data.addWorkout({ title: titleFor(m, v, dur), src: 'interval', dur, items: m === 'amrap' ? [{ ex: null, n: 'סבבים', unit: 'reps', sets: [rounds] }] : [] });
      e.currentTarget.disabled = true; e.currentTarget.innerHTML = icon('i-check') + ' נשמר';
      toast('האימון נשמר ביומן ✓');
    }, { once: true });
    $('#tlAgain', box).addEventListener('click', () => { reset(); start(); });
    T.phases = null; P.classList.remove('is-on');
    syncCtrl();
  }
  function syncCtrl() {
    const go = $('#tlGo', P);
    go.innerHTML = T.run ? icon('i-pause') + ' השהה' : T.phases ? icon('i-play') + ' המשך' : icon('i-play') + ' התחל';
    $('#tlSkip', P).disabled = !T.phases;
    $('#tlReset', P).disabled = !T.phases && !T.done;
    cfgInputs.forEach((el) => (el.disabled = !!T.phases));
    $$('.tl-modes button', P).forEach((b) => (b.disabled = !!T.phases));
  }
  $('#tlGo', P).addEventListener('click', () => (T.run ? pause() : start()));
  $('#tlSkip', P).addEventListener('click', skip);
  $('#tlReset', P).addEventListener('click', reset);
  $('#tlRoundAdd', P).addEventListener('click', () => { if (!T.phases) return; T.rounds++; KX.fx.beep('tick'); draw(); live('סבב ' + T.rounds); });
  $('#tlRoundSub', P).addEventListener('click', () => { if (!T.phases) return; T.rounds = Math.max(0, T.rounds - 1); draw(); });
  /* מסך מלא */
  const fsBtn = $('#tlFs', P);
  if (!stage.requestFullscreen) fsBtn.hidden = true;
  fsBtn.addEventListener('click', () => { if (document.fullscreenElement) document.exitFullscreen(); else stage.requestFullscreen().catch(() => {}); });
  document.addEventListener('fullscreenchange', () => fsBtn.setAttribute('aria-label', document.fullscreenElement === stage ? 'צא ממסך מלא' : 'מסך מלא'));
  stage.addEventListener('keydown', (e) => { if (e.key === ' ' && e.target === stage) { e.preventDefault(); T.run ? pause() : start(); } });
  stage.tabIndex = 0;
  stage.setAttribute('aria-label', 'תצוגת טיימר. רווח להפעלה או השהיה');
  syncPrefs(); syncCfg(); syncCtrl();

  /* ================= 2. כוח יחסי ================= */
  const STD = {
    pullup: { name: 'מתח', t: [1.0, 1.2, 1.45, 1.7, 2.0], min: 0.8, max: 2.3 },
    dip: { name: 'מקבילים', t: [1.0, 1.3, 1.6, 1.9, 2.2], min: 0.8, max: 2.5 },
    pushup: { name: 'שכיבות סמיכה', t: [0, 10, 25, 40, 60], min: 0, max: 80, reps: true },
  };
  const LV = ['מתחיל', 'מתחיל־מתקדם', 'בינוני', 'מתקדם', 'עילית'];
  const sDef = { bw: 75, ex: 'pullup', add: 0, reps: 8 };
  const sc = Object.assign({}, sDef, saved.str || {});
  const S = $('#tlPane-str');
  S.innerHTML = `
    <div class="tl-calc">
      <form class="tl-form card-glass" id="strForm" novalidate>
        <div class="seg" role="radiogroup" aria-label="תרגיל" id="strEx">${Object.keys(STD).map((k) => `<button type="button" role="radio" data-ex="${k}" aria-checked="${k === sc.ex}">${STD[k].name}</button>`).join('')}</div>
        <div class="tl-grid">${field('sBw', 'משקל גוף', sc.bw, 30, 250, 0.5, 'ק״ג')}<span class="tl-addw">${field('sAdd', 'משקל נוסף', sc.add, 0, 200, 0.5, 'ק״ג')}</span>${field('sReps', 'חזרות נקיות', sc.reps, 0, 100, 1, '')}</div>
        <p class="tl-note">${icon('i-info')} הזינו סט אחד קשה עם טכניקה נקייה. משקל נוסף = חגורה או תיק עם משקולות.</p>
      </form>
      <div class="tl-out card-glass" id="strOut" aria-live="polite"></div>
    </div>`;
  function strCalc() {
    const ex = sc.ex, std = STD[ex];
    $('.tl-addw', S).hidden = !!std.reps;
    const bw = inRange($('#sBw', S)), add = std.reps ? 0 : inRange($('#sAdd', S)), reps = inRange($('#sReps', S));
    const out = $('#strOut', S);
    if (![bw, add, reps].every(isFinite)) { out.innerHTML = `<p class="tl-err">${icon('i-info')} הזינו ערכים תקינים: משקל גוף 30–250 ק״ג, חזרות 0–100.</p>`; return; }
    Object.assign(sc, { bw, add, reps: Math.round(reps) }); persist('str', sc);
    let value, scoreTxt, extra = '';
    if (std.reps) {
      value = reps;
      scoreTxt = `<b class="tl-big">${fmtN(reps)}</b><span>חזרות ברצף</span>`;
    } else {
      if (reps < 1) {
        out.innerHTML = `<p class="tl-big-msg">עוד אין חזרה מלאה? זה בסדר גמור.</p><p class="muted">התחילו מ${ex === 'pullup' ? 'מתח שליליים ותלייה פעילה' : 'החזקת תמיכה ודיפס שליליים'}, וחזרו לכאן אחרי החזרה הראשונה.</p>`;
        return;
      }
      const load = bw + add;
      const orm = reps === 1 ? load : load * (1 + reps / 30); /* Epley */
      value = orm / bw;
      scoreTxt = `<b class="tl-big"><bdi dir="ltr">${fmtN(value, 2)}×</bdi></b><span>משקל הגוף · 1RM משוער ${fmtN(orm, 1)} ק״ג (<bdi dir="ltr">${orm - bw >= 0 ? '+' : ''}${fmtN(orm - bw, 1)}</bdi> ק״ג)</span>`;
      const rows = [1, 3, 5, 8].map((r) => { const w = (r === 1 ? orm : orm / (1 + r / 30)) - bw; return `<tr><td>${r}</td><td>${w >= 0.5 ? '<bdi dir="ltr">+' + fmtN(Math.round(w * 2) / 2, 1) + '</bdi> ק״ג' : w > -0.5 ? 'משקל גוף' : 'עם גומייה / ללא משקל'}</td></tr>`; }).join('');
      extra = `<table class="tl-tbl"><caption>משקל נוסף משוער לפי מספר חזרות</caption><thead><tr><th scope="col">חזרות</th><th scope="col">משקל נוסף</th></tr></thead><tbody>${rows}</tbody></table>`;
      if (reps > 10) extra += `<p class="tl-note">${icon('i-info')} מעל 10 חזרות נוסחת Epley פחות מדויקת. לתוצאה טובה יותר, בדקו עם משקל נוסף ו־3–8 חזרות.</p>`;
    }
    let lv = -1; std.t.forEach((t, i) => { if (value >= t) lv = i; });
    const pos = (x) => Math.max(0, Math.min(100, ((x - std.min) / (std.max - std.min)) * 100));
    const marks = std.t.map((t, i) => `<span class="tl-tick" style="--x:${pos(t)}%"><i></i><small>${std.reps ? t : fmtN(t, 2) + '×'}</small><em>${LV[i]}</em></span>`).join('');
    out.innerHTML = `
      <div class="tl-score">${scoreTxt}</div>
      <p class="tl-level">רמה משוערת: <b>${lv < 0 ? 'לפני רמת מתחיל' : LV[lv]}</b></p>
      <div class="tl-scale" role="img" aria-label="מיקום על סולם הרמות: ${lv < 0 ? 'לפני רמת מתחיל' : LV[lv]}"><div class="tl-bar"><span class="tl-pin" style="--x:${pos(value)}%"></span></div>${marks}</div>
      ${extra}
      <p class="tl-fine">הסולם הוא הערכה גסה בלבד, ${std.reps ? 'לפי מספר חזרות ברצף' : 'לפי יחס העומס הכולל (גוף + תוספת) למשקל הגוף, עם נוסחת Epley: עומס × (1 + חזרות/30)'}. גנטיקה, אורך גפיים ושנות אימון משפיעים מאוד.</p>`;
  }
  $('#strEx', S).addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; sc.ex = b.dataset.ex; $$('#strEx button', S).forEach((x) => x.setAttribute('aria-checked', x === b)); strCalc(); });
  $$('input', S).forEach((el) => el.addEventListener('input', strCalc));
  $('#strForm', S).addEventListener('submit', (e) => e.preventDefault());
  strCalc();

  /* ================= 3. חלבון וקלוריות ================= */
  const ACT = [[1.2, 'יושבני', 'עבודה משרדית, כמעט בלי אימונים'], [1.375, 'קל', '1–3 אימונים בשבוע'], [1.55, 'בינוני', '3–5 אימונים בשבוע'], [1.725, 'גבוה', '6–7 אימונים בשבוע'], [1.9, 'גבוה מאוד', 'אימון כפול או עבודה פיזית']];
  const GOALS = { cut: ['חיטוב', 0.825, '−15–20%'], keep: ['שמירה', 1, '±0'], bulk: ['מסה', 1.1, '+10%'] };
  const nDef = { sex: 'm', age: 30, h: 175, w: 75, act: 2, goal: 'keep' };
  const nc = Object.assign({}, nDef, saved.nut || {});
  const N = $('#tlPane-nut');
  N.innerHTML = `
    <div class="tl-calc">
      <form class="tl-form card-glass" id="nutForm" novalidate>
        <div class="seg" role="radiogroup" aria-label="מין" id="nSex"><button type="button" role="radio" data-v="m" aria-checked="${nc.sex === 'm'}">גבר</button><button type="button" role="radio" data-v="f" aria-checked="${nc.sex === 'f'}">אישה</button></div>
        <div class="tl-grid">${field('nAge', 'גיל', nc.age, 14, 100, 1, '')}${field('nH', 'גובה', nc.h, 120, 230, 1, 'ס״מ')}${field('nW', 'משקל', nc.w, 30, 250, 0.5, 'ק״ג')}</div>
        <label class="tl-field tl-sel" for="nAct"><span>רמת פעילות</span><select id="nAct">${ACT.map((a, i) => `<option value="${i}"${i === +nc.act ? ' selected' : ''}>${a[1]} · ${a[2]}</option>`).join('')}</select></label>
        <div class="seg" role="radiogroup" aria-label="מטרה" id="nGoal">${Object.keys(GOALS).map((k) => `<button type="button" role="radio" data-v="${k}" aria-checked="${k === nc.goal}">${GOALS[k][0]} <small dir="ltr">${GOALS[k][2]}</small></button>`).join('')}</div>
      </form>
      <div class="tl-out card-glass" id="nutOut" aria-live="polite"></div>
    </div>`;
  function nutCalc() {
    const age = inRange($('#nAge', N)), h = inRange($('#nH', N)), w = inRange($('#nW', N)), act = +$('#nAct', N).value;
    const out = $('#nutOut', N);
    if (![age, h, w].every(isFinite)) { out.innerHTML = `<p class="tl-err">${icon('i-info')} הזינו ערכים תקינים: גיל 14–100, גובה 120–230 ס״מ, משקל 30–250 ק״ג.</p>`; return; }
    Object.assign(nc, { age, h, w, act }); persist('nut', nc);
    const bmr = 10 * w + 6.25 * h - 5 * age + (nc.sex === 'm' ? 5 : -161); /* Mifflin–St Jeor */
    const tdee = bmr * ACT[act][0];
    const g = GOALS[nc.goal];
    const kcal = tdee * g[1];
    const range = nc.goal === 'cut' ? `${fmtN(Math.round(tdee * 0.8 / 10) * 10)}–${fmtN(Math.round(tdee * 0.85 / 10) * 10)}` : null;
    const prot = 1.6 * w, protHi = 2.2 * w, fat = 0.8 * w;
    let carbs = (kcal - prot * 4 - fat * 9) / 4, carbNote = '';
    if (carbs < 0) { carbs = 0; carbNote = `<p class="tl-note">${icon('i-info')} היעד הקלורי נמוך מדי לחלוקה הזו. שקלו גירעון קטן יותר.</p>`; }
    const kP = prot * 4, kF = fat * 9, kC = carbs * 4, kT = kP + kF + kC || 1;
    const seg = (k, cls, name, gr) => `<span class="${cls}" style="--w:${(k / kT) * 100}%" title="${name}: ${fmtN(gr)} ג׳"></span>`;
    out.innerHTML = `
      <div class="tl-kpis">
        <div><small>BMR (מנוחה)</small><b>${fmtN(bmr)}</b><span>קק״ל</span></div>
        <div><small>TDEE (תחזוקה)</small><b>${fmtN(tdee)}</b><span>קק״ל</span></div>
        <div class="hl"><small>יעד יומי · ${g[0]}</small><b>${fmtN(Math.round(kcal / 10) * 10)}</b><span>${range ? 'טווח ' + range + ' ' : ''}קק״ל</span></div>
      </div>
      <div class="tl-macro" role="img" aria-label="חלוקת קלוריות: חלבון ${Math.round((kP / kT) * 100)}%, שומן ${Math.round((kF / kT) * 100)}%, פחמימות ${Math.round((kC / kT) * 100)}%">${seg(kP, 'm-p', 'חלבון', prot)}${seg(kF, 'm-f', 'שומן', fat)}${seg(kC, 'm-c', 'פחמימות', carbs)}</div>
      <ul class="tl-legend">
        <li><i class="m-p"></i><span>חלבון</span><b>${fmtN(prot)} ג׳</b><small>טווח ${fmtN(prot)}–${fmtN(protHi)} ג׳ (1.6–2.2 ג׳/ק״ג)</small></li>
        <li><i class="m-f"></i><span>שומן</span><b>${fmtN(fat)} ג׳</b><small>~0.8 ג׳/ק״ג</small></li>
        <li><i class="m-c"></i><span>פחמימות</span><b>${fmtN(carbs)} ג׳</b><small>יתרת הקלוריות</small></li>
      </ul>
      ${carbNote}
      <p class="tl-fine">חישוב לפי נוסחת Mifflin–St Jeor כפול מקדם פעילות. חלבון: 1.6 ג׳ לק״ג ביום הוא הסף שמעליו התועלת לבניית שריר כמעט לא גדלה (Morton et al., 2018). מידע כללי בלבד, לא ייעוץ רפואי או תזונתי. במצב רפואי מיוחד, הריון או הפרעת אכילה התייעצו עם דיאטנית.</p>`;
  }
  const segPick = (id, key) => $(id, N).addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; nc[key] = b.dataset.v; $$(id + ' button', N).forEach((x) => x.setAttribute('aria-checked', x === b)); nutCalc(); });
  segPick('#nSex', 'sex'); segPick('#nGoal', 'goal');
  $$('input, select', N).forEach((el) => el.addEventListener('input', nutCalc));
  $('#nutForm', N).addEventListener('submit', (e) => e.preventDefault());
  nutCalc();

  /* חשיפה לבדיקות */
  KX.tools = { epley: (load, reps) => (reps === 1 ? load : load * (1 + reps / 30)), mifflin: (sex, w, h, age) => 10 * w + 6.25 * h - 5 * age + (sex === 'm' ? 5 : -161), buildPhases };
})();
