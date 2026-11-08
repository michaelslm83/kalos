/* KALOS — ממשק המשתמש */
(function () {
  'use strict';
  const KX = window.KX;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const NS = 'http://www.w3.org/2000/svg';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canHover = window.matchMedia('(hover: hover)').matches;
  const icon = (id) => `<svg class="ico" aria-hidden="true"><use href="#${id}"/></svg>`;
  const catColor = (c) => KX.cats[c].color;

  /* ---------- toast ---------- */
  let toastT;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.remove('show'), 2600);
  }

  /* ---------- images ---------- */
  $$('[data-img]').forEach((img) => (img.src = KX.img(img.dataset.img, img.dataset.w)));
  const heroImg = $('#heroImg');
  heroImg.addEventListener('load', () => heroImg.classList.add('loaded'));
  heroImg.src = KX.img('flag', window.innerWidth > 1200 ? 2000 : 1300);

  /* ---------- nav / progress / active ---------- */
  const nav = $('#nav'), bar = $('#progressBar');
  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const y = window.scrollY;
      nav.classList.toggle('scrolled', y > 30);
      const h = document.documentElement.scrollHeight - innerHeight;
      bar.style.transform = `scaleX(${h > 0 ? y / h : 0})`;
      ticking = false;
    });
  }
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const burger = $('#burger'), links = $('#navLinks');
  burger.addEventListener('click', () => {
    const open = burger.getAttribute('aria-expanded') !== 'true';
    burger.setAttribute('aria-expanded', open);
    burger.setAttribute('aria-label', open ? 'סגור תפריט' : 'פתח תפריט');
    links.classList.toggle('open', open);
  });
  links.addEventListener('click', (e) => {
    if (e.target.closest('a')) { burger.setAttribute('aria-expanded', 'false'); links.classList.remove('open'); }
  });

  const navMap = {};
  $$('.nav-links a').forEach((a) => (navMap[a.getAttribute('href').slice(1)] = a));
  const secObs = new IntersectionObserver((ents) => {
    ents.forEach((en) => {
      if (en.isIntersecting && navMap[en.target.id]) {
        $$('.nav-links a').forEach((a) => a.classList.remove('active'));
        navMap[en.target.id].classList.add('active');
      }
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  $$('main section[id]').forEach((s) => secObs.observe(s));

  /* ---------- reveal + counters ---------- */
  const revObs = new IntersectionObserver((ents) => {
    ents.forEach((en) => {
      if (!en.isIntersecting) return;
      en.target.classList.add('in');
      revObs.unobserve(en.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  const observeReveal = (root) => $$('.reveal', root).forEach((el, i) => { el.style.transitionDelay = Math.min(i % 6, 5) * 70 + 'ms'; revObs.observe(el); });

  function countUp(el) {
    const to = +el.dataset.count;
    if (reduce) { el.textContent = to; return; }
    const t0 = performance.now(), D = 1400;
    const step = (now) => {
      const k = Math.min(1, (now - t0) / D);
      el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  setTimeout(() => $$('[data-count]').forEach(countUp), 500);

  /* ---------- player helper ---------- */
  function makePlayer(svg, ex, opts) {
    svg.style.setProperty('--hl', catColor(ex.cat));
    return new KX.fig.Player(svg, ex, Object.assign({ fit: 1.45 }, opts));
  }

  /* ---------- hero demo ---------- */
  const heroSvg = $('#heroFig'), heroCap = $('#heroCap');
  let heroPlayer;
  function setHero(id) {
    if (heroPlayer) heroPlayer.pause();
    const ex = KX.exMap[id];
    $('#heroDemoName').textContent = ex.name;
    heroPlayer = makePlayer(heroSvg, ex, { onFrame: (i, f) => (heroCap.textContent = f.c) });
    if (!reduce) heroPlayer.play();
    $$('.hc-switch button').forEach((b) => b.setAttribute('aria-selected', b.dataset.hero === id));
  }
  $$('.hc-switch button').forEach((b) => b.addEventListener('click', () => setHero(b.dataset.hero)));
  setHero('pullup');
  new IntersectionObserver(([en]) => { if (!heroPlayer || reduce) return; en.isIntersecting ? heroPlayer.play() : heroPlayer.pause(); }).observe(heroSvg);

  /* ---------- about: timeline + compare ---------- */
  $('#timeline').innerHTML = KX.history.map((h) => `<li><span class="y">${esc(h.y)}</span><h4>${esc(h.h)}</h4><p>${esc(h.p)}</p></li>`).join('');
  $$('[data-tl]').forEach((b) => b.addEventListener('click', () => {
    const tl = $('#timeline');
    tl.scrollBy({ left: -(+b.dataset.tl) * 318, behavior: reduce ? 'auto' : 'smooth' });
  }));
  $('#compareBody').innerHTML = KX.compare.map((r) => `<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td><td>${esc(r[2])}</td></tr>`).join('');

  /* ---------- exercises ---------- */
  const state = { cat: 'all', group: 'all', level: 0, q: '' };
  const counts = { all: KX.exercises.length };
  KX.exercises.forEach((e) => (counts[e.cat] = (counts[e.cat] || 0) + 1));
  const chipData = [['all', 'הכל', '#ffffff']].concat(Object.keys(KX.cats).map((k) => [k, KX.cats[k].name, KX.cats[k].color]));
  $('#catChips').innerHTML = chipData.map(([k, n, c]) => `<button class="chip" aria-pressed="${k === 'all'}" data-cat="${k}" style="--c:${c}"><i></i>${n} <b>${counts[k] || 0}</b></button>`).join('');
  $('#catChips').addEventListener('click', (e) => {
    const b = e.target.closest('.chip'); if (!b) return;
    state.cat = b.dataset.cat;
    $$('#catChips .chip').forEach((c) => c.setAttribute('aria-pressed', c === b));
    renderGrid();
  });
  /* סינון לפי אזור בגוף */
  const gCounts = { all: KX.exercises.length };
  KX.exercises.forEach((e) => e.groups.forEach((g) => (gCounts[g] = (gCounts[g] || 0) + 1)));
  $('#groupChips').innerHTML = [['all', 'כל הגוף']].concat(Object.keys(KX.groups).map((k) => [k, KX.groups[k]]))
    .map(([k, n]) => `<button class="chip chip-g" aria-pressed="${k === 'all'}" data-group="${k}">${n} <b>${gCounts[k] || 0}</b></button>`).join('');
  $('#groupChips').addEventListener('click', (e) => {
    const b = e.target.closest('.chip'); if (!b) return;
    state.group = b.dataset.group;
    $$('#groupChips .chip').forEach((c) => c.setAttribute('aria-pressed', c === b));
    renderGrid();
  });
  $$('.ex-total').forEach((el) => (el.textContent = KX.exercises.length));
  $('#statEx').dataset.count = KX.exercises.length;
  $('#levelSeg').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    state.level = +b.dataset.level;
    $$('#levelSeg button').forEach((x) => x.setAttribute('aria-checked', x === b));
    renderGrid();
  });
  let qT;
  $('#exSearch').addEventListener('input', (e) => { clearTimeout(qT); qT = setTimeout(() => { state.q = e.target.value.trim().toLowerCase(); renderGrid(); }, 120); });

  let cardPlayers = [];
  const cardObs = new IntersectionObserver((ents) => {
    ents.forEach((en) => {
      const p = en.target._player; if (!p) return;
      if (!canHover && !reduce) en.isIntersecting ? p.play() : p.pause();
    });
  }, { threshold: 0.6 });

  function filtered() {
    return KX.exercises.filter((e) => (state.cat === 'all' || e.cat === state.cat) && (!state.level || e.level === state.level) &&
      (state.group === 'all' || e.groups.indexOf(state.group) > -1) &&
      (!state.q || (e.name + ' ' + e.en + ' ' + e.muscles.join(' ') + ' ' + e.groups.map((g) => KX.groups[g]).join(' ')).toLowerCase().indexOf(state.q) > -1));
  }
  function renderGrid() {
    cardPlayers.forEach((p) => p.pause());
    cardPlayers = [];
    const list = filtered();
    const grid = $('#exGrid');
    grid.innerHTML = '';
    $('#exEmpty').hidden = list.length > 0;
    list.forEach((ex, i) => {
      const c = catColor(ex.cat);
      const card = document.createElement('button');
      card.className = 'ex-card';
      card.style.setProperty('--c', c);
      card.style.animationDelay = Math.min(i, 10) * 40 + 'ms';
      card.setAttribute('aria-label', `${ex.name} — פתח הדגמה`);
      card.innerHTML = `
        <div class="ex-stage"><svg aria-hidden="true"></svg>
          <div class="ex-badges"><span class="tag"><i></i>${KX.cats[ex.cat].name}</span>
          <span class="lvl" title="רמה: ${KX.levels[ex.level]}">${[1, 2, 3].map((n) => `<i class="${n <= ex.level ? 'on' : ''}"></i>`).join('')}</span></div>
        </div>
        <div class="ex-body"><h3>${esc(ex.name)}</h3><p class="en">${esc(ex.en)}</p><p class="mus">${esc(ex.muscles.join(' · '))}</p>
          <div class="ex-foot"><span class="rx">${esc(ex.rx)}</span><span class="go">הדגמה ${icon('i-arrow')}</span></div></div>`;
      grid.appendChild(card);
      const svg = $('svg', card);
      const p = makePlayer(svg, ex, { fit: 1.5 });
      p.showFrame(1);
      svg._player = p;
      cardObs.observe(svg);
      cardPlayers.push(p);
      if (canHover && !reduce) {
        card.addEventListener('mouseenter', () => p.play());
        card.addEventListener('mouseleave', () => { p.pause(); });
        card.addEventListener('focus', () => p.play());
        card.addEventListener('blur', () => p.pause());
      }
      card.addEventListener('click', () => openEx(ex.id));
    });
  }
  renderGrid();

  /* ---------- modal ---------- */
  const modal = $('#exModal'), mFig = $('#mFig'), mCap = $('#mCap'), mDots = $('#mDots'), mStage = $('.m-stage', modal);
  let mPlayer = null, mEx = null, mTab = 'steps', mOrder = [];
  function setPlayIcon(playing) {
    $('#mPlay').innerHTML = icon(playing ? 'i-pause' : 'i-play');
    $('#mPlay').setAttribute('aria-label', playing ? 'השהה' : 'נגן');
  }
  function buildDots() {
    const n = mPlayer.seq.length;
    mDots.innerHTML = Array.from({ length: n }, (_, i) => `<button aria-label="שלב ${i + 1}"></button>`).join('');
    $$('button', mDots).forEach((b, i) => b.addEventListener('click', () => { mPlayer.pause(); setPlayIcon(false); mPlayer.showFrame(i); }));
  }
  function onFrame(i, f) {
    mCap.textContent = f.c;
    $$('button', mDots).forEach((b, j) => b.classList.toggle('on', j <= i));
  }
  function setMode(mode) {
    if (mode === 'bad' && !mPlayer.bad) return;
    mPlayer.setMode(mode);
    mStage.classList.toggle('is-bad', mode === 'bad');
    $$('.m-mode button').forEach((b) => b.setAttribute('aria-checked', b.dataset.mode === mode));
    buildDots();
    mPlayer.reset();
  }
  function renderPane() {
    const ex = mEx, pane = $('#mPane');
    let html = '';
    if (mTab === 'steps') html = `<ol class="steps">${ex.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>`;
    if (mTab === 'cues') html = `<ul class="ilist good">${ex.cues.map((s) => `<li>${icon('i-check')}<span>${esc(s)}</span></li>`).join('')}</ul>`;
    if (mTab === 'mistakes') html = `<ul class="ilist bad">${ex.mistakes.map((s) => `<li>${icon('i-x')}<span>${esc(s)}</span></li>`).join('')}</ul>` + (mPlayer.bad ? `<button class="btn btn-ghost btn-sm" id="showBad" style="margin-top:8px">${icon('i-play')} הצג את הטעות בהדגמה</button>` : '');
    if (mTab === 'prog') html = `<div class="pgrid"><div class="e"><small>קל יותר ↓</small><p>${esc(ex.easier)}</p></div><div class="h"><small>קשה יותר ↑</small><p>${esc(ex.harder)}</p></div></div>`;
    if (mTab === 'video') {
      const v = KX.videos[ex.id];
      if (v) html = facadeHTML(v) + `<p class="vnote">${esc(v.title)} · ${esc(v.ch)}</p>`;
      else html = `<a class="ytlink" target="_blank" rel="noopener" href="https://www.youtube.com/results?search_query=${encodeURIComponent(ex.en + ' tutorial calisthenics')}">${icon('i-yt')}<span><b>חפש הדרכות ל־${esc(ex.en)} ב־YouTube</b><small>ייפתח בלשונית חדשה</small></span></a><p class="vnote">בינתיים, ההדגמה המונפשת מציגה את הביצוע הנכון ואת הטעות הנפוצה.</p>`;
    }
    pane.innerHTML = html;
    pane.style.animation = 'none'; void pane.offsetWidth; pane.style.animation = '';
    const sb = $('#showBad', pane);
    if (sb) sb.addEventListener('click', () => { setMode('bad'); if (!mPlayer.playing) { mPlayer.play(); setPlayIcon(true); } });
    bindFacades(pane);
  }
  function openEx(id) {
    const ex = KX.exMap[id]; if (!ex) return;
    mEx = ex;
    mOrder = filtered().map((e) => e.id);
    if (mOrder.indexOf(id) < 0) mOrder = KX.exercises.map((e) => e.id);
    if (mPlayer) mPlayer.pause();
    mStage.style.setProperty('--c', catColor(ex.cat));
    mStage.classList.remove('is-bad');
    mPlayer = makePlayer(mFig, ex, { onFrame, fit: 1.3 });
    mFig.style.removeProperty('--hl');
    $$('.m-mode button').forEach((b) => b.setAttribute('aria-checked', b.dataset.mode === 'good'));
    $('.m-mode .bad').disabled = !mPlayer.bad;
    buildDots();
    mPlayer.reset();
    if (!reduce) mPlayer.play();
    setPlayIcon(!reduce);
    $('#mTags').innerHTML = `<span class="tag" style="color:${catColor(ex.cat)}"><i></i>${KX.cats[ex.cat].name}</span><span class="tag">${KX.levels[ex.level]}</span>` + (KX.videos[ex.id] ? `<span class="tag">${icon('i-play')} כולל וידאו</span>` : '');
    $('#mTitle').textContent = ex.name;
    $('#mEn').textContent = ex.en;
    $('#mSum').textContent = ex.summary;
    $('#mMeta').innerHTML = `<div><dt>מינון מומלץ</dt><dd>${esc(ex.rx)}</dd></div><div><dt>ציוד</dt><dd>${esc(ex.equip)}</dd></div><div><dt>שרירים עיקריים</dt><dd>${esc(ex.muscles.slice(0, 2).join(', '))}</dd></div>`;
    mTab = 'steps';
    $$('#mTabs button').forEach((b) => b.setAttribute('aria-selected', b.dataset.tab === mTab));
    renderPane();
    const i = mOrder.indexOf(id);
    $('#mPrev').disabled = i <= 0;
    $('#mNext').disabled = i >= mOrder.length - 1;
    if (!modal.open) modal.showModal();
    $('.m-body', modal).scrollTop = 0;
    history.replaceState(null, '', '#ex-' + id);
  }
  KX.openEx = openEx;
  $$('.m-mode button').forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode)));
  $('#mPlay').addEventListener('click', () => { if (mPlayer.playing) { mPlayer.pause(); setPlayIcon(false); } else { mPlayer.play(); setPlayIcon(true); } });
  $('#mSpeed').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    mPlayer.setSpeed(+b.dataset.speed);
    $$('#mSpeed button').forEach((x) => x.setAttribute('aria-checked', x === b));
  });
  $('#mTabs').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    mTab = b.dataset.tab;
    $$('#mTabs button').forEach((x) => x.setAttribute('aria-selected', x === b));
    renderPane();
  });
  $('#mTabs').addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    const bs = $$('#mTabs button'), i = bs.findIndex((b) => b.dataset.tab === mTab);
    const n = bs[(i + (e.key === 'ArrowLeft' ? 1 : -1) + bs.length) % bs.length];
    n.click(); n.focus();
  });
  const step = (d) => { const i = mOrder.indexOf(mEx.id) + d; if (mOrder[i]) openEx(mOrder[i]); };
  $('#mPrev').addEventListener('click', () => step(-1));
  $('#mNext').addEventListener('click', () => step(1));
  $('#mClose').addEventListener('click', () => modal.close());
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.close(); });
  modal.addEventListener('close', () => {
    if (modal.open) return; /* נפתח מחדש מיד — מעבר בין תרגילים */
    if (mPlayer) mPlayer.pause();
    $$('#mPane .facade').forEach((f) => (f.innerHTML = ''));
    history.replaceState(null, '', location.pathname + location.search);
  });
  modal.addEventListener('keydown', (e) => {
    if (e.target.closest('input, #mTabs')) return;
    if (e.key === 'ArrowLeft') step(1);
    if (e.key === 'ArrowRight') step(-1);
  });

  /* ---------- video facades ---------- */
  function facadeHTML(v) {
    return `<button class="facade" data-yt="${esc(v.id)}" aria-label="נגן: ${esc(v.title)}"><img loading="lazy" src="https://i.ytimg.com/vi/${esc(v.id)}/hqdefault.jpg" alt="" /><span class="pbtn">${icon('i-play')}</span></button>`;
  }
  function bindFacades(root) {
    $$('.facade[data-yt]', root).forEach((f) => f.addEventListener('click', () => {
      const id = f.dataset.yt;
      if (location.protocol === 'file:') { window.open('https://www.youtube.com/watch?v=' + id, '_blank', 'noopener'); return; }
      const ifr = document.createElement('iframe');
      ifr.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`;
      ifr.title = f.getAttribute('aria-label');
      ifr.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
      ifr.allowFullscreen = true;
      ifr.referrerPolicy = 'strict-origin-when-cross-origin';
      const box = Object.assign(document.createElement('div'), { className: 'facade' });
      box.appendChild(ifr);
      f.replaceWith(box);
    }, { once: true }));
  }

  /* ---------- progressions ---------- */
  let progI = 0;
  function renderProgTabs() {
    $('#progTabs').innerHTML = KX.progressions.map((p, i) => `<button class="ptab" role="tab" aria-selected="${i === progI}" style="--c:${catColor(p.cat)}" data-i="${i}"><small>${esc(p.title)}</small><b>${esc(p.goal)}</b></button>`).join('');
  }
  function renderProg() {
    const p = KX.progressions[progI], c = catColor(p.cat), n = p.steps.length;
    const panel = $('#progPanel');
    panel.style.setProperty('--c', c);
    panel.innerHTML = `
      <div class="pp-head"><div><h3>מסלול ${esc(p.title)}: <span>${esc(p.goal)}</span></h3><p>${n} שלבים · התחילו מהשלב שבו אתם עדיין לא עומדים ביעד</p></div></div>
      <ol class="ladder">${p.steps.map((s, i) => `
        <li class="rung" style="--p:${(i / (n - 1)).toFixed(2)};--p2:${((i + 1) / (n - 1)).toFixed(2)};animation-delay:${i * 60}ms">
          <span class="n">${i + 1}</span>
          <div class="card"><h4>${esc(s.n)}</h4><span class="goal">יעד: <b>${esc(s.c)}</b></span>${s.ex ? `<button class="demo" data-ex="${s.ex}">${icon('i-play')} הדגמה</button>` : ''}</div>
        </li>`).join('')}</ol>
      <p class="pp-rule">${icon('i-bolt')}<span>כלל הזהב: טכניקה מושלמת לפני התקדמות. אם הביצוע "נשבר", חזרו שלב אחד אחורה.</span></p>`;
  }
  renderProgTabs(); renderProg();
  $('#progTabs').addEventListener('click', (e) => {
    const b = e.target.closest('.ptab'); if (!b) return;
    progI = +b.dataset.i;
    $$('.ptab').forEach((x) => x.setAttribute('aria-selected', x === b));
    renderProg();
  });
  $('#progPanel').addEventListener('click', (e) => { const b = e.target.closest('[data-ex]'); if (b) openEx(b.dataset.ex); });

  /* ---------- programs ---------- */
  let pgI = 0;
  $('#progList').innerHTML = KX.programs.map((p, i) => `<button class="pitem" role="tab" aria-selected="${i === 0}" data-i="${i}"><span class="th"><img loading="lazy" src="${KX.img(p.img, 200)}" alt="" /></span><span><b>${esc(p.title)}</b><small>${esc(p.freq)} · ${esc(p.level)}</small></span></button>`).join('');
  function renderPg() {
    const p = KX.programs[pgI];
    $('#progDetail').innerHTML = `
      <div class="pd-hero"><img src="${KX.img(p.img, 1400)}" alt="" /><div class="pd-title"><small>${esc(p.sub)}</small><h3>${esc(p.title)}</h3></div></div>
      <div class="pd-body">
        <div class="pd-meta"><span class="tag tag-accent">${esc(p.level)}</span><span class="tag">${icon('i-timer')} ${esc(p.dur)}</span><span class="tag">${esc(p.freq)}</span><span class="tag">${esc(p.equip)}</span></div>
        <p class="pd-sum">${esc(p.summary)}</p>
        <div class="pd-blocks">${p.blocks.map((b) => `<div class="pd-block"><h4>${esc(b.h)}</h4><ul>${b.items.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>`).join('')}</div>
        <p class="callout">${icon('i-bolt')}<span><b>כלל התקדמות:</b> ${esc(p.rule)}</span></p>
      </div>`;
  }
  renderPg();
  $('#progList').addEventListener('click', (e) => {
    const b = e.target.closest('.pitem'); if (!b) return;
    pgI = +b.dataset.i;
    $$('.pitem').forEach((x) => x.setAttribute('aria-selected', x === b));
    renderPg();
    if (innerWidth <= 1100) $('#progDetail').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  });

  /* ---------- builder ---------- */
  const wz = $('#wizard');
  let wzStep = 0;
  const sliders = [['sPush', 'oPush', 'lPush', 'push'], ['sPull', 'oPull', 'lPull', 'pull'], ['sDip', 'oDip', 'lDip', 'dip'], ['sSquat', 'oSquat', 'lSquat', 'squat']];
  function syncSlider([s, o, l, kind]) {
    const el = $('#' + s), v = +el.value;
    $('#' + o).textContent = v + (+el.max === v ? '+' : '');
    $('#' + l).textContent = KX.builder.levelLabel(kind, v);
    el.style.setProperty('--p', ((v - el.min) / (el.max - el.min)) * 100 + '%');
  }
  sliders.forEach((s) => { $('#' + s[0]).addEventListener('input', () => syncSlider(s)); syncSlider(s); });
  function goStep(n) {
    wzStep = Math.max(0, Math.min(3, n));
    $$('.wz-pane', wz).forEach((p) => p.classList.toggle('on', +p.dataset.pane === wzStep));
    $$('.wz-steps li', wz).forEach((li) => { const i = +li.dataset.step; li.classList.toggle('on', i === wzStep); li.classList.toggle('done', i < wzStep); });
    $$('.wz-dots i', wz).forEach((d, i) => d.classList.toggle('on', i === wzStep));
    $('#wzBack').disabled = wzStep === 0;
    $('#wzNext').innerHTML = wzStep === 3 ? `צור את התוכנית שלי ${icon('i-bolt')}` : `המשך ${icon('i-arrow')}`;
  }
  $$('.wz-steps li', wz).forEach((li) => li.addEventListener('click', () => goStep(+li.dataset.step)));
  $('#wzBack').addEventListener('click', () => goStep(wzStep - 1));
  $('#wzNext').addEventListener('click', () => { if (wzStep < 3) goStep(wzStep + 1); else generate(true); });

  function readInput() {
    const f = new FormData(wz);
    const eq = {};
    $$('input[name=eq]', wz).forEach((c) => (eq[c.value] = c.checked));
    return { goal: f.get('goal'), days: +f.get('days'), time: +f.get('time'), equip: eq, push: +$('#sPush').value, pull: +$('#sPull').value, dip: +$('#sDip').value, squat: +$('#sSquat').value };
  }
  function writeInput(inp) {
    const set = (name, v) => { const r = $(`input[name=${name}][value="${v}"]`, wz); if (r) r.checked = true; };
    set('goal', inp.goal); set('days', inp.days); set('time', inp.time);
    $$('input[name=eq]', wz).forEach((c) => { if (!c.disabled) c.checked = !!inp.equip[c.value]; });
    $('#sPush').value = inp.push; $('#sPull').value = inp.pull; $('#sDip').value = inp.dip; $('#sSquat').value = inp.squat;
    sliders.forEach(syncSlider);
  }
  let lastPlan = null;
  function generate(scroll, saved) {
    const inp = readInput();
    const plan = KX.builder.build(inp);
    lastPlan = { inp, plan };
    const out = $('#plan');
    const VC = { push: ['דחיפה', KX.cats.push.color], pull: ['משיכה', KX.cats.pull.color], legs: ['רגליים', KX.cats.legs.color], core: ['ליבה', KX.cats.core.color] };
    out.innerHTML = `
      <div class="plan-head">
        <div><p class="eyebrow">${saved ? 'התוכנית השמורה שלך' : 'התוכנית שלך מוכנה'}</p><h3>${esc(plan.split)}</h3>
          <div class="tags"><span class="tag tag-accent">מטרה: ${esc(plan.goal)}</span><span class="tag">${inp.days} אימונים בשבוע</span><span class="tag">${inp.time} דק׳ לאימון</span><span class="tag">רמה: ${esc(plan.overall)}</span></div></div>
        <div class="plan-actions">
          <button class="btn btn-ghost btn-sm" data-act="save">${icon('i-save')} שמור</button>
          <button class="btn btn-ghost btn-sm" data-act="copy">${icon('i-copy')} העתק</button>
          <button class="btn btn-ghost btn-sm" data-act="print">${icon('i-print')} הדפס</button>
        </div>
      </div>
      <ol class="wkstrip" aria-label="לוח שבועי">${plan.days.map((d) => `<li class="${d.rest ? 'off' : 'on'}"><b>${d.day}</b><span>${d.rest ? 'מנוחה' : esc(d.name)}</span></li>`).join('')}</ol>
      <div class="week">${plan.days.filter((d) => !d.rest).map((d, i) =>
        `<div class="day" style="animation-delay:${i * 60}ms"><div class="day-h"><b>יום ${d.day}</b><small>${esc(d.name)}</small></div><ul>${d.items.map((it) => `
            <li class="${it.skill ? 'sk' : ''}"><span>${it.ex ? `<button class="nm" data-ex="${it.ex}">${esc(it.n)}</button>` : `<span class="nm">${esc(it.n)}</span>`}${it.note ? `<span class="note">${esc(it.note)}</span>` : ''}</span><span class="rx">${esc(it.rx)}</span></li>`).join('')}</ul></div>`).join('')}</div>
      <div class="plan-extra">
        <div class="vol"><h4>נפח שבועי (סטים)</h4>${Object.keys(VC).map((k) => `<div class="vbar" style="--c:${VC[k][1]}"><span>${VC[k][0]}</span><span class="tr"><span class="fill" data-w="${Math.min(100, (plan.volume[k] / 30) * 100)}"></span></span><b>${plan.volume[k]}</b></div>`).join('')}<small>האזור המודגש = 15–30 סטים לדפוס תנועה בשבוע, שהם בערך 10–20 סטים לשריר.</small></div>
        <div class="tips"><h4>כללי המשחק</h4><ul>${plan.tips.map((t) => `<li>${esc(t)}</li>`).join('')}</ul></div>
      </div>`;
    out.hidden = false;
    requestAnimationFrame(() => setTimeout(() => $$('.fill', out).forEach((f) => (f.style.width = f.dataset.w + '%')), 80));
    if (scroll) { out.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }); out.focus({ preventScroll: true }); }
  }
  function planText() {
    const { inp, plan } = lastPlan;
    let t = `KALOS: תוכנית אימון אישית\n${plan.split} · מטרה: ${plan.goal} · ${inp.days} אימונים בשבוע\n\n`;
    plan.days.forEach((d) => {
      if (d.rest) { t += `יום ${d.day}: מנוחה\n\n`; return; }
      t += `יום ${d.day}: ${d.name}\n` + d.items.map((it) => `  • ${it.n}: ${it.rx}${it.note ? ' (' + it.note + ')' : ''}`).join('\n') + '\n\n';
    });
    return t + plan.tips.map((x) => '- ' + x).join('\n');
  }
  $('#plan').addEventListener('click', (e) => {
    const exb = e.target.closest('[data-ex]'); if (exb) { openEx(exb.dataset.ex); return; }
    const b = e.target.closest('[data-act]'); if (!b) return;
    const act = b.dataset.act;
    if (act === 'print') window.print();
    if (act === 'save') { try { localStorage.setItem('kalos.plan', JSON.stringify(lastPlan.inp)); toast('התוכנית נשמרה בדפדפן ✓'); } catch (_) { toast('לא ניתן לשמור בדפדפן הזה'); } }
    if (act === 'copy') {
      const txt = planText();
      (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(() => toast('התוכנית הועתקה ✓'), () => {
        const ta = Object.assign(document.createElement('textarea'), { value: txt });
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); toast('התוכנית הועתקה ✓');
      });
    }
  });
  try {
    const saved = JSON.parse(localStorage.getItem('kalos.plan') || 'null');
    if (saved && saved.goal) { writeInput(saved); generate(false, true); }
  } catch (_) { /* ignore */ }

  /* ---------- principles ---------- */
  $('#bento').innerHTML = KX.principles.map((p) => `<article class="bt reveal${p.wide ? ' wide' : ''}"><span class="big">${esc(p.big)}</span><span class="unit">${esc(p.unit)}</span><h3>${esc(p.h)}</h3><p>${esc(p.p)}</p></article>`).join('');
  $('#warmList').innerHTML = KX.warmup.map((w) => `<li><span>${esc(w.n)}</span><small>${esc(w.t)}</small></li>`).join('');

  /* ---------- videos ---------- */
  $('#vidGrid').innerHTML = Object.keys(KX.videos).map((id) => {
    const v = KX.videos[id], ex = KX.exMap[id];
    return `<article class="vid reveal">${facadeHTML(v)}<div class="vid-body"><p class="t">${esc(v.title)}</p><div class="meta"><span>${esc(v.ch)}</span><button data-ex="${id}">הדגמה: ${esc(ex.name)} ←</button></div></div></article>`;
  }).join('');
  bindFacades($('#vidGrid'));
  $('#vidGrid').addEventListener('click', (e) => { const b = e.target.closest('button[data-ex]'); if (b) openEx(b.dataset.ex); });

  /* ---------- gallery + lightbox ---------- */
  const lb = $('#lightbox');
  $('#masonry').innerHTML = KX.gallery.map((g, i) => `<figure class="reveal" tabindex="0" role="button" aria-label="הגדל: ${esc(g.alt)}" data-i="${i}"><img loading="lazy" src="${KX.img(g.k, 900)}" alt="${esc(g.alt)}" /><figcaption>${esc(g.alt)}</figcaption></figure>`).join('');
  const openLb = (i) => { const g = KX.gallery[i]; $('#lbImg').src = KX.img(g.k, 1800); $('#lbImg').alt = g.alt; $('#lbCap').textContent = g.alt + ' · Pexels'; lb.showModal(); };
  $('#masonry').addEventListener('click', (e) => { const f = e.target.closest('figure'); if (f) openLb(+f.dataset.i); });
  $('#masonry').addEventListener('keydown', (e) => { const f = e.target.closest('figure'); if (f && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openLb(+f.dataset.i); } });
  lb.addEventListener('click', (e) => { if (e.target === lb || e.target.closest('.lb-close')) lb.close(); });

  /* ---------- FAQ ---------- */
  $('#faqList').innerHTML = KX.faq.map((f, i) => `<details class="reveal"${i === 0 ? ' open' : ''}><summary>${esc(f.q)}<i aria-hidden="true"></i></summary><p class="ans">${esc(f.a)}</p></details>`).join('');
  $$('#faqList details').forEach((d) => d.addEventListener('toggle', () => { if (d.open) $$('#faqList details').forEach((o) => { if (o !== d) o.open = false; }); }));

  /* ---------- timer ---------- */
  const T = { total: 90, left: 90, run: false, id: null, queue: null, qi: 0 };
  const fab = $('#timerFab'), panel = $('#timerPanel'), ringFg = $('#ringFg');
  const C = 2 * Math.PI * 52;
  ringFg.style.strokeDasharray = C;
  const fmt = (s) => Math.floor(s / 60) + ':' + String(Math.ceil(s % 60) === 60 ? 0 : Math.ceil(s % 60)).padStart(2, '0');
  function drawT() {
    $('#tpTime').textContent = fmt(Math.max(0, T.left));
    ringFg.style.strokeDashoffset = C * (1 - Math.max(0, T.left) / T.total);
    $('#tpGo').textContent = T.run ? 'השהה' : T.left < T.total ? 'המשך' : 'התחל';
    $('#timer').classList.toggle('running', T.run);
  }
  function beep() {
    try {
      const ac = new (window.AudioContext || window.webkitAudioContext)();
      [0, 0.22, 0.44].forEach((d, i) => {
        const o = ac.createOscillator(), g = ac.createGain();
        o.frequency.value = i === 2 ? 1320 : 880; o.connect(g); g.connect(ac.destination);
        g.gain.setValueAtTime(0.0001, ac.currentTime + d);
        g.gain.exponentialRampToValueAtTime(0.25, ac.currentTime + d + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + d + 0.18);
        o.start(ac.currentTime + d); o.stop(ac.currentTime + d + 0.2);
      });
    } catch (_) { /* no audio */ }
    if (navigator.vibrate) navigator.vibrate([120, 80, 120]);
  }
  function setT(sec) { T.total = T.left = sec; stopT(); drawT(); }
  function stopT() { T.run = false; clearInterval(T.id); drawT(); }
  function startT() {
    T.run = true;
    let last = performance.now();
    clearInterval(T.id);
    T.id = setInterval(() => {
      const now = performance.now(); T.left -= (now - last) / 1000; last = now;
      if (T.left <= 0) { T.left = 0; stopT(); beep(); nextWarm(); }
      drawT();
    }, 200);
    drawT();
  }
  function togglePanel(open) {
    panel.hidden = !open;
    fab.setAttribute('aria-expanded', open);
  }
  fab.addEventListener('click', () => togglePanel(panel.hidden));
  $('#tpPresets').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    endWarm();
    $$('#tpPresets button').forEach((x) => x.classList.toggle('on', x === b));
    setT(+b.dataset.sec);
  });
  $('#tpGo').addEventListener('click', () => (T.run ? stopT() : (T.left <= 0 && setT(T.total), startT())));
  $('#tpReset').addEventListener('click', () => { endWarm(); setT(T.total); });
  drawT();

  /* חימום מודרך */
  const warmItems = () => $$('#warmList li');
  function showWarm() {
    warmItems().forEach((li, i) => { li.classList.toggle('on', i === T.qi); li.classList.toggle('done', i < T.qi); });
    const w = KX.warmup[T.qi];
    $('#tpTitle').textContent = `חימום · ${T.qi + 1}/${KX.warmup.length}`;
    $('#tpSub').textContent = w.n + ' (' + w.t + ')';
  }
  function nextWarm() {
    if (!T.queue) return;
    T.qi++;
    if (T.qi >= KX.warmup.length) { endWarm(); toast('החימום הושלם — בהצלחה באימון! 💪'); return; }
    showWarm(); setT(45); startT();
  }
  function endWarm() {
    if (!T.queue) return;
    T.queue = null;
    warmItems().forEach((li) => li.classList.remove('on', 'done'));
    $('#tpTitle').textContent = 'שעון מנוחה';
    $('#tpSub').textContent = '';
  }
  $('#warmStart').addEventListener('click', () => {
    T.queue = true; T.qi = 0;
    togglePanel(true); showWarm(); setT(45); startT();
    toast('חימום מודרך: 45 שניות לכל שלב');
  });

  /* ---------- reveal init + deep link ---------- */
  observeReveal(document);
  const m = location.hash.match(/^#ex-([a-z]+)/);
  if (m && KX.exMap[m[1]]) setTimeout(() => openEx(m[1]), 300);
})();
