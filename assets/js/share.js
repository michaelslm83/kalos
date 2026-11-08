/* KALOS — שיתוף: קישור לתוכנית אישית, כרטיס תמונה של אימון, WhatsApp ושיתוף מערכת */
(function () {
  'use strict';
  const KX = window.KX;
  const { $, esc, icon, toast } = KX.ui;

  /* ---------- קידוד התוכנית בקישור ----------
     רק פרמטרי המחולל (לא נתונים אישיים): מטרה, ימים, זמן, ציוד ו־4 ערכי רמה */
  const GOALS = ['strength', 'muscle', 'skills', 'endurance'];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, Math.round(+v || 0)));
  function encodePlan(inp) {
    const o = { g: inp.goal, d: inp.days, t: inp.time, e: ['bar', 'dip', 'rings'].filter((k) => inp.equip[k]).map((k) => k[0]).join(''), p: inp.push, u: inp.pull, i: inp.dip, s: inp.squat };
    return btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function decodePlan(code) {
    try {
      const o = JSON.parse(atob(code.replace(/-/g, '+').replace(/_/g, '/')));
      if (GOALS.indexOf(o.g) < 0) return null;
      const e = String(o.e || '');
      return {
        goal: o.g, days: clamp(o.d, 2, 6), time: [30, 45, 60, 75].indexOf(+o.t) > -1 ? +o.t : 60,
        equip: { floor: true, bar: e.indexOf('b') > -1, dip: e.indexOf('d') > -1, rings: e.indexOf('r') > -1 },
        push: clamp(o.p, 0, 50), pull: clamp(o.u, 0, 20), dip: clamp(o.i, 0, 25), squat: clamp(o.s, 0, 100),
      };
    } catch (_) { return null; }
  }
  function readPlanFromUrl() {
    const m = location.hash.match(/^#plan=([A-Za-z0-9_-]{8,200})$/);
    if (!m) return null;
    const inp = decodePlan(m[1]);
    history.replaceState(null, '', location.pathname + location.search + '#builder');
    return inp;
  }
  const baseUrl = () => (location.protocol === 'file:' ? null : location.origin + location.pathname);

  /* ---------- גיליון שיתוף ---------- */
  let dlg, current = null;
  function sheet(opts) {
    if (!dlg) {
      dlg = document.createElement('dialog');
      dlg.className = 'modal sh';
      dlg.setAttribute('aria-labelledby', 'shT');
      document.body.appendChild(dlg);
      dlg.addEventListener('click', onClick);
      dlg.addEventListener('close', () => { if (current && current.imgUrl) URL.revokeObjectURL(current.imgUrl); current = null; });
    }
    current = opts;
    const canNative = !!navigator.share && (!opts.file || (navigator.canShare && navigator.canShare({ files: [opts.file] })));
    dlg.innerHTML = `<div class="sh-in">
      <div class="sh-h"><h3 id="shT">${esc(opts.title)}</h3><button class="icon-btn" data-s="close" aria-label="סגור">${icon('i-x')}</button></div>
      ${opts.imgUrl ? `<img class="sh-img" src="${opts.imgUrl}" alt="כרטיס סיכום האימון" />` : ''}
      ${opts.url ? `<div class="sh-link"><label class="sr-only" for="shUrl">קישור לשיתוף</label><input id="shUrl" readonly value="${esc(opts.url)}" /><button class="btn btn-ghost btn-sm" data-s="copy">${icon('i-link')} העתקה</button></div>` : ''}
      ${opts.note ? `<p class="sh-note">${esc(opts.note)}</p>` : ''}
      <div class="sh-acts">
        ${canNative ? `<button class="btn btn-accent btn-sm" data-s="native">${icon('i-share')} שיתוף…</button>` : ''}
        <a class="btn btn-sm sh-wa" href="https://wa.me/?text=${encodeURIComponent(opts.text + (opts.url ? '\n' + opts.url : ''))}" target="_blank" rel="noopener">${icon('i-wa')} WhatsApp</a>
        ${opts.imgUrl ? `<a class="btn btn-ghost btn-sm" href="${opts.imgUrl}" download="${esc(opts.fileName)}">${icon('i-download')} הורדת התמונה</a>` : ''}
        <button class="btn btn-ghost btn-sm" data-s="copytext">${icon('i-copy')} העתקת טקסט</button>
      </div>
    </div>`;
    if (!dlg.open) dlg.showModal();
  }
  function copy(txt, msg) {
    const done = () => toast(msg || 'הועתק ✓');
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(txt).then(done, fallback); else fallback();
    function fallback() { const ta = Object.assign(document.createElement('textarea'), { value: txt }); document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); done(); } catch (_) { toast('לא הצלחנו להעתיק'); } ta.remove(); }
  }
  function onClick(e) {
    if (e.target === dlg) { dlg.close(); return; }
    const b = e.target.closest('[data-s]'); if (!b || !current) return;
    const a = b.dataset.s;
    if (a === 'close') dlg.close();
    if (a === 'copy') { $('#shUrl').select(); copy(current.url, 'הקישור הועתק ✓'); }
    if (a === 'copytext') copy(current.text + (current.url ? '\n' + current.url : ''), 'הטקסט הועתק ✓');
    if (a === 'native') {
      const data = { title: current.title, text: current.text };
      if (current.url) data.url = current.url;
      if (current.file) data.files = [current.file];
      navigator.share(data).catch((err) => { if (err && err.name !== 'AbortError') toast('השיתוף נכשל'); });
    }
  }

  /* ---------- שיתוף תוכנית ---------- */
  function plan(inp, p) {
    const base = baseUrl();
    const url = base ? base + '#plan=' + encodePlan(inp) : null;
    const text = `התוכנית שלי ב־KALOS: ${p.split} · מטרה: ${p.goal} · ${inp.days} אימונים בשבוע`;
    sheet({ title: 'שיתוף התוכנית', text, url, note: url ? 'מי שיפתח את הקישור יקבל את אותה תוכנית בדיוק. הקישור כולל רק את התשובות למחולל, בלי היומן שלכם.' : 'כדי לשתף קישור, פתחו את האתר דרך שרת (http). בינתיים אפשר להעתיק את הטקסט.' });
  }

  /* ---------- כרטיס תמונה של אימון ---------- */
  function wrap(ctx, text, maxW) {
    const words = String(text).split(' '), lines = [];
    let line = '';
    words.forEach((w) => { const t = line ? line + ' ' + w : w; if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; });
    if (line) lines.push(line);
    return lines;
  }
  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  async function card(rec) {
    const W = 1080, H = 1350, P = 84;
    try { await Promise.all(['900 64px Rubik', '800 64px Rubik', '500 32px Heebo', '700 32px Heebo'].map((f) => document.fonts.load(f))); } catch (_) { /* fonts optional */ }
    const cv = Object.assign(document.createElement('canvas'), { width: W, height: H });
    const ctx = cv.getContext('2d');
    /* באנגלית: מראה של כל הפריסה (שמאל↔ימין), והטקסט מצויר ישר ומתורגם */
    if (KX.isEn) {
      ctx.setTransform(-1, 0, 0, 1, W, 0);
      const ft = ctx.fillText.bind(ctx);
      ctx.fillText = (t, x, y) => {
        ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
        const a = ctx.textAlign; ctx.textAlign = a === 'right' ? 'left' : a === 'left' ? 'right' : a; ctx.direction = 'ltr';
        ft(KX.t(String(t)), W - x, y);
        ctx.restore();
      };
    }
    const DISP = 'Rubik, Heebo, "Segoe UI", sans-serif', BODY = 'Heebo, "Segoe UI", sans-serif';
    /* רקע */
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0d1218'); g.addColorStop(1, '#07090c');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const rg = ctx.createRadialGradient(W * 0.8, 120, 0, W * 0.8, 120, 700); rg.addColorStop(0, 'rgba(200,255,61,0.22)'); rg.addColorStop(1, 'rgba(200,255,61,0)');
    ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
    ctx.direction = 'rtl'; ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic';
    const R = W - P;
    /* לוגו */
    ctx.fillStyle = '#c8ff3d'; rr(ctx, R - 76, P, 76, 76, 20); ctx.fill();
    ctx.strokeStyle = '#0b1000'; ctx.fillStyle = '#0b1000'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    const lx = R - 76, ly = P, s = 76 / 32;
    ctx.beginPath(); ctx.arc(lx + 16 * s, ly + 6 * s, 3.4 * s, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); [[5, 11, 27, 11], [16, 9.5, 16, 18.5], [16, 18.5, 11, 27.5], [16, 18.5, 21, 27.5]].forEach(([a, b, c, d]) => { ctx.moveTo(lx + a * s, ly + b * s); ctx.lineTo(lx + c * s, ly + d * s); }); ctx.stroke();
    ctx.fillStyle = '#eef2f6'; ctx.font = `900 46px ${DISP}`; ctx.fillText('KALOS', R - 100, P + 46);
    ctx.fillStyle = '#95a1ae'; ctx.font = `500 26px ${BODY}`; ctx.fillText('קליסתניקס', R - 100, P + 78);
    /* כותרת */
    let y = P + 230;
    ctx.fillStyle = '#c8ff3d'; ctx.font = `700 30px ${BODY}`;
    ctx.fillText(KX.date.fromDk(rec.date).toLocaleDateString(KX.loc, { weekday: 'long', day: 'numeric', month: 'long' }), R, y);
    y += 92;
    ctx.fillStyle = '#ffffff'; ctx.font = `800 84px ${DISP}`;
    wrap(ctx, KX.t(rec.title || 'אימון'), W - 2 * P).slice(0, 2).forEach((ln) => { ctx.fillText(ln, R, y); y += 96; });
    /* מדדים */
    const items = rec.items || [];
    const sets = items.reduce((a, it) => a + it.sets.length, 0);
    const reps = items.filter((it) => it.unit !== 'sec').reduce((a, it) => a + it.sets.reduce((p, v) => p + v, 0), 0);
    const secs = items.filter((it) => it.unit === 'sec').reduce((a, it) => a + it.sets.reduce((p, v) => p + v, 0), 0);
    const stats = [[rec.dur ? KX.fx.fmt(rec.dur) : '—', 'זמן'], [String(sets), 'סטים'], reps || !secs ? [reps.toLocaleString(KX.loc), 'חזרות'] : [String(secs), 'שניות']];
    y += 10;
    const bw = (W - 2 * P - 2 * 24) / 3;
    stats.forEach(([v, l], i) => {
      const x = R - (i + 1) * bw - i * 24;
      ctx.fillStyle = 'rgba(255,255,255,0.06)'; rr(ctx, x, y, bw, 170, 28); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#ffffff'; ctx.font = `800 64px ${DISP}`; ctx.fillText(v, x + bw - 30, y + 92);
      ctx.fillStyle = '#95a1ae'; ctx.font = `500 28px ${BODY}`; ctx.fillText(l, x + bw - 30, y + 140);
    });
    y += 250;
    /* תרגילים */
    const list = items.slice(0, 6);
    list.forEach((it) => {
      const c = it.ex && KX.exMap[it.ex] ? KX.cats[KX.exMap[it.ex].cat].color : '#c8ff3d';
      ctx.fillStyle = c; ctx.beginPath(); ctx.arc(R - 10, y - 12, 9, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#eef2f6'; ctx.font = `700 36px ${BODY}`;
      ctx.fillText(it.n, R - 36, y);
      ctx.textAlign = 'left'; ctx.direction = 'ltr';
      ctx.fillStyle = '#c7d0d8'; ctx.font = `500 32px ${BODY}`;
      ctx.fillText(it.sets.join(' · ') + (it.unit === 'sec' ? ' s' : ''), P, y);
      ctx.textAlign = 'right'; ctx.direction = 'rtl';
      y += 72;
    });
    if (items.length > list.length) { ctx.fillStyle = '#95a1ae'; ctx.font = `500 28px ${BODY}`; ctx.fillText(`ועוד ${items.length - list.length} תרגילים`, R, y); }
    /* רצף + פוטר */
    const st = KX.data.streak();
    ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fillRect(P, H - P - 70, W - 2 * P, 2);
    ctx.font = `700 32px ${BODY}`;
    if (st.days >= 2) { ctx.fillStyle = '#ff9a6b'; ctx.fillText(`🔥 רצף של ${st.days} ימים`, R, H - P); }
    ctx.textAlign = 'left'; ctx.direction = 'ltr';
    ctx.fillStyle = '#95a1ae'; ctx.font = `500 28px ${BODY}`; ctx.fillText('KALOS · bodyweight training', P, H - P);
    return new Promise((res) => cv.toBlob(res, 'image/png'));
  }
  async function workout(rec) {
    if (!rec) return;
    toast('מכין את כרטיס האימון…', 1500);
    let blob = null;
    try { blob = await card(rec); } catch (_) { blob = null; }
    const name = `kalos-${rec.date}.png`;
    const file = blob && typeof File === 'function' ? new File([blob], name, { type: 'image/png' }) : null;
    const items = rec.items || [];
    const text = `סיימתי אימון ב־KALOS 💪 ${rec.title || ''}\n` + items.slice(0, 6).map((it) => `• ${it.n}: ${it.sets.join(', ')}${it.unit === 'sec' ? ' שנ׳' : ''}`).join('\n');
    sheet({ title: 'שיתוף האימון', text, url: baseUrl(), file, imgUrl: blob ? URL.createObjectURL(blob) : null, fileName: name });
  }

  KX.share = { plan, workout, readPlanFromUrl, encodePlan, decodePlan };
})();
