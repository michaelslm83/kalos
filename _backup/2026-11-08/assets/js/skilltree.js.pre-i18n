/* KALOS — עץ סקילים: מסלולי ההתקדמות כעץ אינטראקטיבי + סימון שלבים בסולם ההתקדמות */
(function () {
  'use strict';
  const KX = window.KX;
  const { $, $$, esc, icon } = KX.ui;
  const mount = $('#skillTreeMount');
  const NS = 'http://www.w3.org/2000/svg';
  const tracks = KX.progressions;
  const color = (t) => KX.cats[t.cat].color;
  const reachedOf = (t) => Math.min(t.steps.length, Math.max(0, +(KX.data.skills()[t.id] || 0)));
  const MAXN = Math.max(...tracks.map((t) => t.steps.length));

  /* ---------- markup ---------- */
  function totals() {
    let done = 0, all = 0;
    tracks.forEach((t) => { done += reachedOf(t); all += t.steps.length; });
    return { done, all, pct: all ? Math.round((done / all) * 100) : 0 };
  }

  function nodeState(t, i) {
    const r = reachedOf(t);
    return i < r ? 'done' : i === r ? 'next' : 'locked';
  }

  function render() {
    if (!mount) return;
    const tt = totals();
    const nexts = tracks.filter((t) => reachedOf(t) < t.steps.length).map((t) => ({ t, s: t.steps[reachedOf(t)], i: reachedOf(t) }));
    mount.innerHTML = `
      <div class="st-summary">
        <div class="st-overall" style="--pct:${tt.pct}">
          <div class="st-ring" aria-hidden="true"><b>${tt.pct}%</b></div>
          <div><p class="st-k">ההתקדמות שלך</p><p class="st-v"><b>${tt.done}</b> מתוך ${tt.all} שלבים הושגו</p></div>
        </div>
        <div class="st-next">
          <p class="st-k">הצעדים הבאים</p>
          <div class="st-next-list">${nexts.length ? nexts.map(({ t, s, i }) =>
            `<button class="st-chip" style="--c:${color(t)}" data-track="${t.id}" data-i="${i}"><i></i><span>${esc(t.title)}:</span> ${esc(s.n)}</button>`).join('')
            : '<span class="st-all">השלמתם את כל העץ. מרשים! 🏆</span>'}</div>
        </div>
        ${tt.done ? `<button class="btn btn-ghost btn-sm st-reset" data-reset>${icon('i-refresh')} איפוס העץ</button>` : ''}
      </div>
      <div class="st-scroll" tabindex="-1">
        <div class="st-canvas" style="--rows:${MAXN}">
          <svg class="st-lines" aria-hidden="true"></svg>
          <div class="st-cols">
            ${tracks.map((t) => {
              const r = reachedOf(t), n = t.steps.length;
              return `<div class="st-col${r === n ? ' complete' : ''}" style="--c:${color(t)}" data-track="${t.id}" role="group" aria-label="ענף ${esc(t.title)}: ${r} מתוך ${n}">
                <div class="st-head"><b>${esc(t.title)}</b><small>${esc(t.goal)}</small><span class="st-prog"><span style="width:${(r / n) * 100}%"></span></span><span class="st-count">${r}/${n}</span></div>
                <ol class="st-nodes">
                  ${t.steps.map((s, i) => {
                    const st = nodeState(t, i), goal = i === n - 1;
                    const lbl = `${s.n}, יעד ${s.c}, ${st === 'done' ? 'הושג' : st === 'next' ? 'הצעד הבא' : 'נעול'}`;
                    /* השלב הראשון למטה, היעד למעלה */
                    return `<li class="st-node ${st}${goal ? ' goal' : ''}" style="grid-row:${MAXN - i}">
                      <button class="st-dot" data-track="${t.id}" data-i="${i}" aria-label="${esc(lbl)}" aria-haspopup="dialog">
                        ${st === 'done' ? icon('i-check') : st === 'locked' ? icon('i-lock') : goal ? icon('i-star') : `<span>${i + 1}</span>`}
                      </button>
                      <span class="st-name">${esc(s.n)}</span>
                    </li>`;
                  }).join('')}
                </ol>
              </div>`;
            }).join('')}
          </div>
          <div class="st-rootrow"><div class="st-root" style="--pct:${tt.pct}"><span>${icon('i-tree')}</span><b>יסודות</b><small>${tt.pct}%</small></div></div>
          <div class="st-pop" role="dialog" aria-modal="false" hidden></div>
        </div>
      </div>
      <p class="st-hint">${icon('i-info')}<span>סימון שלב מסמן גם את כל השלבים שלפניו באותו ענף. עברו לשלב הבא רק כשאתם עומדים ביעד בטכניקה נקייה.</span></p>`;
    requestAnimationFrame(drawLines);
  }

  /* ---------- connectors ---------- */
  function drawLines() {
    const canvas = $('.st-canvas', mount); if (!canvas) return;
    const svg = $('.st-lines', canvas);
    const cb = canvas.getBoundingClientRect();
    if (!cb.width) return;
    svg.setAttribute('viewBox', `0 0 ${cb.width} ${cb.height}`);
    svg.setAttribute('width', cb.width); svg.setAttribute('height', cb.height);
    const ctr = (el) => { const b = el.getBoundingClientRect(); return [b.left - cb.left + b.width / 2, b.top - cb.top + b.height / 2, b.height / 2]; };
    const root = ctr($('.st-root', canvas));
    let out = '';
    $$('.st-col', canvas).forEach((col) => {
      const t = tracks.find((x) => x.id === col.dataset.track), c = color(t), r = reachedOf(t);
      const dots = $$('.st-dot', col).map(ctr);
      /* שורש → צומת ראשון: עקומה */
      const f = dots[0];
      const my = (root[1] + f[1]) / 2;
      out += `<path d="M${root[0]} ${root[1] - root[2]} C ${root[0]} ${my}, ${f[0]} ${my}, ${f[0]} ${f[1] + f[2]}" class="st-l${r > 0 ? ' on' : ''}" style="--c:${c}"/>`;
      for (let i = 0; i < dots.length - 1; i++) {
        const a = dots[i], b = dots[i + 1];
        out += `<line x1="${a[0]}" y1="${a[1] - a[2]}" x2="${b[0]}" y2="${b[1] + b[2]}" class="st-l${i + 1 < r ? ' on' : i + 1 === r ? ' half' : ''}" style="--c:${c}"/>`;
      }
    });
    svg.innerHTML = out;
  }
  let rT;
  if (window.ResizeObserver && mount) new ResizeObserver(() => { clearTimeout(rT); rT = setTimeout(drawLines, 60); }).observe(mount);
  else addEventListener('resize', () => { clearTimeout(rT); rT = setTimeout(drawLines, 120); });
  /* גופנים שנטענים מאוחר משנים גבהים */
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(drawLines);

  /* ---------- popover ---------- */
  let popFor = null;
  function openPop(trackId, i, opener) {
    const t = tracks.find((x) => x.id === trackId); if (!t) return;
    const s = t.steps[i], st = nodeState(t, i), n = t.steps.length;
    const pop = $('.st-pop', mount), canvas = $('.st-canvas', mount);
    popFor = { trackId, i, opener };
    pop.style.setProperty('--c', color(t));
    pop.setAttribute('aria-label', s.n);
    pop.innerHTML = `
      <button class="icon-btn st-pop-x" data-close aria-label="סגור">${icon('i-x')}</button>
      <p class="st-pop-k">${esc(t.title)} · שלב ${i + 1} מתוך ${n}${i === n - 1 ? ' · היעד' : ''}</p>
      <h4>${esc(s.n)}</h4>
      <p class="st-pop-goal">יעד: <b>${esc(s.c)}</b></p>
      <p class="st-pop-track">מטרת הענף: ${esc(t.goal)}</p>
      <p class="st-pop-st ${st}">${st === 'done' ? icon('i-check') + ' הושג' : st === 'next' ? icon('i-bolt') + ' זה הצעד הבא שלך' : icon('i-lock') + ' עוד לא נפתח: ' + (i - reachedOf(t)) + ' שלבים לפניו'}</p>
      <div class="st-pop-act">
        ${st === 'done'
          ? `<button class="btn btn-ghost btn-sm" data-unmark>${icon('i-x')} בטלו סימון</button>`
          : `<button class="btn btn-accent btn-sm" data-mark>${icon('i-check')} סמנו שהשגתי</button>`}
        ${s.ex ? `<button class="btn btn-ghost btn-sm" data-demo="${s.ex}">${icon('i-play')} הדגמה</button>` : ''}
      </div>
      ${st === 'locked' ? '<p class="st-pop-note">הסימון יסמן גם את השלבים הקודמים בענף.</p>' : ''}
      ${st === 'done' && i < reachedOf(t) - 1 ? '<p class="st-pop-note">ביטול הסימון יבטל גם את השלבים שאחריו.</p>' : ''}`;
    pop.hidden = false;
    /* מיקום ליד הצומת (בדסקטופ); במובייל — גיליון תחתון דרך CSS */
    const cb = canvas.getBoundingClientRect(), ob = opener.getBoundingClientRect();
    const pw = pop.offsetWidth, ph = pop.offsetHeight;
    let x = ob.left - cb.left + ob.width / 2 - pw / 2;
    x = Math.max(8, Math.min(cb.width - pw - 8, x));
    let y = ob.bottom - cb.top + 12;
    if (y + ph > cb.height - 8) y = ob.top - cb.top - ph - 12;
    pop.style.left = x + 'px'; pop.style.top = Math.max(8, y) + 'px';
    $$('.st-dot', mount).forEach((d) => d.classList.toggle('sel', d === opener));
    const first = $('[data-mark],[data-unmark]', pop);
    if (first) first.focus({ preventScroll: true });
  }
  function closePop(restore) {
    const pop = $('.st-pop', mount); if (!pop || pop.hidden) return;
    pop.hidden = true;
    $$('.st-dot.sel', mount).forEach((d) => d.classList.remove('sel'));
    if (restore && popFor) {
      const d = $(`.st-dot[data-track="${popFor.trackId}"][data-i="${popFor.i}"]`, mount);
      if (d) d.focus({ preventScroll: true });
    }
    popFor = null;
  }

  /* setSkill → אירוע 'skills' → render, והפופאובר נפתח מחדש על אותו צומת */
  function setReached(trackId, n, msg) {
    KX.data.setSkill(trackId, n);
    if (msg) KX.ui.toast(msg);
  }

  if (mount) {
    mount.addEventListener('click', (e) => {
      const dot = e.target.closest('.st-dot, .st-chip');
      if (dot) {
        const same = popFor && popFor.trackId === dot.dataset.track && popFor.i === +dot.dataset.i;
        if (same && dot.classList.contains('st-dot')) { closePop(); return; }
        const node = dot.classList.contains('st-chip') ? $(`.st-dot[data-track="${dot.dataset.track}"][data-i="${dot.dataset.i}"]`, mount) : dot;
        if (dot.classList.contains('st-chip')) node.scrollIntoView({ block: 'nearest', inline: 'center', behavior: KX.ui.reduce ? 'auto' : 'smooth' });
        openPop(dot.dataset.track, +dot.dataset.i, node);
        return;
      }
      if (e.target.closest('[data-close]')) { closePop(true); return; }
      if (e.target.closest('[data-mark]') && popFor) {
        const t = tracks.find((x) => x.id === popFor.trackId);
        const n = popFor.i + 1;
        setReached(t.id, n, n === t.steps.length ? `השגתם את היעד: ${t.goal}! 🏆` : `סומן: ${t.steps[popFor.i].n} ✓`);
        return;
      }
      if (e.target.closest('[data-unmark]') && popFor) { setReached(popFor.trackId, popFor.i, 'הסימון בוטל'); return; }
      const demo = e.target.closest('[data-demo]');
      if (demo && KX.app) { closePop(); KX.app.openEx(demo.dataset.demo); return; }
      if (e.target.closest('[data-reset]')) {
        if (confirm('לאפס את כל ההתקדמות בעץ הסקילים?')) {
          const s = KX.data.skills();
          tracks.forEach((t) => { if (s[t.id]) KX.data.setSkill(t.id, 0); });
          KX.ui.toast('העץ אופס');
        }
        return;
      }
      if (!e.target.closest('.st-pop')) closePop();
    });
    mount.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && popFor) { e.stopPropagation(); closePop(true); }
    });
    /* composedPath נקבע לפני הטיפול — עובד גם כשהיעד הוחלף ברינדור */
    document.addEventListener('click', (e) => { if (popFor && e.composedPath().indexOf(mount) < 0) closePop(); });
  }

  /* ---------- סולם ההתקדמות (app.js) ---------- */
  function decorate({ panel, track }) {
    const t = tracks.find((x) => x.id === track); if (!t || !panel) return;
    const r = reachedOf(t);
    $$('.rung', panel).forEach((rung, i) => {
      rung.classList.toggle('reached', i < r);
      rung.classList.toggle('next', i === r);
      const card = $('.card', rung); if (!card) return;
      let b = $('.rung-tog', card);
      if (!b) {
        b = document.createElement('button');
        b.className = 'rung-tog';
        b.dataset.rtTrack = t.id; b.dataset.rtI = i;
        card.appendChild(b);
      }
      const on = i < r;
      b.setAttribute('aria-pressed', on);
      b.innerHTML = on ? icon('i-check') + ' השגתי' : 'סמנו השגתי';
      b.setAttribute('aria-label', (on ? 'בטלו סימון: ' : 'סמנו שהשגתי: ') + t.steps[i].n);
      const n = $('.n', rung);
      if (n && !n.dataset.num) n.dataset.num = n.textContent;
      if (n) n.innerHTML = on ? icon('i-check') : n.dataset.num;
    });
    if (!panel.dataset.rtBound) {
      panel.dataset.rtBound = '1';
      panel.addEventListener('click', (e) => {
        const b = e.target.closest('.rung-tog'); if (!b) return;
        const tid = b.dataset.rtTrack, i = +b.dataset.rtI;
        const tr = tracks.find((x) => x.id === tid);
        const on = i < reachedOf(tr);
        KX.data.setSkill(tid, on ? i : i + 1);
        KX.ui.toast(on ? 'הסימון בוטל' : i + 1 === tr.steps.length ? `השגתם את היעד: ${tr.goal}! 🏆` : `סומן: ${tr.steps[i].n} ✓`);
        /* app.js מצייר מחדש את הפאנל — מחזירים את הפוקוס לכפתור באותו מקום */
        requestAnimationFrame(() => { const nb = $(`.rung-tog[data-rt-i="${i}"]`, panel); if (nb) nb.focus({ preventScroll: true }); });
      });
    }
  }
  KX.on('progrender', decorate);

  KX.on('skills', () => { const keep = popFor; render(); if (keep) { const d = $(`.st-dot[data-track="${keep.trackId}"][data-i="${keep.i}"]`, mount); if (d) openPop(keep.trackId, keep.i, d); } });
  KX.on('import', () => { popFor = null; render(); });

  KX.skilltree = { render, reachedOf: (id) => reachedOf(tracks.find((t) => t.id === id)) };
  render();
})();
