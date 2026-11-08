/* KALOS — מצב בהיר / כהה
   הסקריפט שב־<head> קובע את data-theme לפני הציור הראשון; כאן: כפתור ההחלפה, שמירה ומעקב אחרי הגדרת המערכת */
(function () {
  'use strict';
  const KX = window.KX;
  const root = document.documentElement;
  const mq = window.matchMedia('(prefers-color-scheme: light)');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const BG = { dark: '#07090c', light: '#f5f4ef' };
  const btn = document.getElementById('themeToggle');
  const meta = document.getElementById('metaTheme');

  const current = () => (root.dataset.theme === 'light' ? 'light' : 'dark');
  const chosen = () => (KX.data ? KX.data.prefs().theme : null);
  const system = () => (mq.matches ? 'light' : 'dark');

  function sync() {
    const t = current();
    if (meta) meta.setAttribute('content', BG[t]);
    if (btn) {
      const label = t === 'light' ? 'מצב כהה' : 'מצב בהיר';
      btn.setAttribute('aria-label', 'עבור ל' + label);
      btn.title = label;
    }
  }
  let animT;
  function apply(t, animate) {
    if (t === current()) { sync(); return; }
    if (animate && !reduce) {
      root.classList.add('theme-anim');
      clearTimeout(animT);
      animT = setTimeout(() => root.classList.remove('theme-anim'), 520);
    }
    root.dataset.theme = t;
    sync();
    if (KX.emit) KX.emit('theme', { theme: t });
  }

  /* תיקון: אם הסקריפט שב־head לא רץ (למשל localStorage חסום) */
  if (!root.dataset.theme) root.dataset.theme = chosen() || system();
  sync();

  if (btn) btn.addEventListener('click', () => {
    const next = current() === 'light' ? 'dark' : 'light';
    /* בחירה זהה להגדרת המערכת = חזרה למעקב אוטומטי */
    if (KX.data) KX.data.setPref('theme', next === system() ? null : next);
    apply(next, true);
    if (KX.ui && KX.ui.toast) KX.ui.toast(next === 'light' ? 'מצב בהיר ☀️' : 'מצב כהה 🌙', 1400);
  });

  const onSystem = () => { if (!chosen()) apply(system(), true); };
  if (mq.addEventListener) mq.addEventListener('change', onSystem); else if (mq.addListener) mq.addListener(onSystem);

  /* שחזור גיבוי / איפוס נתונים משנים את ההעדפה */
  if (KX.on) KX.on('import', () => apply(chosen() || system(), true));

  KX.theme = { get: current, set: (t) => { if (KX.data) KX.data.setPref('theme', t); apply(t || system(), true); } };
})();
