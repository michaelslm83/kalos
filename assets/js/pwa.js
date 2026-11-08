/* KALOS — PWA: רישום Service Worker, הצעת התקנה והודעה על גרסה חדשה
   Service Worker עובד רק ב־http(s)/localhost, לא בפתיחה ישירה של הקובץ (file://) */
(function () {
  'use strict';
  const KX = window.KX || {};
  const toast = (m, ms) => KX.ui && KX.ui.toast && KX.ui.toast(m, ms);
  const store = KX.store;
  const DISMISS_DAYS = 30;

  if (!/^https?:$/.test(location.protocol) || !('serviceWorker' in navigator)) return;

  /* ---------- רישום + עדכונים ---------- */
  const hadController = !!navigator.serviceWorker.controller;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js', { scope: './' }).then((reg) => {
      /* בדיקת עדכון כשחוזרים ללשונית */
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); });
    }).catch((err) => console.warn('KALOS: Service Worker registration failed', err));
  });
  /* ה־SW עושה skipWaiting; אם הוחלף SW קיים — יש גרסה חדשה של האתר */
  let notified = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || notified) return;
    notified = true;
    toast('גרסה חדשה זמינה — רעננו את הדף', 6000);
  });

  /* ---------- הצעת התקנה ---------- */
  const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const dismissedRecently = () => {
    const t = store ? store.get('pwaDismissed', 0) : 0;
    return t && Date.now() - t < DISMISS_DAYS * 864e5;
  };
  let deferred = null, pill = null;

  function buildPill() {
    if (pill) return pill;
    pill = document.createElement('div');
    pill.className = 'pwa-pill';
    pill.setAttribute('role', 'region');
    pill.setAttribute('aria-label', 'התקנת האפליקציה');
    pill.hidden = true;
    pill.innerHTML = '<svg class="ico" aria-hidden="true"><use href="#i-download"/></svg>' +
      '<span>אימון גם בלי אינטרנט</span>' +
      '<button type="button" class="btn btn-accent btn-sm" data-pwa="install">התקינו את האפליקציה</button>' +
      '<button type="button" class="x" data-pwa="close" aria-label="סגור"><svg class="ico" aria-hidden="true"><use href="#i-x"/></svg></button>';
    pill.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-pwa]'); if (!b) return;
      if (b.dataset.pwa === 'close') {
        if (store) store.set('pwaDismissed', Date.now());
        hide();
        return;
      }
      if (!deferred) { hide(); return; }
      deferred.prompt();
      try {
        const choice = await deferred.userChoice;
        if (choice && choice.outcome === 'dismissed' && store) store.set('pwaDismissed', Date.now());
      } catch (_) { /* ignore */ }
      deferred = null;
      hide();
    });
    document.body.appendChild(pill);
    return pill;
  }
  function show() { if (isStandalone() || dismissedRecently()) return; buildPill().hidden = false; }
  function hide() { if (pill) pill.hidden = true; }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e;
    /* לא להפריע מיד בכניסה — מציגים אחרי שהמשתמש התחיל לגלול/להשתמש */
    setTimeout(show, 12000);
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    hide();
    toast('האפליקציה הותקנה ✓ אפשר לפתוח אותה ממסך הבית');
  });
  KX.pwa = { installable: () => !!deferred, install: () => { if (deferred) { buildPill(); pill.querySelector('[data-pwa="install"]').click(); } } };
})();
