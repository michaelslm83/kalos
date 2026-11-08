/* KALOS — מצא פארק: מתקני כושר, מוטות מתח ומגרשים ציבוריים בקרבתכם
   מקור הנתונים: OpenStreetMap (Overpass לחיפוש מקומות, Nominatim לחיפוש עיר/כתובת).
   המיקום נשלח רק לשרתי החיפוש של OpenStreetMap ברגע החיפוש, ולא נשמר. "הפארקים שלי" נשמרים במכשיר בלבד. */
(function () {
  'use strict';
  const KX = window.KX;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icon = (id) => `<svg class="ico" aria-hidden="true"><use href="#${id}"/></svg>`;
  const root = $('#parks');
  if (!root) return;

  const OVERPASS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter', 'https://overpass.private.coffee/api/interpreter'];
  const NOMINATIM = 'https://nominatim.openstreetmap.org/search';

  /* ציוד (תג OSM fitness_station=*) → שם בעברית + תרגילים מהאתר */
  const EQUIP = {
    horizontal_bar: ['מוט מתח', ['pullup', 'chinup', 'hangknee', 'deadhang']],
    chin_up: ['מוט מתח', ['pullup', 'chinup']],
    parallel_bars: ['מקבילים', ['dip', 'lsit']],
    dip: ['מקבילים', ['dip']],
    rings: ['טבעות', ['row', 'dip']],
    wall_bars: ['סולם שוודי', ['legraise', 'deadhang']],
    horizontal_ladder: ['סולם קופים', ['deadhang', 'hangknee']],
    monkey_bars: ['סולם קופים', ['deadhang', 'hangknee']],
    'push-up': ['שכיבות סמיכה', ['pushup', 'incline']],
    push_up: ['שכיבות סמיכה', ['pushup', 'incline']],
    'sit-up': ['ספסל בטן', ['crunch', 'vup']],
    sit_up: ['ספסל בטן', ['crunch', 'vup']],
    bench: ['ספסל', ['benchdip', 'stepup']],
    balance_beam: ['קורת שיווי משקל', []],
    stretch: ['עמדת מתיחות', []],
    hyperextension: ['פשיטת גב', ['superman']],
    beam_jump: ['קפיצות', ['jumpsquat']],
    steps: ['מדרגות', ['stepup']],
    rower: ['חתירה', []],
    air_walker: ['הליכון אוויר', []],
    elliptical_trainer: ['אליפטיקל', []],
    exercise_bike: ['אופני כושר', []],
    leg_press: ['לחיצת רגליים', []],
    chest_press: ['לחיצת חזה', []],
    shoulder_press: ['לחיצת כתפיים', []],
    pull_down: ['פולי עליון', []],
    rotator: ['מסובב מותניים', []],
    slalom_poles: ['עמודי סלאלום', []],
  };
  const CALI = new Set(['horizontal_bar', 'chin_up', 'parallel_bars', 'dip', 'rings', 'wall_bars', 'horizontal_ladder', 'monkey_bars']);
  const TYPES = {
    gym: { name: 'מתקני כושר', one: 'פינת כושר' },
    pitch: { name: 'מגרשים', one: 'מגרש ספורט' },
    track: { name: 'מסלולי ריצה', one: 'מסלול ריצה' },
  };
  const SPORT_HE = { multi: 'רב־תכליתי', basketball: 'כדורסל', soccer: 'כדורגל', tennis: 'טניס', volleyball: 'כדורעף', beachvolleyball: 'כדורעף חופים', running: 'ריצה', athletics: 'אתלטיקה', fitness: 'כושר', calisthenics: 'קליסתניקס', skateboard: 'סקייטבורד', table_tennis: 'טניס שולחן', handball: 'כדוריד' };

  /* ---------- גיאומטריה ---------- */
  const R = Math.PI / 180;
  function dist(a, b) {
    const dLat = (b[0] - a[0]) * R, dLon = (b[1] - a[1]) * R;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * R) * Math.cos(b[0] * R) * Math.sin(dLon / 2) ** 2;
    return 2 * 6371000 * Math.asin(Math.sqrt(h));
  }
  function bearing(a, b) {
    const y = Math.sin((b[1] - a[1]) * R) * Math.cos(b[0] * R);
    const x = Math.cos(a[0] * R) * Math.sin(b[0] * R) - Math.sin(a[0] * R) * Math.cos(b[0] * R) * Math.cos((b[1] - a[1]) * R);
    return (Math.atan2(y, x) / R + 360) % 360;
  }
  const fmtDist = (m) => (m < 1000 ? Math.round(m / 10) * 10 + ' מ׳' : (m / 1000).toFixed(m < 10000 ? 1 : 0) + ' ק״מ');
  const DIRS = ['צפונה', 'צפון־מזרח', 'מזרחה', 'דרום־מזרח', 'דרומה', 'דרום־מערב', 'מערבה', 'צפון־מערב'];
  const dirName = (deg) => DIRS[Math.round(deg / 45) % 8];

  /* ---------- רשת ---------- */
  async function fetchJSON(url, opts, ms) {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), ms || 25000);
    try {
      const r = await fetch(url, Object.assign({ signal: ctl.signal }, opts));
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return await r.json();
    } finally { clearTimeout(t); }
  }
  async function overpass(lat, lon, radius, onRetry) {
    const A = `(around:${radius},${lat.toFixed(5)},${lon.toFixed(5)})`;
    const q = `[out:json][timeout:25];
(
  nwr["leisure"="fitness_station"]${A};
  nwr["sport"="calisthenics"]["leisure"!="fitness_centre"]["leisure"!="sports_centre"]${A};
  nwr["leisure"="pitch"]["access"!="private"]${A};
  nwr["leisure"="track"]["sport"~"running|athletics"]${A};
);
out center tags 600;
way["leisure"="park"]["name"]${A};
out center tags 300;`;
    /* כמה שרתים; אם כולם עמוסים — המתנה קצרה וניסיון נוסף */
    let err;
    for (let round = 0; round < 2; round++) {
      if (round) await new Promise((res) => setTimeout(res, 2500));
      for (const [n, u] of OVERPASS.entries()) {
        if (n || round) onRetry && onRetry();
        try { return await fetchJSON(u, { method: 'POST', body: new URLSearchParams({ data: q }) }, 20000); } catch (e) { err = e; }
      }
    }
    throw err;
  }
  async function geocode(text) {
    const u = `${NOMINATIM}?format=jsonv2&limit=1&accept-language=he&q=${encodeURIComponent(text)}`;
    const j = await fetchJSON(u, {}, 15000);
    if (!j.length) return null;
    return { lat: +j[0].lat, lon: +j[0].lon, label: j[0].display_name.split(',').slice(0, 2).join(',') };
  }

  /* ---------- עיבוד: איחוד מתקנים סמוכים לנקודה אחת, שיוך לפארק ---------- */
  function process(data, here) {
    const parks = [], items = [];
    (data.elements || []).forEach((e) => {
      const t = e.tags || {};
      const lat = e.lat != null ? e.lat : e.center && e.center.lat, lon = e.lon != null ? e.lon : e.center && e.center.lon;
      if (lat == null) return;
      const p = [lat, lon];
      if (t.leisure === 'park') { parks.push({ name: (KX.isEn ? t['name:en'] : t['name:he']) || t.name, p }); return; }
      let type = 'gym';
      if (t.leisure === 'pitch') type = (t.sport === 'calisthenics' || t.sport === 'fitness') ? 'gym' : 'pitch';
      else if (t.leisure === 'track') type = 'track';
      items.push({ type, p, t, id: e.type + '/' + e.id });
    });
    const spots = [];
    items.forEach((it) => {
      if (it.type === 'gym') {
        const s = spots.find((x) => x.type === 'gym' && dist(x.p, it.p) < 90);
        if (s) { s.members.push(it); s.p = [(s.p[0] * (s.members.length - 1) + it.p[0]) / s.members.length, (s.p[1] * (s.members.length - 1) + it.p[1]) / s.members.length]; return; }
      }
      spots.push({ type: it.type, p: it.p.slice(), members: [it], id: it.id });
    });
    spots.forEach((s) => {
      const tags = s.members.map((m) => m.t);
      const eq = new Map();
      tags.forEach((t) => String(t.fitness_station || '').split(';').map((v) => v.trim()).filter(Boolean).forEach((v) => { if (EQUIP[v]) eq.set(EQUIP[v][0], EQUIP[v][1]); if (CALI.has(v)) s.cali = true; }));
      if (tags.some((t) => t.sport === 'calisthenics')) s.cali = true;
      s.equip = Array.from(eq.keys());
      s.exIds = Array.from(new Set([].concat(...eq.values()))).filter((id) => KX.exMap && KX.exMap[id]).slice(0, 5);
      const own = tags.map((t) => (KX.isEn ? t['name:en'] : t['name:he']) || t.name).find(Boolean);
      let near = null, nd = 1e9;
      parks.forEach((pk) => { const d = dist(pk.p, s.p); if (d < nd) { nd = d; near = pk; } });
      s.park = near && nd < 350 ? near.name : null;
      s.lit = tags.some((t) => t.lit === 'yes');
      s.sports = Array.from(new Set(tags.map((t) => t.sport).filter(Boolean).join(';').split(';').map((x) => SPORT_HE[x.trim()]).filter(Boolean)));
      const kind = s.type === 'pitch' && s.sports.length === 1 ? 'מגרש ' + s.sports[0] : TYPES[s.type].one;
      s.name = own || (s.park ? kind + ' · ' + s.park : kind);
      s.surface = tags.map((t) => t.surface).find(Boolean);
      s.d = dist(here, s.p);
      s.b = bearing(here, s.p);
      s.count = s.members.length;
    });
    /* קליסתניקס קודם, אחריו מתקני כושר, ואז מגרשים — אלא אם הם רחוקים בהרבה */
    const score = (x) => x.d - (x.cali ? 700 : x.type === 'gym' ? 350 : 0);
    spots.sort((a, b) => score(a) - score(b));
    return spots;
  }

  /* ---------- מצב ---------- */
  let radius = 2000, here = null, hereLabel = '', spots = [], filter = 'all', sel = null, busy = false;
  const saved = () => KX.store.get('parks', []);
  const isSaved = (s) => saved().some((x) => x.id === s.id);
  function toggleSave(s) {
    const list = saved();
    const i = list.findIndex((x) => x.id === s.id);
    if (i > -1) list.splice(i, 1);
    else list.unshift({ id: s.id, name: s.name, p: s.p, type: s.type, equip: s.equip, cali: !!s.cali, ts: Date.now() });
    KX.store.set('parks', list.slice(0, 30));
    renderSaved();
    renderList();
    if (KX.app && KX.app.toast) KX.app.toast(i > -1 ? 'הוסר מהפארקים שלי' : 'נשמר בפארקים שלי');
  }

  const status = (msg, tone) => { const el = $('#pkStatus'); el.textContent = msg || ''; el.dataset.tone = tone || ''; };
  const ua = navigator.userAgent || '';
  const isApple = /iPhone|iPad|iPod|Macintosh/.test(ua);
  const navLinks = (p, name) => {
    const ll = p[0].toFixed(6) + ',' + p[1].toFixed(6);
    const links = [
      ['Waze', `https://waze.com/ul?ll=${ll}&navigate=yes`],
      ['Google Maps', `https://www.google.com/maps/dir/?api=1&destination=${ll}`],
      ['Apple Maps', `https://maps.apple.com/?daddr=${ll}&q=${encodeURIComponent(name)}`],
    ];
    if (isApple) links.unshift(links.pop());
    return links.map(([n, u]) => `<a class="pk-nav" href="${esc(u)}" target="_blank" rel="noopener">${esc(n)}</a>`).join('');
  };

  function spotHTML(s, i) {
    const on = sel === s;
    const ex = s.exIds.map((id) => `<button type="button" class="pk-ex" data-ex="${id}">${esc(KX.exMap[id].name)}</button>`).join('');
    const facts = [
      s.type === 'gym' ? (s.count > 1 ? `${s.count} מתקנים` : 'מתקן כושר') : s.sports.length > 1 ? s.sports.join(' · ') : '',
      s.lit ? 'מואר בלילה' : '',
      s.surface === 'rubber' || s.surface === 'tartan' ? 'משטח גומי' : '',
    ].filter(Boolean);
    return `<li class="pk-item${on ? ' on' : ''}${s.cali ? ' cali' : ''}" data-i="${i}">
      <button type="button" class="pk-main" aria-expanded="${on}" aria-controls="pkMap">
        <span class="pk-dist"><b>${fmtDist(s.d)}</b><small>${dirName(s.b)}</small></span>
        <span class="pk-txt"><span class="pk-name">${esc(s.name)}</span><span class="pk-facts">${s.cali ? '<span class="pk-badge">מתאים לקליסתניקס</span>' : ''}${facts.map(esc).join(' · ')}</span>
        ${s.equip.length ? `<span class="pk-eq">${s.equip.map((e) => `<i>${esc(e)}</i>`).join('')}</span>` : ''}</span>
      </button>
      <div class="pk-more"${on ? '' : ' hidden'}>
        ${ex ? `<p class="pk-lbl">אפשר לעשות כאן</p><div class="pk-exs">${ex}</div>` : ''}
        <p class="pk-lbl">ניווט</p><div class="pk-navs">${navLinks(s.p, s.name)}</div>
        <button type="button" class="btn btn-ghost btn-sm pk-save" aria-pressed="${isSaved(s)}">${isSaved(s) ? '★ שמור בפארקים שלי' : '☆ שמור בפארקים שלי'}</button>
      </div>
    </li>`;
  }
  const visible = () => spots.filter((s) => filter === 'all' || (filter === 'cali' ? s.cali : s.type === filter));
  function renderList() {
    const list = visible();
    $('#pkList').innerHTML = list.length ? list.slice(0, 40).map((s) => spotHTML(s, spots.indexOf(s))).join('') : (here ? '<li class="pk-empty">לא נמצאו מקומות מהסוג הזה ברדיוס. נסו להגדיל את הרדיוס או לבחור "הכל".</li>' : '');
    renderRadar();
  }
  function renderFilters() {
    const n = (f) => spots.filter((s) => (f === 'all' ? true : f === 'cali' ? s.cali : s.type === f)).length;
    const fs = [['all', 'הכל'], ['cali', 'קליסתניקס'], ['gym', TYPES.gym.name], ['pitch', TYPES.pitch.name], ['track', TYPES.track.name]].filter(([f]) => f === 'all' || n(f));
    $('#pkFilters').innerHTML = fs.map(([f, name]) => `<button type="button" class="chip chip-g" aria-pressed="${f === filter}" data-f="${f}">${esc(name)} <b>${n(f)}</b></button>`).join('');
    $('#pkFilters').hidden = !spots.length;
  }

  /* רדאר: אתם במרכז, הנקודות לפי כיוון ומרחק (צפון למעלה) */
  function renderRadar() {
    const svg = $('#pkRadar');
    if (!here) { svg.innerHTML = ''; svg.parentElement.hidden = true; return; }
    svg.parentElement.hidden = false;
    const C = 100, RR = 88, list = visible().slice(0, 40);
    const rings = [0.33, 0.66, 1].map((k) => `<circle cx="${C}" cy="${C}" r="${(RR * k).toFixed(1)}" class="pk-ring"/>`).join('');
    const labels = [0.33, 0.66, 1].map((k) => `<text x="${C + 3}" y="${(C - RR * k + 9).toFixed(1)}" class="pk-rl">${fmtDist(radius * k)}</text>`).join('');
    const dots = list.map((s) => {
      const r = Math.min(1, s.d / radius) * RR, a = (s.b - 90) * R;
      const x = C + r * Math.cos(a), y = C + r * Math.sin(a);
      return `<g class="pk-dot${s === sel ? ' on' : ''}${s.cali ? ' cali' : ''}" data-i="${spots.indexOf(s)}" tabindex="-1"><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${s === sel ? 7 : 4.5}"><title>${esc(s.name)} · ${fmtDist(s.d)}</title></circle></g>`;
    }).join('');
    svg.innerHTML = `${rings}<line x1="${C}" y1="${C - RR - 6}" x2="${C}" y2="${C + RR + 6}" class="pk-axis"/><line x1="${C - RR - 6}" y1="${C}" x2="${C + RR + 6}" y2="${C}" class="pk-axis"/>
      <text x="${C}" y="9" class="pk-n">צ</text>${labels}${dots}<circle cx="${C}" cy="${C}" r="6" class="pk-me"/><circle cx="${C}" cy="${C}" r="12" class="pk-me-ring"/>`;
  }
  /* מפה (OpenStreetMap) לנקודה הנבחרת — נטענת רק בבחירה */
  function renderMap() {
    const box = $('#pkMap');
    if (!sel) { box.innerHTML = '<p class="pk-map-ph">בחרו מקום מהרשימה או מהרדאר כדי לראות אותו על המפה.</p>'; return; }
    const [la, lo] = sel.p, d = Math.max(0.004, Math.min(0.03, (sel.d / 111000) * 1.4));
    const bbox = [Math.min(lo, here[1]) - d * 0.6, Math.min(la, here[0]) - d * 0.4, Math.max(lo, here[1]) + d * 0.6, Math.max(la, here[0]) + d * 0.4].map((n) => n.toFixed(5)).join(',');
    const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${la.toFixed(6)},${lo.toFixed(6)}`;
    box.innerHTML = `<iframe title="מפה: ${esc(sel.name)}" src="${esc(src)}" loading="lazy" referrerpolicy="no-referrer"></iframe>
      <a class="pk-map-big" href="https://www.openstreetmap.org/?mlat=${la.toFixed(6)}&mlon=${lo.toFixed(6)}#map=17/${la.toFixed(5)}/${lo.toFixed(5)}" target="_blank" rel="noopener">מפה גדולה ↗</a>`;
  }
  function select(i, scroll) {
    const s = spots[i];
    sel = sel === s ? null : s;
    renderList();
    renderMap();
    if (sel && scroll) { const li = $(`#pkList .pk-item[data-i="${i}"]`); if (li) li.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
  }

  function renderSaved() {
    const list = saved(), box = $('#pkSaved');
    box.hidden = !list.length;
    $('#pkSavedList').innerHTML = list.map((s) => `<li><span class="pk-sv-n">${esc(s.name)}${s.cali ? ' <span class="pk-badge">קליסתניקס</span>' : ''}</span>
      <span class="pk-navs">${navLinks(s.p, s.name)}<button type="button" class="pk-nav pk-unsave" data-id="${esc(s.id)}" aria-label="הסר מהפארקים שלי">✕</button></span></li>`).join('');
  }

  async function search(lat, lon, label) {
    if (busy) return;
    busy = true;
    here = [lat, lon];
    hereLabel = label;
    sel = null;
    root.classList.add('pk-busy');
    status(`מחפש מתקנים ומגרשים ברדיוס ${fmtDist(radius)} ${label ? 'מ' + label : 'ממך'}…`);
    try {
      const data = await overpass(lat, lon, radius, () => status('שרת המפות עמוס — מנסה שרת נוסף…'));
      spots = process(data, here);
      const c = spots.filter((s) => s.cali).length;
      status(spots.length ? `נמצאו ${spots.length} מקומות${c ? `, ${c} מהם מתאימים לקליסתניקס` : ''} · ${label || 'סביב המיקום שלך'}` : `לא נמצאו מתקנים ברדיוס ${fmtDist(radius)}. נסו רדיוס גדול יותר.`, spots.length ? 'ok' : 'warn');
      if (filter !== 'all' && !visible().length) filter = 'all';
    } catch (e) {
      spots = [];
      status(navigator.onLine === false ? 'אין חיבור לאינטרנט — החיפוש צריך רשת. "הפארקים שלי" זמינים גם בלי חיבור.' : 'שרת המפות עמוס כרגע. נסו שוב בעוד רגע.', 'err');
    }
    busy = false;
    root.classList.remove('pk-busy');
    renderFilters();
    renderList();
    renderMap();
  }

  /* ---------- אירועים ---------- */
  $('#pkLocate').addEventListener('click', () => {
    if (!('geolocation' in navigator)) { status('הדפדפן לא תומך באיתור מיקום. חפשו לפי עיר או כתובת.', 'warn'); return; }
    if (!window.isSecureContext) { status('איתור מיקום עובד רק באתר מאובטח (https). חפשו לפי עיר או כתובת.', 'warn'); return; }
    status('מאתר את המיקום שלך…');
    navigator.geolocation.getCurrentPosition(
      (pos) => search(pos.coords.latitude, pos.coords.longitude, ''),
      (err) => status(err.code === 1 ? 'לא ניתנה הרשאת מיקום. אפשר לחפש לפי עיר או כתובת.' : 'לא הצלחנו לאתר מיקום. חפשו לפי עיר או כתובת.', 'warn'),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  });
  $('#pkForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const q = $('#pkQ').value.trim();
    if (!q || busy) return;
    status('מחפש את "' + q + '"…');
    try {
      const g = await geocode(q);
      if (!g) { status('לא מצאנו את המקום "' + q + '". נסו שם עיר או כתובת אחרת.', 'warn'); return; }
      search(g.lat, g.lon, g.label);
    } catch (_) { status(navigator.onLine === false ? 'אין חיבור לאינטרנט.' : 'החיפוש נכשל. נסו שוב.', 'err'); }
  });
  $('#pkRadius').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-r]'); if (!b) return;
    radius = +b.dataset.r;
    $$('#pkRadius button').forEach((x) => x.setAttribute('aria-pressed', x === b));
    if (here) search(here[0], here[1], hereLabel);
  });
  $('#pkFilters').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-f]'); if (!b) return;
    filter = b.dataset.f; sel = null;
    renderFilters(); renderList(); renderMap();
  });
  $('#pkList').addEventListener('click', (e) => {
    const exb = e.target.closest('.pk-ex');
    if (exb) { if (KX.openEx) KX.openEx(exb.dataset.ex); return; }
    const li = e.target.closest('.pk-item'); if (!li) return;
    if (e.target.closest('.pk-save')) { toggleSave(spots[+li.dataset.i]); return; }
    if (e.target.closest('.pk-main')) select(+li.dataset.i, false);
  });
  $('#pkRadar').addEventListener('click', (e) => { const g = e.target.closest('.pk-dot'); if (g) select(+g.dataset.i, true); });
  $('#pkSavedList').addEventListener('click', (e) => {
    const b = e.target.closest('.pk-unsave'); if (!b) return;
    KX.store.set('parks', saved().filter((x) => x.id !== b.dataset.id));
    renderSaved();
    if (spots.length) renderList();
  });

  renderSaved();
  renderMap();
  KX.parks = { search, process, dist };
})();
