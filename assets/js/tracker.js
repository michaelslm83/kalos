/* KALOS — "האימון שלי": יומן, רצפים, לוח חודשי, גרפים, הישגים, מועדפים, גיבוי; וגם אתגרים ומנוע ההישגים */
(function () {
  'use strict';
  const KX = window.KX;
  const { $, $$, esc, icon, toast } = KX.ui;
  const D = KX.data, dt = KX.date;
  const HE_MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
  const HE_DAYS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];
  const FEEL = ['', '😮‍💨', '😓', '🙂', '😄', '🔥'];
  const SRC = { quick: 'מודרך', plan: 'מהתוכנית', manual: 'ידני', challenge: 'אתגר', interval: 'אינטרוולים', test: 'מבחן' };
  const nf = (n) => Math.round(n).toLocaleString('he-IL');
  const shortDate = (k) => { const d = dt.fromDk(k); return d.getDate() + '/' + (d.getMonth() + 1); };
  const longDate = (k) => dt.fromDk(k).toLocaleDateString('he-IL', { weekday: 'short', day: 'numeric', month: 'short' });
  const exName = (id) => (KX.exMap[id] ? KX.exMap[id].name : id);
  const setsOf = (w) => (w.items || []).reduce((a, it) => a + (it.sets || []).length, 0);
  const repsOf = (w) => (w.items || []).filter((it) => it.unit !== 'sec').reduce((a, it) => a + it.sets.reduce((p, v) => p + (+v || 0), 0), 0);

  /* ================= הישגים ================= */
  function bestWeeks() {
    const per = {};
    D.activeDays().forEach((k) => { const w = dt.weekStart(k); per[w] = (per[w] || 0) + 1; });
    const weeks = Object.keys(per).filter((w) => per[w] >= 2).sort();
    let best = 0, run = 0, prev = null;
    weeks.forEach((w) => { run = prev && dt.addDays(prev, 7) === w ? run + 1 : 1; best = Math.max(best, run); prev = w; });
    return best;
  }
  function ctx() {
    const skills = D.skills(), ch = D.challenges();
    return {
      workouts: D.workouts(), totals: D.totals(), streak: D.streak(), bestWeeks: bestWeeks(), tests: D.tests(),
      challengesDone: KX.challenges.filter((c) => ch[c.id] && (ch[c.id].done || []).length >= c.days).length,
      skillSteps: Object.keys(skills).reduce((a, k) => a + (+skills[k] || 0), 0),
      fullBranches: KX.progressions.filter((p) => (skills[p.id] || 0) >= p.steps.length).length,
    };
  }
  function evalBadges(silent) {
    const c = ctx(), got = KX.store.get('badges', {});
    const fresh = [];
    KX.badges.forEach((b) => { if (!got[b.id] && b.check(c) >= 1) { got[b.id] = Date.now(); fresh.push(b); } });
    if (fresh.length) {
      KX.store.set('badges', got);
      if (!silent) fresh.forEach((b, i) => setTimeout(() => toast(`${b.ic} הישג חדש: ${b.n}`, 3400), 900 + i * 3600));
    }
    return { c, got };
  }

  /* ================= אתגרים (#challengesMount) ================= */
  function chState(ch) {
    const st = D.challenges()[ch.id];
    if (!st) return null;
    const done = st.done || [];
    const next = done.length + 1;
    return { st, done, next, complete: done.length >= ch.days, today: done[done.length - 1] === dt.today(), spec: next <= ch.days ? ch.day(next) : null };
  }
  function specText(ch, spec) {
    if (!spec) return '';
    if (spec.rest) return 'יום מנוחה';
    if (spec.workout) return 'אימון בטן מודרך של 15 דקות';
    return `${spec.total} ${spec.unit === 'sec' ? 'שניות' : 'חזרות'} ${exName(spec.ex)}`;
  }
  function markDone(ch, opts) {
    const s = D.challenges()[ch.id]; if (!s) return;
    if ((s.done || []).slice(-1)[0] === dt.today()) return;
    const no = s.done.length + 1, spec = ch.day(no);
    s.done = (s.done || []).concat(dt.today());
    D.setChallenge(ch.id, s);
    /* סימון ידני של יום חזרות/החזקה נרשם גם ביומן, כדי שייספר בסיכומים ובהישגים */
    if (opts && opts.log && spec && spec.ex) D.addWorkout({ title: ch.title + ' · יום ' + no, src: 'challenge', meta: { ch: ch.id, day: no }, dur: 0, items: [{ ex: spec.ex, n: exName(spec.ex), unit: spec.unit, sets: [spec.total] }] });
    toast(s.done.length >= ch.days ? `🥇 השלמתם את "${ch.title}"!` : `יום ${no} הושלם ✓`);
  }
  function renderChallenges() {
    const m = $('#challengesMount'); if (!m) return;
    m.innerHTML = `
      <div class="ch-head"><h3>${icon('i-flag')} אתגרים</h3><p>יעד קטן כל יום. ההתקדמות נשמרת ונספרת ברצף הימים שלכם.</p></div>
      <div class="ch-grid">${KX.challenges.map((ch) => {
        const s = chState(ch);
        const cells = Array.from({ length: ch.days }, (_, i) => {
          const d = i + 1, spec = ch.day(d), done = s && i < s.done.length, isNext = s && !s.complete && d === s.next;
          return `<i class="${done ? 'done' : ''}${isNext ? ' next' : ''}${spec.rest ? ' rest' : ''}" title="יום ${d}: ${esc(specText(ch, spec))}${done ? ' ✓' : ''}"></i>`;
        }).join('');
        let body;
        if (!s) body = `<p class="ch-desc">${esc(ch.desc)}</p>${ch.needs ? `<p class="ch-needs">${icon('i-bar')} דרוש: ${esc(ch.needs)}</p>` : ''}<button class="btn btn-ghost btn-sm" data-ch-join="${ch.id}">${icon('i-plus')} הצטרפו לאתגר</button>`;
        else if (s.complete) body = `<p class="ch-win">🥇 השלמתם את כל ${ch.days} הימים!</p><button class="btn btn-ghost btn-sm" data-ch-restart="${ch.id}">${icon('i-refresh')} מתחילים שוב</button>`;
        else if (s.today) body = `<p class="ch-today ok">${icon('i-check')} היום בוצע. מחר: יום ${s.next} · ${esc(specText(ch, s.spec))}</p>`;
        else body = `<p class="ch-today"><small>היום · יום ${s.next} מתוך ${ch.days}</small><b>${esc(specText(ch, s.spec))}</b></p>
          <div class="ch-acts">${s.spec.rest ? `<button class="btn btn-ghost btn-sm" data-ch-done="${ch.id}">${icon('i-check')} סמנו יום מנוחה</button>`
            : `<button class="btn btn-accent btn-sm" data-ch-go="${ch.id}">${icon('i-play')} בצעו מודרך</button><button class="btn btn-ghost btn-sm" data-ch-done="${ch.id}">${icon('i-check')} כבר ביצעתי</button>`}</div>`;
        return `<article class="ch${s ? ' on' : ''}" style="--c:${ch.color}">
          <div class="ch-top"><h4>${esc(ch.title)}</h4>${s ? `<span class="ch-pct">${s.done.length}/${ch.days}</span>` : `<span class="tag">${ch.days} ימים</span>`}</div>
          <div class="ch-cells" aria-label="${s ? `הושלמו ${s.done.length} מתוך ${ch.days} ימים` : `${ch.days} ימים`}">${cells}</div>
          ${body}
          ${s && !s.complete ? `<button class="ch-leave" data-ch-leave="${ch.id}">עזיבת האתגר</button>` : ''}
        </article>`;
      }).join('')}</div>`;
  }
  document.addEventListener('click', (e) => {
    const t = (a) => e.target.closest('[' + a + ']');
    let b;
    if ((b = t('data-ch-join')) || (b = t('data-ch-restart'))) {
      const id = b.dataset.chJoin || b.dataset.chRestart;
      D.setChallenge(id, { start: dt.today(), done: [] });
      toast('הצטרפתם! יום 1 מחכה לכם 💪');
    } else if ((b = t('data-ch-done'))) {
      const ch = KX.challengeMap[b.dataset.chDone], s = chState(ch);
      markDone(ch, { log: s && s.spec && !s.spec.rest && !s.spec.workout });
    } else if ((b = t('data-ch-go'))) {
      const ch = KX.challengeMap[b.dataset.chGo], s = chState(ch);
      if (s && s.spec && KX.workout) KX.workout.startChallenge(ch, s.next, s.spec, () => markDone(ch));
    } else if ((b = t('data-ch-leave'))) {
      if (b.dataset.sure) { D.setChallenge(b.dataset.chLeave, null); toast('עזבתם את האתגר'); }
      else { b.dataset.sure = '1'; b.textContent = 'בטוחים? ההתקדמות תימחק. לחצו שוב'; setTimeout(() => { if (b.isConnected) { delete b.dataset.sure; b.textContent = 'עזיבת האתגר'; } }, 4000); }
    }
  });

  /* ================= גרפים ================= */
  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  const isLight = () => document.documentElement.dataset.theme === 'light';
  const chartColor = () => (isLight() ? '#5f8f00' : '#c8ff3d');
  const RAMP = { dark: ['#4a5e22', '#76a02a', '#a3d134', '#c8ff3d'], light: ['#94bf50', '#74a31c', '#568500', '#3a5c00'] }; /* אומתו ב־validate_palette */
  function niceMax(v) {
    if (v <= 5) return 5;
    const p = Math.pow(10, Math.floor(Math.log10(v))), n = v / p;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
  }
  const NS = 'http://www.w3.org/2000/svg';
  const el = (tag, attrs, parent) => { const n = document.createElementNS(NS, tag); Object.keys(attrs || {}).forEach((k) => n.setAttribute(k, attrs[k])); if (parent) parent.appendChild(n); return n; };
  function tipShow(box, x, y, val, lab) {
    let tip = $('.ch-tip', box);
    if (!tip) { tip = document.createElement('div'); tip.className = 'ch-tip'; tip.setAttribute('role', 'status'); box.appendChild(tip); }
    tip.textContent = '';
    const b = document.createElement('b'); b.textContent = val;
    const s = document.createElement('span'); s.textContent = lab;
    tip.append(b, s);
    tip.hidden = false;
    const W = box.clientWidth;
    tip.style.left = Math.max(4, Math.min(W - tip.offsetWidth - 4, x - tip.offsetWidth / 2)) + 'px';
    tip.style.top = Math.max(0, y - tip.offsetHeight - 12) + 'px';
  }
  const tipHide = (box) => { const t = $('.ch-tip', box); if (t) t.hidden = true; };

  /* קו: הסט הטוב ביותר בכל יום אימון לתרגיל הנבחר */
  function seriesFor(ex) {
    const by = {};
    D.workouts().forEach((w) => (w.items || []).forEach((it) => {
      if (it.ex !== ex || !it.sets || !it.sets.length) return;
      const best = Math.max(...it.sets.map(Number));
      if (!by[w.date] || best > by[w.date].v) by[w.date] = { v: best, unit: it.unit };
    }));
    return Object.keys(by).sort().map((k) => ({ k, t: dt.fromDk(k).getTime(), v: by[k].v, unit: by[k].unit }));
  }
  function drawLine(box, pts, unitLbl) {
    box.innerHTML = '';
    const W = Math.max(280, box.clientWidth), H = 220, m = { t: 22, r: 40, b: 28, l: 14 };
    const svg = el('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, class: 'ch-svg', role: 'img', tabindex: '0', 'aria-label': `גרף התקדמות: ${pts.length} אימונים, אחרון ${pts[pts.length - 1].v} ${unitLbl}. חצים לניווט בין נקודות.` }, box);
    const c = chartColor(), grid = css('--line2') || 'rgba(127,127,127,.2)', muted = css('--muted');
    const max = niceMax(Math.max(...pts.map((p) => p.v)) * 1.1);
    const t0 = pts[0].t, t1 = pts[pts.length - 1].t, span = Math.max(1, t1 - t0);
    const X = (t) => (pts.length === 1 ? (m.l + W - m.r) / 2 : m.l + ((t - t0) / span) * (W - m.l - m.r));
    const Y = (v) => H - m.b - (v / max) * (H - m.t - m.b);
    [0, 0.5, 1].forEach((f) => {
      const v = max * f, y = Y(v);
      el('line', { x1: m.l, x2: W - m.r, y1: y, y2: y, stroke: grid, 'stroke-width': 1 }, svg);
      const tx = el('text', { x: W - m.r + 6, y: y + 4, fill: muted, 'font-size': 11, 'text-anchor': 'start', class: 'tnum' }, svg); tx.textContent = nf(v);
    });
    const lbl = (x, txt, anchor) => { const t = el('text', { x, y: H - 8, fill: muted, 'font-size': 11, 'text-anchor': anchor }, svg); t.textContent = txt; };
    lbl(X(t0), shortDate(pts[0].k), 'start');
    if (pts.length > 1) lbl(X(t1), shortDate(pts[pts.length - 1].k), 'end');
    const d = pts.map((p, i) => (i ? 'L' : 'M') + X(p.t).toFixed(1) + ' ' + Y(p.v).toFixed(1)).join(' ');
    if (pts.length > 1) {
      el('path', { d: d + ` L${X(t1).toFixed(1)} ${Y(0)} L${X(t0).toFixed(1)} ${Y(0)} Z`, fill: c, 'fill-opacity': 0.1, stroke: 'none' }, svg);
      el('path', { d, fill: 'none', stroke: c, 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, svg);
    }
    const surf = css('--surface') || '#11161d';
    /* תוויות סלקטיביות: הנקודה האחרונה + השיא (אם שונה) */
    const last = pts.length - 1;
    /* בשוויון — השיא הוא המאוחר ביותר; ותווית שיא קרובה מדי לתווית האחרונה לא מוצגת */
    let bi = 0; pts.forEach((p, i) => { if (p.v >= pts[bi].v) bi = i; });
    if (bi !== last && Math.abs(X(pts[bi].t) - X(pts[last].t)) < 48 && Math.abs(Y(pts[bi].v) - Y(pts[last].v)) < 20) bi = last;
    const mark = (i) => {
      el('circle', { cx: X(pts[i].t), cy: Y(pts[i].v), r: 5, fill: c, stroke: surf, 'stroke-width': 2 }, svg);
      const t = el('text', { x: X(pts[i].t), y: Y(pts[i].v) - 11, fill: css('--text'), 'font-size': 12, 'font-weight': 700, 'text-anchor': i === last && pts.length > 1 ? 'end' : 'middle' }, svg);
      t.textContent = (i === bi && i !== last ? 'שיא ' : '') + pts[i].v;
    };
    if (bi !== last) mark(bi);
    mark(last);
    /* crosshair + tooltip */
    const cross = el('line', { y1: m.t - 6, y2: H - m.b, stroke: muted, 'stroke-width': 1, opacity: 0 }, svg);
    const dot = el('circle', { r: 5, fill: c, stroke: surf, 'stroke-width': 2, opacity: 0 }, svg);
    let fi = last;
    const show = (i) => {
      fi = i; const p = pts[i], x = X(p.t), y = Y(p.v);
      cross.setAttribute('x1', x); cross.setAttribute('x2', x); cross.setAttribute('opacity', 0.6);
      dot.setAttribute('cx', x); dot.setAttribute('cy', y); dot.setAttribute('opacity', 1);
      tipShow(box, x, y, `${p.v} ${unitLbl}`, longDate(p.k));
    };
    const hide = () => { cross.setAttribute('opacity', 0); dot.setAttribute('opacity', 0); tipHide(box); };
    svg.addEventListener('pointermove', (e) => {
      const r = svg.getBoundingClientRect(), x = e.clientX - r.left;
      let bi2 = 0, bd = Infinity; pts.forEach((p, i) => { const dd = Math.abs(X(p.t) - x); if (dd < bd) { bd = dd; bi2 = i; } });
      show(bi2);
    });
    svg.addEventListener('pointerleave', hide);
    svg.addEventListener('focus', () => show(fi));
    svg.addEventListener('blur', hide);
    svg.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); show(Math.max(0, fi - 1)); }
      if (e.key === 'ArrowRight') { e.preventDefault(); show(Math.min(last, fi + 1)); }
    });
  }
  /* עמודות: סטים בכל אחד מ־8 השבועות האחרונים */
  function weekly() {
    const ws = dt.weekStart(dt.today()), weeks = [];
    for (let i = 7; i >= 0; i--) weeks.push({ k: dt.addDays(ws, -7 * i), v: 0 });
    const idx = {}; weeks.forEach((w, i) => (idx[w.k] = i));
    D.workouts().forEach((w) => { const i = idx[dt.weekStart(w.date)]; if (i != null) weeks[i].v += setsOf(w); });
    return weeks;
  }
  function drawBars(box, weeks) {
    box.innerHTML = '';
    const W = Math.max(280, box.clientWidth), H = 200, m = { t: 22, r: 40, b: 28, l: 8 };
    const svg = el('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, class: 'ch-svg', role: 'img', 'aria-label': 'סטים בכל שבוע, 8 השבועות האחרונים. ' + weeks.map((w) => shortDate(w.k) + ': ' + w.v).join(', ') }, box);
    const c = chartColor(), grid = css('--line2'), muted = css('--muted');
    const max = niceMax(Math.max(1, ...weeks.map((w) => w.v)) * 1.1);
    const band = (W - m.l - m.r) / weeks.length, bw = Math.min(24, band * 0.6);
    const Y = (v) => H - m.b - (v / max) * (H - m.t - m.b);
    [0, 0.5, 1].forEach((f) => {
      const y = Y(max * f);
      el('line', { x1: m.l, x2: W - m.r, y1: y, y2: y, stroke: grid, 'stroke-width': 1 }, svg);
      const t = el('text', { x: W - m.r + 6, y: y + 4, fill: muted, 'font-size': 11, class: 'tnum' }, svg); t.textContent = nf(max * f);
    });
    let mi = 0; weeks.forEach((w, i) => { if (w.v > weeks[mi].v) mi = i; });
    weeks.forEach((w, i) => {
      const cx = m.l + band * i + band / 2, x = cx - bw / 2, y = Y(w.v), h = Y(0) - y;
      const g = el('g', { class: 'ch-bar', tabindex: '0', role: 'img', 'aria-label': `שבוע ${shortDate(w.k)}: ${w.v} סטים` }, svg);
      el('rect', { x: cx - band / 2, y: m.t, width: band, height: H - m.t - m.b, fill: 'transparent' }, g); /* אזור פגיעה */
      if (w.v > 0) {
        const r = Math.min(4, h, bw / 2);
        el('path', { d: `M${x} ${Y(0)} V${y + r} Q${x} ${y} ${x + r} ${y} H${x + bw - r} Q${x + bw} ${y} ${x + bw} ${y + r} V${Y(0)} Z`, fill: c, opacity: i === weeks.length - 1 ? 1 : 0.72 }, g);
      }
      if ((i === weeks.length - 1 || i === mi) && w.v > 0) { const t = el('text', { x: cx, y: y - 7, fill: css('--text'), 'font-size': 12, 'font-weight': 700, 'text-anchor': 'middle' }, svg); t.textContent = w.v; }
      if (i % 2 === 1 || i === weeks.length - 1) { const t = el('text', { x: cx, y: H - 8, fill: muted, 'font-size': 11, 'text-anchor': 'middle' }, svg); t.textContent = i === weeks.length - 1 ? 'השבוע' : shortDate(w.k); }
      const sh = () => { g.classList.add('hot'); tipShow(box, cx, y, `${w.v} סטים`, `שבוע שמתחיל ב־${shortDate(w.k)}`); };
      const hd = () => { g.classList.remove('hot'); tipHide(box); };
      g.addEventListener('pointerenter', sh); g.addEventListener('pointerleave', hd); g.addEventListener('focus', sh); g.addEventListener('blur', hd);
    });
  }

  /* ================= לוח חודשי ================= */
  let calMonth = null; /* {y, m} */
  function calHTML() {
    const now = new Date();
    if (!calMonth) calMonth = { y: now.getFullYear(), m: now.getMonth() };
    const { y, m } = calMonth;
    const first = new Date(y, m, 1), days = new Date(y, m + 1, 0).getDate();
    const per = {};
    D.workouts().forEach((w) => { per[w.date] = (per[w.date] || 0) + Math.max(1, setsOf(w)); });
    const ch = D.challenges(), chDays = new Set();
    Object.keys(ch).forEach((id) => (ch[id].done || []).forEach((d) => chDays.add(d)));
    const lvl = (k) => { const s = per[k] || 0; if (!s) return chDays.has(k) ? 1 : 0; return s <= 5 ? 1 : s <= 12 ? 2 : s <= 20 ? 3 : 4; };
    const today = dt.today();
    let cells = '';
    for (let i = 0; i < first.getDay(); i++) cells += '<span class="cal-pad"></span>';
    let active = 0;
    for (let d = 1; d <= days; d++) {
      const k = dt.dk(new Date(y, m, d)), L = lvl(k);
      if (L) active++;
      const txt = per[k] ? `${per[k]} סטים` : chDays.has(k) ? 'יום אתגר' : 'ללא אימון';
      cells += `<span class="cal-d l${L}${k === today ? ' today' : ''}${k > today ? ' future' : ''}" title="${longDate(k)}: ${txt}" aria-label="${longDate(k)}: ${txt}">${d}</span>`;
    }
    const isCur = y === now.getFullYear() && m === now.getMonth();
    return `<div class="cal-head"><button class="icon-btn" data-cal="-1" aria-label="החודש הקודם">${icon('i-chev-r')}</button><b>${HE_MONTHS[m]} ${y}</b><button class="icon-btn" data-cal="1" aria-label="החודש הבא" ${isCur ? 'disabled' : ''}>${icon('i-chev-l')}</button></div>
      <div class="cal-grid" role="grid" aria-label="ימי אימון ב${HE_MONTHS[m]}">${HE_DAYS.map((d) => `<span class="cal-w">${d}</span>`).join('')}${cells}</div>
      <div class="cal-foot"><span>${active} ימים פעילים</span><span class="cal-leg" aria-label="מקרא: פחות עד יותר סטים">פחות <i class="l1"></i><i class="l2"></i><i class="l3"></i><i class="l4"></i> יותר</span></div>`;
  }

  /* ================= דשבורד ================= */
  let chartEx = null, showAll = false, tableView = { line: false, bars: false };
  function kpis(c) {
    const now = new Date(), mk = dt.dk(now).slice(0, 7);
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1), pk = dt.dk(prev).slice(0, 7);
    const thisM = c.workouts.filter((w) => w.date.slice(0, 7) === mk).length, lastM = c.workouts.filter((w) => w.date.slice(0, 7) === pk).length;
    const delta = thisM - lastM;
    const tile = (lab, val, sub, ic) => `<div class="kpi">${ic ? `<span class="kpi-ic">${icon(ic)}</span>` : ''}<span class="kpi-l">${lab}</span><b class="kpi-v">${val}</b>${sub ? `<span class="kpi-s">${sub}</span>` : ''}</div>`;
    return `<div class="me-kpis">
      ${tile('אימונים החודש', nf(thisM), lastM || thisM ? `<span class="${delta >= 0 ? 'up' : 'down'}">${delta >= 0 ? '▲' : '▼'} ${Math.abs(delta)}</span> לעומת ${HE_MONTHS[prev.getMonth()]}` : '')}
      ${tile('רצף ימים', nf(c.streak.days), c.streak.best ? `השיא: ${c.streak.best} ימים` : 'אימון היום מתחיל רצף', 'i-fire')}
      ${tile('רצף שבועות', nf(c.streak.weeks), 'שבועות עם 2+ אימונים', 'i-cal')}
      ${tile('סך חזרות', nf(c.totals.reps), c.totals.sec ? `+ ${KX.fx.fmtDur(c.totals.sec)} בהחזקות` : `${nf(c.totals.sets)} סטים`)}
      ${tile('זמן אימון', c.totals.dur >= 3600 ? (c.totals.dur / 3600).toLocaleString('he-IL', { maximumFractionDigits: 1 }) + ' שע׳' : Math.round(c.totals.dur / 60) + ' דק׳', `${nf(c.workouts.length)} אימונים ביומן`)}
    </div>`;
  }
  function historyHTML(ws) {
    if (!ws.length) return `<p class="me-empty-s">עוד אין אימונים ביומן.</p>`;
    const list = showAll ? ws : ws.slice(0, 6);
    return `<ul class="hist">${list.map((w) => `
      <li><details><summary>
        <span class="h-date">${longDate(w.date)}</span>
        <span class="h-t"><b>${esc(w.title || 'אימון')}</b><small>${SRC[w.src] || ''}${w.dur ? ' · ' + KX.fx.fmtDur(w.dur) : ''} · ${setsOf(w)} סטים${repsOf(w) ? ' · ' + nf(repsOf(w)) + ' חזרות' : ''}</small></span>
        ${w.feel ? `<span class="h-feel" aria-label="תחושה">${FEEL[w.feel]}</span>` : ''}
      </summary>
      <div class="h-body">${(w.items || []).length ? `<ul>${w.items.map((it) => `<li><span>${esc(it.n || exName(it.ex))}</span><span class="tnum">${it.sets.join(' · ')} ${it.unit === 'sec' ? 'שנ׳' : ''}</span></li>`).join('')}</ul>` : '<p>אין פירוט סטים.</p>'}
        <div class="h-acts">${KX.share ? `<button class="btn btn-ghost btn-sm" data-h-share="${w.id}">${icon('i-share')} שיתוף</button>` : ''}<button class="btn btn-ghost btn-sm h-del" data-h-del="${w.id}">${icon('i-trash')} מחיקה</button></div>
      </div></details></li>`).join('')}</ul>
      ${ws.length > 6 ? `<button class="me-more" data-h-all>${showAll ? 'הצג פחות' : `הצג את כל ${ws.length} האימונים`}</button>` : ''}`;
  }
  function badgesHTML(got, c) {
    const n = KX.badges.filter((b) => got[b.id]).length;
    return `<p class="bd-sum"><b>${n}</b> מתוך ${KX.badges.length} הישגים</p>
      <ul class="bd-grid">${KX.badges.map((b) => {
        const on = !!got[b.id], pr = on ? 1 : b.check(c);
        return `<li class="${on ? 'on' : ''}" title="${esc(b.d)}${on ? ' · נפתח ב־' + new Date(got[b.id]).toLocaleDateString('he-IL') : ''}">
          <span class="bd-ic" aria-hidden="true">${on ? b.ic : icon('i-lock')}</span><b>${esc(b.n)}</b><small>${esc(b.d)}</small>
          ${on ? '' : `<span class="bd-pr" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(pr * 100)}" aria-label="התקדמות"><i style="width:${Math.round(pr * 100)}%"></i></span>`}
        </li>`;
      }).join('')}</ul>`;
  }
  function favHTML() {
    const f = D.favs();
    if (!f.ex.length && !f.prog.length) return `<p class="me-empty-s">סמנו ☆ על תרגיל או תוכנית, והם יופיעו כאן.</p>`;
    return `${f.ex.length ? `<p class="fv-l">תרגילים</p><div class="fv-chips">${f.ex.filter((id) => KX.exMap[id]).map((id) => `<span class="fv"><button data-fv-ex="${id}" style="--c:${KX.cats[KX.exMap[id].cat].color}"><i></i>${esc(exName(id))}</button><button class="fv-go" data-fv-go="${id}" aria-label="אימון מודרך: ${esc(exName(id))}">${icon('i-play')}</button></span>`).join('')}</div>` : ''}
      ${f.prog.length ? `<p class="fv-l">תוכניות</p><div class="fv-chips">${f.prog.map((id) => { const i = KX.programs.findIndex((p) => p.id === id); return i < 0 ? '' : `<button class="fv-p" data-fv-prog="${i}">${esc(KX.programs[i].title)}</button>`; }).join('')}</div>` : ''}`;
  }
  function testHTML() {
    const ts = D.tests();
    if (!ts.length) return `<p class="me-empty-s">מבחן קצר של 5 תרגילים קובע את הרמה שלכם, ומאפשר לראות התקדמות בכל מבחן חוזר.</p><button class="btn btn-ghost btn-sm" data-open-test>${icon('i-test')} למבחן הכושר</button>`;
    const a = ts[ts.length - 1], b = ts[ts.length - 2];
    const rows = [['push', 'שכיבות סמיכה', ''], ['pull', 'מתח', ''], ['dip', 'מקבילים', ''], ['squat', 'סקוואט', ''], ['plank', 'פלאנק', 'שנ׳']].filter(([k]) => a[k] != null);
    const days = Math.round((Date.now() - a.ts) / 864e5);
    return `<p class="ts-when">מבחן אחרון: ${longDate(a.date)}${b ? ` · לעומת ${longDate(b.date)}` : ''}</p>
      <table class="ts"><tbody>${rows.map(([k, n, u]) => { const d = b && b[k] != null ? a[k] - b[k] : null; return `<tr><th scope="row">${n}</th><td class="tnum">${a[k]}${u ? ' ' + u : ''}</td><td>${d == null ? '' : `<span class="${d > 0 ? 'up' : d < 0 ? 'down' : ''}">${d > 0 ? '▲' : d < 0 ? '▼' : '='} ${Math.abs(d)}</span>`}</td></tr>`; }).join('')}</tbody></table>
      <button class="btn btn-ghost btn-sm" data-open-test>${icon('i-refresh')} ${days >= 28 ? 'הגיע הזמן למבחן חוזר' : 'מבחן חוזר'}</button>`;
  }
  function tableHTML(rows, h1, h2) {
    return `<table class="ch-table"><thead><tr><th scope="col">${h1}</th><th scope="col">${h2}</th></tr></thead><tbody>${rows.map((r) => `<tr><td>${r[0]}</td><td class="tnum">${r[1]}</td></tr>`).join('')}</tbody></table>`;
  }

  function render() {
    const m = $('#meMount'); if (!m) return;
    const { c, got } = evalBadges(true);
    const ws = c.workouts;
    const exIds = {};
    ws.forEach((w) => (w.items || []).forEach((it) => { if (it.ex && it.sets && it.sets.length) exIds[it.ex] = (exIds[it.ex] || 0) + 1; }));
    const exList = Object.keys(exIds).sort((a, b) => exIds[b] - exIds[a]);
    if (!chartEx || !exIds[chartEx]) chartEx = exList[0] || null;
    const series = chartEx ? seriesFor(chartEx) : [];
    const unitLbl = series[0] && series[0].unit === 'sec' ? 'שנ׳' : 'חזרות';
    const weeks = weekly();
    m.innerHTML = `
      <div class="me">
        ${ws.length ? '' : `<div class="me-empty">
          <div><h3>היומן שלכם מחכה לאימון הראשון</h3><p>התחילו אימון מודרך, עשו מבחן כושר או רשמו אימון שעשיתם. הכל נשמר כאן, רק בדפדפן שלכם.</p></div>
          <div class="me-empty-a"><a class="btn btn-accent btn-sm" href="#workouts">${icon('i-play')} לאימונים המודרכים</a><button class="btn btn-ghost btn-sm" data-open-test>${icon('i-test')} מבחן כושר</button><button class="btn btn-ghost btn-sm" data-log-open>${icon('i-plus')} רישום ידני</button></div>
        </div>`}
        ${kpis(c)}
        <div class="me-grid">
          <section class="me-card me-cal" aria-labelledby="meCalT"><h3 id="meCalT">${icon('i-cal')} לוח אימונים</h3><div id="meCal">${calHTML()}</div></section>
          <section class="me-card me-line" aria-labelledby="meLineT">
            <div class="me-ch"><h3 id="meLineT">${icon('i-chart')} התקדמות בתרגיל</h3>
              ${exList.length ? `<div class="me-ctl"><label class="sr-only" for="meEx">בחירת תרגיל</label><select id="meEx">${exList.map((id) => `<option value="${id}" ${id === chartEx ? 'selected' : ''}>${esc(exName(id))}</option>`).join('')}</select>
              <button class="me-tbl" data-tbl="line" aria-pressed="${tableView.line}">${tableView.line ? 'גרף' : 'טבלה'}</button></div>` : ''}</div>
            <p class="me-cap">${series.length ? `הסט הטוב ביותר בכל יום אימון (${unitLbl})` : ''}</p>
            <div class="ch-box" id="meLine">${!series.length ? '<p class="me-empty-s">כשתרשמו אימונים, תראו כאן את ההתקדמות בכל תרגיל.</p>' : series.length < 2 && !tableView.line ? `<p class="me-empty-s">יש אימון אחד עם ${esc(exName(chartEx))} (${series[0].v} ${unitLbl}). מהאימון השני והלאה יופיע כאן קו מגמה.</p>` : ''}</div>
          </section>
          <section class="me-card me-bars" aria-labelledby="meBarsT">
            <div class="me-ch"><h3 id="meBarsT">${icon('i-chart')} נפח שבועי</h3><button class="me-tbl" data-tbl="bars" aria-pressed="${tableView.bars}">${tableView.bars ? 'גרף' : 'טבלה'}</button></div>
            <p class="me-cap">סטים בכל שבוע · 8 השבועות האחרונים</p>
            <div class="ch-box" id="meBars"></div>
          </section>
          <section class="me-card me-badges" aria-labelledby="meBdT"><h3 id="meBdT">${icon('i-trophy')} הישגים</h3>${badgesHTML(got, c)}</section>
          <section class="me-card me-hist" aria-labelledby="meHT">
            <div class="me-ch"><h3 id="meHT">${icon('i-edit')} יומן אימונים</h3><button class="btn btn-ghost btn-sm" data-log-open>${icon('i-plus')} רישום ידני</button></div>
            ${historyHTML(ws)}
          </section>
          <section class="me-card me-fav" aria-labelledby="meFvT"><h3 id="meFvT">${icon('i-star')} מועדפים</h3>${favHTML()}</section>
          <section class="me-card me-test" aria-labelledby="meTsT"><h3 id="meTsT">${icon('i-test')} מבחן כושר</h3>${testHTML()}</section>
          <section class="me-card me-data" aria-labelledby="meDT"><h3 id="meDT">${icon('i-save')} הנתונים שלכם</h3>
            <p>הכל נשמר רק בדפדפן הזה, בלי חשבון ובלי שרת. כדי להעביר את הנתונים למכשיר אחר: גבו כאן לקובץ, ושחזרו אותו במכשיר השני.</p>
            ${KX.store.ok ? '' : '<p class="me-warn">הדפדפן חוסם שמירה מקומית (למשל בגלישה פרטית), ולכן הנתונים יימחקו כשתסגרו את הדף.</p>'}
            <div class="me-dacts"><button class="btn btn-ghost btn-sm" data-d="export">${icon('i-download')} גיבוי לקובץ</button><label class="btn btn-ghost btn-sm">${icon('i-upload')} שחזור מקובץ<input type="file" accept="application/json,.json" data-d="import" hidden /></label><button class="btn btn-ghost btn-sm me-reset" data-d="reset">${icon('i-trash')} מחיקת הכל</button></div>
          </section>
        </div>
      </div>`;
    const lineBox = $('#meLine'), barBox = $('#meBars');
    if (series.length >= 2 || (series.length && tableView.line)) {
      if (tableView.line) lineBox.innerHTML = tableHTML(series.slice().reverse().map((p) => [longDate(p.k), p.v]), 'תאריך', unitLbl);
      else drawLine(lineBox, series, unitLbl);
    }
    if (tableView.bars) barBox.innerHTML = tableHTML(weeks.slice().reverse().map((w) => ['שבוע ' + shortDate(w.k), w.v]), 'שבוע', 'סטים');
    else drawBars(barBox, weeks);
    m._series = series; m._unit = unitLbl; m._weeks = weeks;
  }
  function renderNav() {
    const s = D.streak(), b = $('#navStreak');
    if (!b) return;
    b.hidden = s.days < 1;
    $('span', b).textContent = s.days;
    b.title = `רצף של ${s.days} ימים`;
    $('#navMe').setAttribute('aria-label', 'האימון שלי' + (s.days ? ` · רצף של ${s.days} ימים` : ''));
  }

  /* ---------- אירועים בדשבורד ---------- */
  const mount = $('#meMount');
  if (mount) {
    mount.addEventListener('change', (e) => {
      if (e.target.id === 'meEx') { chartEx = e.target.value; render(); $('#meEx').focus(); }
      if (e.target.dataset.d === 'import') importFile(e.target.files[0]);
    });
    mount.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.cal) {
        const n = new Date(calMonth.y, calMonth.m + +b.dataset.cal, 1);
        calMonth = { y: n.getFullYear(), m: n.getMonth() };
        $('#meCal').innerHTML = calHTML();
        const f = $(`[data-cal="${b.dataset.cal}"]`, mount); if (f && !f.disabled) f.focus();
      } else if (b.dataset.tbl) { tableView[b.dataset.tbl] = !tableView[b.dataset.tbl]; render(); }
      else if (b.hasAttribute('data-h-all')) { showAll = !showAll; render(); }
      else if (b.dataset.hDel) {
        if (b.dataset.sure) { D.removeWorkout(b.dataset.hDel); toast('האימון נמחק'); }
        else { b.dataset.sure = '1'; b.lastChild.textContent = ' בטוחים? לחצו שוב'; }
      } else if (b.dataset.hShare && KX.share) { const w = D.workouts().find((x) => x.id === b.dataset.hShare); if (w) KX.share.workout(w); }
      else if (b.dataset.fvEx) KX.app && KX.app.openEx(b.dataset.fvEx);
      else if (b.dataset.fvGo) KX.workout && KX.workout.startExercise(b.dataset.fvGo);
      else if (b.dataset.fvProg) { KX.app.selectProgram(+b.dataset.fvProg); $('#programs').scrollIntoView({ behavior: KX.ui.reduce ? 'auto' : 'smooth' }); }
      else if (b.dataset.d === 'export') exportFile();
      else if (b.dataset.d === 'reset') {
        if (b.dataset.sure) { D.resetAll(); toast('כל הנתונים נמחקו'); }
        else { b.dataset.sure = '1'; b.lastChild.textContent = ' בטוחים? כל היומן יימחק. לחצו שוב'; setTimeout(() => { if (b.isConnected) { delete b.dataset.sure; b.lastChild.textContent = ' מחיקת הכל'; } }, 5000); }
      }
    });
    let rw = 0;
    new ResizeObserver(() => {
      const w = mount.clientWidth; if (Math.abs(w - rw) < 8) return; rw = w;
      if (mount._series && mount._series.length >= 2 && !tableView.line) drawLine($('#meLine'), mount._series, mount._unit);
      if (mount._weeks && !tableView.bars) drawBars($('#meBars'), mount._weeks);
    }).observe(mount);
  }
  function exportFile() {
    const o = D.exportAll();
    const blob = new Blob([JSON.stringify(o, null, 2)], { type: 'application/json' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `kalos-backup-${dt.today()}.json` });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast('קובץ הגיבוי ירד ✓');
  }
  function importFile(file) {
    if (!file) return;
    if (file.size > 5e6) { toast('הקובץ גדול מדי'); return; }
    const r = new FileReader();
    r.onload = () => {
      let o;
      try { o = JSON.parse(r.result); if (!o || o.app !== 'kalos' || typeof o.data !== 'object') throw 0; } catch (_) { toast('זה לא קובץ גיבוי של KALOS'); return; }
      if (!window.confirm('השחזור יחליף את כל הנתונים הנוכחיים בדפדפן הזה. להמשיך?')) return;
      const allowed = ['workouts', 'favs', 'skills', 'tests', 'challenges', 'badges', 'prefs', 'plan', 'tools', 'woWarm'];
      const clean = { app: 'kalos', data: {} };
      allowed.forEach((k) => { if (o.data[k] !== undefined) clean.data[k] = o.data[k]; });
      if (clean.data.workouts && !Array.isArray(clean.data.workouts)) { toast('קובץ הגיבוי פגום'); return; }
      D.resetAll();
      D.importAll(clean);
      toast(`שוחזרו ${(clean.data.workouts || []).length} אימונים ✓`);
    };
    r.readAsText(file);
  }

  /* ================= רישום ידני ================= */
  let logDlg;
  function openLog() {
    if (!logDlg) {
      logDlg = document.createElement('dialog');
      logDlg.className = 'modal me-log';
      logDlg.setAttribute('aria-labelledby', 'logT');
      document.body.appendChild(logDlg);
      logDlg.addEventListener('click', (e) => {
        if (e.target === logDlg || e.target.closest('[data-l="close"]')) logDlg.close();
        if (e.target.closest('[data-l="add"]')) addRow();
        const del = e.target.closest('[data-l="del"]'); if (del && $$('.lg-row', logDlg).length > 1) del.closest('.lg-row').remove();
      });
      logDlg.addEventListener('submit', (e) => { e.preventDefault(); saveLog(); });
    }
    const opts = KX.exercises.map((e) => `<option value="${e.id}">${esc(e.name)}</option>`).join('');
    logDlg.innerHTML = `<form class="lg" novalidate>
      <div class="lg-h"><h3 id="logT">רישום אימון ידני</h3><button type="button" class="icon-btn" data-l="close" aria-label="סגור">${icon('i-x')}</button></div>
      <div class="lg-top">
        <label>תאריך<input type="date" name="date" value="${dt.today()}" max="${dt.today()}" required /></label>
        <label>משך (דקות)<input type="number" name="dur" min="0" max="600" inputmode="numeric" placeholder="45" /></label>
        <label class="lg-wide">שם האימון (לא חובה)<input type="text" name="title" maxlength="60" placeholder="למשל: אימון בפארק" /></label>
      </div>
      <p class="lg-l">תרגילים <small>· כתבו את החזרות (או השניות) בכל סט, מופרדות בפסיק: 10, 8, 8</small></p>
      <div class="lg-rows" data-opts></div>
      <button type="button" class="btn btn-ghost btn-sm" data-l="add">${icon('i-plus')} עוד תרגיל</button>
      <p class="lg-err" role="alert" hidden></p>
      <div class="lg-f"><button type="submit" class="btn btn-accent">${icon('i-save')} שמירה ביומן</button><button type="button" class="btn btn-ghost" data-l="close">ביטול</button></div>
    </form>`;
    logDlg._opts = opts;
    addRow();
    logDlg.showModal();
  }
  function addRow() {
    const box = $('.lg-rows', logDlg), n = $$('.lg-row', logDlg).length + 1;
    const row = document.createElement('div');
    row.className = 'lg-row';
    row.innerHTML = `<label class="sr-only" for="lgEx${n}">תרגיל ${n}</label><select id="lgEx${n}" name="ex">${logDlg._opts}</select>
      <label class="sr-only" for="lgS${n}">סטים לתרגיל ${n}</label><input id="lgS${n}" name="sets" type="text" inputmode="numeric" placeholder="10, 8, 8" autocomplete="off" />
      <span class="lg-u" aria-live="polite"></span><button type="button" class="icon-btn" data-l="del" aria-label="הסרת תרגיל ${n}">${icon('i-trash')}</button>`;
    box.appendChild(row);
    const sel = $('select', row), u = $('.lg-u', row);
    const sync = () => { u.textContent = KX.parseRx(KX.exMap[sel.value].rx).unit === 'sec' ? 'שנ׳' : 'חזרות'; };
    sel.addEventListener('change', sync); sync();
    if (n > 1) sel.focus();
  }
  function saveLog() {
    const f = $('form', logDlg), err = $('.lg-err', logDlg);
    const date = f.date.value;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > dt.today()) { err.hidden = false; err.textContent = 'בחרו תאריך תקין (לא בעתיד).'; return; }
    const items = [];
    for (const row of $$('.lg-row', logDlg)) {
      const ex = $('select', row).value, raw = $('input', row).value.trim();
      if (!raw) continue;
      const sets = raw.split(/[,\s،]+/).filter(Boolean).map(Number);
      if (sets.some((v) => !Number.isFinite(v) || v < 0 || v > 999)) { err.hidden = false; err.textContent = `בדקו את המספרים ב"${exName(ex)}" (0–999, מופרדים בפסיק).`; $('input', row).focus(); return; }
      const clean = sets.map((v) => Math.round(v)).filter((v) => v > 0);
      if (clean.length) items.push({ ex, n: exName(ex), unit: KX.parseRx(KX.exMap[ex].rx).unit, sets: clean });
    }
    if (!items.length) { err.hidden = false; err.textContent = 'הוסיפו לפחות תרגיל אחד עם סט אחד.'; return; }
    const d = dt.fromDk(date), n = new Date();
    d.setHours(n.getHours(), n.getMinutes());
    D.addWorkout({ title: f.title.value.trim() || 'אימון', src: 'manual', ts: d.getTime(), date, dur: Math.max(0, Math.min(600, +f.dur.value || 0)) * 60, items });
    logDlg.close();
    toast('האימון נרשם ביומן ✓');
  }
  document.addEventListener('click', (e) => { if (e.target.closest('[data-log-open]')) openLog(); });

  /* ================= רענון ================= */
  let rt;
  const refresh = () => { clearTimeout(rt); rt = setTimeout(() => { render(); renderChallenges(); renderNav(); }, 40); };
  KX.on('change', (d) => { if (d.key !== 'prefs' && d.key !== 'tools' && d.key !== 'woWarm') { evalBadges(false); refresh(); } });
  KX.on('import', () => { evalBadges(true); refresh(); });
  KX.on('prefs', () => refresh()); /* צבעי הגרפים לפי ערכת הנושא */
  new MutationObserver(refresh).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  evalBadges(true); /* הישגים שכבר קיימים (למשל אחרי שחזור) לא קופצים בטעינה */
  render(); renderChallenges(); renderNav();
  KX.tracker = { render, openLog, evalBadges };
})();
