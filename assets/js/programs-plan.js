/* KALOS — תוכניות מוכחות בשלבים: לכל תוכנית 3 שלבים, ימי אימון עם תרגילים מהספרייה,
   רצועת Kalo (הדגמה מונפשת לכל תרגיל + ניגון רציף של סרטוני Kalo מקוצרים),
   החלפת תרגיל בחלופה מאותה קטגוריה, אימון מודרך, ו"מה ממליצים ברשת" עם קישור למקור. */
(function () {
  'use strict';
  const KX = window.KX;
  const { $, $$, esc, icon, reduce } = KX.ui;

  /* ---------- מקורות (אומתו מול PubMed ו־Open Library) ---------- */
  const SRC = {
    rr: ['r/bodyweightfitness · Recommended Routine', 'https://www.reddit.com/r/bodyweightfitness/wiki/kb/recommended_routine/'],
    cc: ['Paul Wade · Convict Conditioning', 'https://openlibrary.org/works/OL19837917W'],
    nw: ['Pavel Tsatsouline · The Naked Warrior', 'https://openlibrary.org/works/OL8725526W'],
    og: ['Steven Low · Overcoming Gravity', 'https://openlibrary.org/works/OL19717563W'],
    freq16: ['Schoenfeld ועמיתים, 2016 · Sports Medicine', 'https://pubmed.ncbi.nlm.nih.gov/27102172/'],
    freq19: ['Schoenfeld, Grgic ו־Krieger, 2019 · J Sports Sci', 'https://pubmed.ncbi.nlm.nih.gov/30558493/'],
    vol17: ['Schoenfeld, Ogborn ו־Krieger, 2017 · J Sports Sci', 'https://pubmed.ncbi.nlm.nih.gov/27433992/'],
    load17: ['Schoenfeld ועמיתים, 2017 · J Strength Cond Res', 'https://pubmed.ncbi.nlm.nih.gov/28834797/'],
    push15: ['Calatayud ועמיתים, 2015 · J Strength Cond Res', 'https://pubmed.ncbi.nlm.nih.gov/24983847/'],
    push17: ['Kikuchi ו־Nakazato, 2017 · J Exerc Sci Fit', 'https://pubmed.ncbi.nlm.nih.gov/29541130/'],
    prot18: ['Morton ועמיתים, 2018 · Br J Sports Med', 'https://pubmed.ncbi.nlm.nih.gov/28698222/'],
  };
  const W = (t, s) => ({ t, s });

  /* ---------- שלבים ----------
     day: { name, rest, items: [[exId, rx, note?]] } */
  const PLANS = {
    rr: {
      web: [
        W('תרגילי הכוח נעשים בזוגות: סט מהתרגיל הראשון, מנוחה, סט מהשני. כך האימון נשאר קצר.', 'rr'),
        W('מתחילים בשלב שבו אפשר לבצע 3×5 בטכניקה טובה, ועוברים לשלב הבא כשמגיעים ל־3×8.', 'rr'),
        W('3 אימונים בשבוע בימים לא רצופים, וחימום של 10–15 דקות לפני כל אימון.', 'rr'),
        W('שכיבות סמיכה ולחיצת חזה בעומס דומה נתנו עלייה דומה בכוח ובמסת השריר.', 'push17'),
      ],
      stages: [
        { name: 'בסיס', goal: 'ללמוד את ארבעת הדפוסים: משיכה, דחיפה, רגליים וליבה.', advance: '3×8 נקיים בתרגיל — עוברים לגרסה של שלב 2 באותו תרגיל. כל תרגיל מתקדם בקצב שלו.',
          days: [{ name: 'אימון גוף מלא · 3× בשבוע', rest: 90, items: [
            ['deadhang', '3×20–30 שנ׳', 'זוג 1 · משיכה: הכנה למתח'], ['squat', '3×5–8', 'זוג 1 · רגליים'],
            ['benchdip', '3×5–8', 'זוג 2 · דחיפה אנכית'], ['bridge', '3×5–8', 'זוג 2 · ירך וישבן'],
            ['row', '3×5–8', 'זוג 3 · משיכה אופקית'], ['incline', '3×5–8', 'זוג 3 · דחיפה אופקית'],
            ['plank', '3×20–30 שנ׳', 'ליבה · נגד יישור'], ['sideplank', '3×20–30 שנ׳', 'ליבה · נגד סיבוב'], ['superman', '3×8–12', 'ליבה · גב'],
          ] }] },
        { name: 'כוח', goal: 'התרגילים הקלאסיים בגוף מלא: מתח, דיפס, שכיבות סמיכה וסקוואט על רגל אחת.', advance: '3×8 נקיים — עוברים לגרסה של שלב 3.',
          days: [{ name: 'אימון גוף מלא · 3× בשבוע', rest: 90, items: [
            ['pullup', '3×5–8', 'זוג 1'], ['bulgarian', '3×5–8 לכל רגל', 'זוג 1'],
            ['dip', '3×5–8', 'זוג 2'], ['bridge', '3×8–12 רגל אחת', 'זוג 2'],
            ['row', '3×5–8 גוף אופקי', 'זוג 3'], ['pushup', '3×5–8', 'זוג 3'],
            ['abwheel', '3×8–12 מהברכיים', 'ליבה'], ['sideplank', '3×30–45 שנ׳', 'ליבה'], ['superman', '3×10–12', 'ליבה'],
          ] }] },
        { name: 'מתקדם', goal: 'מנוף קשה יותר ותוספת משקל. בשלב הזה כבר בונים לסקילים.', advance: '3×8 נקיים — מוסיפים משקל (וסט/תיק) או עוברים לסקיל.',
          days: [{ name: 'אימון גוף מלא · 3× בשבוע', rest: 120, items: [
            ['pullup', '3×5–8 עם תוספת משקל', 'זוג 1'], ['pistol', '3×5–8 לכל רגל', 'זוג 1'],
            ['dip', '3×5–8 עם תוספת משקל', 'זוג 2'], ['nordic', '3×3–5', 'זוג 2'],
            ['row', '3×5–8 רגליים מוגבהות', 'זוג 3'], ['pppu', '3×5–8', 'זוג 3'],
            ['abwheel', '3×6–10', 'ליבה'], ['sideplank', '3×45–60 שנ׳', 'ליבה'], ['superman', '3×12', 'ליבה'],
          ] }] },
      ],
    },
    cc: {
      web: [
        W('עשרה שלבים לכל אחד מששת התרגילים. מתחילים מהשלב הראשון גם אם הוא נראה קל, כדי לחזק מפרקים וגידים.', 'cc'),
        W('כל חזרה איטית ומבוקרת, בלי תנופה ובטווח תנועה מלא.', 'cc'),
        W('עוברים שלב רק אחרי שעומדים ב"סטנדרט ההתקדמות" של השלב הנוכחי.', 'cc'),
        W('בתוכנית New Blood יש רק שני אימונים בשבוע, ובכל אחד שני תרגילים.', 'cc'),
      ],
      stages: [
        { name: 'שלבים 1–3', goal: 'גרסאות קלות של "השישייה הגדולה": בונים בסיס בלי עומס על המפרקים.', advance: 'סטנדרט ההתקדמות של השלב (למשל שכיבות סמיכה מהקיר: 3×50) — ואז השלב הבא.',
          days: [
            { name: 'יום א׳ · דחיפה וליבה', rest: 90, items: [['wallpush', '2–3×10–50', 'שלב 1: מהקיר'], ['lyinglegraise', '2–3×10–25', 'הרמות רגליים בשכיבה']] },
            { name: 'יום ב׳ · משיכה ורגליים', rest: 90, items: [['row', '2–3×10–40', 'משיכות אופקיות'], ['squat', '2–3×10–30', 'סקוואט חלקי ← מלא']] },
          ] },
        { name: 'שלבים 4–6', goal: 'התרגילים המלאים. מוסיפים יום שלישי לגשרים ולעמידת ידיים ("Good Behavior").', advance: 'למשל שכיבות סמיכה מלאות: 2×20 — ואז הגרסה הצמודה.',
          days: [
            { name: 'יום א׳ · דחיפה וליבה', rest: 90, items: [['kneepush', '2×15–30', 'בדרך לשכיבות מלאות'], ['pushup', '2×10–20'], ['hangknee', '2×10–25', 'הרמות ברכיים בתלייה']] },
            { name: 'יום ב׳ · משיכה ורגליים', rest: 90, items: [['pullup', '2×5–10', 'חצאי מתח ← מתח מלא'], ['squat', '2×20–30', 'סקוואט מלא']] },
            { name: 'יום ג׳ · גשרים ועמידת ידיים', rest: 90, items: [['bridge', '2×10–25'], ['pike', '2×5–10', 'הכנה לעמידת ידיים']] },
          ] },
        { name: 'שלבים 7–10', goal: 'בדרך ל"מאסטר": גרסאות צמודות, לא סימטריות ועל יד או רגל אחת.', advance: 'מתקדמים לאט. לפי הספר, שלבי המאסטר לוקחים חודשים ואפילו שנים.',
          days: [
            { name: 'יום א׳ · דחיפה וליבה', rest: 120, items: [['diamond', '2×10–20', 'שכיבות צמודות'], ['pppu', '2×5–10', 'בדרך ליד אחת'], ['legraise', '2×10–20', 'רגליים ישרות בתלייה']] },
            { name: 'יום ב׳ · משיכה ורגליים', rest: 120, items: [['chinup', '2×5–10', 'אחיזה צמודה'], ['pistol', '2×5–10', 'רגל אחת']] },
            { name: 'יום ג׳ · גשרים ועמידת ידיים', rest: 120, items: [['bridge', '2×10–20'], ['handstand', '2×30–60 שנ׳', 'מול הקיר']] },
          ] },
      ],
    },
    fb: {
      web: [
        W('מי שאימן כל שריר פעמיים בשבוע או יותר צבר יותר מסת שריר ממי שאימן פעם אחת.', 'freq16'),
        W('גם עומס נמוך עם הרבה חזרות בונה שריר, אם מתקרבים לכשל. לכוח מרבי עדיף עומס גבוה.', 'load17'),
        W('שכיבות סמיכה ולחיצת חזה, בפעילות שרירית דומה, נתנו עלייה דומה בכוח.', 'push15'),
      ],
      stages: [
        { name: 'מתחילים', goal: 'גרסאות נגישות לכל דפוס, כדי ללמוד טכניקה ולבנות הרגל.', advance: 'הגבול העליון בכל הסטים — עוברים לגרסה הקשה יותר באותו תרגיל.',
          days: [
            { name: 'אימון A', rest: 75, items: [['row', '3×8–12'], ['squat', '3×10–15'], ['incline', '3×8–12'], ['bridge', '3×12–15'], ['plank', '3×20–30 שנ׳']] },
            { name: 'אימון B', rest: 75, items: [['deadhang', '3×20–30 שנ׳'], ['lunge', '3×8 לכל רגל'], ['kneepush', '3×8–12'], ['benchdip', '3×6–10'], ['deadbug', '3×8 לכל צד']] },
          ] },
        { name: 'ביניים', goal: 'התרגילים הבסיסיים המלאים, A–B–A ואז B–A–B.', advance: 'הגבול העליון בכל הסטים — שלב 3.',
          days: [
            { name: 'אימון A', rest: 90, items: [['pullup', '3×5–8', 'או שליליים'], ['squat', '3×15–20'], ['pushup', '3×8–12'], ['bridge', '3×12–15 רגל אחת'], ['plank', '3×45 שנ׳']] },
            { name: 'אימון B', rest: 90, items: [['row', '3×8–12'], ['lunge', '3×10 לכל רגל'], ['pike', '3×6–10'], ['dip', '3×5–8', 'או שליליים'], ['hollow', '3×20–30 שנ׳']] },
          ] },
        { name: 'מתקדמים', goal: 'גרסאות קשות של אותו מבנה, לפני מעבר לחלוקה עליון/תחתון.', advance: 'כשאתם עושים 8+ מתח ו־15+ שכיבות סמיכה, עברו לתוכנית "עליון / תחתון".',
          days: [
            { name: 'אימון A', rest: 120, items: [['pullup', '4×6–10'], ['bulgarian', '3×8–10 לכל רגל'], ['diamond', '3×8–12'], ['nordic', '3×3–5'], ['abwheel', '3×6–10']] },
            { name: 'אימון B', rest: 120, items: [['chinup', '3×6–10'], ['pistol', '3×3–6 לכל רגל'], ['pike', '3×8–12 רגליים מוגבהות'], ['dip', '3×8–12'], ['hangknee', '3×10–12']] },
          ] },
      ],
    },
    ul: {
      web: [
        W('10 סטים בשבוע ומעלה לכל שריר הניבו יותר גדילה מפחות מ־5 סטים.', 'vol17'),
        W('כשהנפח השבועי זהה, התדירות עצמה משפיעה מעט. אפשר לחלק את הסטים לפי מה שנוח.', 'freq19'),
        W('כ־1.6 גרם חלבון לק״ג גוף ביום ממצים את רוב התועלת לבניית שריר.', 'prot18'),
      ],
      stages: [
        { name: 'בינוני', goal: 'יותר נפח לכל אזור. כל שריר עובד פעמיים בשבוע (עליון–תחתון–מנוחה–עליון–תחתון).', advance: 'עלייה בחזרות קודם, ואז מנוף קשה יותר.',
          days: [
            { name: 'עליון', rest: 120, items: [['pullup', '4×5–8'], ['dip', '4×6–10'], ['row', '3×8–12'], ['pike', '3×6–10'], ['hangknee', '3×8–12']] },
            { name: 'תחתון', rest: 120, items: [['bulgarian', '4×8–10 לכל רגל'], ['bridge', '3×10–12 רגל אחת'], ['lunge', '3×10 לכל רגל'], ['calfraise', '3×15'], ['hollow', '3×30 שנ׳']] },
          ] },
        { name: 'בינוני+', goal: 'וריאציות קשות יותר, עם תחילת עבודה על רגל אחת ועל יד מוטה.', advance: 'הגבול העליון בכל הסטים — שלב 3.',
          days: [
            { name: 'עליון', rest: 120, items: [['chinup', '4×6–10'], ['dip', '4×8–12'], ['row', '4×8–12 רגליים מוגבהות'], ['pppu', '3×6–10'], ['legraise', '3×6–10']] },
            { name: 'תחתון', rest: 120, items: [['pistol', '3×3–6 לכל רגל'], ['nordic', '3×3–5'], ['stepup', '3×10 לכל רגל'], ['calfraise', '3×15 רגל אחת'], ['abwheel', '3×6–10']] },
          ] },
        { name: 'מתקדם', goal: 'משלבים סקילים בעליון: מאסל־אפ, פרונט לבר ועמידת ידיים.', advance: 'כשהסקילים יציבים, עוברים ל"דחיפה / משיכה / רגליים" או ל"סקילים תחילה".',
          days: [
            { name: 'עליון', rest: 150, items: [['muscleup', '4×2–5'], ['dip', '4×10–15'], ['frontlever', '5×10 שנ׳', 'טאק / חצי'], ['handstand', '5×30 שנ׳'], ['legraise', '3×10']] },
            { name: 'תחתון', rest: 150, items: [['pistol', '4×5–8 לכל רגל'], ['nordic', '3×5'], ['jumpsquat', '4×6'], ['calfraise', '4×15 רגל אחת'], ['dragonflag', '3×3–5']] },
          ] },
      ],
    },
    ppl: {
      web: [
        W('10 סטים בשבוע ומעלה לכל שריר הניבו יותר גדילה מפחות מ־5. החלוקה הזו מאפשרת נפח גבוה.', 'vol17'),
        W('אימון כל שריר פעמיים בשבוע (6 אימונים) עדיף על פעם אחת.', 'freq16'),
        W('בנפח גבוה החלבון חשוב: כ־1.6 גרם לק״ג גוף ביום.', 'prot18'),
      ],
      stages: [
        { name: 'מתקדם', goal: 'כל דפוס תנועה פעמיים בשבוע: דחיפה–משיכה–רגליים ×2.', advance: 'הגבול העליון בכל הסטים, וההתאוששות טובה — שלב 2.',
          days: [
            { name: 'דחיפה', rest: 120, items: [['dip', '4×6–10'], ['pike', '4×6–10'], ['pushup', '3×10–15'], ['diamond', '3×מקס׳']] },
            { name: 'משיכה', rest: 120, items: [['pullup', '4×5–8'], ['row', '4×8–12'], ['chinup', '3×5–8'], ['hangknee', '3×10–12']] },
            { name: 'רגליים', rest: 120, items: [['bulgarian', '4×8–10 לכל רגל'], ['lunge', '3×10 לכל רגל'], ['nordic', '3×3', 'שליליים'], ['calfraise', '4×15']] },
          ] },
        { name: 'מתקדם+', goal: 'סקילים בתוך החלוקה: עמידת ידיים בדחיפה ופרונט לבר במשיכה.', advance: 'אם הביצועים יורדים שבועיים ברצף — שבוע קל (חצי נפח) לפני שממשיכים.',
          days: [
            { name: 'דחיפה', rest: 150, items: [['dip', '4×8–12'], ['handstand', '4×20–40 שנ׳', 'מול הקיר'], ['pppu', '3×6–8'], ['diamond', '3×מקס׳']] },
            { name: 'משיכה', rest: 150, items: [['pullup', '4×6–10'], ['row', '4×8–12 רגליים מוגבהות'], ['frontlever', '5×10 שנ׳', 'טאק'], ['legraise', '3×8–10']] },
            { name: 'רגליים', rest: 150, items: [['pistol', '4×5–8 לכל רגל'], ['bulgarian', '3×10 לכל רגל'], ['nordic', '3×5'], ['jumpsquat', '3×8']] },
          ] },
        { name: 'עילית', goal: 'נפח גבוה עם סקילים מלאים. דורש שינה, תזונה ושבוע קל כל 4–6 שבועות.', advance: 'זה השלב הגבוה ביותר כאן. משם ממשיכים לסקילים ספציפיים ב"סקילים תחילה".',
          days: [
            { name: 'דחיפה', rest: 180, items: [['dip', '5×8–12'], ['handstand', '5×30–60 שנ׳'], ['pppu', '4×8'], ['tuckplanche', '5×10 שנ׳']] },
            { name: 'משיכה', rest: 180, items: [['muscleup', '5×2–4'], ['frontlever', '5×10–15 שנ׳'], ['chinup', '4×8'], ['dragonflag', '3×5']] },
            { name: 'רגליים', rest: 150, items: [['pistol', '4×6–10 לכל רגל'], ['nordic', '4×5'], ['jumpsquat', '4×8'], ['calfraise', '4×20 רגל אחת']] },
          ] },
      ],
    },
    gtg: {
      web: [
        W('סטים של 40–50% מהמקסימום, הרבה פעמים ביום, ואף פעם לא עד כשל.', 'nw'),
        W('כוח הוא מיומנות: תרגול תכוף ונקי של אותה תנועה מלמד את מערכת העצבים.', 'nw'),
        W('עובדים על תרגיל אחד או שניים בכל פעם, כתוספת לאימון הרגיל.', 'nw'),
      ],
      stages: [
        { name: 'גרסה קלה', goal: 'בוחרים תרגיל אחד מהרצועה ומפזרים את הסטים לאורך היום.', advance: 'אחרי 2–3 שבועות: יום מנוחה, מבחן מקסימום חדש, וחישוב מחדש של 40–50%.',
          days: [{ name: 'בחרו תרגיל אחד · 5–10 סטים ביום', rest: 0, pick: true, items: [['row', '8×4–6', 'בין הסטים: שעה לפחות'], ['incline', '8×5–8'], ['squat', '8×8–10'], ['deadhang', '8×15 שנ׳']] }] },
        { name: 'גרסה מלאה', goal: 'התרגילים המלאים. השיטה עובדת מצוין לשבירת "תקרה" במתח.', advance: 'אותו כלל: מבחן מקסימום כל 2–3 שבועות.',
          days: [{ name: 'בחרו תרגיל אחד · 5–10 סטים ביום', rest: 0, pick: true, items: [['pullup', '8×2–4', 'מקס׳ 6 ← סטים של 3'], ['pushup', '8×6–10'], ['bulgarian', '8×4–6 לכל רגל'], ['plank', '8×30 שנ׳']] }] },
        { name: 'גרסה קשה', goal: 'תרגילים קשים שמתאימים במיוחד לתרגול תכוף וקצר.', advance: 'כשהמקסימום עולה ב־50% — מחליפים לגרסה הבאה או לתרגיל אחר.',
          days: [{ name: 'בחרו תרגיל אחד · 5–10 סטים ביום', rest: 0, pick: true, items: [['chinup', '8×3–5'], ['diamond', '8×5–8'], ['pistol', '8×1–3 לכל רגל'], ['handstand', '8×20 שנ׳', 'מול הקיר']] }] },
      ],
    },
    og: {
      web: [
        W('מתרגלים סקילים בתחילת האימון, כשמערכת העצבים רעננה, ורק אחר כך כוח.', 'og'),
        W('בתרגילי "ידיים ישרות" (פלאנץ׳, לבר) מתקדמים לאט, כי גידים ורצועות מסתגלים לאט יותר משריר.', 'og'),
        W('החזקות איזומטריות בסטים קצרים ואיכותיים, ולא עד כשל.', 'og'),
      ],
      stages: [
        { name: 'יסודות', goal: 'הכנת פרקי ידיים וכתפיים: עורב, פייק ו־L-sit מקופל, ולצדם כוח בסיסי.', advance: '15+ שניות בהחזקה, או הגבול העליון בתרגילי הכוח — השלב הבא.',
          days: [{ name: 'אימון · 3× בשבוע', rest: 120, items: [['crow', '5×10–20 שנ׳', 'סקיל'], ['pike', '3×6–8', 'סקיל · הכנה לעמידת ידיים'], ['lsit', '5×10 שנ׳', 'סקיל · מקופל'], ['pullup', '3×5–8', 'כוח'], ['dip', '3×5–8', 'כוח'], ['row', '3×8–12', 'כוח'], ['hollow', '3×20–30 שנ׳', 'השלמה']] }] },
        { name: 'סקילים', goal: 'עמידת ידיים מול הקיר, L-sit מלא וטאק פלאנץ׳.', advance: '15+ שניות נקיות — מתקדמים בשלב אחד בסקיל.',
          days: [{ name: 'אימון · 3× בשבוע', rest: 150, items: [['handstand', '5×20–30 שנ׳', 'סקיל · מול הקיר'], ['lsit', '5×10–15 שנ׳', 'סקיל'], ['tuckplanche', '5×8–10 שנ׳', 'סקיל'], ['pullup', '3×6–8', 'כוח'], ['dip', '3×8', 'כוח'], ['pppu', '3×6–8', 'כוח'], ['legraise', '3×8', 'השלמה']] }] },
        { name: 'מתקדם', goal: 'עמידת ידיים חופשית, פרונט לבר ומאסל־אפ.', advance: 'סבלנות: שלב בסקיל של ידיים ישרות יכול לקחת חודשים.',
          days: [{ name: 'אימון · 3× בשבוע', rest: 180, items: [['handstand', '5×30–60 שנ׳', 'סקיל'], ['frontlever', '5×10 שנ׳', 'סקיל'], ['tuckplanche', '5×10–15 שנ׳', 'סקיל'], ['muscleup', '4×2–4', 'כוח'], ['dip', '4×8–10', 'כוח'], ['chinup', '3×6–8', 'כוח'], ['dragonflag', '3×5', 'השלמה']] }] },
      ],
    },
  };
  KX.progPlans = PLANS;

  /* ---------- מצב (שלב, יום והחלפות נשמרים במכשיר) ---------- */
  const st = KX.store.get('progUI', {});
  const save = () => KX.store.set('progUI', st);
  const S = (pid) => (st[pid] = st[pid] || { stage: 0, day: 0, swap: {} });
  const alts = (id) => {
    const e = KX.exMap[id];
    if (!e) return [];
    return KX.exercises.filter((x) => x.cat === e.cat && x.id !== id && Math.abs(x.level - e.level) <= 1)
      .sort((a, b) => Math.abs(a.level - e.level) - Math.abs(b.level - e.level) || a.level - b.level).slice(0, 4).map((x) => x.id);
  };
  const lvl = (e) => KX.levels[e.level];
  const itemsOf = (pid, si, di) => {
    const day = PLANS[pid].stages[si].days[di], sw = S(pid).swap;
    return day.items.map(([id, rx, note], j) => {
      const k = si + ':' + di + ':' + j, cur = sw[k] && KX.exMap[sw[k]] ? sw[k] : id;
      return { id: cur, orig: id, rx, note, k, swapped: cur !== id };
    });
  };

  /* ---------- רצועת Kalo: מיני־הדגמות שמתנגנות כשהן במסך ---------- */
  let players = [];
  const io = 'IntersectionObserver' in window ? new IntersectionObserver((ents) => ents.forEach((en) => {
    const p = en.target.__kp; if (!p) return;
    if (en.isIntersecting && !reduce) p.play(); else p.pause();
  }), { threshold: 0.35 }) : null;
  function killPlayers() { players.forEach((p) => { p.pause(); if (io && p.svg) io.unobserve(p.svg); }); players = []; }
  function mountStrip(box) {
    $$('svg[data-kfig]', box).forEach((svg) => {
      const ex = KX.exMap[svg.dataset.kfig]; if (!ex) return;
      const p = KX.ui.makeFig(svg, ex, { fit: 1.25 });
      svg.__kp = p; p.svg = svg;
      p.showFrame(Math.min(1, p.seq.length - 1));
      players.push(p);
      if (io) io.observe(svg);
      const card = svg.closest('.ks-card');
      if (card && reduce) { card.addEventListener('mouseenter', () => p.play()); card.addEventListener('mouseleave', () => p.pause()); card.addEventListener('focusin', () => p.play()); card.addEventListener('focusout', () => p.pause()); }
    });
  }

  function stripHTML(pid, si, di, pick) {
    return itemsOf(pid, si, di).map((it, j) => {
      const e = KX.exMap[it.id]; if (!e) return '';
      const c = KX.cats[e.cat].color, can = alts(it.orig).length > 0;
      return `<li class="ks-card${it.swapped ? ' swapped' : ''}" style="--c:${c}" data-k="${it.k}" data-ex="${it.id}">
        <button type="button" class="ks-fig" data-act="film" aria-label="סרטון Kalo: ${esc(e.name)}">
          <span class="ks-n">${pick ? 'או' : j + 1}</span><svg data-kfig="${it.id}" aria-hidden="true"></svg><span class="ks-play">${icon('i-play')}</span>
        </button>
        <div class="ks-body">
          <b class="ks-name">${esc(e.name)}</b>
          <span class="ks-rx">${esc(KX.bidi(it.rx))}</span>
          ${it.note ? `<small class="ks-note">${esc(it.note)}</small>` : ''}
          ${it.swapped ? `<small class="ks-was">במקום: ${esc(KX.exMap[it.orig].name)}</small>` : ''}
          <span class="ks-acts">
            <button type="button" data-act="card" class="ks-btn">כרטיס</button>
            ${can ? `<button type="button" data-act="swap" class="ks-btn" aria-label="החלף את ${esc(e.name)} בתרגיל דומה">⇄ החלף</button>` : ''}
            ${it.swapped ? `<button type="button" data-act="reset" class="ks-btn" aria-label="חזרה לתרגיל המקורי">↺</button>` : ''}
          </span>
        </div>
      </li>`;
    }).join('');
  }

  function render(box, p) {
    const plan = PLANS[p.id]; if (!plan) return;
    killPlayers();
    const s = S(p.id);
    s.stage = Math.min(s.stage, plan.stages.length - 1);
    const stg = plan.stages[s.stage];
    s.day = Math.min(s.day, stg.days.length - 1);
    const day = stg.days[s.day];
    const host = $('.pg-plan', box) || box.querySelector('.pd-body').insertBefore(Object.assign(document.createElement('div'), { className: 'pg-plan' }), box.querySelector('.pd-blocks'));
    const sets = itemsOf(p.id, s.stage, s.day).reduce((a, it) => a + (KX.parseRx(it.rx).sets || 1), 0);
    host.innerHTML = `
      <div class="pg-stages" role="tablist" aria-label="שלבי התוכנית">
        ${plan.stages.map((x, i) => `<button type="button" role="tab" aria-selected="${i === s.stage}" data-stage="${i}" class="${i < s.stage ? 'done' : ''}"><i>${i + 1}</i><span><small>שלב ${i + 1}</small>${esc(x.name)}</span></button>`).join('')}
      </div>
      <div class="pg-stage" role="tabpanel">
        <p class="pg-goal">${esc(stg.goal)}</p>
        ${stg.days.length > 1 ? `<div class="pg-days" role="tablist" aria-label="ימי אימון">${stg.days.map((d, i) => `<button type="button" role="tab" aria-selected="${i === s.day}" data-day="${i}">${esc(d.name)}</button>`).join('')}</div>` : ''}
        <div class="ks-head">
          <h4>${esc(day.name)} <small>${day.items.length} תרגילים${day.pick ? '' : ` · ${sets} סטים`}</small></h4>
          <div class="ks-ctl">
            <button type="button" class="btn btn-ghost btn-sm" data-act="reel">${icon('i-play')} רצועת Kalo</button>
            ${day.pick ? '' : `<button type="button" class="btn btn-accent btn-sm" data-act="start">${icon('i-play')} אימון מודרך</button>`}
          </div>
        </div>
        <ol class="ks-strip" aria-label="רצועת Kalo: ${esc(day.name)}">${stripHTML(p.id, s.stage, s.day, day.pick)}</ol>
        <p class="pg-adv">${icon('i-bolt')}<span><b>מתי עוברים שלב:</b> ${esc(stg.advance)}</span></p>
      </div>
      <div class="pg-web">
        <h4>מה ממליצים ברשת</h4>
        <ul>${plan.web.map((w) => `<li><p>${esc(w.t)}</p><a href="${esc(SRC[w.s][1])}" target="_blank" rel="noopener">${esc(SRC[w.s][0])} ↗</a></li>`).join('')}</ul>
      </div>`;
    mountStrip(host);
    const blocks = box.querySelector('.pd-blocks');
    if (blocks && !blocks.closest('details')) {
      const d = document.createElement('details');
      d.className = 'pg-orig';
      d.innerHTML = '<summary>המבנה המקורי של התוכנית</summary>';
      blocks.replaceWith(d);
      d.appendChild(blocks);
    }
    if (!host.__bound) { host.__bound = true; host.addEventListener('click', (e) => onClick(e, p.id, box)); }
    host.__pid = p.id;
  }

  function onClick(e, _pid, box) {
    const host = e.currentTarget, pid = host.__pid, p = KX.programs.find((x) => x.id === pid), s = S(pid);
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.stage != null) { s.stage = +b.dataset.stage; s.day = 0; save(); render(box, p); $('.pg-stages', box).scrollIntoView({ block: 'nearest' }); return; }
    if (b.dataset.day != null) { s.day = +b.dataset.day; save(); render(box, p); return; }
    const act = b.dataset.act, card = b.closest('.ks-card');
    const stg = PLANS[pid].stages[s.stage], day = stg.days[s.day];
    if (act === 'swap' || act === 'reset') {
      const k = card.dataset.k, j = +k.split(':')[2], orig = day.items[j][0];
      if (act === 'reset') delete s.swap[k];
      else { const list = [orig].concat(alts(orig)), cur = s.swap[k] || orig; const nx = list[(list.indexOf(cur) + 1) % list.length]; if (nx === orig) delete s.swap[k]; else s.swap[k] = nx; }
      save(); render(box, p);
      const nc = $(`.ks-card[data-k="${k}"]`, box); if (nc) { nc.classList.add('flash'); const nb = $('[data-act="swap"]', nc); if (nb) nb.focus({ preventScroll: true }); }
      if (KX.app && KX.app.toast && act === 'swap') KX.app.toast('הוחלף ל' + KX.exMap[(s.swap[k] || orig)].name);
      return;
    }
    const items = itemsOf(pid, s.stage, s.day);
    if (act === 'film') { const i = items.findIndex((it) => it.k === card.dataset.k); reel(p, stg, day, items, i, true); return; }
    if (act === 'card') { KX.openEx(card.dataset.ex); return; }
    if (act === 'reel') { reel(p, stg, day, items, 0, false); return; }
    if (act === 'start') { startGuided(p, s.stage, stg, day, items); }
  }

  /* ניגון רציף של סרטוני Kalo מקוצרים עם המינון של התוכנית */
  function reel(p, stg, day, items, i, single) {
    const list = items.map((it) => ({ ex: it.id, rx: it.rx, note: it.note }));
    KX.openCinema(list[i].ex, { playlist: list, idx: i, title: `${p.title} · ${stg.name} · ${day.name}`, cut: single ? null : 'short' });
  }

  function startGuided(p, si, stg, day, items) {
    if (!KX.workout) return;
    const sessionItems = items.map((it) => {
      const e = KX.exMap[it.id], r = KX.parseRx(it.rx);
      const maxRep = /מקס/.test(r.label);
      return { ex: it.id, n: e.name, unit: r.unit, target: r.unit === 'sec' ? r.target : maxRep ? null : r.target,
        label: r.unit === 'sec' ? String(r.target) : maxRep ? 'מקס׳' : r.label.replace(/\s*(לכל|עם|גוף|רגל|רגליים|מהברכיים).*$/, '').trim(),
        sets: r.sets, rest: day.rest || 90, note: it.note || '' };
    });
    KX.workout.start({ title: day.name, sub: `${p.title} · שלב ${si + 1}: ${stg.name}`, src: 'quick', meta: { prog: p.id, stage: si }, items: sessionItems });
  }

  KX.progUI = { render, plans: PLANS };
})();
