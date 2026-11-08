/* KALOS — שפה: עברית (ברירת מחדל) / English
   - השפה נקבעת לפי ?lang=en|he בכתובת, אחרת לפי ההעדפה השמורה (kalos.prefs.lang).
   - בעברית אין שום עלות: המילון נטען רק באנגלית.
   - באנגלית: html[lang=en][dir=ltr], טעינת assets/i18n/en.js, ותרגום של כל טקסט ותכונה בדף
     (כולל תוכן שנוצר אחר כך — MutationObserver). הלוגיקה והנתונים נשארים בעברית בפנים.
   - KX.t(s) מתרגם מחרוזת שלא מוצגת בדף (קול, canvas, confirm). */
(function () {
  'use strict';
  const KX = (window.KX = window.KX || {});
  const doc = document.documentElement;
  const HEB = /[֐-׿]/;
  const ISO = /[⁦-⁩]/g;

  let prefs = {};
  try { prefs = JSON.parse(localStorage.getItem('kalos.prefs') || '{}') || {}; } catch (_) { prefs = {}; }
  let lang = prefs.lang === 'en' ? 'en' : 'he';
  try {
    const q = new URLSearchParams(location.search).get('lang');
    if (q === 'en' || q === 'he') { lang = q; prefs.lang = q; localStorage.setItem('kalos.prefs', JSON.stringify(prefs)); }
  } catch (_) { /* בלי אחסון */ }

  /* הגדרות נגישות לפני הציור הראשון */
  const a11y = prefs.a11y || {};
  if (a11y.fs) doc.classList.add('a11y-fs' + a11y.fs);
  ['contrast', 'links', 'still', 'font', 'spacing'].forEach((k) => a11y[k] && doc.classList.add('a11y-' + k));

  KX.lang = lang;
  KX.isEn = lang === 'en';
  KX.loc = KX.isEn ? 'en-US' : 'he-IL';
  doc.lang = KX.isEn ? 'en' : 'he';
  doc.dir = KX.isEn ? 'ltr' : 'rtl';

  KX.setLang = function (l) {
    try {
      const p = JSON.parse(localStorage.getItem('kalos.prefs') || '{}') || {};
      p.lang = l;
      localStorage.setItem('kalos.prefs', JSON.stringify(p));
    } catch (_) { /* בלי אחסון — נשען על הכתובת */ }
    const u = new URL(location.href);
    u.searchParams.set('lang', l);
    location.replace(u.toString());
  };

  /* ---------- מנוע התרגום ---------- */
  const exact = new Map();
  let pats = [];
  const cache = new Map();
  const missing = new Set();
  KX.i18nMissing = missing;
  const norm = (s) => s.replace(ISO, '').replace(/\s+/g, ' ').trim();
  const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  /* מפתח "רופף": בלי פיסוק וסימנים בקצוות (גרש/גרשיים נשארים — הם חלק מקיצורים כמו דק׳) */
  const EDGE = /^[\s.,:;!?·•—–\-→←↗↑↓✓✗★☆()[\]"'„“”]+|[\s.,:;!?·•—–\-→←↗↑↓✓✗★☆()[\]"'„“”]+$/g;
  const loose = new Map();
  const looseKey = (s) => s.replace(EDGE, '');
  /* יחידות ומילים שחוזרות בטקסט שנבנה מספרים (מינונים, משכים) */
  const UNITS = [
    [/(\d)\s*עד\s*(\d)/g, '$1 to $2'], [/(\d)\s*שנ׳/g, '$1 s'], [/(\d)\s*שניות/g, '$1 seconds'], [/(\d)\s*דק׳/g, '$1 min'], [/(\d)\s*דקות/g, '$1 minutes'], [/(\d)\s*שע׳/g, '$1 h'],
    [/(\d)\s*ק״מ/g, '$1 km'], [/(\d)\s*מ׳/g, '$1 m'], [/(\d)\s*ק״ג/g, '$1 kg'], [/(\d)\s*גרם/g, '$1 g'], [/(\d)\s*קק״ל/g, '$1 kcal'],
    [/×\s*מקס׳/g, '×max'], [/מקס׳/g, 'max'], [/לכל רגל/g, 'per leg'], [/לכל צד/g, 'per side'], [/לכל יד/g, 'per arm'],
    [/(\d)\s*חזרות/g, '$1 reps'], [/(\d)\s*חזרה/g, '$1 rep'], [/(\d)\s*סטים/g, '$1 sets'], [/(\d)\s*סט\b/g, '$1 set'], [/(\d)\s*ימים/g, '$1 days'], [/(\d)\s*יום/g, '$1 day'],
    [/(\d)\s*שבועות/g, '$1 weeks'], [/(\d)\s*שבוע/g, '$1 week'], [/(\d)\s*אימונים/g, '$1 workouts'], [/(\d)\s*תרגילים/g, '$1 exercises'], [/(\d)\s*פעמים/g, '$1 times'],
  ];
  const SEPS = [' · ', ' — ', ' – ', ' | ', ' / ', ' ← ', ' → ', ': ', '. ', ', ', '; '];

  function load(dict) {
    Object.keys(dict.exact || {}).forEach((k) => {
      const v = dict.exact[k];
      exact.set(norm(k), v);
      const lk = looseKey(norm(k));
      if (lk && !loose.has(lk)) loose.set(lk, v.replace(EDGE, ''));
    });
    pats = (dict.patterns || []).map(([he, en]) => {
      const src = norm(he);
      const order = [];
      const re = new RegExp('^' + src.split(/(\{\d+\})/).map((part) => {
        const m = part.match(/^\{(\d+)\}$/);
        if (m) { order.push(+m[1]); return '(.+?)'; }
        return reEsc(part);
      }).join('') + '$');
      /* דפוסים עם יותר טקסט קבוע נבדקים קודם */
      return { re, order, en, weight: src.replace(/\{\d+\}/g, '').length };
    }).sort((a, b) => b.weight - a.weight);
  }

  function tr(s, depth) {
    if (!s || !HEB.test(s)) return s;
    const key = norm(s);
    if (!key) return s;
    const hit = exact.get(key);
    if (hit != null) return hit;
    if (cache.has(key)) return cache.get(key);
    let out = null;
    /* צירוף של מחרוזות מוכרות (" · ") — לפני הדפוסים, כדי שדפוס כללי כמו "יום {0}" לא יבלע אותו */
    if (key.indexOf(' · ') > -1) {
      const parts = key.split(' · ');
      const t = parts.map((x) => (HEB.test(x) ? exact.get(x) || loose.get(looseKey(x)) : x));
      if (t.every((x) => x != null)) out = t.join(' · ');
    }
    if (out == null) for (const p of pats) {
      const m = key.match(p.re);
      if (!m) continue;
      out = p.en.replace(/\{(\d+)\}/g, (_, n) => {
        const v = m[p.order.indexOf(+n) + 1];
        return v == null ? '' : (depth < 3 ? tr(v, depth + 1) : v);
      });
      break;
    }
    if (out == null && depth < 5) out = fallback(key, depth);
    if (out == null) { missing.add(key); out = s; }
    if (cache.size > 4000) cache.clear();
    cache.set(key, out);
    return out;
  }
  /* תרגום של התחלה שנחתכה ("חזה,") — שומרים את סימן הפיסוק המקורי */
  function keepPunct(head, hv) {
    const p = (head.match(/[.,:;!?]+$/) || [''])[0];
    return hv.replace(/[\s.,:;!?]+$/, '') + p;
  }
  /* גיבוי לטקסט שנבנה בקוד מחיבור של קטעים */
  function fallback(key, depth) {
    const changed = (a, b) => a !== b;
    /* 1. פיסוק / סימנים בקצוות */
    const m = key.match(/^([\s.,:;!?·•—–\-→←↗↑↓✓✗★☆()[\]"'„“”]*)([\s\S]*?)([\s.,:;!?·•—–\-→←↗↑↓✓✗★☆()[\]"'„“”]*)$/);
    if (m && (m[1] || m[3]) && m[2]) {
      const core = loose.get(m[2]) || tr(m[2], depth + 1);
      if (changed(core, m[2])) return m[1].replace(/←/g, '→') + core + m[3].replace(/←/g, '→');
    }
    const lk = loose.get(looseKey(key));
    if (lk != null) return lk;
    /* 2. התחלה מוכרת, כשהיתר מתורגם במלואו ("בהדגמה: …") */
    const ww = key.split(' ');
    for (let k = ww.length - 1; k >= 1; k--) {
      const head = ww.slice(0, k).join(' '), hv = exact.get(head) || loose.get(looseKey(head));
      if (hv == null) continue;
      const rv = tr(ww.slice(k).join(' '), depth + 1);
      if (!HEB.test(rv)) return keepPunct(head, hv) + ' ' + rv;
    }
    /* 3. מפרידים */
    for (const sep of SEPS) {
      if (key.indexOf(sep) < 0) continue;
      const parts = key.split(sep);
      const t = parts.map((x) => (HEB.test(x) ? tr(x, depth + 1) : x));
      if (t.some((x, i) => changed(x, parts[i]))) return t.join(sep === ' ← ' ? ' → ' : sep);
    }
    /* 3. התחלה / סוף מוכרים (בגבולות מילה) */
    const w = key.split(' ');
    if (w.length > 1) {
      for (let k = w.length - 1; k >= 1; k--) {
        const head = w.slice(0, k).join(' '), rest = w.slice(k).join(' ');
        const hv = exact.get(head) || loose.get(looseKey(head));
        if (hv != null) { const rv = tr(rest, depth + 1); return keepPunct(head, hv) + ' ' + rv; }
      }
      for (let k = 1; k < w.length; k++) {
        const head = w.slice(0, k).join(' '), tail = w.slice(k).join(' ');
        const tv = exact.get(tail) || loose.get(looseKey(tail));
        if (tv != null) { const hv = tr(head, depth + 1); return hv + ' ' + tv.replace(/^\s+/, ''); }
      }
    }
    /* 4. יחידות */
    let u = key;
    UNITS.forEach(([re, to]) => (u = u.replace(re, to)));
    if (u !== key && !HEB.test(u)) return u;
    if (u !== key) { const r = tr(u, depth + 1); if (!HEB.test(r)) return r; }
    return null;
  }
  KX.t = (s) => (KX.isEn && s != null ? tr(String(s), 0) : s);

  /* ---------- DOM ---------- */
  const ATTRS = ['aria-label', 'title', 'placeholder', 'alt', 'aria-valuetext', 'aria-roledescription', 'data-tip'];
  const SKIP = 'script,style,textarea,[data-no-i18n],[translate="no"],[contenteditable="true"]';
  function txNode(n) {
    const v = n.nodeValue;
    if (!v || !HEB.test(v)) return;
    const p = n.parentElement;
    if (p && p.closest(SKIP)) return;
    const lead = v.match(/^\s*/)[0], trail = v.match(/\s*$/)[0];
    const t = tr(v, 0);
    if (t !== v) n.nodeValue = lead + t.trim() + trail;
  }
  function txAttrs(el) {
    if (el.closest && el.closest(SKIP)) return;
    for (const a of ATTRS) {
      const v = el.getAttribute && el.getAttribute(a);
      if (v && HEB.test(v)) { const t = tr(v, 0); if (t !== v) el.setAttribute(a, t); }
    }
    if (el.tagName === 'META' && el.getAttribute('content') && HEB.test(el.getAttribute('content'))) el.setAttribute('content', tr(el.getAttribute('content'), 0));
  }
  function txTree(root) {
    if (!root) return;
    if (root.nodeType === 3) { txNode(root); return; }
    if (root.nodeType !== 1 && root.nodeType !== 9 && root.nodeType !== 11) return;
    if (root.nodeType === 1) txAttrs(root);
    const w = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    let n;
    while ((n = w.nextNode())) { if (n.nodeType === 3) txNode(n); else txAttrs(n); }
  }
  KX.i18nApply = txTree;

  if (!KX.isEn) return;

  doc.classList.add('i18n-wait');
  const failsafe = setTimeout(() => doc.classList.remove('i18n-wait'), 3000);
  let mo = null;
  function start() {
    txTree(document.head);
    txTree(document.body);
    if (!mo) {
      mo = new MutationObserver((list) => {
        for (const m of list) {
          if (m.type === 'characterData') txNode(m.target);
          else if (m.type === 'attributes') txAttrs(m.target);
          else m.addedNodes.forEach(txTree);
        }
      });
      mo.observe(doc, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS.concat(['content']) });
    }
    clearTimeout(failsafe);
    doc.classList.remove('i18n-wait');
    doc.classList.add('i18n-ready');
  }
  const s = document.createElement('script');
  s.src = 'assets/i18n/en.js';
  s.onload = () => {
    if (window.KALOS_EN) load(window.KALOS_EN);
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
    else start();
  };
  s.onerror = () => { clearTimeout(failsafe); doc.classList.remove('i18n-wait'); };
  document.head.appendChild(s);
})();
