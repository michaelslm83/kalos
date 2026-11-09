/* KALOS — נגישות: תפריט נגישות, הצהרת נגישות, כפתור שפה.
   ההגדרות נשמרות ב־kalos.prefs.a11y ומוחלות על <html> כבר בראש הדף (i18n.js). */
(function () {
  'use strict';
  const KX = window.KX;
  const doc = document.documentElement;
  const en = !!KX.isEn;
  const T = (he, eng) => (en ? eng : he);
  const icon = (id) => `<svg class="ico" aria-hidden="true"><use href="#${id}"/></svg>`;

  /* ---------- כפתור שפה ---------- */
  const lb = document.getElementById('langToggle');
  if (lb) {
    lb.textContent = en ? 'עב' : 'EN';
    lb.setAttribute('lang', en ? 'he' : 'en');
    lb.setAttribute('aria-label', en ? 'עברית — מעבר לעברית' : 'English — switch to English');
    lb.title = lb.getAttribute('aria-label');
    lb.addEventListener('click', () => KX.setLang(en ? 'he' : 'en'));
  }

  /* ---------- הגדרות ---------- */
  const OPTS = [
    ['contrast', 'i-contrast', 'ניגודיות גבוהה', 'High contrast'],
    ['links', 'i-link', 'הדגשת קישורים וכפתורים', 'Highlight links & buttons'],
    ['still', 'i-pause', 'עצירת אנימציות', 'Stop animations'],
    ['font', 'i-font', 'גופן קריא', 'Readable font'],
    ['spacing', 'i-spacing', 'ריווח טקסט', 'Text spacing'],
  ];
  const prefs = () => (KX.data && KX.data.prefs ? KX.data.prefs() : {});
  const get = () => Object.assign({ fs: 0 }, prefs().a11y || {});
  function set(a) {
    if (KX.data && KX.data.setPref) KX.data.setPref('a11y', a);
    apply(a);
  }
  function apply(a) {
    ['a11y-fs1', 'a11y-fs2', 'a11y-fs3'].forEach((c, i) => doc.classList.toggle(c, a.fs === i + 1));
    OPTS.forEach(([k]) => doc.classList.toggle('a11y-' + k, !!a[k]));
    if (a.still) stopAll();
  }
  KX.a11yApply = apply;

  /* עצירת אנימציות: הדגמות שמתנגנות לבד נעצרות, ולא מתחילות מחדש בלי לחיצה */
  const live = new Set();
  /* פעולה מפורשת של המשתמש (לחיצה / מקש) מותרת גם במצב עצירה; ריחוף וגלילה — לא */
  let userAct = false;
  ['click', 'keydown', 'pointerup'].forEach((t) => document.addEventListener(t, () => { userAct = true; setTimeout(() => (userAct = false), 0); }, true));
  if (KX.fig && KX.fig.Player) {
    const P = KX.fig.Player.prototype, play = P.play, pause = P.pause;
    P.play = function () {
      if (doc.classList.contains('a11y-still') && !userAct) return;
      live.add(this);
      return play.call(this);
    };
    P.pause = function () { live.delete(this); return pause.call(this); };
  }
  function stopAll() { live.forEach((p) => p.pause()); }

  /* ---------- תפריט נגישות ---------- */
  let dlg = null;
  function build() {
    dlg = document.createElement('dialog');
    dlg.className = 'a11y-dlg';
    dlg.setAttribute('aria-labelledby', 'a11yTitle');
    dlg.setAttribute('data-no-i18n', '');
    dlg.setAttribute('lang', en ? 'en' : 'he');
    dlg.innerHTML = `
      <div class="a11y-head"><h2 id="a11yTitle">${T('נגישות', 'Accessibility')}</h2>
        <button type="button" class="icon-btn" data-a="close" aria-label="${T('סגור', 'Close')}">${icon('i-x')}</button></div>
      <div class="a11y-body">
        <div class="a11y-row" role="radiogroup" aria-labelledby="a11yFs"><span id="a11yFs">${T('גודל טקסט', 'Text size')}</span>
          <div class="a11y-seg">${['100%', '112%', '125%', '140%'].map((l, i) => `<button type="button" class="a11y-opt" role="radio" data-fs="${i}" aria-checked="false">${l}</button>`).join('')}</div></div>
        <div class="a11y-grid">${OPTS.map(([k, ic, he, eng]) => `<button type="button" class="a11y-opt" data-k="${k}" aria-pressed="false">${icon(ic)}<span>${T(he, eng)}</span></button>`).join('')}</div>
        <div class="a11y-foot">
          <button type="button" class="btn btn-ghost btn-sm" data-a="reset">${T('איפוס הגדרות', 'Reset settings')}</button>
          <a class="a11y-link" href="#a11y-statement" data-a="stmt">${T('הצהרת נגישות', 'Accessibility statement')}</a>
        </div>
      </div>`;
    document.body.appendChild(dlg);
    dlg.addEventListener('click', (e) => {
      if (e.target === dlg) { dlg.close(); return; }
      const b = e.target.closest('button, a'); if (!b) return;
      const a = get();
      if (b.dataset.fs != null) { a.fs = +b.dataset.fs; set(a); sync(); return; }
      if (b.dataset.k) { a[b.dataset.k] = !a[b.dataset.k]; set(a); sync(); return; }
      if (b.dataset.a === 'reset') { set({ fs: 0 }); sync(); return; }
      if (b.dataset.a === 'close') dlg.close();
      if (b.dataset.a === 'stmt') { e.preventDefault(); dlg.close(); openStatement(); }
    });
  }
  function sync() {
    const a = get();
    dlg.querySelectorAll('[data-fs]').forEach((b) => b.setAttribute('aria-checked', String(+b.dataset.fs === (a.fs || 0))));
    dlg.querySelectorAll('[data-k]').forEach((b) => b.setAttribute('aria-pressed', String(!!a[b.dataset.k])));
  }
  function openPanel() { if (!dlg) build(); sync(); dlg.showModal(); }
  KX.openA11y = openPanel;
  const ab = document.getElementById('a11yToggle');
  if (ab) ab.addEventListener('click', openPanel);

  /* ---------- הצהרת נגישות ---------- */
  let st = null;
  const UPDATED = en ? 'November 8, 2026' : '8 בנובמבר 2026';
  const FILL = (he, eng) => `<span class="fill">${T(he, eng)}</span>`;
  function openStatement() {
    if (!st) {
      st = document.createElement('dialog');
      st.className = 'a11y-stmt';
      st.id = 'a11y-statement';
      st.setAttribute('aria-labelledby', 'a11yStTitle');
      st.setAttribute('data-no-i18n', '');
      st.setAttribute('lang', en ? 'en' : 'he');
      st.innerHTML = `
        <div class="a11y-head"><h2 id="a11yStTitle">${T('הצהרת נגישות', 'Accessibility statement')}</h2>
          <button type="button" class="icon-btn" data-a="close" aria-label="${T('סגור', 'Close')}">${icon('i-x')}</button></div>
        <div class="a11y-body">
          <p>${T('אנחנו רואים חשיבות רבה בכך שכל אחד ואחת יוכלו להשתמש באתר KALOS בקלות ובנוחות, כולל אנשים עם מוגבלות.', 'We want everyone — including people with disabilities — to be able to use KALOS easily and comfortably.')}</p>
          <h3>${T('רמת הנגישות', 'Conformance level')}</h3>
          <p>${T('האתר הותאם לדרישות תקנות שוויון זכויות לאנשים עם מוגבלות (התאמות נגישות לשירות), התשע״ג–2013, ולתקן הישראלי ת״י 5568, המבוסס על הנחיות WCAG 2.0 ברמה AA. בנוסף יושמו חלק מהנחיות WCAG 2.1 ו־2.2.', 'The site was adapted to the Israeli Equal Rights for Persons with Disabilities (Service Accessibility Adjustments) Regulations, 2013, and to Israeli Standard IS 5568, which is based on WCAG 2.0 level AA. Parts of WCAG 2.1 and 2.2 were also applied.')}</p>
          <h3>${T('מה הותאם', 'What we did')}</h3>
          <ul>
            <li>${T('ניווט מלא במקלדת, קישור "דלג לתוכן" ומסגרת מיקוד בולטת.', 'Full keyboard navigation, a “skip to content” link and a clear focus outline.')}</li>
            <li>${T('מבנה כותרות ואזורים (landmarks) תקני, ותוויות לכל כפתור, שדה וחלון.', 'Proper heading and landmark structure, and labels for every button, field and dialog.')}</li>
            <li>${T('טקסט חלופי לתמונות, וכל הדגמה מונפשת מלווה בהוראות כתובות, דגשים וטעויות נפוצות.', 'Alternative text for images; every animated demo comes with written steps, cues and common mistakes.')}</li>
            <li>${T('סרטוני ההדרכה כוללים כתוביות, פרקים, עצירה וגלילה בציר הזמן, ותיאור קולי לקורא מסך.', 'Training films include captions, chapters, pause and seeking, and announcements for screen readers.')}</li>
            <li>${T('ניגודיות צבעים מספקת במצב כהה ובהיר, ותמיכה בהעדפת "הפחתת תנועה" של המערכת.', 'Sufficient color contrast in dark and light modes, and support for the system “reduce motion” setting.')}</li>
            <li>${T('תפריט נגישות: הגדלת טקסט, ניגודיות גבוהה, הדגשת קישורים, עצירת אנימציות, גופן קריא וריווח טקסט.', 'An accessibility menu: text size, high contrast, highlighted links, stop animations, readable font and text spacing.')}</li>
            <li>${T('האתר זמין בעברית ובאנגלית, ותומך בהגדלת תצוגה עד 200% בלי אובדן תוכן.', 'The site is available in Hebrew and English and supports zoom up to 200% without losing content.')}</li>
          </ul>
          <h3>${T('מגבלות ידועות', 'Known limitations')}</h3>
          <ul>
            <li>${T('המפה ב"מצא פארק" מוטמעת מ־OpenStreetMap, ונגישותה תלויה בשירות החיצוני. רשימת המקומות שלצדה נגישה במלואה.', 'The map in “Find a park” is embedded from OpenStreetMap and its accessibility depends on that service. The list of places next to it is fully accessible.')}</li>
            <li>${T('ההנחיות הקוליות באימון המודרך תלויות בקולות שמותקנים בדפדפן.', 'Voice cues in the guided workout depend on the voices installed in your browser.')}</li>
          </ul>
          <h3>${T('נתקלתם בבעיה?', 'Found a problem?')}</h3>
          <p>${T('אם נתקלתם בקושי בגלישה או בשימוש באתר, נשמח לשמוע ולתקן. פנו לרכז/ת הנגישות:', 'If something on the site is hard to use, please tell us and we will fix it. Contact our accessibility coordinator:')}</p>
          <ul>
            <li>${T('שם', 'Name')}: ${FILL('[שם רכז/ת הנגישות — למילוי]', '[Accessibility coordinator name — to fill in]')}</li>
            <li>${T('טלפון', 'Phone')}: ${FILL('[טלפון — למילוי]', '[Phone — to fill in]')}</li>
            <li>${T('דוא״ל', 'Email')}: ${FILL('[דוא״ל — למילוי]', '[Email — to fill in]')}</li>
          </ul>
          <p>${T('תאריך עדכון ההצהרה', 'Statement last updated')}: ${UPDATED}. ${T('תאריך בדיקת הנגישות האחרונה', 'Last accessibility audit')}: ${FILL('[למילוי]', '[to fill in]')}.</p>
        </div>`;
      document.body.appendChild(st);
      st.addEventListener('click', (e) => { if (e.target === st || e.target.closest('[data-a="close"]')) st.close(); });
      st.addEventListener('close', () => { if (location.hash === '#a11y-statement') history.replaceState(null, '', location.pathname + location.search); });
    }
    if (!st.open) st.showModal();
  }
  KX.openA11yStatement = openStatement;
  document.addEventListener('click', (e) => { const a = e.target.closest('a[href="#a11y-statement"]'); if (a && !a.closest('.a11y-dlg')) { e.preventDefault(); openStatement(); } });
  if (location.hash === '#a11y-statement') setTimeout(openStatement, 300);

  /* תפריט הטלפון: Esc סוגר ומחזיר את המיקוד לכפתור */
  function closeMenu() { const bg = document.getElementById('burger'); if (bg && bg.getAttribute('aria-expanded') === 'true') { bg.click(); return bg; } return null; }
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !document.querySelector('dialog[open]')) { const bg = closeMenu(); if (bg) bg.focus(); } });

  /* ---------- בטלפון: נגישות, שפה ומצב תצוגה בתוך התפריט ---------- */
  const menu = document.getElementById('navLinks');
  if (menu && !menu.querySelector('.menu-tools')) {
    const li = document.createElement('li');
    li.className = 'menu-tools';
    li.setAttribute('data-no-i18n', '');
    li.innerHTML = `
      <button type="button" data-mt="a11y">${icon('i-access')}<span>${T('נגישות', 'Accessibility')}</span></button>
      <button type="button" data-mt="lang" lang="${en ? 'he' : 'en'}"><b class="mt-badge" aria-hidden="true">${en ? 'עב' : 'EN'}</b><span>${en ? 'עברית' : 'English'}</span></button>
      <button type="button" data-mt="theme">${icon('i-contrast')}<span>${T('בהיר / כהה', 'Light / dark')}</span></button>`;
    menu.insertBefore(li, menu.firstChild);
    li.addEventListener('click', (e) => {
      const b = e.target.closest('[data-mt]'); if (!b) return;
      const t = b.dataset.mt;
      if (t === 'a11y') { closeMenu(); openPanel(); }
      else if (t === 'lang') KX.setLang(en ? 'he' : 'en');
      else if (t === 'theme') { const tb = document.getElementById('themeToggle'); if (tb) tb.click(); }
    });
  }

  apply(get());
})();
