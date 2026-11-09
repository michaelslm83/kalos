/* KALOS — מנוע הדגמות מונפשות (שלד דו-ממדי עם קינמטיקה הפוכה) */
(function () {
  'use strict';
  const KX = (window.KX = window.KX || {});
  const NS = 'http://www.w3.org/2000/svg';
  const R = Math.PI / 180;

  /* אורכי מקטעים (יחסים אנטומיים מקורבים) */
  const L = { thigh: 58, shin: 56, torso: 72, upper: 44, fore: 40, neck: 10, head: 14 };

  /* כיוון: 0° = ימינה, 90° = למעלה (מערכת מתמטית, ציר y של המסך הפוך) */
  const add = (p, len, d) => [p[0] + len * Math.cos(d * R), p[1] - len * Math.sin(d * R)];
  const ang = (a, b) => Math.atan2(-(b[1] - a[1]), b[0] - a[0]) / R;
  const lerp = (a, b, k) => a + (b - a) * k;
  const lerpP = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
  const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);

  /* קינמטיקה הפוכה לשני מקטעים. s=+1 — המפרק בצד "עם כיוון השעון" של הקו */
  function ik(a, t, l1, l2, s) {
    const dx = t[0] - a[0], dy = t[1] - a[1];
    let d = Math.max(Math.abs(l1 - l2) + 0.5, Math.min(l1 + l2 - 0.01, Math.hypot(dx, dy)));
    if (d > (l1 + l2) * 0.99) d = l1 + l2 - 0.01; /* כמעט ישר = ישר (נעילה) */
    const base = Math.atan2(dy, dx);
    const c = Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d)));
    const A = Math.acos(c);
    const j = [a[0] + l1 * Math.cos(base + s * A), a[1] + l1 * Math.sin(base + s * A)];
    const jt = Math.atan2(t[1] - j[1], t[0] - j[0]);
    return [j, [j[0] + l2 * Math.cos(jt), j[1] + l2 * Math.sin(jt)]];
  }

  const shoulderOf = (p) => add(p.hip, L.torso, p.t);

  /* סיבוב פלג גוף עליון סביב הכתף (שימושי ל"אגן שוקע") */
  function pivotTorso(p, delta) {
    const S = shoulderOf(p);
    const t = p.t + delta;
    return Object.assign({}, p, { t, hip: add(S, L.torso, t + 180) });
  }

  const DEF = { bend: 0, ht: 0, es: 1, ks: -1, es2: 1, ks2: -1, toe: null, toe2: null };
  const norm = (p) => Object.assign({}, DEF, p);

  /* גפה "נטועה" (לא זזה בעולם) — אינטרפולציה ישרה; אחרת — קשת סביב מפרק השורש,
     כדי שהגפה תסתובב באורך קבוע ולא "תתקפל" באמצע התנועה */
  function lerpLimb(pa, pb, ra, rb, ro, k) {
    if (Math.hypot(pa[0] - pb[0], pa[1] - pb[1]) < 1) return lerpP(pa, pb, k);
    const aa = Math.atan2(pa[1] - ra[1], pa[0] - ra[0]), ab = Math.atan2(pb[1] - rb[1], pb[0] - rb[0]);
    let d = ab - aa;
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    const la = Math.hypot(pa[0] - ra[0], pa[1] - ra[1]), lb = Math.hypot(pb[0] - rb[0], pb[1] - rb[1]);
    const an = aa + d * k, len = lerp(la, lb, k);
    return [ro[0] + len * Math.cos(an), ro[1] + len * Math.sin(an)];
  }
  function lerpPose(a, b, k) {
    const o = {};
    o.hip = lerpP(a.hip, b.hip, k);
    ['t', 'bend', 'ht'].forEach((f) => (o[f] = lerp(a[f], b[f], k)));
    const Sa = shoulderOf(a), Sb = shoulderOf(b), So = shoulderOf(o);
    o.hand = lerpLimb(a.hand, b.hand, Sa, Sb, So, k);
    o.foot = lerpLimb(a.foot, b.foot, a.hip, b.hip, o.hip, k);
    if (a.hand2 && b.hand2) o.hand2 = lerpLimb(a.hand2, b.hand2, Sa, Sb, So, k);
    if (a.foot2 && b.foot2) o.foot2 = lerpLimb(a.foot2, b.foot2, a.hip, b.hip, o.hip, k);
    ['toe', 'toe2'].forEach((f) => (o[f] = a[f] == null || b[f] == null ? b[f] : lerp(a[f], b[f], k)));
    ['es', 'ks', 'es2', 'ks2'].forEach((f) => (o[f] = k < 0.5 ? a[f] : b[f]));
    o.mark = k < 0.5 ? a.mark : b.mark;
    return o;
  }

  function solve(p) {
    const S = shoulderOf(p);
    const hd = p.t + p.ht;
    const sk = { S, hip: p.hip };
    sk.neck = add(S, L.neck, hd);
    sk.head = add(S, L.neck + L.head, hd);
    [sk.E, sk.W] = ik(S, p.hand, L.upper, L.fore, p.es);
    [sk.K, sk.A] = ik(p.hip, p.foot, L.thigh, L.shin, p.ks);
    if (p.hand2) [sk.E2, sk.W2] = ik(S, p.hand2, L.upper, L.fore, p.es2);
    if (p.foot2) [sk.K2, sk.A2] = ik(p.hip, p.foot2, L.thigh, L.shin, p.ks2);
    const mid = lerpP(p.hip, S, 0.5);
    const perp = add([0, 0], p.bend, p.t + 90);
    sk.ctrl = [mid[0] + perp[0], mid[1] + perp[1]];
    if (p.toe != null) sk.toe = add(sk.A, 17, p.toe);
    if (p.toe2 != null && sk.A2) sk.toe2 = add(sk.A2, 17, p.toe2);
    return sk;
  }

  const el = (tag, attrs, parent) => {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  };
  const f1 = (n) => Math.round(n * 10) / 10;
  const pts = (...ps) => ps.map((p) => f1(p[0]) + ',' + f1(p[1])).join(' ');

  function drawGear(g, front, gear, vb) {
    const bottom = vb[1] + vb[3];
    (gear || []).forEach((o) => {
      switch (o.k) {
        case 'floor':
          el('rect', { x: vb[0], y: o.y, width: vb[2], height: bottom - o.y, class: 'fx-floor' }, g);
          el('line', { x1: vb[0] + 10, x2: vb[0] + vb[2] - 10, y1: o.y, y2: o.y, class: 'fx-floorline' }, g);
          break;
        case 'bar':
          el('line', { x1: o.x, x2: o.x, y1: vb[1], y2: o.y, class: 'fx-post' }, g);
          el('circle', { cx: o.x, cy: o.y, r: 11, class: 'fx-barhalo' }, g);
          el('circle', { cx: o.x, cy: o.y, r: 6.5, class: 'fx-bar' }, front);
          break;
        case 'lowbar':
          el('line', { x1: o.x, x2: o.x, y1: o.y, y2: o.floor, class: 'fx-post' }, g);
          el('circle', { cx: o.x, cy: o.y, r: 11, class: 'fx-barhalo' }, g);
          el('circle', { cx: o.x, cy: o.y, r: 6.5, class: 'fx-bar' }, front);
          break;
        case 'pbar':
          (o.posts || []).forEach((x) => el('line', { x1: x, x2: x, y1: o.y, y2: o.floor || bottom, class: 'fx-post fx-post-solid' }, g));
          el('line', { x1: o.x1, x2: o.x2, y1: o.y, y2: o.y, class: 'fx-rail' }, g);
          break;
        case 'pt':
          el('path', { d: `M${o.x - 26},${o.floor} L${o.x - 16},${o.y} L${o.x + 16},${o.y} L${o.x + 26},${o.floor}`, class: 'fx-pt' }, g);
          el('line', { x1: o.x - 20, x2: o.x + 20, y1: o.y, y2: o.y, class: 'fx-rail' }, g);
          break;
        case 'box':
          el('rect', { x: o.x, y: o.y, width: o.w, height: o.h, rx: 6, class: 'fx-box' }, g);
          break;
      }
    });
  }

  /* ---------- המדריכים: Cali ו־Stheni ----------
     שתי דמויות על אותו שלד (אותן תנוחות בדיוק), עם שכבת מראה משלהן: שיער, קוקו, סרט ראש, זקן.
     השם מגיע מהמילה קליסתניקס: κάλλος (יופי) + σθένος (כוח). */
  const COACHES = {
    cali: { id: 'cali', name: 'Cali', g: 'f', color: '#ff6f91', hair: '#c8643a' },
    stheni: { id: 'stheni', name: 'Stheni', g: 'm', color: '#38bdf8', hair: '#3b414a' },
  };
  const coachPref = () => {
    /* KX.data (core.js) נטען אחרי הקובץ הזה, ויודע לעבוד גם כשהאחסון חסום */
    try { const v = KX.data ? KX.data.prefs().coach : JSON.parse(localStorage.getItem('kalos.prefs') || '{}').coach; return COACHES[v] ? v : 'auto'; } catch (_) { return 'auto'; }
  };
  /* מדריך לתרגיל: לפי ההעדפה, ואם "מתחלפים" — לסירוגין בתוך כל קטגוריה (כך ששניהם מופיעים בכל סוג תרגיל) */
  function coachFor(ex) {
    const pref = coachPref();
    if (pref !== 'auto') return pref;
    if (ex && COACHES[ex.coach]) return ex.coach;
    const list = (KX.exercises || []).filter((x) => x.cat === (ex && ex.cat));
    let i = ex ? list.indexOf(ex) : -1;
    if (i < 0) i = String((ex && ex.id) || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    return i % 2 ? 'cali' : 'stheni';
  }
  /* "Cali מדגימה" / "Stheni מדגים" — התאמת מין בעברית */
  const coachVerb = (id, f, m) => (COACHES[id] && COACHES[id].g === 'f' ? f : m);
  const live = new Set(); /* נגנים פעילים — להחלפת מדריך בלי לבנות מחדש */

  /* ---------- נגן ---------- */
  class Player {
    constructor(svg, ex, opts) {
      this.svg = svg;
      this.ex = ex;
      this.opts = opts || {};
      this.mode = 'good';
      this.speed = 1;
      this.time = 0;
      this.raf = null;
      this.idx = -1;
      this.good = ex.anim.frames().map((f) => Object.assign({}, f, { p: norm(f.p) }));
      this.bad = ex.anim.bad ? ex.anim.bad().map((f) => Object.assign({}, f, { p: norm(f.p) })) : null;
      this.coach = COACHES[this.opts.coach] ? this.opts.coach : coachFor(ex);
      this.side = 1;
      if (live.size > 150) live.forEach((q) => { if (!q.svg.isConnected) live.delete(q); });
      live.add(this);
      this.build();
      this.reset();
    }
    get seq() { return this.mode === 'bad' && this.bad ? this.bad : this.good; }
    /* מסגור אוטומטי: תיבה תוחמת של כל התנוחות + הציוד, ביחס הרוחב-גובה של הבמה */
    fitBox(aspect) {
      const xs = [], ys = [];
      const push = (p, r) => { if (!p) return; r = r || 0; xs.push(p[0] - r, p[0] + r); ys.push(p[1] - r, p[1] + r); };
      this.good.concat(this.bad || []).forEach((f) => {
        const k = solve(f.p);
        push(k.head, L.head + 2); [k.S, k.hip, k.E, k.W, k.K, k.A, k.E2, k.W2, k.K2, k.A2, k.toe, k.toe2].forEach((p) => push(p, 9));
      });
      let floorY = null;
      (this.ex.anim.gear || []).forEach((o) => {
        if (o.k === 'floor') floorY = o.y;
        if (o.k === 'bar' || o.k === 'lowbar') push([o.x, o.y], 14);
        if (o.k === 'pbar') { push([o.x1, o.y], 6); push([o.x2, o.y], 6); }
        if (o.k === 'pt') push([o.x, o.y], 26);
      });
      if (floorY != null) ys.push(floorY + 14);
      let x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
      const pad = 22;
      x0 -= pad; x1 += pad; y0 -= pad; y1 += floorY != null ? 6 : pad;
      let w = x1 - x0, h = y1 - y0;
      if (w / h < aspect) { const nw = h * aspect; x0 -= (nw - w) / 2; w = nw; }
      else { const nh = w / aspect; if (floorY != null) y0 -= nh - h; else y0 -= (nh - h) / 2; h = nh; }
      return [x0, y0, w, h].map((n) => Math.round(n));
    }
    build() {
      const a = this.ex.anim;
      const vb = this.opts.fit ? this.fitBox(this.opts.fit) : (a.vb || [0, 0, 480, 330]).slice();
      this.vb = vb;
      const svg = this.svg;
      svg.setAttribute('viewBox', vb.join(' '));
      svg.classList.add('fx');
      svg.classList.remove('fx-c-cali', 'fx-c-stheni');
      svg.classList.add('fx-c-' + this.coach);
      svg.innerHTML = '';
      this.titleEl = el('title', {}, svg);
      this.titleEl.textContent = COACHES[this.coach].name + ' ' + coachVerb(this.coach, 'מדגימה', 'מדגים') + ': ' + this.ex.name;
      this.gGear = el('g', {}, svg);
      const front = el('g', {});
      const hl = a.hl || [];
      const cls = (part) => 'fx-seg' + (hl.indexOf(part) > -1 ? ' fx-hl' : '');
      const floorY = (a.gear || []).find((o) => o.k === 'floor');
      this.floorY = floorY ? floorY.y : null;
      if (floorY) this.shadow = el('ellipse', { cx: 240, cy: floorY.y + 2, rx: 60, ry: 5, class: 'fx-shadow' }, svg);
      const far = el('g', { class: 'fx-far' }, svg);
      this.leg2 = el('polyline', { class: cls('leg') + ' fx-leg' }, far);
      this.toe2 = el('line', { class: cls('leg') + ' fx-toe' }, far);
      this.arm2 = el('polyline', { class: cls('arm') + ' fx-arm' }, far);
      this.torso = el('path', { class: cls('torso') + ' fx-torso' }, svg);
      this.neck = el('line', { class: 'fx-seg fx-neck' }, svg);
      this.hairBack = el('g', { class: 'fx-hair-back' }, svg);
      this.head = el('circle', { r: L.head, class: 'fx-head' }, svg);
      this.hairFront = el('g', { class: 'fx-hair-front' }, svg);
      this.buildCoach();
      this.leg = el('polyline', { class: cls('leg') + ' fx-leg' }, svg);
      this.toe = el('line', { class: cls('leg') + ' fx-toe' }, svg);
      this.arm = el('polyline', { class: cls('arm') + ' fx-arm' }, svg);
      this.joints = ['E', 'K', 'hip', 'S'].map(() => el('circle', { r: 3.2, class: 'fx-joint' }, svg));
      svg.appendChild(front);
      drawGear(this.gGear, front, a.gear, vb);
      if (a.prop === 'wheel') {
        this.wheel = el('g', {}, svg);
        el('circle', { r: 13, class: 'fx-wheel' }, this.wheel);
        el('circle', { r: 4, class: 'fx-bar' }, this.wheel);
      }
      this.markEl = el('circle', { r: 20, class: 'fx-mark' }, svg);
    }
    /* שכבת המראה של המדריך: מאחורי הראש (קוקו / קצוות סרט) ומעליו (שיער, סרט, זקן) */
    buildCoach() {
      const b = this.hairBack, f = this.hairFront;
      b.innerHTML = ''; f.innerHTML = '';
      this.cEl = {};
      if (this.coach === 'cali') {
        this.cEl.tail = el('path', { class: 'fx-hair' }, b);
        this.cEl.tie = el('circle', { r: 3, class: 'fx-tie' }, b);
        this.cEl.cap = el('path', { class: 'fx-hair' }, f);
      } else {
        this.cEl.tails = el('path', { class: 'fx-band-tail' }, b);
        this.cEl.cap = el('path', { class: 'fx-hair' }, f);
        this.cEl.beard = el('path', { class: 'fx-hair fx-beard' }, f);
        this.cEl.band = el('path', { class: 'fx-band' }, f);
      }
    }
    setCoach(id) {
      if (!COACHES[id] || id === this.coach) return;
      this.coach = id;
      this.svg.classList.remove('fx-c-cali', 'fx-c-stheni');
      this.svg.classList.add('fx-c-' + id);
      this.titleEl.textContent = COACHES[id].name + ' ' + coachVerb(id, 'מדגימה', 'מדגים') + ': ' + this.ex.name;
      this.buildCoach();
      if (this.lastPose) this.render(this.lastPose);
    }
    /* כיוון הפנים: לצד שאליו הברך מתכופפת ושאליו הירך מתקפלת (ניצב לציר הצוואר) */
    faceDir(k, p) {
      const dx = k.hip[0] - k.S[0], dy = k.hip[1] - k.S[1], dl = Math.hypot(dx, dy) || 1;
      const nx = -dy / dl, ny = dx / dl;
      const fa = Math.atan2(p.foot[1] - p.hip[1], p.foot[0] - p.hip[0]) + (p.ks || -1) * Math.PI / 2;
      const s1 = Math.cos(fa) * nx + Math.sin(fa) * ny;
      const tx = k.K[0] - k.hip[0], ty = k.K[1] - k.hip[1], tl = Math.hypot(tx, ty) || 1;
      const sc = s1 * 0.6 + (tx * nx + ty * ny) / tl;
      if (Math.abs(sc) > 0.12) this.side = sc > 0 ? 1 : -1; /* היסטרזיס: בלי הבהוב כשהאות חלש */
      let ux = k.head[0] - k.S[0], uy = k.head[1] - k.S[1];
      const ul = Math.hypot(ux, uy) || 1; ux /= ul; uy /= ul;
      let fx = -uy, fy = ux;
      if (fx * nx * this.side + fy * ny * this.side < 0) { fx = -fx; fy = -fy; }
      return { ux, uy, fx, fy };
    }
    drawCoach(k, p) {
      const c = this.cEl; if (!c) return;
      const { ux, uy, fx, fy } = this.faceDir(k, p);
      const H = k.head, r = L.head;
      /* נקודה על הראש: θ=0 קודקוד, 90 פנים, ‎-90 עורף, 180 סנטר */
      const V = (th, rr) => { const a = th * R; rr = rr == null ? r : rr; return [H[0] + rr * (ux * Math.cos(a) + fx * Math.sin(a)), H[1] + rr * (uy * Math.cos(a) + fy * Math.sin(a))]; };
      const arc = (a0, a1, rr, n) => { const o = []; for (let i = 0; i <= n; i++) o.push(V(a0 + ((a1 - a0) * i) / n, rr)); return o; };
      const P = (q) => f1(q[0]) + ',' + f1(q[1]);
      const off = (q, x, y, m) => [q[0] + x * m, q[1] + y * m];
      const floor = this.floorY;
      const clampY = (q) => (floor != null && q[1] > floor - 2 ? [q[0], floor - 2] : q);
      const sway = this.raf ? Math.sin(this.time / 240) * 1.6 : 0;
      const bx = -fx, by = -fy; /* אחורה */
      /* צורה מחודדת לאורך עקומה ריבועית (קוקו, קצוות הסרט) */
      const taper = (a, ctl, e, w0) => {
        const tx = ctl[0] - a[0], ty = ctl[1] - a[1], tl = Math.hypot(tx, ty) || 1, nx = -ty / tl, ny = tx / tl;
        return 'M' + P(off(a, nx, ny, w0)) + ' Q' + P(off(ctl, nx, ny, w0 * 0.75)) + ' ' + P(e) + ' Q' + P(off(ctl, nx, ny, -w0 * 0.75)) + ' ' + P(off(a, nx, ny, -w0)) + 'Z';
      };
      if (this.coach === 'cali') {
        const cap = arc(70, -132, r + 1.4, 20);
        const inner = [H[0] + r * (ux * 0.3 - fx * 0.1), H[1] + r * (uy * 0.3 - fy * 0.1)];
        c.cap.setAttribute('d', 'M' + cap.map(P).join(' L') + ' Q' + P(inner) + ' ' + P(cap[0]) + 'Z');
        /* קוקו גבוה: יוצא מאחורי הקודקוד, מתעקל החוצה ונופל עם כוח המשיכה */
        const root = V(-50, r + 1.5);
        const ctl = clampY([root[0] + bx * 11 + ux * 5, root[1] + by * 11 + uy * 5]);
        const end = clampY([root[0] + bx * 10 + sway, root[1] + by * 10 + 27]);
        c.tail.setAttribute('d', taper(root, ctl, end, 5.6));
        c.tie.setAttribute('cx', f1(root[0])); c.tie.setAttribute('cy', f1(root[1]));
      } else {
        const cap = arc(58, -112, r + 0.9, 10);
        const inner = [H[0] + r * (ux * 0.42 - fx * 0.08), H[1] + r * (uy * 0.42 - fy * 0.08)];
        c.cap.setAttribute('d', 'M' + cap.map(P).join(' L') + ' Q' + P(inner) + ' ' + P(cap[0]) + 'Z');
        const jaw = arc(98, 196, r + 0.9, 8);
        const jin = [H[0] + r * (fx * 0.3 - ux * 0.3), H[1] + r * (fy * 0.3 - uy * 0.3)];
        c.beard.setAttribute('d', 'M' + jaw.map(P).join(' L') + ' Q' + P(jin) + ' ' + P(jaw[0]) + 'Z');
        const a = V(74, r + 0.4), e = V(-102, r + 0.4), mid = [H[0] + ux * r * 0.42, H[1] + uy * r * 0.42];
        c.band.setAttribute('d', 'M' + P(a) + ' Q' + P(mid) + ' ' + P(e));
        const t1 = clampY([e[0] + bx * 11 + sway, e[1] + by * 11 + 7]), t2 = clampY([e[0] + bx * 8 - sway * 0.6, e[1] + by * 8 + 12]);
        c.tails.setAttribute('d', taper(e, [e[0] + bx * 6, e[1] + by * 6 + 2], t1, 2.1) + taper(e, [e[0] + bx * 4, e[1] + by * 4 + 4], t2, 1.9));
      }
    }
    total() { return this.seq.reduce((s, f) => s + f.d + f.h, 0); }
    reset() { this.time = this.seq[0].d; this.idx = -1; this.update(0); }
    setMode(m) { this.mode = m; this.reset(); }
    setSpeed(s) { this.speed = s; }
    play() {
      if (this.raf) return;
      this.last = performance.now();
      const loop = (now) => {
        this.update(Math.min(64, now - this.last) * this.speed);
        this.last = now;
        this.raf = requestAnimationFrame(loop);
      };
      this.raf = requestAnimationFrame(loop);
    }
    pause() { if (this.raf) cancelAnimationFrame(this.raf); this.raf = null; }
    get playing() { return !!this.raf; }
    showFrame(i) { const s = this.seq; i = Math.min(i, s.length - 1); this.time = s.slice(0, i + 1).reduce((a, f, j) => a + f.d + (j < i ? f.h : 0), 0); this.update(0); }
    update(dt) {
      const seq = this.seq;
      const T = this.total();
      this.time = (this.time + dt) % T;
      let t = this.time, i = 0, pose;
      for (i = 0; i < seq.length; i++) {
        const f = seq[i];
        if (t < f.d) {
          const prev = seq[(i - 1 + seq.length) % seq.length].p;
          pose = lerpPose(prev, f.p, ease(t / f.d));
          break;
        }
        t -= f.d;
        if (t < f.h) { pose = f.p; break; }
        t -= f.h;
      }
      if (!pose) { i = seq.length - 1; pose = seq[i].p; }
      if (i !== this.idx) {
        this.idx = i;
        if (this.opts.onFrame) this.opts.onFrame(i, seq[i], seq.length);
      }
      this.render(pose);
    }
    render(p) {
      const k = solve(p);
      this.sk = k; /* שלד אחרון — לסימון שרירים בסרטוני ההדרכה */
      this.lastPose = p;
      this.torso.setAttribute('d', `M${f1(k.hip[0])},${f1(k.hip[1])} Q${f1(k.ctrl[0])},${f1(k.ctrl[1])} ${f1(k.S[0])},${f1(k.S[1])}`);
      this.neck.setAttribute('x1', f1(k.S[0])); this.neck.setAttribute('y1', f1(k.S[1]));
      this.neck.setAttribute('x2', f1(k.neck[0])); this.neck.setAttribute('y2', f1(k.neck[1]));
      this.head.setAttribute('cx', f1(k.head[0])); this.head.setAttribute('cy', f1(k.head[1]));
      this.arm.setAttribute('points', pts(k.S, k.E, k.W));
      this.leg.setAttribute('points', pts(k.hip, k.K, k.A));
      const setLine = (ln, a, b) => {
        if (!b) { ln.style.display = 'none'; return; }
        ln.style.display = '';
        ln.setAttribute('x1', f1(a[0])); ln.setAttribute('y1', f1(a[1]));
        ln.setAttribute('x2', f1(b[0])); ln.setAttribute('y2', f1(b[1]));
      };
      setLine(this.toe, k.A, k.toe);
      if (k.E2) { this.arm2.style.display = ''; this.arm2.setAttribute('points', pts(k.S, k.E2, k.W2)); } else this.arm2.style.display = 'none';
      if (k.K2) { this.leg2.style.display = ''; this.leg2.setAttribute('points', pts(k.hip, k.K2, k.A2)); } else this.leg2.style.display = 'none';
      setLine(this.toe2, k.A2, k.toe2);
      this.drawCoach(k, p);
      if (this.wheel) this.wheel.setAttribute('transform', `translate(${f1(k.W[0])},${f1(k.W[1])})`);
      [k.E, k.K, k.hip, k.S].forEach((p2, j) => { this.joints[j].setAttribute('cx', f1(p2[0])); this.joints[j].setAttribute('cy', f1(p2[1])); });
      if (this.shadow) {
        const xs = [k.hip[0], k.S[0], k.A[0], k.W[0]];
        const mn = Math.min(...xs), mx = Math.max(...xs);
        this.shadow.setAttribute('cx', f1((mn + mx) / 2));
        this.shadow.setAttribute('rx', f1(Math.max(30, (mx - mn) / 2 + 14)));
      }
      const markMap = { hip: k.hip, S: k.S, E: k.E, K: k.K, head: k.head, torso: k.ctrl, A: k.A };
      const m = this.mode === 'bad' && p.mark ? markMap[p.mark] : null;
      if (m) {
        this.markEl.style.display = '';
        this.markEl.setAttribute('cx', f1(m[0])); this.markEl.setAttribute('cy', f1(m[1]));
      } else this.markEl.style.display = 'none';
    }
  }

  KX.fig = { L, add, ang, pivotTorso, shoulderOf, lerpPose, solve, Player };
  KX.coaches = COACHES;
  KX.coachFor = coachFor;
  KX.coachPref = coachPref;
  KX.coachVerb = coachVerb;
  /* החלפת מדריך מועדף: כל הדמויות בעמוד מתעדכנות מיד (חוץ מאלה שננעלו על מדריך מסוים).
     נגן שה־SVG שלו כבר לא בדף יוצא מהרשימה */
  KX.refreshCoaches = () => live.forEach((p) => {
    if (!p.svg.isConnected) { live.delete(p); return; }
    if (!p.opts.coach) p.setCoach(coachFor(p.ex));
  });
})();
