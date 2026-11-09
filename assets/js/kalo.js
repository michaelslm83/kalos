/* KALOS — סרטוני הדרכה
   סרטון קצר לכל תרגיל, בכיכובם של Cali או Stheni (המדריכים המונפשים של האתר, figure.js).
   הסרטון "מצולם" בזמן אמת ממנוע ההדגמות: וקטורי, חד בכל גודל, בלי קובצי וידאו ובלי רשת.
   פרקים: פתיחה · ביצוע (שרירים מסומנים) · צעד אחר צעד (הילוך איטי) · דגשים (זווית 2) ·
          טעויות (הביצוע השגוי, מסומן) · ככה נכון · סיכום.
   עובד בכל פלטפורמה: מגע/עכבר/מקלדת, מסך מלא אמיתי או מדומה (iPhone), יחס 1:1 במסכים צרים. */
(function () {
  'use strict';
  const KX = window.KX;
  const NS = 'http://www.w3.org/2000/svg';
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const ease = (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
  const fmt = (ms) => { const s = Math.max(0, Math.round(ms / 1000)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  const sum = (seq) => seq.reduce((s, f) => s + f.d + f.h, 0);
  const SVGI = {
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l12-7.5z" fill="currentColor"/></svg>',
    pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor"/></svg>',
    replay: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4.5h4.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    fs: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    fsx: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  };

  /* ---------- שרירים → נקודה על השלד: [מקטע, מיקום יחסי לאורכו] ---------- */
  const ANCHOR = {
    'חזה': ['torso', 0.78], 'חזה עליון': ['torso', 0.88], 'חזה פנימי': ['torso', 0.74], 'חזה תחתון': ['torso', 0.66],
    'גב רחב': ['torso', 0.62], 'לאטס': ['torso', 0.62], 'גב עליון': ['torso', 0.9], 'שכמות': ['torso', 0.9], 'מורידי כתף': ['torso', 0.86],
    'טרפז עליון': ['neck', 0.6],
    'כתף קדמית': ['S', 0], 'כתף אחורית': ['S', 0], 'כתפיים': ['S', 0],
    'יד אחורית': ['upper', 0.5], 'יד אחורית (טרייספס)': ['upper', 0.5], 'יד קדמית': ['upper', 0.5], 'יד קדמית (ביספס)': ['upper', 0.5],
    'אמות': ['fore', 0.5],
    'ליבה': ['torso', 0.42], 'בטן': ['torso', 0.42], 'בטן ישרה': ['torso', 0.46], 'בטן ישרה (קוביות)': ['torso', 0.46],
    'בטן רוחבית': ['torso', 0.38], 'אלכסוניים': ['torso', 0.5], 'בטן תחתונה': ['torso', 0.26],
    'זוקפי גב': ['torso', 0.3], 'מייצבי גב': ['torso', 0.3],
    'ישבן': ['hip', 0], 'ישבן צידי': ['hip', 0], 'שרשרת אחורית': ['hip', 0],
    'מכופפי ירך': ['thigh', 0.16], 'ארבע ראשי': ['thigh', 0.5], 'רגליים': ['thigh', 0.5], 'מקרבים': ['thigh', 0.4],
    'המסטרינג': ['thigh', 0.58], 'המסטרינג (ירך אחורית)': ['thigh', 0.58],
    'שוקיים': ['shin', 0.4], 'שוקיים (תאומים וסולאוס)': ['shin', 0.4], 'מייצבי קרסול': ['A', 0],
  };
  const short = (m) => m.replace(/\s*\(.*\)\s*/, '');
  const LP = (a, b, u) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u)];
  function anchorPoint(sk, seg, u) {
    switch (seg) {
      case 'torso': { const v = 1 - u; return [v * v * sk.hip[0] + 2 * u * v * sk.ctrl[0] + u * u * sk.S[0], v * v * sk.hip[1] + 2 * u * v * sk.ctrl[1] + u * u * sk.S[1]]; }
      case 'neck': return LP(sk.S, sk.neck, u);
      case 'upper': return LP(sk.S, sk.E, u);
      case 'fore': return LP(sk.E, sk.W, u);
      case 'thigh': return LP(sk.hip, sk.K, u);
      case 'shin': return LP(sk.K, sk.A, u);
      default: return sk[seg];
    }
  }
  /* עד 4 נקודות; שרירים באותה נקודה מאוחדים לתווית אחת */
  function muscleSpots(ex) {
    const spots = [], extra = [];
    ex.muscles.forEach((m) => {
      const a = ANCHOR[m];
      if (!a) { extra.push(m); return; }
      const key = a.join(':');
      const s = spots.find((x) => x.key === key);
      if (s) { if (s.names.indexOf(short(m)) < 0) s.names.push(short(m)); }
      else if (spots.length < 4) spots.push({ key, seg: a[0], u: a[1], names: [short(m)] });
    });
    return { spots, extra };
  }

  /* ---------- תסריט ---------- */
  /* o: { rx, note, cut: 'short' } — מינון מהתוכנית, וגרסה מקוצרת לרצועה */
  function script(ex, player, o) {
    o = o || {};
    const g = player.good, b = player.bad;
    const Tg = sum(g), Tb = b ? sum(b) : 0;
    const cyc = (T, min) => (T >= min ? T : Math.ceil(min / T) * T);
    const hold = KX.parseRx(ex.rx).unit === 'sec'; /* "3×3–5 (ירידה 5 שנ׳)" = חזרות, לא החזקה */
    const cat = KX.cats[ex.cat], lvl = KX.levels[ex.level];
    const ms = muscleSpots(ex);
    const capNow = (p) => (p.seq[p.idx] ? p.seq[p.idx].c : '');
    const clean = (s) => String(s).replace(/^[✗✓]\s*/, '');
    const steps = ex.steps, cues = ex.cues.slice(0, 4), errs = ex.mistakes.slice(0, 4);
    const cid = KX.coaches[o.coach] ? o.coach : KX.coachFor(ex), cn = KX.coaches[cid].name;
    const S = [];
    S.push({
      key: 'intro', name: 'פתיחה', dur: 3600, mode: 'good', speed: 0.4, zoom: [0.86, 1], off: g[0].d,
      card: () => `<p class="km-eyebrow"><span class="km-dot"></span>${esc(cn)} ${KX.coachVerb(cid, 'מציגה', 'מציג')}</p><h3>${esc(ex.name)}</h3><p class="km-en" dir="ltr">${esc(ex.en)}</p>
        <p class="km-tags"><span style="--t:${cat.color}">${esc(cat.name)}</span><span>${esc(lvl)}</span><span>${esc(ex.equip)}</span></p>${o.rx ? `<p class="km-rx">במינון: <b>${esc(KX.bidi(o.rx))}</b>${o.note ? ` · ${esc(o.note)}` : ''}</p>` : ''}`,
    });
    S.push({
      key: 'demo', name: 'ביצוע', dur: cyc(Tg, 6500), mode: 'good', speed: 1, zoom: [1, 0.97], off: g[0].d, labels: true, points: true, counter: true,
      chip: 'ביצוע נכון · 1×', tone: 'ok',
      lower: () => ({ k: 'demo', kick: 'השרירים שעובדים', text: ms.spots.map((s) => s.names.join(' · ')).join('  ·  ') || ex.muscles.join(' · '), sub: o.rx ? 'במינון: ' + KX.bidi(o.rx) + (o.note ? ' · ' + o.note : '') : ms.extra.length ? 'וגם: ' + ms.extra.join(' · ') : ex.summary }),
    });
    const stepDur = 2200;
    S.push({
      key: 'steps', name: 'צעד אחר צעד', dur: steps.length * stepDur, mode: 'good', speed: 0.5, zoom: [0.98, 0.8], off: g[0].d, points: true,
      chip: 'הילוך איטי · 0.5×', tone: 'ok',
      lower: (lt, p) => { const i = Math.min(steps.length - 1, Math.floor(lt / stepDur)); return { k: 's' + i, kick: `שלב ${i + 1} מתוך ${steps.length}`, text: steps[i], sub: '' }; },
    });
    const cueDur = 2400;
    S.push({
      key: 'cues', name: 'דגשים', dur: Math.max(1, cues.length) * cueDur, mode: 'good', speed: 1, zoom: [0.96, 0.96], off: g[0].d, mirror: true, points: true,
      chip: 'זווית 2 · דגשים לביצוע נכון', tone: 'ok',
      lower: (lt) => { const i = Math.min(cues.length - 1, Math.floor(lt / cueDur)); return { k: 'c' + i, kick: `✓ דגש ${i + 1} מתוך ${cues.length}`, text: cues[i] || '', sub: '' }; },
    });
    const errDur = 2500;
    if (b) {
      S.push({
        key: 'bad', name: 'טעויות', dur: Math.max(errs.length * errDur, cyc(Tb / 0.7, 5000)), mode: 'bad', speed: 0.7, zoom: [0.98, 0.84], off: b[0].d, grade: 'bad',
        chip: '✗ מה לא לעשות', tone: 'bad',
        lower: (lt, p) => { const i = Math.min(errs.length - 1, Math.floor(lt / errDur)); return { k: 'e' + i, kick: `✗ טעות נפוצה ${i + 1} מתוך ${errs.length}`, text: errs[i], sub: 'בהדגמה: ' + clean(capNow(p)) }; },
      });
    } else {
      S.push({
        key: 'bad', name: 'טעויות', dur: Math.max(4200, errs.length * 1500), mode: 'good', speed: 0.5, zoom: [0.96, 0.96], off: g[0].d, grade: 'bad', dim: true,
        chip: '✗ מה לא לעשות', tone: 'bad',
        card: () => `<p class="km-eyebrow bad">✗ טעויות נפוצות</p><ul class="km-list bad">${errs.map((m) => `<li>${esc(m)}</li>`).join('')}</ul>`,
      });
    }
    S.push({
      key: 'good', name: 'ככה נכון', dur: cyc(Tg, 4200), mode: 'good', speed: 1, zoom: [0.94, 1], off: g[0].d, grade: 'good', labels: true, points: true, counter: true,
      chip: '✓ ככה נכון', tone: 'ok',
      lower: (lt, p) => ({ k: 'g' + p.idx, kick: '✓ הביצוע הנכון', text: clean(capNow(p)), sub: '' }),
    });
    S.push({
      key: 'outro', name: 'סיכום', dur: 5200, mode: 'good', speed: 0.35, zoom: [1, 0.94], off: g[0].d, dim: true,
      card: () => `<p class="km-eyebrow"><span class="km-dot"></span>${esc(ex.name)} · סיכום</p>
        <dl class="km-sum"><div><dt>מינון מומלץ</dt><dd dir="ltr">${esc(ex.rx)}</dd></div><div><dt>ציוד</dt><dd>${esc(ex.equip)}</dd></div><div class="w"><dt>שרירים</dt><dd>${esc(ex.muscles.join(' · '))}</dd></div>
        <div><dt>קל יותר ↓</dt><dd>${esc(ex.easier)}</dd></div><div><dt>קשה יותר ↑</dt><dd>${esc(ex.harder)}</dd></div></dl>
        <p class="km-sign"><b>${esc(cn)}</b> · KALOS <button type="button" class="km-again">${SVGI.replay}<span>צפה שוב</span></button></p>`,
    });
    if (o.cut === 'short') {
      /* רצועה: פתיחה קצרה, ביצוע, 2 טעויות, ככה נכון */
      for (let i = S.length - 1; i >= 0; i--) if (['intro', 'demo', 'bad', 'good'].indexOf(S[i].key) < 0) S.splice(i, 1);
      S.forEach((x) => {
        if (x.key === 'intro') x.dur = 2600;
        if (x.key === 'demo') x.dur = cyc(Tg, 5200);
        if (x.key === 'bad') x.dur = b ? Math.min(x.dur, Math.max(2, Math.min(errs.length, 2)) * errDur) : 3600;
        if (x.key === 'good') x.dur = cyc(Tg, 3400);
      });
    }
    let t0 = 0;
    S.forEach((s) => { s.t0 = t0; t0 += s.dur; });
    return { scenes: S, total: t0, hold, Tg, Tb };
  }

  /* ---------- נגן הסרטון ---------- */
  class Movie {
    constructor(host, ex, opts) {
      this.host = host;
      this.ex = ex;
      this.opts = Object.assign({}, opts);
      this.coach = KX.coaches[this.opts.coach] ? this.opts.coach : KX.coachFor(ex);
      this.opts.coach = this.coach;
      this.t = 0;
      this.raf = null;
      this.si = -1;
      this.lowKey = null;
      this.color = KX.cats[ex.cat].color;
      this.dom();
      this.ensurePlayer();
      this.render();
      this.ro = new ResizeObserver(() => { if (this.ensurePlayer()) { this.si = -1; this.render(); } });
      this.ro.observe(this.root);
      this.onFs = () => this.fsIcon();
      document.addEventListener('fullscreenchange', this.onFs);
      document.addEventListener('webkitfullscreenchange', this.onFs);
      this.onVis = () => { if (document.hidden) this.pause(); };
      document.addEventListener('visibilitychange', this.onVis);
      if (this.opts.autoplay) this.play();
    }
    dom() {
      const r = (this.root = document.createElement('div'));
      r.className = 'kmov stage-dark paused';
      r.style.setProperty('--c', this.color);
      r.setAttribute('role', 'region');
      r.setAttribute('aria-label', 'סרטון הדרכה: ' + this.ex.name);
      r.innerHTML = `
        <div class="km-screen">
          <svg class="km-fig" aria-hidden="true" focusable="false"></svg>
          <svg class="km-anno" aria-hidden="true" focusable="false"></svg>
          <div class="km-labels" aria-hidden="true"></div>
          <div class="km-grade" aria-hidden="true"></div>
          ${brand(this.coach, 'km-brand')}
          <div class="km-chip" aria-hidden="true"></div>
          <div class="km-count" aria-hidden="true"></div>
          <div class="km-card"></div>
          <div class="km-lower" aria-hidden="true"><b class="km-kick"></b><p class="km-text"></p><small class="km-sub"></small></div>
          <div class="km-fade" aria-hidden="true"></div>
          <button type="button" class="km-big" aria-label="נגן">${SVGI.play}</button>
          <p class="km-live" aria-live="polite"></p>
        </div>
        <div class="km-bar" dir="ltr">
          <button type="button" class="km-pp" aria-label="נגן">${SVGI.play}</button>
          <div class="km-track" role="slider" tabindex="0" aria-label="מיקום בסרטון" aria-valuemin="0"></div>
          <span class="km-time">0:00</span>
          <button type="button" class="km-fs" aria-label="מסך מלא">${SVGI.fs}</button>
        </div>
        <div class="km-chapters" role="group" aria-label="פרקים"></div>`;
      const q = (s) => r.querySelector(s);
      Object.assign(this, {
        screen: q('.km-screen'), fig: q('.km-fig'), anno: q('.km-anno'), labelsEl: q('.km-labels'), chip: q('.km-chip'), count: q('.km-count'),
        card: q('.km-card'), lower: q('.km-lower'), fade: q('.km-fade'), big: q('.km-big'), live: q('.km-live'),
        pp: q('.km-pp'), track: q('.km-track'), time: q('.km-time'), fsBtn: q('.km-fs'), chapters: q('.km-chapters'),
      });
      this.fig.style.setProperty('--hl', this.color);
      this.host.appendChild(r);

      /* פקדים */
      this.pp.addEventListener('click', () => this.toggle());
      this.big.addEventListener('click', (e) => { e.stopPropagation(); this.toggle(); });
      this.screen.addEventListener('click', (e) => {
        if (e.target.closest('.km-again')) { this.seek(0); this.play(); return; }
        if (e.target.closest('button, a')) return;
        this.toggle();
      });
      this.screen.addEventListener('dblclick', (e) => { if (!e.target.closest('button')) this.toggleFs(); });
      this.fsBtn.addEventListener('click', () => this.toggleFs());
      const seekAt = (e) => { const rc = this.track.getBoundingClientRect(); this.seek(clamp((e.clientX - rc.left) / rc.width, 0, 1) * this.sc.total); };
      this.track.addEventListener('pointerdown', (e) => {
        if (e.button > 0) return;
        this.track.setPointerCapture(e.pointerId);
        this.dragging = true; this.wasPlaying = this.playing; this.pause(); seekAt(e);
      });
      this.track.addEventListener('pointermove', (e) => { if (this.dragging) seekAt(e); });
      const end = () => { if (!this.dragging) return; this.dragging = false; if (this.wasPlaying) this.play(); };
      this.track.addEventListener('pointerup', end);
      this.track.addEventListener('pointercancel', end);
      this.track.addEventListener('keydown', (e) => {
        const k = e.key;
        if (k === 'ArrowRight' || k === 'ArrowUp') this.seek(this.t + 5000);
        else if (k === 'ArrowLeft' || k === 'ArrowDown') this.seek(this.t - 5000);
        else if (k === 'Home') this.seek(0);
        else if (k === 'End') this.seek(this.sc.total);
        else if (k === 'PageUp') this.jump(1);
        else if (k === 'PageDown') this.jump(-1);
        else return;
        e.preventDefault(); e.stopPropagation();
      });
      r.addEventListener('keydown', (e) => {
        if (e.target.closest('.km-track')) return;
        const k = e.key.toLowerCase();
        if ((k === ' ' || k === 'k') && !e.target.closest('button')) { e.preventDefault(); this.toggle(); }
        else if (k === 'f') { e.preventDefault(); this.toggleFs(); }
        else if (k === 'escape' && r.classList.contains('km-pseudo')) { e.preventDefault(); e.stopPropagation(); this.toggleFs(); }
      });
      this.chapters.addEventListener('click', (e) => { const b = e.target.closest('button[data-i]'); if (b) { this.seek(this.sc.scenes[+b.dataset.i].t0 + 1); if (!this.playing) this.play(); } });
    }
    /* יחס במה לפי רוחב: 4:5 במסכים צרים (טלפון לאורך), 16:9 בכל השאר */
    aspectFor() {
      const w = this.root.clientWidth || 640;
      const fsH = this.isFs() ? window.innerHeight - 120 : 0;
      if (fsH > 0 && w / fsH < 1.2) return 0.8;
      return w < 460 ? 0.8 : 16 / 9;
    }
    ensurePlayer() {
      const a = this.aspectFor();
      if (this.player && this.aspect === a) return false;
      this.aspect = a;
      this.screen.style.aspectRatio = a < 1 ? '4 / 5' : '16 / 9';
      this.root.classList.toggle('km-sq', a < 1);
      this.player = new KX.fig.Player(this.fig, this.ex, { fit: a, coach: this.coach });
      /* מסגור: הדמות ברצועה האמצעית, מקום למעלה לתווית הפרק ולמטה לכתוביות */
      const v = this.player.vb, top = a < 1 ? 0.14 : 0.12, band = a < 1 ? 0.56 : 0.64;
      const H = v[3] / band, Wd = H * a;
      const wide = [v[0] + v[2] / 2 - Wd / 2, v[1] - top * H, Wd, H].map((n) => Math.round(n));
      this.focus = [v[0] + v[2] / 2, v[1] + v[3] / 2];
      this.player.fitBox = () => wide;
      this.player.build();
      this.player.reset();
      this.base = this.player.vb.slice();
      this.hasFloor = (this.ex.anim.gear || []).some((o) => o.k === 'floor');
      if (!this.sc) { this.sc = script(this.ex, this.player, this.opts); this.buildBar(); }
      this.anno.setAttribute('viewBox', this.base.join(' '));
      return true;
    }
    buildBar() {
      const S = this.sc.scenes, T = this.sc.total;
      this.track.innerHTML = S.map((s) => `<i class="km-seg" style="flex-grow:${s.dur}"><b></b></i>`).join('') + '<span class="km-knob"></span>';
      this.segs = Array.from(this.track.querySelectorAll('.km-seg b'));
      this.knob = this.track.querySelector('.km-knob');
      this.track.setAttribute('aria-valuemax', String(Math.round(T / 1000)));
      this.chapters.innerHTML = S.map((s, i) => `<button type="button" data-i="${i}"><span>${esc(s.name)}</span></button>`).join('');
      this.chapBtns = Array.from(this.chapters.querySelectorAll('button'));
      this.duration = T;
    }

    /* ---------- ניגון ---------- */
    get playing() { return !!this.raf; }
    play() {
      if (this.raf) return;
      if (this.t >= this.sc.total - 30) this.t = 0;
      this.root.classList.remove('paused', 'ended');
      this.pp.innerHTML = SVGI.pause; this.pp.setAttribute('aria-label', 'השהה');
      this.big.setAttribute('aria-label', 'השהה');
      this.last = performance.now();
      const loop = (now) => {
        this.t += Math.min(64, now - this.last);
        this.last = now;
        if (this.t >= this.sc.total) { this.t = this.sc.total - 1; this.render(); this.pause(true); if (this.opts.onEnd) this.opts.onEnd(); return; }
        this.render();
        this.raf = requestAnimationFrame(loop);
      };
      this.raf = requestAnimationFrame(loop);
      if (this.opts.onPlay) this.opts.onPlay();
    }
    pause(ended) {
      if (this.raf) cancelAnimationFrame(this.raf);
      this.raf = null;
      this.root.classList.add('paused');
      this.root.classList.toggle('ended', !!ended);
      this.pp.innerHTML = ended ? SVGI.replay : SVGI.play;
      this.pp.setAttribute('aria-label', ended ? 'צפה שוב' : 'נגן');
      this.big.innerHTML = ended ? SVGI.replay : SVGI.play;
      this.big.setAttribute('aria-label', ended ? 'צפה שוב' : 'נגן');
    }
    toggle() { if (this.playing) this.pause(); else this.play(); }
    seek(t) { this.t = clamp(t, 0, this.sc.total - 1); this.root.classList.remove('ended'); this.render(); }
    jump(d) { const i = clamp(this.si + d, 0, this.sc.scenes.length - 1); this.seek(this.sc.scenes[i].t0 + 1); }

    /* ---------- מסך מלא: אמיתי כשנתמך, מדומה (CSS) ב־iPhone ---------- */
    isFs() { return document.fullscreenElement === this.root || document.webkitFullscreenElement === this.root || this.root.classList.contains('km-pseudo'); }
    toggleFs() {
      const r = this.root;
      if (r.classList.contains('km-pseudo')) { r.classList.remove('km-pseudo'); document.documentElement.classList.remove('km-lock'); this.fsIcon(); return; }
      if (document.fullscreenElement || document.webkitFullscreenElement) { (document.exitFullscreen || document.webkitExitFullscreen).call(document); return; }
      const req = r.requestFullscreen || r.webkitRequestFullscreen;
      if (req && (document.fullscreenEnabled || document.webkitFullscreenEnabled)) {
        Promise.resolve(req.call(r)).then(() => { try { screen.orientation.lock('landscape').catch(() => {}); } catch (e) { /* לא נתמך */ } }).catch(() => this.pseudoFs());
      } else this.pseudoFs();
    }
    pseudoFs() { this.root.classList.add('km-pseudo'); document.documentElement.classList.add('km-lock'); this.fsIcon(); this.root.focus && this.root.setAttribute('tabindex', '-1'); this.root.focus(); }
    fsIcon() {
      const on = this.isFs();
      this.fsBtn.innerHTML = on ? SVGI.fsx : SVGI.fs;
      this.fsBtn.setAttribute('aria-label', on ? 'יציאה ממסך מלא' : 'מסך מלא');
      this.root.classList.toggle('km-isfs', on);
    }

    /* ---------- ציור פריים ---------- */
    sceneAt(t) { const S = this.sc.scenes; let i = S.length - 1; while (i > 0 && S[i].t0 > t) i--; return i; }
    render() {
      const S = this.sc.scenes, i = this.sceneAt(this.t), s = S[i], lt = this.t - s.t0, p = this.player;
      if (i !== this.si) this.enter(i);

      /* תנוחה */
      if (p.mode !== s.mode) { p.mode = s.mode; p.idx = -1; }
      const T = p.total();
      p.time = (s.off + lt * s.speed) % T;
      p.update(0);

      /* מצלמה: זום עדין, מעוגן לרצפה */
      const k = ease(clamp(lt / s.dur, 0, 1));
      const z = lerp(s.zoom[0], s.zoom[1], k), B = this.base;
      const fx = this.focus[0], fy = this.focus[1];
      this.vb = [fx - (fx - B[0]) * z, fy - (fy - B[1]) * z, B[2] * z, B[3] * z];
      const vbs = this.vb.map((n) => n.toFixed(1)).join(' ');
      this.fig.setAttribute('viewBox', vbs);
      this.anno.setAttribute('viewBox', vbs);

      /* מעבר: דהייה לשחור בקצוות הפרקים */
      const F = 280;
      let fade = 0;
      if (lt < F) fade = 1 - lt / F;
      if (s.dur - lt < F && i < S.length - 1) fade = Math.max(fade, 1 - (s.dur - lt) / F);
      if (i === 0) fade = Math.max(fade, lt < 500 ? 1 - lt / 500 : 0);
      this.fade.style.opacity = fade.toFixed(3);

      /* כתוביות */
      const lo = s.lower ? s.lower(lt, p) : null;
      const key = lo ? s.key + ':' + lo.k : null;
      if (key !== this.lowKey) {
        this.lowKey = key;
        if (lo) {
          this.lower.querySelector('.km-kick').textContent = lo.kick;
          this.lower.querySelector('.km-text').textContent = lo.text;
          const sub = this.lower.querySelector('.km-sub');
          sub.textContent = lo.sub || '';
          sub.hidden = !lo.sub;
          this.lower.classList.remove('in'); void this.lower.offsetWidth; this.lower.classList.add('in');
          this.live.textContent = KX.t(lo.kick) + ': ' + KX.t(lo.text);
        }
        this.lower.classList.toggle('show', !!lo);
      } else if (lo && lo.sub) {
        const sub = this.lower.querySelector('.km-sub');
        if (sub.textContent !== lo.sub) sub.textContent = lo.sub;
      }

      /* מונה חזרות / שעון החזקה */
      if (s.counter) {
        const done = (lt * s.speed) / (this.sc.Tg || 1);
        this.count.textContent = this.sc.hold ? '⏱ ' + fmt(lt) : 'חזרה ' + (Math.floor(done) + 1);
      }

      /* סימון שרירים */
      this.drawMuscles(s);

      /* פס התקדמות */
      S.forEach((sc, j) => { const v = j < i ? 1 : j > i ? 0 : lt / sc.dur; this.segs[j].style.transform = `scaleX(${v.toFixed(4)})`; });
      const pct = (this.t / this.sc.total) * 100;
      this.knob.style.left = pct.toFixed(2) + '%';
      this.track.setAttribute('aria-valuenow', String(Math.round(this.t / 1000)));
      this.track.setAttribute('aria-valuetext', `${fmt(this.t)} מתוך ${fmt(this.sc.total)} · ${s.name}`);
      this.time.textContent = fmt(this.t) + ' / ' + fmt(this.sc.total);
    }
    enter(i) {
      const s = this.sc.scenes[i];
      this.si = i;
      this.lowKey = undefined;
      const r = this.root;
      r.dataset.scene = s.key;
      r.classList.toggle('km-bad', s.grade === 'bad');
      r.classList.toggle('km-good', s.grade === 'good');
      r.classList.toggle('km-dim', !!s.dim || !!s.card);
      this.fig.classList.toggle('km-mirror', !!s.mirror);
      this.chip.textContent = s.chip || '';
      this.chip.className = 'km-chip' + (s.chip ? ' show' : '') + (s.tone === 'bad' ? ' bad' : '');
      this.count.classList.toggle('show', !!s.counter);
      this.card.innerHTML = s.card ? `<div class="km-card-in">${s.card()}</div>` : '';
      this.card.classList.toggle('show', !!s.card);
      this.chapBtns.forEach((b, j) => b.setAttribute('aria-current', j === i ? 'step' : 'false'));
      const cb = this.chapBtns[i];
      if (cb && this.chapters.scrollWidth > this.chapters.clientWidth) this.chapters.scrollTo({ left: cb.offsetLeft - this.chapters.clientWidth / 2 + cb.offsetWidth / 2, behavior: 'smooth' });
      /* הכרזה לקורא מסך — אחרי שהכרטיס תורגם (אם צריך), עם רווח בין החלקים */
      if (!s.lower) setTimeout(() => {
        if (this.si !== i) return;
        const parts = [];
        const w = document.createTreeWalker(this.card, NodeFilter.SHOW_TEXT);
        let n;
        while ((n = w.nextNode())) { const v = n.nodeValue.trim(); if (v) parts.push(v); }
        this.live.textContent = s.card ? parts.join(' ').slice(0, 240) : KX.t(s.name);
      }, 0);
      this.layout = null; /* תוויות השרירים יסודרו מחדש לפי התנוחה בפרק החדש */
    }
    /* נקודות מהבהבות על השרירים + תוויות עם קו מוביל.
       גוף אופקי (שכיבות, פלאנק) — שורת תוויות מעל הגוף; גוף זקוף (מתח, סקוואט) — עמודות משני הצדדים */
    drawMuscles(s) {
      const sk = this.player.sk;
      if (!this.spots) {
        this.spots = muscleSpots(this.ex).spots;
        this.anno.innerHTML = this.spots.map(() => '<g class="km-mp"><line class="km-ml"/><circle class="km-ring"/><circle class="km-pt"/></g>').join('');
        this.labelsEl.innerHTML = this.spots.map((sp) => `<span class="km-lab">${esc(sp.names.join(' · '))}</span>`).join('');
        this.mpEls = Array.from(this.anno.querySelectorAll('.km-mp'));
        this.labEls = Array.from(this.labelsEl.querySelectorAll('.km-lab'));
      }
      const on = !!s.points && !!sk;
      this.anno.classList.toggle('show', on);
      this.labelsEl.classList.toggle('show', on && !!s.labels);
      if (!on) return;
      const vb = this.vb, cxm = vb[0] + vb[2] / 2;
      const mx = s.mirror ? (x) => 2 * cxm - x : (x) => x;
      /* קואורדינטות מסך באחוזים */
      const P = (q) => [((mx(q[0]) - vb[0]) / vb[2]) * 100, ((q[1] - vb[1]) / vb[3]) * 100];
      const pts = this.spots.map((sp) => P(anchorPoint(sk, sp.seg, sp.u)));
      const body = [sk.head, sk.S, sk.hip, sk.E, sk.W, sk.K, sk.A].filter(Boolean).map(P);
      const bx0 = Math.min(...body.map((q) => q[0])), bx1 = Math.max(...body.map((q) => q[0]));
      const by0 = Math.min(...body.map((q) => q[1])), by1 = Math.max(...body.map((q) => q[1]));
      if (!this.layout) {
        const sw = this.screen.clientWidth || 1, shh = this.screen.clientHeight || 1;
        this.layout = {
          row: (bx1 - bx0) * sw >= (by1 - by0) * shh,
          size: this.labEls.map((l) => [(l.offsetWidth / sw) * 100, (l.offsetHeight / shh) * 100]),
        };
      }
      const L = this.layout, n = pts.length, lab = pts.map((q) => q.slice());
      if (s.labels && n) {
        const pad = 1.4;
        if (L.row) {
          /* שורה (או שתיים) מעל הגוף, ממוינת לפי מיקום הנקודה */
          const order = pts.map((q, j) => j).sort((a, b) => pts[a][0] - pts[b][0]);
          const tw = L.size.reduce((a, z) => a + z[0] + pad, 0);
          const two = tw > 88;
          const h = Math.max(...L.size.map((z) => z[1]));
          const y1 = clamp(by0 - 9, 20 + (two ? h + 1.5 : 0), 60);
          const rows = two ? [order.filter((j, i) => i % 2 === 0), order.filter((j, i) => i % 2 === 1)] : [order];
          rows.forEach((row, ri) => {
            let prev = -Infinity;
            row.forEach((j) => { const w = L.size[j][0]; let x = Math.max(pts[j][0], prev + w / 2 + pad); lab[j] = [x, ri ? y1 - h - 1.5 : y1]; prev = x + w / 2; });
            const last = row[row.length - 1], over = lab[last][0] + L.size[last][0] / 2 - 97;
            if (over > 0) row.forEach((j) => (lab[j][0] -= over));
            const first = row[0], under = 3 - (lab[first][0] - L.size[first][0] / 2);
            if (under > 0) row.forEach((j) => (lab[j][0] += under));
          });
        } else {
          /* עמודות: שמאל/ימין לפי צד הנקודה ביחס למרכז הגוף */
          const cx = (bx0 + bx1) / 2;
          [pts.map((q, j) => j).filter((j) => pts[j][0] <= cx), pts.map((q, j) => j).filter((j) => pts[j][0] > cx)].forEach((col, side) => {
            col.sort((a, b) => pts[a][1] - pts[b][1]);
            let prev = -Infinity;
            col.forEach((j) => {
              const [w, h] = L.size[j];
              const x = side ? Math.min(97 - w / 2, bx1 + 6 + w / 2) : Math.max(3 + w / 2, bx0 - 6 - w / 2);
              const y = Math.max(clamp(pts[j][1], 18, 66), prev + h + pad);
              lab[j] = [x, y]; prev = y;
            });
            const lj = col[col.length - 1];
            if (lj != null && lab[lj][1] > 66) { const d = lab[lj][1] - 66; col.forEach((j) => (lab[j][1] -= d)); }
          });
        }
      }
      const toVb = (q) => [vb[0] + (q[0] / 100) * vb[2], vb[1] + (q[1] / 100) * vb[3]];
      const r = vb[2] * 0.0105;
      pts.forEach((q, j) => {
        const a = toVb(q), b = toVb(lab[j]);
        const [ln, ring, pt] = this.mpEls[j].children;
        ln.setAttribute('x1', a[0].toFixed(1)); ln.setAttribute('y1', a[1].toFixed(1));
        ln.setAttribute('x2', b[0].toFixed(1)); ln.setAttribute('y2', b[1].toFixed(1));
        ln.style.display = s.labels ? '' : 'none';
        ring.setAttribute('cx', a[0].toFixed(1)); ring.setAttribute('cy', a[1].toFixed(1)); ring.setAttribute('r', (r * 2.2).toFixed(1));
        pt.setAttribute('cx', a[0].toFixed(1)); pt.setAttribute('cy', a[1].toFixed(1)); pt.setAttribute('r', r.toFixed(1));
        const el = this.labEls[j];
        el.style.left = lab[j][0].toFixed(2) + '%';
        el.style.top = lab[j][1].toFixed(2) + '%';
      });
    }
    destroy() {
      this.pause();
      if (this.root.classList.contains('km-pseudo')) document.documentElement.classList.remove('km-lock');
      if (document.fullscreenElement === this.root && document.exitFullscreen) document.exitFullscreen().catch(() => {});
      this.ro.disconnect();
      document.removeEventListener('fullscreenchange', this.onFs);
      document.removeEventListener('webkitfullscreenchange', this.onFs);
      document.removeEventListener('visibilitychange', this.onVis);
      this.root.remove();
    }
  }

  /* תמונת שער לכרטיס: המדריך בתנוחה מאמצע התרגיל */
  function poster(svg, ex) {
    svg.style.setProperty('--hl', KX.cats[ex.cat].color);
    const p = new KX.fig.Player(svg, ex, { fit: 16 / 9 });
    p.showFrame(Math.min(1, p.seq.length - 1));
    return p;
  }
  /* אורך הסרטון (לתצוגה בכרטיס) בלי לבנות נגן */
  function duration(ex, o) {
    const fake = { good: ex.anim.frames(), bad: ex.anim.bad ? ex.anim.bad() : null };
    fake.seq = fake.good; fake.idx = 0;
    return script(ex, fake, o).total;
  }

  /* תווית המדריך בפינת הסרטון ובכרטיסים: האות הראשונה + השם, בצבע הזהות */
  function brand(id, cls) {
    const c = KX.coaches[id] || KX.coaches.stheni;
    return `<span class="${cls} coach-brand" style="--coach:${c.color}" aria-hidden="true" data-no-i18n><i>${c.name[0]}</i>${c.name}</span>`;
  }

  KX.kalo = { Movie, poster, duration, fmt, muscleSpots, brand };
})();
