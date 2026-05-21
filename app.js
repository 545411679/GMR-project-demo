/* =====================================================
   makeup-as-physics — interactivity v1
   - language toggle (zh / en, only one rendered at a time)
   - step scrubber (placeholder label updates; image swap wired later)
   - KaTeX auto-render
   ===================================================== */

(function () {
  'use strict';

  // -----------------------------
  // Language toggle
  // -----------------------------
  const html = document.documentElement;
  const btn = document.getElementById('langToggle');
  const STORAGE_KEY = 'mxp-lang';

  function setLang(lang) {
    html.classList.remove('lang-zh', 'lang-en');
    html.classList.add('lang-' + lang);
    html.setAttribute('lang', lang === 'zh' ? 'zh' : 'en');
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) {}
  }

  // honor stored preference
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'zh' || saved === 'en') setLang(saved);
  } catch (e) {}

  if (btn) {
    btn.addEventListener('click', function () {
      const isZh = html.classList.contains('lang-zh');
      setLang(isZh ? 'en' : 'zh');
    });
  }

  // -----------------------------
  // Step scrubber (Method · Act 03)
  // -----------------------------
  const scrub = document.getElementById('scrubInput');
  const label = document.getElementById('scrubLabel');

  // step descriptors — used now for the label, and later to swap images
  const STEPS = [
    { i: 0, name_zh: '素颜',   name_en: 'bare'  },
    { i: 1, name_zh: '底妆',   name_en: 'base'  },
    { i: 2, name_zh: '眉',     name_en: 'brow'  },
    { i: 3, name_zh: '眼影',   name_en: 'eye'   },
    { i: 4, name_zh: '腮红',   name_en: 'cheek' },
    { i: 5, name_zh: '唇',     name_en: 'lip'   },
    { i: 6, name_zh: '完成',   name_en: 'final' },
  ];

  function updateScrub(idx) {
    if (!label) return;
    const s = STEPS[idx] || STEPS[0];
    const total = STEPS.length - 1;
    const isZh = html.classList.contains('lang-zh');
    const padded = String(s.i).padStart(2, '0');
    const totalPadded = String(total).padStart(2, '0');
    label.textContent = isZh
      ? `笔 ${padded} / ${totalPadded} — ${s.name_zh}`
      : `STROKE ${padded} / ${totalPadded} — ${s.name_en}`;

    // when case_a frames are dropped in: e.g.
    // stage.style.backgroundImage = `url('assets/case_a/step_${padded}.jpg')`;
  }

  if (scrub) {
    scrub.addEventListener('input', function (e) {
      updateScrub(parseInt(e.target.value, 10));
    });
    // language toggle should re-render the label
    if (btn) {
      btn.addEventListener('click', function () {
        updateScrub(parseInt(scrub.value, 10));
      });
    }
    updateScrub(0);
  }

  // -----------------------------
  // KaTeX auto-render
  // -----------------------------
  function renderMath() {
    if (typeof renderMathInElement !== 'function') return;
    renderMathInElement(document.body, {
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '\\(', right: '\\)', display: false },
        { left: '\\[', right: '\\]', display: true },
      ],
      throwOnError: false,
    });
  }
  if (document.readyState === 'complete') {
    renderMath();
  } else {
    window.addEventListener('load', renderMath);
  }

})();
