/* KALOS — מצב אימון מודרך: הדגמה, ספירת סטים, מנוחה אוטומטית, הנחיות קוליות, סיכום ושמירה ביומן */
(function () {
  'use strict';
  const KX = window.KX;
  const { $, $$, esc, icon, toast, reduce } = KX.ui;
  const fx = KX.fx;
  const exName = (id) => (KX.exMap[id] ? KX.exMap[id].name : id);
  const colorOf = (id) => (KX.exMap[id] ? KX.cats[KX.exMap[id].cat].color : 'var(--accent)');
  const unitWord = (u, n) => (u === 'sec' ? 'שניות' : n === 1 ? 'חזרה' : 'חזרות');

  /* ================= בניית סשן =================
     session: { title, sub, src, meta, circuit, roundRest, items:[item], warm:false }
     item: { ex, n, unit:'reps'|'sec', target:number|null, label, sets, rest, note, warm } */
  function mkItem(ex, o) {
    const e = KX.exMap[ex];
    const unit = o.unit || (o.sec ? 'sec' : 'reps');
    const target = o.target != null ? o.target : unit === 'sec' ? o.sec : o.reps;
    const label = o.label || (target != null ? String(target) : 'מקס׳');
    return { ex: e ? ex : null, n: o.n || (e ? e.name : ex), unit, target: target != null ? +target : null, label, sets: Math.max(1, o.sets || 1), rest: o.rest != null ? o.rest : 60, note: o.note || '' };
  }
  function fromQuick(q) {
    return { title: q.title, sub: q.sub, src: 'quick', meta: { quick: q.id }, circuit: !!q.circuit, roundRest: q.roundRest || 90, items: q.items.map((it) => mkItem(it.ex, it)) };
  }
  function fromPlanDay(day, inp) {
    const rest = KX.restByGoal[inp.goal] || 90, circuit = inp.goal === 'endurance';
    const items = day.items.map((it) => {
      const r = KX.parseRx(it.rx);
      let label = r.label;
      if (r.unit === 'reps' && /מקס/.test(r.label)) label = 'מקס׳';
      return mkItem(it.ex, { n: it.n, unit: r.unit, target: r.unit === 'sec' ? r.target : (/מקס/.test(r.label) ? null : r.target), label: r.unit === 'sec' ? String(r.target) : label.replace(/\s*(חזרות)?$/, ''), sets: r.sets, rest: it.skill ? 90 : rest, note: it.note || '' });
    });
    return { title: day.name, sub: 'מהתוכנית האישית · יום ' + day.day, src: 'plan', meta: { day: day.day }, circuit, roundRest: 120, items };
  }
  function fromExercise(ex) {
    const r = KX.parseRx(ex.rx);
    return { title: ex.name, sub: 'אימון תרגיל בודד · ' + ex.rx, src: 'quick', meta: { ex: ex.id }, items: [mkItem(ex.id, { unit: r.unit, target: r.target, label: r.unit === 'sec' ? String(r.target) : r.label.replace(/\s*לכל.*$/, ''), sets: Math.min(r.sets, 6), rest: 90, note: /לכל/.test(ex.rx) ? 'לכל צד' : '' })] };
  }
  /* יום באתגר: מחלקים את היעד היומי לסטים בגודל chunk */
  function fromChallenge(ch, dayNo, spec) {
    if (spec.workout) { const q = KX.quick.find((x) => x.id === spec.workout); const s = fromQuick(q); s.title = ch.title + ' · יום ' + dayNo; s.src = 'challenge'; s.meta = { ch: ch.id, day: dayNo }; return s; }
    const sets = Math.max(1, Math.ceil(spec.total / spec.chunk));
    const per = Math.ceil(spec.total / sets);
    return { title: ch.title + ' · יום ' + dayNo, sub: `יעד היום: ${spec.total} ${unitWord(spec.unit, spec.total)} ב־${sets} סטים`, src: 'challenge', meta: { ch: ch.id, day: dayNo },
      items: [mkItem(spec.ex, { unit: spec.unit, target: per, sets, rest: spec.unit === 'sec' ? 45 : 60 })] };
  }
  function warmItems() {
    return KX.warmup.map((w) => ({ ex: null, n: w.n, unit: 'sec', target: 45, label: w.t, sets: 1, rest: 0, note: w.t, warm: true }));
  }

  /* סדר הביצוע: רשימת צעדים { i, set, rest } */
  function buildOrder(s) {
    const order = [];
    const all = (s.warm ? warmItems() : []).concat(s.items);
    s.all = all;
    const warmN = s.warm ? KX.warmup.length : 0;
    for (let i = 0; i < warmN; i++) order.push({ i, set: 0, rest: 0 });
    if (s.circuit) {
      const rounds = Math.max(...s.items.map((x) => x.sets));
      for (let r = 0; r < rounds; r++) {
        const inRound = s.items.map((x, j) => [x, j]).filter(([x]) => x.sets > r);
        inRound.forEach(([x, j], k) => order.push({ i: warmN + j, set: r, rest: k === inRound.length - 1 ? s.roundRest : x.rest, round: r, rounds }));
      }
    } else {
      s.items.forEach((x, j) => { for (let k = 0; k < x.sets; k++) order.push({ i: warmN + j, set: k, rest: x.rest }); });
    }
    if (order.length) order[order.length - 1].rest = 0;
    return order;
  }
  function estimate(s) {
    const order = buildOrder(s);
    return order.reduce((a, st) => { const it = s.all[st.i]; return a + (it.unit === 'sec' ? (it.target || 30) + 8 : Math.max(25, (it.target || 8) * 3.5)) + st.rest; }, 0);
  }
  /* הביצוע הקודם של אותו תרגיל (לתצוגת "בפעם הקודמת") */
  function lastFor(ex, unit) {
    if (!ex) return null;
    for (const w of KX.data.workouts()) { const it = (w.items || []).find((x) => x.ex === ex && x.unit === unit && x.sets && x.sets.length); if (it) return { sets: it.sets, date: w.date }; }
    return null;
  }

  /* ================= הנגן ================= */
  let dlg, S = null, raf = null, fig = null, nextFig = null;

  function ensureDialog() {
    if (dlg) return dlg;
    dlg = document.createElement('dialog');
    dlg.className = 'wo';
    dlg.setAttribute('aria-labelledby', 'woTitle');
    dlg.innerHTML = `
      <div class="wo-shell">
        <header class="wo-top">
          <button class="icon-btn" data-a="close" aria-label="יציאה מהאימון">${icon('i-x')}</button>
          <div class="wo-tt"><b id="woTitle"></b><small id="woMeta"></small></div>
          <span class="wo-clock" id="woClock" aria-label="זמן אימון">0:00</span>
          <button class="icon-btn" data-a="pause" id="woPause" aria-label="השהה">${icon('i-pause')}</button>
          <button class="icon-btn" data-a="voice" id="woVoice" aria-label="הנחיות קוליות"></button>
        </header>
        <div class="wo-bar" aria-hidden="true"><span id="woBar"></span></div>
        <div class="wo-main" id="woMain"></div>
        <p class="sr-only" id="woLive" aria-live="assertive"></p>
      </div>`;
    document.body.appendChild(dlg);
    dlg.addEventListener('cancel', (e) => { e.preventDefault(); if (S && S.phase !== 'intro' && S.phase !== 'done') askExit(); else close(); });
    dlg.addEventListener('click', onClick);
    dlg.addEventListener('keydown', (e) => {
      if (e.target.closest('input, textarea, select')) return;
      if (e.key === ' ' || e.key === 'Enter') {
        const p = $('[data-primary]', dlg);
        if (p && !e.target.closest('button, a')) { e.preventDefault(); p.click(); }
      }
    });
    return dlg;
  }
  function syncVoiceBtn() {
    const on = KX.data.prefs().voice;
    const b = $('#woVoice');
    b.innerHTML = icon(on ? 'i-volume' : 'i-mute');
    b.setAttribute('aria-pressed', on);
    b.setAttribute('aria-label', on ? 'השתק הנחיות קוליות' : 'הפעל הנחיות קוליות');
  }
  const say = (t) => { $('#woLive').textContent = t; fx.speak(t); };

  function start(session) {
    ensureDialog();
    if (KX.app && KX.app.closeEx) KX.app.closeEx();
    S = { s: session, phase: 'intro', k: 0, order: [], log: [], t0: 0, paused: 0, pauseAt: 0, timer: null, val: 0, hold: 'ready' };
    session.warm = !!KX.store.get('woWarm', false) && session.src !== 'challenge';
    $('#woTitle').textContent = session.title;
    syncVoiceBtn();
    render();
    if (!dlg.open) dlg.showModal();
    fx.audio(); /* פותח את ה־AudioContext בתוך מחוות משתמש */
  }
  function close() {
    stopLoop();
    if (fig) fig.pause(); if (nextFig) nextFig.pause();
    fx.wake(false);
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    S = null;
    if (dlg && dlg.open) dlg.close();
  }

  /* ---------- clock / loop ---------- */
  const now = () => performance.now();
  const elapsed = () => (S && S.t0 ? ((S.pauseAt || now()) - S.t0 - S.paused) / 1000 : 0);
  function loop() {
    raf = requestAnimationFrame(loop);
    if (!S) return;
    $('#woClock').textContent = fx.fmt(elapsed());
    const T = S.timer;
    if (!T || !T.run || S.pauseAt) return;
    const t = now(), dt = (t - T.last) / 1000; T.last = t;
    T.left -= dt;
    const sec = Math.ceil(T.left);
    if (sec !== T.shown) {
      T.shown = sec;
      if (T.onSec) T.onSec(sec);
      drawTimer();
    }
    if (T.left <= 0) { T.run = false; const done = T.onEnd; S.timer = null; drawTimer(0); if (done) done(); }
    else drawRing(T);
  }
  function startLoop() { if (!raf) raf = requestAnimationFrame(loop); }
  function stopLoop() { if (raf) cancelAnimationFrame(raf); raf = null; }
  function setTimer(total, onSec, onEnd) { S.timer = { total, left: total, run: true, last: now(), shown: Math.ceil(total), onSec, onEnd }; drawTimer(); return S.timer; }
  function drawRing(T) {
    const r = $('#woRing'); if (!r) return;
    const C = 2 * Math.PI * 54;
    r.style.strokeDasharray = C;
    r.style.strokeDashoffset = C * (1 - Math.max(0, T.left) / T.total);
  }
  function drawTimer(force) {
    const T = S && S.timer, el = $('#woTime');
    if (el) el.textContent = fx.fmt(force === 0 ? 0 : T ? Math.ceil(T.left) : 0);
    if (T) drawRing(T);
  }
  function togglePause() {
    if (!S || !S.t0) return;
    if (S.pauseAt) { S.paused += now() - S.pauseAt; S.pauseAt = 0; if (S.timer) S.timer.last = now(); if (fig && !reduce) fig.play(); }
    else { S.pauseAt = now(); if (fig) fig.pause(); if ('speechSynthesis' in window) speechSynthesis.cancel(); }
    const b = $('#woPause');
    b.innerHTML = icon(S.pauseAt ? 'i-play' : 'i-pause');
    b.setAttribute('aria-label', S.pauseAt ? 'המשך' : 'השהה');
    dlg.classList.toggle('is-paused', !!S.pauseAt);
  }

  /* ---------- progress ---------- */
  function updateTop() {
    const s = S.s, st = S.order[S.k];
    const pct = S.phase === 'done' ? 100 : S.order.length ? (S.k / S.order.length) * 100 : 0;
    $('#woBar').style.width = pct + '%';
    if (!st || S.phase === 'intro' || S.phase === 'done') { $('#woMeta').textContent = s.sub || ''; return; }
    const it = s.all[st.i];
    if (it.warm) { $('#woMeta').textContent = `חימום · ${st.i + 1}/${KX.warmup.length}`; return; }
    const warmN = s.warm ? KX.warmup.length : 0;
    $('#woMeta').textContent = s.circuit && st.rounds ? `סבב ${st.round + 1}/${st.rounds} · תרגיל ${st.i - warmN + 1}/${s.items.length}` : `תרגיל ${st.i - warmN + 1}/${s.items.length} · סט ${st.set + 1}/${it.sets}`;
  }

  /* ================= מסכים ================= */
  function render() {
    if (fig) { fig.pause(); fig = null; }
    if (nextFig) { nextFig.pause(); nextFig = null; }
    const main = $('#woMain');
    main.className = 'wo-main wo-' + S.phase;
    main.innerHTML = ({ intro: introHTML, work: workHTML, rest: restHTML, done: doneHTML })[S.phase]();
    updateTop();
    const svg = $('.wo-fig', main), st = S.order[S.k];
    if (svg && st) {
      const it = S.s.all[st.i];
      if (it.ex) { fig = KX.ui.makeFig(svg, KX.exMap[it.ex], { fit: 1.25, onFrame: (i, f) => { const c = $('.wo-cap', main); if (c) c.textContent = f.c; } }); if (!reduce && !S.pauseAt) fig.play(); else fig.showFrame(1); }
    }
    const nsvg = $('.wo-nfig', main);
    if (nsvg) { const ns = S.order[S.k + 1] || S.order[S.k]; const nit = ns && S.s.all[ns.i]; if (nit && nit.ex) { nextFig = KX.ui.makeFig(nsvg, KX.exMap[nit.ex], { fit: 1.5 }); nextFig.showFrame(1); } }
    const p = $('[data-primary]', main);
    if (p) setTimeout(() => p.focus({ preventScroll: true }), 30);
    main.scrollTop = 0;
  }

  function introHTML() {
    const s = S.s;
    const est = Math.round(estimate(s) / 60);
    const sets = s.items.reduce((a, x) => a + x.sets, 0);
    const voiceNote = fx.hasVoice() ? '' : `<p class="wo-hint">${icon('i-info')} בדפדפן הזה אין קול בעברית, לכן ההנחיות יושמעו כצלילים בלבד.</p>`;
    return `
      <div class="wo-intro">
        <div class="wo-ihead">
          <p class="eyebrow">${s.circuit ? 'אימון מעגלי' : 'אימון מודרך'}</p>
          <h2>${esc(s.title)}</h2>
          ${s.sub ? `<p class="wo-isub">${esc(s.sub)}</p>` : ''}
          <dl class="wo-istats">
            <div><dt>תרגילים</dt><dd>${s.items.length}</dd></div>
            <div><dt>${s.circuit ? 'סבבים' : 'סטים'}</dt><dd>${s.circuit ? Math.max(...s.items.map((x) => x.sets)) : sets}</dd></div>
            <div><dt>משך משוער</dt><dd>~${est + (s.warm ? 6 : 0)} דק׳</dd></div>
          </dl>
        </div>
        <ol class="wo-list">${s.items.map((it, i) => `
          <li style="--c:${colorOf(it.ex)}"><span class="n">${i + 1}</span><span class="t"><b>${esc(it.n)}</b>${it.note ? `<small>${esc(it.note)}</small>` : ''}</span><span class="rx">${esc(KX.bidi(it.sets + '×' + it.label))}${it.unit === 'sec' ? ' שנ׳' : ''}</span></li>`).join('')}
        </ol>
        <div class="wo-opts">
          ${S.s.src !== 'challenge' ? `<label class="wo-switch"><input type="checkbox" id="woWarm" ${s.warm ? 'checked' : ''} /><span></span>להתחיל בחימום מודרך (כ־6 דק׳)</label>` : ''}
          <label class="wo-switch"><input type="checkbox" id="woVoiceOpt" ${KX.data.prefs().voice ? 'checked' : ''} /><span></span>הנחיות קוליות</label>
          <label class="wo-switch"><input type="checkbox" id="woSoundOpt" ${KX.data.prefs().sound ? 'checked' : ''} /><span></span>צלילים ורטט</label>
        </div>
        ${voiceNote}
        <div class="wo-actions"><button class="btn btn-accent btn-lg" data-a="begin" data-primary>${icon('i-play')} התחילו</button></div>
        <p class="wo-keys">רווח / Enter = הפעולה הראשית · Esc = יציאה</p>
      </div>`;
  }

  function workHTML() {
    const st = S.order[S.k], it = S.s.all[st.i];
    const e = it.ex && KX.exMap[it.ex];
    const c = colorOf(it.ex);
    if (it.warm) {
      return `
        <div class="wo-stage wo-stage-warm stage-dark" style="--c:var(--accent)">
          <div class="wo-ringbox"><svg viewBox="0 0 120 120" class="wo-ring"><circle cx="60" cy="60" r="54" class="bg"/><circle cx="60" cy="60" r="54" class="fg" id="woRing"/></svg><b id="woTime">0:45</b></div>
        </div>
        <div class="wo-panel">
          <p class="wo-kicker">חימום ${st.i + 1} מתוך ${KX.warmup.length}</p>
          <h2>${esc(it.n)}</h2>
          <p class="wo-target">${esc(KX.bidi(it.label))} · בקצב נוח</p>
          <div class="wo-actions"><button class="btn btn-accent btn-lg" data-a="next" data-primary>הבא ${icon('i-skip')}</button></div>
          <div class="wo-sec"><button data-a="skipwarm">דלגו על החימום</button></div>
        </div>`;
    }
    const prev = lastFor(it.ex, it.unit);
    const done = S.log[st.i] || [];
    const tgt = it.unit === 'sec' ? `<b>${it.target}</b> שניות` : `<b>${esc(KX.bidi(it.label))}</b> ${it.label === 'מקס׳' ? 'חזרות נקיות' : 'חזרות'}`;
    const cues = e ? e.cues.slice(0, 2) : [];
    const control = it.unit === 'sec'
      ? `<div class="wo-hold">
           <div class="wo-ringbox wo-ringbox-sm"><svg viewBox="0 0 120 120" class="wo-ring"><circle cx="60" cy="60" r="54" class="bg"/><circle cx="60" cy="60" r="54" class="fg" id="woRing"/></svg><b id="woTime">${fx.fmt(it.target)}</b><small id="woHoldLbl">${S.hold === 'run' ? 'מחזיקים' : S.hold === 'prep' ? 'היכונו' : 'מוכנים?'}</small></div>
           <div class="wo-actions">
             ${S.hold === 'ready' ? `<button class="btn btn-accent btn-lg" data-a="hold" data-primary>${icon('i-play')} התחילו (3…2…1)</button>` : `<button class="btn btn-ghost btn-lg" data-a="stophold" data-primary>עצרו ושמרו</button><button class="btn btn-ghost" data-a="plus10">+10 שנ׳</button>`}
           </div>
         </div>`
      : `<div class="wo-count">
           <p class="wo-q" id="woQ">כמה חזרות ביצעתם?</p>
           <div class="wo-step" role="group" aria-labelledby="woQ">
             <button class="icon-btn" data-a="dec" aria-label="פחות">${icon('i-minus')}</button>
             <output id="woVal" aria-live="polite">${S.val}</output>
             <button class="icon-btn" data-a="inc" aria-label="יותר">${icon('i-plus')}</button>
           </div>
           <div class="wo-actions"><button class="btn btn-accent btn-lg" data-a="set" data-primary>${icon('i-check')} סיימתי סט</button></div>
         </div>`;
    return `
      <div class="wo-stage stage-dark" style="--c:${c}">
        <svg class="wo-fig" role="img" aria-label="הדגמה: ${esc(it.n)}"></svg>
        <p class="wo-cap" aria-hidden="true"></p>
      </div>
      <div class="wo-panel" style="--c:${c}">
        <p class="wo-kicker"><i aria-hidden="true"></i>${S.s.circuit && st.rounds ? `סבב ${st.round + 1}/${st.rounds}` : `סט ${st.set + 1} מתוך ${it.sets}`}</p>
        <h2>${esc(it.n)}</h2>
        ${it.note ? `<p class="wo-note">${esc(it.note)}</p>` : ''}
        <p class="wo-target">יעד: ${tgt}</p>
        ${control}
        <div class="wo-meta">
          ${done.length ? `<span>היום: ${done.map((v) => `<b>${v}</b>`).join(' · ')}</span>` : ''}
          ${prev ? `<span>בפעם הקודמת: ${prev.sets.map((v) => `<b>${v}</b>`).join(' · ')}</span>` : ''}
        </div>
        ${cues.length ? `<ul class="wo-cues">${cues.map((x) => `<li>${icon('i-check')}<span>${esc(x)}</span></li>`).join('')}</ul>` : ''}
        <div class="wo-sec">${e ? `<button data-a="info">איך מבצעים נכון?</button>` : ''}<button data-a="skipex">דלגו על התרגיל</button></div>
      </div>`;
  }

  function restHTML() {
    const ns = S.order[S.k + 1], nit = ns && S.s.all[ns.i];
    const st = S.order[S.k];
    const roundEnd = S.s.circuit && st.rounds && ns && ns.round !== st.round;
    return `
      <div class="wo-restbox">
        <p class="wo-kicker">${roundEnd ? `סוף סבב ${st.round + 1} · מנוחה` : 'מנוחה'}</p>
        <div class="wo-ringbox"><svg viewBox="0 0 120 120" class="wo-ring"><circle cx="60" cy="60" r="54" class="bg"/><circle cx="60" cy="60" r="54" class="fg" id="woRing"/></svg><b id="woTime">${fx.fmt(st.rest)}</b></div>
        <div class="wo-actions">
          <button class="btn btn-ghost" data-a="rest+">+15 שנ׳</button>
          <button class="btn btn-accent" data-a="next" data-primary>דלגו על המנוחה ${icon('i-skip')}</button>
        </div>
        <p class="wo-hint">נשמו עמוק, שתו מים. הסט הבא מתחיל אוטומטית.</p>
      </div>
      ${nit ? `<div class="wo-next" style="--c:${colorOf(nit.ex)}">
        ${nit.ex ? `<svg class="wo-nfig" aria-hidden="true"></svg>` : ''}
        <div><small>הבא בתור</small><b>${esc(nit.n)}</b><span>${nit.warm ? esc(KX.bidi(nit.label)) : `${S.s.circuit && ns.rounds ? `סבב ${ns.round + 1}` : `סט ${ns.set + 1}/${nit.sets}`} · ${nit.unit === 'sec' ? nit.target + ' שנ׳' : esc(nit.label) + ' חזרות'}`}</span></div>
      </div>` : ''}`;
  }

  function summary() {
    const s = S.s;
    return totalsOf(s.items.map((it, j) => ({ ex: it.ex, n: it.n, unit: it.unit, sets: (S.log[(s.warm ? KX.warmup.length : 0) + j] || []).slice() })).filter((x) => x.sets.length));
  }
  function totalsOf(items) {
    const reps = items.filter((x) => x.unit === 'reps').reduce((a, x) => a + x.sets.reduce((p, v) => p + v, 0), 0);
    const secs = items.filter((x) => x.unit === 'sec').reduce((a, x) => a + x.sets.reduce((p, v) => p + v, 0), 0);
    const sets = items.reduce((a, x) => a + x.sets.length, 0);
    return { items, reps, secs, sets };
  }
  function doneHTML() {
    const sm = S.summary || (S.summary = summary());
    const dur = S.dur != null ? S.dur : (S.dur = Math.round(elapsed()));
    const feel = S.feel || 0;
    const FEEL = [['😮‍💨', 'קשה מאוד'], ['😓', 'קשה'], ['🙂', 'טוב'], ['😄', 'מעולה'], ['🔥', 'בשיא']];
    return `
      <div class="wo-done">
        <div class="wo-dhead">
          <div class="wo-burst" aria-hidden="true">${icon('i-trophy')}</div>
          <p class="eyebrow">${S.partial ? 'אימון חלקי' : 'האימון הושלם'}</p>
          <h2>${S.partial ? 'גם חלקי נחשב.' : 'כל הכבוד!'}</h2>
          <dl class="wo-istats">
            <div><dt>זמן</dt><dd>${fx.fmt(dur)}</dd></div>
            <div><dt>סטים</dt><dd>${sm.sets}</dd></div>
            <div><dt>חזרות</dt><dd>${sm.reps}</dd></div>
            ${sm.secs ? `<div><dt>שניות בהחזקה</dt><dd>${sm.secs}</dd></div>` : ''}
          </dl>
        </div>
        ${sm.items.length ? `<div class="wo-edit"><h3>מה ביצעתם <small>(אפשר לתקן לפני השמירה)</small></h3>
          <ul>${sm.items.map((it, j) => `<li style="--c:${colorOf(it.ex)}"><b>${esc(it.n)}</b><span class="sets">${it.sets.map((v, k) => `<input type="number" inputmode="numeric" min="0" max="999" value="${v}" data-ei="${j}" data-ek="${k}" aria-label="${esc(it.n)} סט ${k + 1} (${unitWord(it.unit)})" />`).join('')}<small>${it.unit === 'sec' ? 'שנ׳' : 'חזרות'}</small></span></li>`).join('')}</ul></div>` : '<p class="wo-hint">לא נרשמו סטים באימון הזה.</p>'}
        <div class="wo-feel"><h3>איך הרגיש?</h3><div role="radiogroup" aria-label="תחושה">${FEEL.map(([e, t], i) => `<button role="radio" aria-checked="${feel === i + 1}" data-feel="${i + 1}" title="${t}"><span aria-hidden="true">${e}</span><small>${t}</small></button>`).join('')}</div></div>
        <div class="wo-actions">
          ${S.saved ? `<span class="wo-saved">${icon('i-check')} נשמר ביומן</span>` : `<button class="btn btn-accent btn-lg" data-a="save" data-primary ${sm.items.length ? '' : 'disabled'}>${icon('i-save')} שמרו ביומן</button>`}
          <button class="btn btn-ghost" data-a="share" ${sm.items.length ? '' : 'disabled'}>${icon('i-share')} שתפו</button>
          <button class="btn btn-ghost" data-a="close">${S.saved ? 'סגירה' : 'סגירה בלי לשמור'}</button>
        </div>
      </div>`;
  }

  /* ================= מעברים ================= */
  function begin() {
    S.order = buildOrder(S.s);
    S.log = S.s.all.map(() => []);
    S.k = 0; S.t0 = now(); S.paused = 0; S.pauseAt = 0;
    fx.wake(true);
    startLoop();
    fx.beep('go');
    enterWork();
  }
  function defaultVal(it, idx) {
    const done = S.log[idx] || [];
    if (done.length) return done[done.length - 1];
    if (it.target != null) return it.target;
    const prev = lastFor(it.ex, it.unit);
    return prev ? Math.max(...prev.sets) : 8;
  }
  function enterWork() {
    const st = S.order[S.k], it = S.s.all[st.i];
    S.phase = 'work'; S.timer = null; S.hold = 'ready';
    S.val = defaultVal(it, st.i);
    render();
    if (it.warm) {
      if (st.i === 0) say('מתחילים בחימום. ' + it.n); else say(it.n);
      setTimer(it.target, (sec) => { if (sec <= 3 && sec > 0) fx.beep('tick'); }, () => { fx.beep('go'); advance(); });
      return;
    }
    const setTxt = S.s.circuit && st.rounds ? '' : (it.sets > 1 ? `סט ${st.set + 1} מתוך ${it.sets}. ` : '');
    const tgt = it.unit === 'sec' ? `${it.target} שניות` : it.target != null ? `${it.label.replace('–', ' עד ')} חזרות` : 'מקסימום חזרות נקיות';
    say(`${setTxt}${it.n}. ${tgt}`);
  }
  function startHold() {
    const st = S.order[S.k], it = S.s.all[st.i];
    S.hold = 'prep';
    render();
    $('#woTime').textContent = '3';
    let n = 3;
    fx.beep('tick');
    const prep = setInterval(() => {
      if (!S || S.phase !== 'work' || S.order[S.k] !== st) { clearInterval(prep); return; }
      if (S.pauseAt) return;
      n--;
      if (n > 0) { $('#woTime').textContent = String(n); fx.beep('tick'); return; }
      clearInterval(prep);
      S.hold = 'run'; S.holdStart = now();
      render();
      fx.beep('go');
      say('מחזיקים');
      const T = setTimer(it.target, (sec) => {
        if (sec === 10 && it.target >= 20) say('עוד 10 שניות');
        if (sec <= 3 && sec > 0) fx.beep('tick');
      }, () => { fx.beep('done'); logSet(Math.round(T.total)); }); /* T.total כולל תוספות של +10 */
    }, 1000);
  }
  function stopHold() {
    const T = S.timer;
    if (S.hold !== 'run' || !T) { S.hold = 'ready'; S.timer = null; render(); return; }
    const held = Math.max(1, Math.round(T.total - Math.max(0, T.left)));
    S.timer = null;
    fx.beep('done');
    logSet(held);
  }
  function logSet(v) {
    const st = S.order[S.k];
    S.log[st.i].push(Math.max(0, Math.round(v)));
    if (st.rest > 0 && S.k < S.order.length - 1) enterRest();
    else advance();
  }
  function enterRest() {
    const st = S.order[S.k];
    S.phase = 'rest';
    render();
    const ns = S.order[S.k + 1], nit = ns && S.s.all[ns.i];
    say(`מנוחה, ${st.rest >= 60 && st.rest % 60 === 0 ? (st.rest / 60 === 1 ? 'דקה' : st.rest / 60 + ' דקות') : st.rest + ' שניות'}.${nit ? ' הבא: ' + nit.n : ''}`);
    setTimer(st.rest, (sec) => {
      if (sec === 10 && st.rest > 20) say('עוד 10 שניות');
      if (sec <= 3 && sec > 0) fx.beep('tick');
    }, () => { fx.beep('go'); advance(); });
  }
  function advance() {
    S.timer = null;
    if (S.k >= S.order.length - 1) return finish(false);
    S.k++;
    enterWork();
  }
  function skipExercise() {
    const cur = S.order[S.k].i;
    if (S.s.circuit) { advance(); return; } /* במעגל: מדלגים על הסט הנוכחי בלבד */
    let k = S.k;
    while (k < S.order.length && S.order[k].i === cur) k++;
    if (k >= S.order.length) return finish(false);
    S.k = k; S.timer = null; enterWork();
  }
  function skipWarm() {
    let k = S.k;
    while (k < S.order.length && S.s.all[S.order[k].i].warm) k++;
    S.k = Math.min(k, S.order.length - 1); S.timer = null; enterWork();
  }
  function finish(partial) {
    S.timer = null;
    S.dur = Math.round(elapsed());
    S.partial = partial;
    S.phase = 'done';
    S.summary = summary();
    fx.wake(false);
    render();
    if (!partial) { fx.beep('done'); say('כל הכבוד! האימון הושלם'); }
  }
  function askExit() {
    if ($('.wo-confirm', dlg)) return;
    const had = S.log.some((l) => l.length);
    const box = document.createElement('div');
    box.className = 'wo-confirm';
    box.setAttribute('role', 'alertdialog');
    box.setAttribute('aria-label', 'יציאה מהאימון');
    box.innerHTML = `<div class="wo-cbox"><h3>לצאת מהאימון?</h3><p>${had ? 'אפשר לשמור את מה שכבר ביצעתם.' : 'עוד לא נרשמו סטים.'}</p>
      <div class="wo-actions">${had ? `<button class="btn btn-accent" data-c="partial">סיום ושמירה</button>` : ''}<button class="btn btn-ghost" data-c="stay" data-cfocus>המשך באימון</button><button class="btn btn-ghost" data-c="quit">יציאה בלי לשמור</button></div></div>`;
    $('.wo-shell', dlg).appendChild(box);
    const wasPaused = !!S.pauseAt;
    if (!wasPaused) togglePause();
    $('[data-cfocus]', box).focus();
    box.addEventListener('click', (e) => {
      const b = e.target.closest('[data-c]'); if (!b) return;
      box.remove();
      if (b.dataset.c === 'stay') { if (!wasPaused) togglePause(); return; }
      if (S.pauseAt) togglePause();
      if (b.dataset.c === 'quit') close();
      if (b.dataset.c === 'partial') finish(true);
    });
  }
  function save() {
    if (S.saved) return;
    const sm = S.summary;
    $$('.wo-edit input', dlg).forEach((inp) => { const v = Math.max(0, Math.min(999, Math.round(+inp.value || 0))); sm.items[+inp.dataset.ei].sets[+inp.dataset.ek] = v; });
    sm.items.forEach((it) => (it.sets = it.sets.filter((v) => v > 0)));
    const items = sm.items.filter((it) => it.sets.length);
    const rec = KX.data.addWorkout({ title: S.s.title, src: S.s.src, meta: S.s.meta || {}, dur: S.dur, feel: S.feel || null, items });
    S.saved = rec;
    S.summary = totalsOf(items);
    if (S.s.onSave) S.s.onSave(rec);
    render();
    toast('האימון נשמר ביומן ✓');
  }

  function onClick(e) {
    const f = e.target.closest('[data-feel]');
    if (f && S) { S.feel = +f.dataset.feel; $$('[data-feel]', dlg).forEach((b) => b.setAttribute('aria-checked', b === f)); return; }
    const b = e.target.closest('[data-a]'); if (!b || !S) return;
    const a = b.dataset.a;
    const it = S.order[S.k] && S.s.all[S.order[S.k].i];
    switch (a) {
      case 'close': if (S.phase === 'work' || S.phase === 'rest') askExit(); else close(); break;
      case 'pause': togglePause(); break;
      case 'voice': KX.data.setPref('voice', !KX.data.prefs().voice); syncVoiceBtn(); if (!KX.data.prefs().voice && 'speechSynthesis' in window) speechSynthesis.cancel(); break;
      case 'begin': {
        const w = $('#woWarm', dlg);
        if (w) { S.s.warm = w.checked; KX.store.set('woWarm', w.checked); }
        KX.data.setPref('voice', $('#woVoiceOpt', dlg).checked);
        KX.data.setPref('sound', $('#woSoundOpt', dlg).checked);
        syncVoiceBtn();
        begin();
        break;
      }
      case 'inc': S.val = Math.min(999, S.val + 1); $('#woVal').textContent = S.val; break;
      case 'dec': S.val = Math.max(0, S.val - 1); $('#woVal').textContent = S.val; break;
      case 'set': fx.beep('tick'); logSet(S.val); break;
      case 'hold': startHold(); break;
      case 'stophold': stopHold(); break;
      case 'plus10': if (S.timer) { S.timer.left += 10; S.timer.total += 10; drawTimer(); } break;
      case 'rest+': if (S.timer) { S.timer.left += 15; S.timer.total += 15; drawTimer(); } break;
      case 'next': if (it && it.warm && S.phase === 'work') { advance(); } else { S.timer = null; advance(); } break;
      case 'skipex': skipExercise(); break;
      case 'skipwarm': skipWarm(); break;
      case 'info': if (it && it.ex && KX.app) { if (!S.pauseAt) togglePause(); KX.app.openEx(it.ex); toast('האימון מושהה. סגרו את ההדגמה ולחצו ▶ כדי להמשיך'); } break;
      case 'save': save(); break;
      case 'share': if (KX.share) { if (!S.saved) save(); KX.share.workout(S.saved); } break;
    }
  }

  /* ================= רשימת אימונים מוכנים (#workoutsMount) ================= */
  function nextPlanDay() {
    const inp = KX.store.get('plan', null);
    if (!inp || !inp.goal) return null;
    let plan;
    try { plan = KX.builder.build(inp); } catch (_) { return null; }
    const today = new Date().getDay();
    for (let o = 0; o < 7; o++) { const d = plan.days[(today + o) % 7]; if (!d.rest) return { day: d, inp, offset: o }; }
    return null;
  }
  function cardFigs(root) {
    $$('svg[data-fig]', root).forEach((svg) => { const ex = KX.exMap[svg.dataset.fig]; if (ex) KX.ui.makeFig(svg, ex, { fit: 1.55 }).showFrame(1); });
  }
  function renderMount() {
    const m = $('#workoutsMount'); if (!m) return;
    const np = nextPlanDay();
    const lvl = ['', 'מתחילים', 'בינוני', 'מתקדמים'];
    m.innerHTML = `
      ${np ? `<article class="wq-plan">
        <div><p class="eyebrow">${np.offset === 0 ? 'היום בתוכנית שלך' : np.offset === 1 ? 'מחר בתוכנית שלך' : 'האימון הבא בתוכנית שלך'}</p>
          <h3>${esc(np.day.name)} <small>· יום ${esc(np.day.day)}</small></h3>
          <p>${np.day.items.map((x) => esc(x.n)).join(' · ')}</p></div>
        <button class="btn btn-accent" data-wq-plan>${icon('i-play')} התחילו עכשיו</button>
      </article>` : ''}
      <div class="wq-grid">${KX.quick.map((q) => {
        const s = fromQuick(q), est = Math.round(estimate(s) / 60);
        return `<article class="wq" style="--c:${q.color}">
          <div class="wq-figs stage-dark" aria-hidden="true">${q.items.slice(0, 2).map((it) => `<svg data-fig="${it.ex}"></svg>`).join('')}</div>
          <div class="wq-body">
            <div class="wq-tags"><span class="tag">~${est} דק׳</span><span class="tag">${lvl[q.level]}</span>${q.circuit ? '<span class="tag">מעגלי</span>' : ''}</div>
            <h3>${esc(q.title)}</h3>
            <p class="wq-sub">${esc(q.sub)} · ${esc(q.equip)}</p>
            <p class="wq-ex">${q.items.map((it) => esc(exName(it.ex))).join(' · ')}</p>
            <button class="btn btn-ghost btn-sm wq-go" data-wq="${q.id}">${icon('i-play')} התחילו</button>
          </div>
        </article>`;
      }).join('')}</div>`;
    cardFigs(m);
  }
  document.addEventListener('click', (e) => {
    const q = e.target.closest('[data-wq]');
    if (q) { start(fromQuick(KX.quick.find((x) => x.id === q.dataset.wq))); return; }
    if (e.target.closest('[data-wq-plan]')) { const np = nextPlanDay(); if (np) start(fromPlanDay(np.day, np.inp)); }
  });
  renderMount();
  KX.on('change', (d) => { if (d.key === 'plan') renderMount(); });
  KX.on('import', renderMount);

  /* כפתור "אימון מודרך" במודאל התרגיל */
  const mf = $('#exModal .m-foot');
  if (mf) {
    const b = document.createElement('button');
    b.className = 'btn btn-accent btn-sm m-start';
    b.innerHTML = `${icon('i-play')} אימון מודרך`;
    b.addEventListener('click', () => { const ex = KX.app && KX.app.currentEx(); if (ex) start(fromExercise(ex)); });
    mf.insertBefore(b, mf.lastElementChild);
  }

  KX.workout = {
    start,
    startQuick: (id) => start(fromQuick(KX.quick.find((x) => x.id === id))),
    startPlanDay: (day, inp) => start(fromPlanDay(day, inp)),
    startExercise: (id) => start(fromExercise(KX.exMap[id])),
    startChallenge: (ch, dayNo, spec, onSave) => { const s = fromChallenge(ch, dayNo, spec); s.onSave = onSave; start(s); },
    isOpen: () => !!(dlg && dlg.open),
  };
})();
