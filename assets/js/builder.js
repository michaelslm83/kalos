/* KALOS — מחולל תוכניות אימון אישיות */
(function () {
  'use strict';
  const KX = window.KX;

  /* סולמות התקדמות לכל דפוס תנועה: [סף, שם, מזהה תרגיל להדגמה] */
  const pick = (ladder, v) => { let r = ladder[0]; ladder.forEach((s) => { if (v >= s[0]) r = s; }); return { n: r[1], ex: r[2] || null, iso: !!r[3] }; };

  const LAD = {
    push: [[0, 'שכיבות סמיכה על קיר', 'pushup'], [1, 'שכיבות סמיכה בשיפוע (ידיים על ספסל)', 'incline'], [5, 'שכיבות סמיכה', 'pushup'], [15, 'שכיבות סמיכה יהלום', 'diamond'], [25, 'שכיבות סמיכה ארצ׳ר', 'pushup'], [40, 'פסאודו־פלאנץ׳ פוש־אפ', 'pppu']],
    pushAlt: [[0, 'שכיבות סמיכה בשיפוע', 'incline'], [5, 'שכיבות סמיכה בשיפוע (נפח)', 'incline'], [15, 'שכיבות סמיכה', 'pushup'], [25, 'שכיבות סמיכה רגליים מוגבהות', 'decline'], [40, 'שכיבות סמיכה ארצ׳ר', 'pushup']],
    pike: [[0, 'החזקת פייק (V הפוך)', 'pike', true], [10, 'פייק פוש־אפ', 'pike'], [25, 'פייק מוגבה (רגליים על ספסל)', 'pike'], [40, 'שכיבת סמיכה בעמידת ידיים צמוד לקיר', 'handstand']],
    vpull: [[0, 'מתח שליליים (ירידה 5 שנ׳) + תלייה פעילה', 'pullup'], [1, 'מתח שליליים + מתח', 'pullup'], [4, 'מתח', 'pullup'], [9, 'מתח חזה־למוט', 'pullup'], [13, 'מתח ארצ׳ר / מתח עם משקל', 'pullup']],
    vpull2: [[0, 'משיכות שכמות בתלייה', 'pullup'], [1, 'צ׳ין־אפ שליליים', 'chinup'], [4, 'צ׳ין־אפ (כפות אליך)', 'chinup'], [9, 'מתח רחב', 'pullup'], [13, 'מתח L־sit', 'pullup']],
    row: [[0, 'חתירה בשיפוע (מוט גבוה)', 'row'], [1, 'חתירה אוסטרלית', 'row'], [8, 'חתירה עם רגליים מוגבהות', 'row'], [13, 'חתירת ארצ׳ר', 'row']],
    rowNoBar: [[0, 'חתירה מתחת לשולחן יציב', 'row'], [8, 'חתירה מתחת לשולחן — רגליים מוגבהות', 'row']],
    dip: [[0, 'החזקת תמיכה + דיפס שליליים', 'dip'], [1, 'דיפס שליליים + דיפס', 'dip'], [6, 'דיפס במקבילים', 'dip'], [15, 'דיפס בטבעות / עם משקל', 'dip']],
    squat: [[0, 'סקוואט עם אחיזה', 'squat'], [10, 'סקוואט', 'squat'], [25, 'ספליט סקוואט', 'lunge'], [40, 'בולגרי ספליט סקוואט', 'bulgarian'], [60, 'פיסטול לספסל / שרימפ', 'pistol'], [80, 'סקוואט פיסטול', 'pistol']],
    squatAlt: [[0, 'סקוואט לכיסא', 'squat'], [10, 'לאנג׳ אחורי', 'lunge'], [25, 'לאנג׳ אחורי', 'lunge'], [40, 'ספליט סקוואט עם עצירה', 'lunge'], [60, 'בולגרי ספליט סקוואט', 'bulgarian']],
    hinge: [[0, 'גשר ישבן', 'bridge'], [25, 'גשר ישבן על רגל אחת', 'bridge'], [50, 'RDL על רגל אחת', 'bridge'], [70, 'נורדיק שליליים', 'nordic']],
    hinge2: [[0, 'גשר ישבן עם עצירה', 'bridge'], [25, 'היפ תראסט על ספסל', 'bridge'], [50, 'גשר רגל אחת על ספסל', 'bridge'], [70, 'RDL על רגל אחת', 'bridge']],
    core: [[0, 'פלאנק', 'plank', true], [1, 'הולו בודי', 'hollow', true], [2, 'הרמות רגליים בתלייה', 'legraise'], [3, 'L־sit', 'lsit', true]],
    core2: [[0, 'דד באג', 'deadbug'], [1, 'פלאנק צד', 'sideplank', true], [2, 'L־sit מכווץ', 'lsit', true], [3, 'בהונות למוט', 'legraise']],
    coreNoBar: [[0, 'פלאנק', 'plank', true], [1, 'הולו בודי', 'hollow', true], [2, 'הרמות רגליים בשכיבה', 'lyinglegraise'], [3, 'L־sit על הרצפה', 'lsit', true]],
  };

  const SLOT_CAT = { push: 'push', pushAlt: 'push', pike: 'push', dip: 'push', vpull: 'pull', vpull2: 'pull', row: 'pull', squat: 'legs', squatAlt: 'legs', hinge: 'legs', hinge2: 'legs', calf: 'legs', core: 'core', core2: 'core', skill: 'skill' };

  const TEMPLATES = {
    fbA: { name: 'גוף מלא A', slots: ['vpull', 'squat', 'push', 'dip', 'hinge', 'row', 'core'] },
    fbB: { name: 'גוף מלא B', slots: ['row', 'squatAlt', 'pike', 'hinge2', 'vpull2', 'pushAlt', 'core2'] },
    upA: { name: 'פלג גוף עליון A', slots: ['vpull', 'dip', 'row', 'pike', 'push', 'core'] },
    upB: { name: 'פלג גוף עליון B', slots: ['row', 'push', 'vpull2', 'pike', 'dip', 'core2'] },
    loA: { name: 'פלג גוף תחתון A', slots: ['squat', 'hinge', 'squatAlt', 'calf', 'core'] },
    loB: { name: 'פלג גוף תחתון B', slots: ['squatAlt', 'hinge2', 'squat', 'calf', 'core2'] },
    push: { name: 'דחיפה', slots: ['dip', 'pike', 'push', 'pushAlt', 'core'] },
    pull: { name: 'משיכה', slots: ['vpull', 'row', 'vpull2', 'core2'] },
    legs: { name: 'רגליים', slots: ['squat', 'hinge', 'squatAlt', 'calf', 'core'] },
  };

  const WEEK = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  const SPLITS = {
    2: [[0, 'fbA'], [3, 'fbB']],
    3: [[0, 'fbA'], [2, 'fbB'], [4, 'fbA']],
    4: [[0, 'upA'], [1, 'loA'], [3, 'upB'], [4, 'loB']],
    5: [[0, 'upA'], [1, 'loA'], [2, 'push'], [4, 'pull'], [5, 'legs']],
    6: [[0, 'push'], [1, 'pull'], [2, 'legs'], [3, 'push'], [4, 'pull'], [5, 'legs']],
  };
  const SPLIT_NAME = { 2: 'גוף מלא A/B', 3: 'גוף מלא A/B/A', 4: 'עליון / תחתון', 5: 'עליון / תחתון + דחיפה / משיכה / רגליים', 6: 'דחיפה / משיכה / רגליים ×2' };

  const GOALS = {
    strength: { name: 'כוח', main: [4, '4–6'], acc: [3, '6–8'], iso: [4, '10–15 שנ׳'], rest: '2–3 דק׳', rir: '1–2 חזרות ברזרבה' },
    muscle: { name: 'מסת שריר', main: [4, '8–12'], acc: [3, '10–15'], iso: [3, '20–40 שנ׳'], rest: '60–90 שנ׳', rir: '0–2 חזרות ברזרבה' },
    skills: { name: 'סקילים', main: [3, '5–8'], acc: [3, '6–10'], iso: [4, '10–20 שנ׳'], rest: '2 דק׳', rir: '2 חזרות ברזרבה' },
    endurance: { name: 'סיבולת וחיטוב', main: [3, '12–20'], acc: [3, '15–25'], iso: [3, '30–60 שנ׳'], rest: '30–45 שנ׳', rir: 'עבודה במעגל' },
  };

  const SLOTS_BY_TIME = { 30: 4, 45: 5, 60: 6, 75: 7 };

  function skillFor(lv, hasBar, i) {
    const opts = [];
    opts.push(lv.push >= 25 ? { n: 'עמידת ידיים — ניסיונות חופשיים', ex: 'handstand', rx: '10 דק׳' } : { n: 'עמידת ידיים — בטן לקיר', ex: 'handstand', rx: '4×20–40 שנ׳' });
    if (hasBar) opts.push(lv.pull >= 10 ? { n: 'טאק פרונט לבר', ex: 'frontlever', rx: '5×8–12 שנ׳' } : { n: 'L־sit מכווץ', ex: 'lsit', rx: '5×10–15 שנ׳' });
    else opts.push({ n: 'L־sit מכווץ', ex: 'lsit', rx: '5×10–15 שנ׳' });
    if (hasBar && lv.pull >= 12 && lv.dip >= 10) opts.push({ n: 'תרגול עליית כוח', ex: 'muscleup', rx: '5×1–3' });
    return opts[i % opts.length];
  }

  function build(input) {
    const eq = input.equip;
    const hasBar = eq.bar || eq.rings;
    const hasDip = eq.dip || eq.rings;
    const lv = { push: input.push, pull: hasBar ? input.pull : 0, dip: hasDip ? input.dip : 0, squat: input.squat };
    const overall = Math.max(0, Math.min(3, Math.round(((lv.push >= 25 ? 3 : lv.push >= 15 ? 2 : lv.push >= 5 ? 1 : 0) + (lv.pull >= 12 ? 3 : lv.pull >= 6 ? 2 : lv.pull >= 1 ? 1 : 0)) / 2)));
    const goal = GOALS[input.goal];
    const nSlots = SLOTS_BY_TIME[input.time] || 6;

    const resolve = (slot) => {
      switch (slot) {
        case 'vpull': if (!hasBar) return Object.assign(pick(LAD.rowNoBar, input.pull), { n: 'חתירת מגבת בדלת / מתחת לשולחן' }); return pick(LAD.vpull, lv.pull);
        case 'vpull2': if (!hasBar) return null; return pick(LAD.vpull2, lv.pull);
        case 'row': return hasBar ? pick(LAD.row, lv.pull) : pick(LAD.rowNoBar, input.pull);
        case 'dip': return hasDip ? pick(LAD.dip, lv.dip) : { n: 'שכיבות סמיכה יהלום (יד אחורית)', ex: 'diamond' };
        case 'core': return hasBar ? pick(LAD.core, overall) : pick(LAD.coreNoBar, overall);
        case 'core2': return pick(LAD.core2, hasBar ? overall : Math.min(overall, 2));
        case 'calf': return { n: input.squat >= 25 ? 'הרמות עקב על רגל אחת' : 'הרמות עקב', ex: 'calfraise', calf: true };
        default: return pick(LAD[slot], SLOT_CAT[slot] === 'push' ? lv.push : lv.squat);
      }
    };

    const days = [];
    const volume = { push: 0, pull: 0, legs: 0, core: 0 };
    let skillI = 0;
    const plan = SPLITS[input.days];
    const assigned = {};
    plan.forEach(([dayIdx, tpl]) => (assigned[dayIdx] = tpl));

    for (let d = 0; d < 7; d++) {
      const tplKey = assigned[d];
      if (!tplKey) { days.push({ day: WEEK[d], rest: true }); continue; }
      const tpl = TEMPLATES[tplKey];
      const items = [];
      const isLower = tplKey.indexOf('lo') === 0 || tplKey === 'legs';
      if (input.goal === 'skills' && !isLower) {
        const s = skillFor(lv, hasBar, skillI++);
        items.push({ n: s.n, ex: s.ex, rx: s.rx, skill: true, note: 'בתחילת האימון, רענן' });
      }
      const seen = {};
      /* תמיד לשמור תרגיל ליבה בסוף; לקצץ תרגילי השלמה לפי הזמן */
      const coreSlot = tpl.slots.filter((s) => SLOT_CAT[s] === 'core')[0];
      const others = tpl.slots.filter((s) => SLOT_CAT[s] !== 'core');
      const chosen = others.slice(0, Math.max(2, nSlots - 1)).concat(coreSlot ? [coreSlot] : []);
      for (const slot of chosen) {
        const r = resolve(slot);
        if (!r || seen[r.n]) continue;
        seen[r.n] = 1;
        const mainSlot = ['vpull', 'squat', 'dip', 'push', 'pike'].indexOf(slot) > -1 && items.filter((x) => !x.skill).length < 3;
        let sets, reps, note = '';
        if (r.iso) { [sets, reps] = goal.iso; }
        else if (r.calf) { sets = 3; reps = input.goal === 'strength' ? '10–12' : '15–20'; }
        else if (/שליליים/.test(r.n) && !/\+/.test(r.n)) { sets = 3; reps = '3–5'; note = 'ירידה איטית של 5 שניות'; }
        else if (/שליליים \+/.test(r.n)) { sets = 4; reps = 'מקס׳'; note = 'חזרות נקיות, והשלמה בשליליים עד 5'; }
        else { [sets, reps] = mainSlot ? goal.main : goal.acc; }
        if (/ספליט|לאנג׳|בולגרי|פיסטול|רגל אחת|שרימפ|ארצ׳ר/.test(r.n) && !r.iso) note = note || 'לכל צד';
        items.push({ n: r.n, ex: r.ex, rx: sets + '×' + reps, note });
        const cat = SLOT_CAT[slot];
        if (volume[cat] != null) volume[cat] += sets;
      }
      days.push({ day: WEEK[d], name: tpl.name, items });
    }

    const tips = [
      'פתח כל אימון ב־8–10 דקות חימום (ראה סעיף החימום).',
      'מנוחה בין סטים: ' + goal.rest + '. עצימות: ' + goal.rir + '.',
      'הגעת לגבול העליון של טווח החזרות בכל הסטים? עבור לגרסה הקשה הבאה במסלול.',
      'ירידה מבוקרת של 2–3 שניות בכל חזרה — זה חלק מהעומס.',
      'כל 6–8 שבועות — שבוע הקלה בחצי נפח.',
    ];
    if (input.goal === 'endurance') tips.splice(1, 1, 'בצע את התרגילים כמעגל: 30–45 שנ׳ מנוחה בין תרגילים, 2 דק׳ בין סבבים. 3–4 סבבים.');
    if (!hasBar) tips.push('הכי משתלם לקנות: מוט מתח לדלת. הוא פותח את כל עולם המשיכות.');

    return { days, volume, tips, split: SPLIT_NAME[input.days], goal: goal.name, overall: KX.levels[Math.max(1, overall)] || 'מתחיל' };
  }

  function levelLabel(kind, v) {
    const T = {
      push: [[0, 'מתחיל מוחלט'], [1, 'מתחיל'], [5, 'בסיס טוב'], [15, 'בינוני'], [25, 'מתקדם'], [40, 'חזק מאוד']],
      pull: [[0, 'עוד לא — נתחיל משליליים'], [1, 'מתחיל'], [4, 'בסיס טוב'], [9, 'בינוני'], [13, 'מתקדם']],
      dip: [[0, 'מתחיל'], [1, 'מתחיל'], [6, 'בינוני'], [15, 'מתקדם']],
      squat: [[0, 'מתחיל'], [10, 'בסיס טוב'], [25, 'בינוני'], [40, 'מתקדם'], [60, 'חזק מאוד']],
    }[kind];
    let r = T[0][1]; T.forEach((s) => { if (v >= s[0]) r = s[1]; }); return r;
  }

  KX.builder = { build, levelLabel };
})();
