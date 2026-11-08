/* KALOS — ליבה משותפת: אחסון מקומי, אירועים, צליל, קול, נעילת מסך, עזרי ממשק
   נטען אחרי builder.js ולפני כל המודולים ו־app.js */
(function () {
  'use strict';
  const KX = window.KX;

  /* ---------- UI helpers ---------- */
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icon = (id) => `<svg class="ico" aria-hidden="true"><use href="#${id}"/></svg>`;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let toastT;
  function toast(msg, ms) {
    const t = $('#toast'); if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.remove('show'), ms || 2600);
  }
  function makeFig(svg, ex, opts) {
    svg.style.setProperty('--hl', KX.cats[ex.cat].color);
    return new KX.fig.Player(svg, ex, Object.assign({ fit: 1.45 }, opts));
  }
  KX.ui = { $, $$, esc, icon, toast, reduce, makeFig, catColor: (c) => KX.cats[c].color, reveal: () => {} /* app.js מחליף */ };

  /* ---------- events ---------- */
  const bus = new EventTarget();
  KX.on = (type, fn) => bus.addEventListener(type, (e) => fn(e.detail));
  KX.emit = (type, detail) => bus.dispatchEvent(new CustomEvent(type, { detail }));

  /* ---------- dates ---------- */
  const pad = (n) => String(n).padStart(2, '0');
  const dk = (d) => { d = d ? new Date(d) : new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  const fromDk = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (k, n) => { const d = fromDk(k); d.setDate(d.getDate() + n); return dk(d); };
  const weekStart = (k) => { const d = fromDk(k); d.setDate(d.getDate() - d.getDay()); return dk(d); }; /* שבוע מתחיל ביום ראשון */
  KX.date = { dk, fromDk, addDays, weekStart, today: () => dk() };

  /* ---------- storage ---------- */
  const NS = 'kalos.';
  let memory = {}; /* fallback אם localStorage חסום */
  let canStore = true;
  try { localStorage.setItem(NS + '_t', '1'); localStorage.removeItem(NS + '_t'); } catch (_) { canStore = false; }
  const store = {
    ok: canStore,
    get(k, def) {
      try { const v = canStore ? localStorage.getItem(NS + k) : memory[k]; return v == null ? def : JSON.parse(v); } catch (_) { return def; }
    },
    set(k, v) {
      const s = JSON.stringify(v);
      if (canStore) { try { localStorage.setItem(NS + k, s); } catch (_) { memory[k] = s; } } else memory[k] = s;
      KX.emit('change', { key: k });
    },
    remove(k) { if (canStore) localStorage.removeItem(NS + k); delete memory[k]; KX.emit('change', { key: k }); },
    keys() {
      if (!canStore) return Object.keys(memory);
      const out = [];
      for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.indexOf(NS) === 0 && k !== NS + '_t') out.push(k.slice(NS.length)); }
      return out;
    },
  };
  KX.store = store;

  /* ---------- domain data ----------
     workouts : [{ id, ts, date:'YYYY-MM-DD', title, src:'quick'|'plan'|'manual'|'challenge'|'interval'|'test',
                   dur: sec, feel: 1..5|null, items: [{ ex|null, n, unit:'reps'|'sec', sets:[number] }] }]
     favs     : { ex: [id], prog: [id] }
     skills   : { [trackId]: number }   — כמה שלבים הושגו במסלול (0..steps.length), לפי KX.progressions
     tests    : [{ ts, date, push, pull, dip, squat, plank, bar:bool }]
     challenges: { [id]: { start:'YYYY-MM-DD', done:['YYYY-MM-DD', ...] } }   — done[i] = התאריך שבו הושלם יום i+1
     badges   : { [id]: ts }  — הישגים שנפתחו
     prefs    : { theme:'dark'|'light'|null, voice:bool, sound:bool } */
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const data = {
    workouts() { return store.get('workouts', []).slice().sort((a, b) => b.ts - a.ts); },
    addWorkout(w) {
      const list = store.get('workouts', []);
      const rec = Object.assign({ id: uid(), ts: Date.now(), feel: null, items: [], dur: 0 }, w);
      rec.date = rec.date || dk(rec.ts);
      list.push(rec);
      store.set('workouts', list);
      KX.emit('workout', rec);
      return rec;
    },
    removeWorkout(id) { store.set('workouts', store.get('workouts', []).filter((w) => w.id !== id)); },
    favs() { return Object.assign({ ex: [], prog: [] }, store.get('favs', {})); },
    isFav(type, id) { return data.favs()[type].indexOf(id) > -1; },
    toggleFav(type, id) {
      const f = data.favs(), a = f[type], i = a.indexOf(id);
      if (i > -1) a.splice(i, 1); else a.push(id);
      store.set('favs', f);
      KX.emit('fav', { type, id, on: i < 0 });
      return i < 0;
    },
    skills() { return store.get('skills', {}); },
    /* reached = מספר השלבים שהושגו במסלול (השלבים מושגים לפי הסדר) */
    setSkill(track, reached) {
      const s = data.skills(); s[track] = Math.max(0, reached); store.set('skills', s);
      KX.emit('skills', { track, reached: s[track] });
    },
    tests() { return store.get('tests', []).slice().sort((a, b) => a.ts - b.ts); },
    addTest(t) { const l = store.get('tests', []); const r = Object.assign({ ts: Date.now() }, t); r.date = r.date || dk(r.ts); l.push(r); store.set('tests', l); KX.emit('test', r); return r; },
    challenges() { return store.get('challenges', {}); },
    setChallenge(id, v) { const c = data.challenges(); if (v) c[id] = v; else delete c[id]; store.set('challenges', c); KX.emit('challenge', { id }); },
    prefs() { return Object.assign({ theme: null, voice: true, sound: true }, store.get('prefs', {})); },
    setPref(k, v) { const p = data.prefs(); p[k] = v; store.set('prefs', p); KX.emit('prefs', p); },

    /* ימים פעילים: אימונים + ימי אתגר שהושלמו */
    activeDays() {
      const s = new Set(data.workouts().map((w) => w.date));
      const ch = data.challenges();
      Object.keys(ch).forEach((id) => (ch[id].done || []).forEach((d) => s.add(d)));
      return s;
    },
    streak() {
      const days = data.activeDays(), today = dk();
      /* רצף ימים: נספר עד היום, או עד אתמול אם היום עוד לא התאמנו */
      let cur = days.has(today) ? today : addDays(today, -1), d = 0;
      while (days.has(cur)) { d++; cur = addDays(cur, -1); }
      /* רצף שבועות: שבועות ברצף עם 2+ ימים פעילים (השבוע הנוכחי נספר אם כבר עומד ביעד) */
      const per = {};
      days.forEach((k) => { const w = weekStart(k); per[w] = (per[w] || 0) + 1; });
      let wk = weekStart(today), w = 0;
      if (!(per[wk] >= 2)) wk = addDays(wk, -7);
      while (per[wk] >= 2) { w++; wk = addDays(wk, -7); }
      /* רצף ימים הטוב ביותר */
      const sorted = Array.from(days).sort();
      let best = 0, run = 0, prev = null;
      sorted.forEach((k) => { run = prev && addDays(prev, 1) === k ? run + 1 : 1; best = Math.max(best, run); prev = k; });
      return { days: d, weeks: w, best, activeToday: days.has(today) };
    },
    /* סך חזרות/שניות לתרגיל לאורך כל ההיסטוריה */
    totals() {
      const t = { reps: 0, sec: 0, sets: 0, dur: 0, byEx: {} };
      data.workouts().forEach((w) => {
        t.dur += w.dur || 0;
        (w.items || []).forEach((it) => {
          const sum = (it.sets || []).reduce((a, b) => a + (+b || 0), 0);
          t.sets += (it.sets || []).length;
          if (it.unit === 'sec') t.sec += sum; else t.reps += sum;
          if (it.ex) { const e = (t.byEx[it.ex] = t.byEx[it.ex] || { reps: 0, sec: 0, best: 0 }); e[it.unit === 'sec' ? 'sec' : 'reps'] += sum; e.best = Math.max(e.best, ...(it.sets || [0]).map(Number)); }
        });
      });
      return t;
    },
    exportAll() { const o = { app: 'kalos', v: 1, exported: new Date().toISOString(), data: {} }; store.keys().forEach((k) => (o.data[k] = store.get(k))); return o; },
    importAll(o) {
      if (!o || o.app !== 'kalos' || !o.data) throw new Error('bad file');
      Object.keys(o.data).forEach((k) => store.set(k, o.data[k]));
      KX.emit('import', {});
    },
    resetAll() { store.keys().forEach((k) => { if (canStore) localStorage.removeItem(NS + k); }); memory = {}; KX.emit('import', {}); },
  };
  KX.data = data;

  /* ---------- sound / voice / wake lock ---------- */
  let ac = null;
  function audio() {
    try { if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === 'suspended') ac.resume(); } catch (_) { ac = null; }
    return ac;
  }
  /* kind: 'tick' (קצר), 'go' (התחלה), 'done' (סיום — שלושה צלילים) */
  function beep(kind) {
    if (!data.prefs().sound) return;
    const a = audio(); if (!a) return;
    const seq = { tick: [[0, 660, 0.09]], go: [[0, 880, 0.14], [0.16, 1320, 0.22]], done: [[0, 880, 0.16], [0.22, 880, 0.16], [0.44, 1320, 0.3]] }[kind || 'done'];
    seq.forEach(([d, f, len]) => {
      const o = a.createOscillator(), g = a.createGain();
      o.frequency.value = f; o.connect(g); g.connect(a.destination);
      const t0 = a.currentTime + d;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.25, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + len);
      o.start(t0); o.stop(t0 + len + 0.02);
    });
    const active = !navigator.userActivation || navigator.userActivation.hasBeenActive;
    if (kind !== 'tick' && navigator.vibrate && active) navigator.vibrate(kind === 'go' ? 80 : [120, 80, 120]);
  }
  let heVoice;
  function findVoice() {
    if (!('speechSynthesis' in window)) return null;
    const vs = speechSynthesis.getVoices();
    heVoice = KX.isEn ? vs.find((v) => /^en[-_]US/i.test(v.lang)) || vs.find((v) => /^en/i.test(v.lang)) || null : vs.find((v) => /^he|^iw/i.test(v.lang)) || null;
    return heVoice;
  }
  if ('speechSynthesis' in window) { findVoice(); speechSynthesis.addEventListener && speechSynthesis.addEventListener('voiceschanged', findVoice); }
  function speak(text, opts) {
    if (!data.prefs().voice || !('speechSynthesis' in window)) return false;
    if (!heVoice && !findVoice()) return false; /* בלי קול עברי — לא מקריאים (קול אנגלי יעוות עברית) */
    if (!opts || !opts.queue) speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(KX.t ? KX.t(text) : text);
    u.voice = heVoice; u.lang = heVoice.lang; u.rate = 1.05;
    speechSynthesis.speak(u);
    return true;
  }
  let wl = null;
  async function wake(on) {
    try {
      if (on && 'wakeLock' in navigator && !wl) { wl = await navigator.wakeLock.request('screen'); wl.addEventListener('release', () => (wl = null)); }
      if (!on && wl) { await wl.release(); wl = null; }
    } catch (_) { wl = null; }
  }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && wake.want) wake(true); });
  const fmt = (s) => { s = Math.max(0, Math.round(s)); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60; return (h ? h + ':' + pad(m) : m) + ':' + pad(x); };
  const fmtDur = (s) => { const m = Math.round(s / 60); return m < 60 ? m + ' דק׳' : Math.floor(m / 60) + ' שע׳ ' + (m % 60 ? (m % 60) + ' דק׳' : ''); };
  KX.fx = {
    beep, speak, audio, fmt, fmtDur,
    hasVoice: () => !!(heVoice || findVoice()),
    wake: (on) => { wake.want = on; return wake(on); },
  };

  /* ---------- parse prescriptions like "4×8–12", "3×20–40 שנ׳", "10 דק׳", "5×1–3" ---------- */
  /* מינון בעברית: רצפים כמו "3×8–12" או "5–8" מבודדים משמאל לימין (LRI…PDI),
     אחרת הדפדפן מציג אותם הפוך ("12–8×3") בתוך טקסט מימין לשמאל */
  KX.bidi = (s) => String(s == null ? '' : s).replace(/\d+(?:\s*[×x–-]\s*\d+)+/g, (m) => '\u2066' + m + '\u2069');
  KX.parseRx = function (rx) {
    rx = String(rx || '');
    let sets = 1, rest = rx;
    const m = rx.match(/^\s*(\d+)(?:\s*[–-]\s*\d+)?\s*[×x]\s*(.+)$/); /* "4×8–12" או "5–8 × 5–10 שנ׳" */
    if (m) { sets = +m[1]; rest = m[2]; }
    const nums = (rest.match(/\d+/g) || []).map(Number);
    /* היחידה נקבעת לפי מה שצמוד למספר הראשון: "3–6 (שליליים 5 שנ׳)" = חזרות */
    const head = rest.match(/^\s*[\d–\-\s]+\s*(דק׳|דקות|שנ׳|שניות|״)?/);
    const u = head && head[1];
    if (u === 'דק׳' || u === 'דקות') return { sets, unit: 'sec', target: (nums[0] || 1) * 60, label: rest.trim() };
    if (u) return { sets, unit: 'sec', target: nums[0] || 20, label: rest.trim() };
    return { sets, unit: 'reps', target: nums[0] || null, label: rest.trim() };
  };
})();
