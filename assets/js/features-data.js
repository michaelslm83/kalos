/* KALOS — נתונים לאימונים מודרכים, אתגרים והישגים */
(function () {
  'use strict';
  const KX = window.KX;

  /* ---------- אימונים מודרכים מוכנים ----------
     item: { ex, sets, reps | sec, rest (שנ׳ אחרי כל סט), note }
     circuit: true → מבצעים סבב של כל התרגילים, ואז roundRest ומתחילים סבב חדש */
  KX.quick = [
    {
      id: 'fb-start', title: 'גוף מלא למתחילים', sub: 'האימון הראשון שלכם', level: 1, equip: 'ללא ציוד', focus: ['גוף מלא'], color: '#c8ff3d',
      items: [
        { ex: 'squat', sets: 3, reps: 12, rest: 60 },
        { ex: 'incline', sets: 3, reps: 10, rest: 60, note: 'ידיים על ספסל, שולחן או קיר' },
        { ex: 'bridge', sets: 3, reps: 15, rest: 45 },
        { ex: 'superman', sets: 3, sec: 20, rest: 45 },
        { ex: 'lunge', sets: 2, reps: 8, rest: 60, note: 'לכל רגל' },
        { ex: 'plank', sets: 3, sec: 30, rest: 45 },
      ],
    },
    {
      id: 'core15', title: 'בטן ב־15 דקות', sub: 'ליבה חזקה, בלי ציוד', level: 1, equip: 'ללא ציוד', focus: ['בטן'], color: '#ff7ad9',
      items: [
        { ex: 'deadbug', sets: 3, reps: 10, rest: 30, note: 'לכל צד' },
        { ex: 'crunch', sets: 3, reps: 15, rest: 30 },
        { ex: 'lyinglegraise', sets: 3, reps: 12, rest: 30 },
        { ex: 'sideplank', sets: 2, sec: 30, rest: 20, note: 'סט לכל צד' },
        { ex: 'plank', sets: 2, sec: 45, rest: 30 },
        { ex: 'climbers', sets: 2, sec: 30, rest: 30 },
      ],
    },
    {
      id: 'push-home', title: 'חזה, כתפיים ויד אחורית', sub: 'יום דחיפה בבית', level: 2, equip: 'ללא ציוד / ספסל', focus: ['חזה', 'כתפיים', 'ידיים'], color: '#c8ff3d',
      items: [
        { ex: 'pushup', sets: 4, reps: 10, rest: 75 },
        { ex: 'pike', sets: 3, reps: 8, rest: 75 },
        { ex: 'decline', sets: 3, reps: 8, rest: 75 },
        { ex: 'diamond', sets: 3, reps: 8, rest: 60 },
        { ex: 'benchdip', sets: 3, reps: 12, rest: 60 },
        { ex: 'hollow', sets: 2, sec: 30, rest: 45 },
      ],
    },
    {
      id: 'pull-bar', title: 'גב ויד קדמית', sub: 'יום משיכה על מוט', level: 2, equip: 'מוט מתח', focus: ['גב', 'ידיים'], color: '#45e3ff',
      items: [
        { ex: 'pullup', sets: 4, reps: 5, rest: 120, note: 'לא מצליחים? שליליים של 5 שניות' },
        { ex: 'row', sets: 3, reps: 10, rest: 75 },
        { ex: 'chinup', sets: 3, reps: 6, rest: 90 },
        { ex: 'legraise', sets: 3, reps: 10, rest: 60 },
        { ex: 'superman', sets: 2, sec: 30, rest: 45 },
      ],
    },
    {
      id: 'legs', title: 'רגליים וישבן', sub: 'כוח וסיבולת לפלג התחתון', level: 2, equip: 'ללא ציוד / ספסל', focus: ['רגליים', 'ישבן'], color: '#ffb547',
      items: [
        { ex: 'squat', sets: 4, reps: 15, rest: 60 },
        { ex: 'bulgarian', sets: 3, reps: 10, rest: 75, note: 'לכל רגל' },
        { ex: 'bridge', sets: 3, reps: 15, rest: 45 },
        { ex: 'calfraise', sets: 3, reps: 20, rest: 45 },
        { ex: 'wallsit', sets: 2, sec: 45, rest: 60 },
      ],
    },
    {
      id: 'hiit20', title: 'HIIT שורף ב־20 דקות', sub: 'מעגל: 4 סבבים', level: 2, equip: 'ללא ציוד', focus: ['גוף מלא', 'כושר'], color: '#ff7b54', circuit: true, roundRest: 90,
      items: [
        { ex: 'burpee', sets: 4, reps: 10, rest: 20 },
        { ex: 'jumpsquat', sets: 4, reps: 12, rest: 20 },
        { ex: 'climbers', sets: 4, sec: 30, rest: 20 },
        { ex: 'pushup', sets: 4, reps: 10, rest: 20 },
      ],
    },
    {
      id: 'express10', title: 'אקספרס 10 דקות', sub: 'מעגל: 2 סבבים, לימים עמוסים', level: 1, equip: 'ללא ציוד', focus: ['גוף מלא'], color: '#c8ff3d', circuit: true, roundRest: 60,
      items: [
        { ex: 'squat', sets: 2, reps: 15, rest: 15 },
        { ex: 'pushup', sets: 2, reps: 10, rest: 15 },
        { ex: 'lunge', sets: 2, reps: 8, rest: 15, note: 'לכל רגל' },
        { ex: 'plank', sets: 2, sec: 30, rest: 15 },
        { ex: 'hollow', sets: 2, sec: 20, rest: 15 },
      ],
    },
    {
      id: 'skills', title: 'סקילים למתקדמים', sub: 'החזקות, איזון ושליטה', level: 3, equip: 'מוט, פרלטס / רצפה', focus: ['סקילים', 'ליבה'], color: '#a98bff',
      items: [
        { ex: 'handstand', sets: 6, sec: 30, rest: 60, note: 'בטן לקיר או חופשי' },
        { ex: 'lsit', sets: 5, sec: 15, rest: 60 },
        { ex: 'tuckplanche', sets: 5, sec: 8, rest: 90 },
        { ex: 'frontlever', sets: 5, sec: 8, rest: 90, note: 'בגרסה שמתאימה לכם (טאק / מתקדם)' },
        { ex: 'pppu', sets: 3, reps: 6, rest: 90 },
        { ex: 'dragonflag', sets: 3, reps: 4, rest: 90, note: 'שליליים איטיים' },
      ],
    },
  ];

  /* מנוחה בין סטים לפי מטרת המחולל */
  KX.restByGoal = { strength: 150, muscle: 75, skills: 120, endurance: 40 };

  /* ---------- אתגרים ----------
     day(d) עבור d = 1..days מחזיר: { rest:true } | { ex, unit:'reps'|'sec', total, chunk }
     total = היעד היומי, chunk = גודל סט מומלץ לחלוקה באימון המודרך */
  const lerp = (a, b, d, n) => Math.round(a + (b - a) * ((d - 1) / (n - 1)));
  KX.challenges = [
    {
      id: 'push30', title: '30 יום שכיבות סמיכה', ex: 'pushup', days: 30, color: '#c8ff3d',
      desc: 'מ־10 ל־100 שכיבות סמיכה ביום. מחלקים לכמה סטים שצריך. כל יום שביעי מנוחה.',
      day: (d) => (d % 7 === 0 ? { rest: true } : { ex: 'pushup', unit: 'reps', total: lerp(10, 100, d, 30), chunk: d < 10 ? 5 : 10 }),
    },
    {
      id: 'plank30', title: 'אתגר פלאנק 30 יום', ex: 'plank', days: 30, color: '#ff7ad9',
      desc: 'מ־20 שניות ל־5 דקות פלאנק מצטבר. כל יום שביעי מנוחה.',
      day: (d) => (d % 7 === 0 ? { rest: true } : { ex: 'plank', unit: 'sec', total: Math.round(lerp(20, 300, d, 30) / 5) * 5, chunk: 60 }),
    },
    {
      id: 'squat30', title: '30 יום סקוואט', ex: 'squat', days: 30, color: '#ffb547',
      desc: 'מ־50 ל־250 סקוואטים ביום. רגליים חזקות, ברכיים בריאות. כל יום שביעי מנוחה.',
      day: (d) => (d % 7 === 0 ? { rest: true } : { ex: 'squat', unit: 'reps', total: Math.round(lerp(50, 250, d, 30) / 5) * 5, chunk: 25 }),
    },
    {
      id: 'pull30', title: '30 יום מתח', ex: 'pullup', days: 30, color: '#45e3ff', needs: 'מוט מתח',
      desc: 'מ־5 ל־40 מתחים ביום, בשיטת "Grease the Groove": סטים קטנים לאורך היום. לא מצליחים מתח? שליליים נספרים. כל יום רביעי מנוחה.',
      day: (d) => (d % 4 === 0 ? { rest: true } : { ex: 'pullup', unit: 'reps', total: lerp(5, 40, d, 30), chunk: d < 12 ? 2 : 4 }),
    },
    {
      id: 'core21', title: '21 יום בטן', ex: 'hollow', days: 21, color: '#a98bff',
      desc: 'אימון בטן מודרך של 15 דקות, 6 ימים בשבוע, שלושה שבועות.',
      day: (d) => (d % 7 === 0 ? { rest: true } : { workout: 'core15' }),
    },
  ];
  KX.challengeMap = {};
  KX.challenges.forEach((c) => (KX.challengeMap[c.id] = c));

  /* ---------- הישגים ----------
     check(ctx) מחזיר התקדמות 0..1 (1 = נפתח). ctx נבנה ב־tracker.js */
  const PUSH = ['pushup', 'incline', 'decline', 'diamond', 'pppu'];
  const PULL = ['pullup', 'chinup'];
  const sumEx = (ctx, ids) => ids.reduce((a, id) => a + ((ctx.totals.byEx[id] || {}).reps || 0), 0);
  const p = (v, goal) => Math.min(1, v / goal);
  KX.badges = [
    { id: 'first', n: 'צעד ראשון', d: 'השלמתם אימון ראשון', ic: '🎯', check: (c) => p(c.workouts.length, 1) },
    { id: 'w5', n: 'נכנסים לקצב', d: '5 אימונים', ic: '⚡', check: (c) => p(c.workouts.length, 5) },
    { id: 'w25', n: 'זה כבר הרגל', d: '25 אימונים', ic: '💪', check: (c) => p(c.workouts.length, 25) },
    { id: 'w100', n: 'מועדון המאה', d: '100 אימונים', ic: '🏆', check: (c) => p(c.workouts.length, 100) },
    { id: 'd3', n: 'שלושה ברצף', d: 'רצף של 3 ימים פעילים', ic: '🔥', check: (c) => p(c.streak.best, 3) },
    { id: 'd7', n: 'שבוע מלא', d: 'רצף של 7 ימים פעילים', ic: '🌋', check: (c) => p(c.streak.best, 7) },
    { id: 'wk4', n: 'חודש של עקביות', d: '4 שבועות ברצף עם 2+ אימונים', ic: '📅', check: (c) => p(c.bestWeeks, 4) },
    { id: 'wk12', n: 'רבעון ברזל', d: '12 שבועות ברצף עם 2+ אימונים', ic: '🛡️', check: (c) => p(c.bestWeeks, 12) },
    { id: 'push100', n: '100 שכיבות סמיכה', d: 'סך הכל, מכל הסוגים', ic: '🙌', check: (c) => p(sumEx(c, PUSH), 100) },
    { id: 'push1000', n: '1,000 שכיבות סמיכה', d: 'סך הכל, מכל הסוגים', ic: '🚀', check: (c) => p(sumEx(c, PUSH), 1000) },
    { id: 'pull1', n: 'המתח הראשון', d: 'רשמתם מתח או צ׳ין־אפ', ic: '🧗', check: (c) => p(sumEx(c, PULL), 1) },
    { id: 'pull100', n: '100 מתחים', d: 'סך הכל, מתח וצ׳ין־אפ', ic: '🦍', check: (c) => p(sumEx(c, PULL), 100) },
    { id: 'plank2', n: 'פלאנק של 2 דקות', d: 'סט פלאנק אחד של 120 שניות', ic: '🧱', check: (c) => p(((c.totals.byEx.plank || {}).best || 0), 120) },
    { id: 'hours10', n: '10 שעות אימון', d: 'זמן אימון מצטבר', ic: '⏱️', check: (c) => p(c.totals.dur, 36000) },
    { id: 'challenge', n: 'סיימתם אתגר', d: 'השלמתם את כל הימים באתגר', ic: '🥇', check: (c) => p(c.challengesDone, 1) },
    { id: 'test', n: 'יודעים איפה עומדים', d: 'השלמתם מבחן כושר', ic: '🧪', check: (c) => p(c.tests.length, 1) },
    { id: 'tree1', n: 'נבט ראשון', d: 'סימנתם שלב בעץ הסקילים', ic: '🌱', check: (c) => p(c.skillSteps, 1) },
    { id: 'tree20', n: 'עץ צומח', d: '20 שלבים בעץ הסקילים', ic: '🌳', check: (c) => p(c.skillSteps, 20) },
    { id: 'branch', n: 'ענף מלא', d: 'השלמתם מסלול התקדמות שלם', ic: '👑', check: (c) => p(c.fullBranches, 1) },
  ];
})();
