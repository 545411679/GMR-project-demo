/* =====================================================
   GMR project page — interactivity
   - language toggle (zh / en, only one rendered at a time)
   - KaTeX auto-render
   - manifest-driven showcase + gallery + RMSE table
   ===================================================== */

(function () {
  'use strict';

  // ------------------------------------------------------------
  // 1.  Language toggle
  // ------------------------------------------------------------
  const html  = document.documentElement;
  const btn   = document.getElementById('langToggle');
  const STORE = 'gmr-lang';

  function setLang(lang) {
    html.classList.remove('lang-zh', 'lang-en');
    html.classList.add('lang-' + lang);
    html.setAttribute('lang', lang === 'zh' ? 'zh' : 'en');
    try { localStorage.setItem(STORE, lang); } catch (e) {}
  }

  try {
    const saved = localStorage.getItem(STORE);
    if (saved === 'zh' || saved === 'en') setLang(saved);
  } catch (e) {}

  if (btn) {
    btn.addEventListener('click', function () {
      const isZh = html.classList.contains('lang-zh');
      setLang(isZh ? 'en' : 'zh');
    });
  }

  // ------------------------------------------------------------
  // 2.  KaTeX auto-render
  // ------------------------------------------------------------
  function renderMath() {
    if (typeof renderMathInElement !== 'function') return;
    renderMathInElement(document.body, {
      delimiters: [
        { left: '$$', right: '$$', display: true  },
        { left: '\\[', right: '\\]', display: true  },
        { left: '\\(', right: '\\)', display: false },
      ],
      throwOnError: false,
    });
  }

  // ------------------------------------------------------------
  // 3.  Manifest-driven content
  // ------------------------------------------------------------
  const RESULTS_ROOT = 'results';
  const LOOKS = ['M1', 'M2', 'M3'];

  // Each column descriptor: data key + display label (EN/ZH) + render type.
  const COLUMNS = [
    { key: 'B',                kind: 'img',  en: 'B',                  zh: 'B' },
    { key: 'M',                kind: 'img',  en: 'M',                  zh: 'M' },
    { key: 'M_bnd',            kind: 'img',  en: 'M + segmentation borders', zh: 'M + 分区边界' },
    { key: 'palette_gmm',      kind: 'img',  en: 'GMM palette',        zh: 'GMM palette' },
    { key: 'palette_merged',   kind: 'img',  en: 'merged palette',     zh: '修剪后 palette' },
    { key: 'strokes',          kind: 'img',  en: 'stroke regions',     zh: 'stroke regions' },
    { key: 'steps_mp4',        kind: 'mp4',  en: 'step MP4',           zh: 'step MP4' },
    { key: 'recon_over_M',     kind: 'img',  en: 'recon over M',       zh: '重建合成' },
    { key: 'M_cmp',            kind: 'img',  en: 'original input M (for compare)', zh: '原始输入 M（对比）' },
    { key: 'rmse',             kind: 'num',  en: 'RMSE',               zh: 'RMSE' },
  ];

  // Resolve the on-disk file path for a column given the B_id + Mi tag.
  // The build script names files by convention; we hard-code the same names here.
  function fileFor(bId, look, colKey) {
    const base = `${RESULTS_ROOT}/${bId}/`;
    switch (colKey) {
      case 'B':              return base + 'B.jpg';
      case 'M':              return base + `${look}.jpg`;
      case 'M_bnd':          return base + `${look}_bnd.jpg`;
      case 'palette_gmm':    return base + `${look}_palette_gmm.png`;
      case 'palette_merged': return base + `${look}_palette_merged.png`;
      case 'strokes':        return base + `${look}_strokes.jpg`;
      case 'steps_mp4':      return base + `${look}_steps_quality.mp4`;
      case 'steps_poster':   return base + `${look}_steps_poster.jpg`;
      case 'recon_over_M':   return base + `${look}_recon_over_M.jpg`;
      case 'M_cmp':          return base + `${look}.jpg`;    // duplicate of M
      default:               return null;
    }
  }

  // Build the 10-column grid table for one subject (B_id), 3 rows (M1/M2/M3).
  function renderBgrid(bId, perLookRmse) {
    const lang = html.classList.contains('lang-zh') ? 'zh' : 'en';

    // data-modal-group makes every [data-modal-src] inside this table one
    // navigable series in the lightbox.
    let html_ = '<table class="rg" data-modal-group><thead><tr>';
    html_ += '<th class="rg__rowhead mono"><span class="hl">'
          + (lang === 'zh' ? '风格' : 'Look')
          + '</span></th>';
    for (const col of COLUMNS) {
      html_ += `<th class="rg__colhead mono"><span class="hl">${col[lang]}</span></th>`;
    }
    html_ += '</tr></thead><tbody>';

    for (const look of LOOKS) {
      const rmse = perLookRmse && perLookRmse[look];
      html_ += `<tr><th class="rg__rowhead mono">${look}</th>`;
      for (const col of COLUMNS) {
        if (col.kind === 'num') {
          const txt = (rmse === null || rmse === undefined) ? 'n/a'
                    : (typeof rmse === 'number' ? rmse.toFixed(2) : String(rmse));
          html_ += `<td class="rg__cell rg__cell--num mono">${txt}</td>`;
        } else if (col.kind === 'mp4') {
          const src    = fileFor(bId, look, col.key);
          const poster = fileFor(bId, look, 'steps_poster');
          html_ += `<td class="rg__cell rg__cell--mp4"`
                +  ` data-video-src="${src}" data-video-poster="${poster}"`
                +  ` data-video-label="${look} · computed makeup steps">`
                +  `<img src="${poster}" loading="lazy" alt="step MP4 ${look}" />`
                +  `<span class="rg__play">▶</span></td>`;
        } else {
          const src = fileFor(bId, look, col.key);
          html_ += `<td class="rg__cell rg__cell--img"`
                +  ` data-modal-src="${src}" data-modal-alt="${col.en} ${look}">`
                +  `<img src="${src}" loading="lazy" alt="${col.en} ${look}" /></td>`;
        }
      }
      html_ += '</tr>';
    }

    html_ += '</tbody></table>';
    return html_;
  }

  // ------------------------------------------------------------
  // 4.  Wire it together
  // ------------------------------------------------------------
  async function loadManifest() {
    try {
      const r = await fetch(RESULTS_ROOT + '/manifest.json', { cache: 'no-store' });
      if (!r.ok) throw new Error('manifest ' + r.status);
      return await r.json();
    } catch (e) {
      console.warn('manifest load failed:', e);
      return null;
    }
  }

  async function loadRmseTable() {
    try {
      const r = await fetch(RESULTS_ROOT + '/rmse_table.json', { cache: 'no-store' });
      if (!r.ok) throw new Error('rmse_table ' + r.status);
      return await r.json();
    } catch (e) {
      console.warn('rmse_table load failed:', e);
      return null;
    }
  }

  async function loadBsummary(bId) {
    try {
      const r = await fetch(`${RESULTS_ROOT}/${bId}/B_summary.json`,
                            { cache: 'no-store' });
      if (!r.ok) return { per_look_rmse: {} };
      return await r.json();
    } catch (e) {
      return { per_look_rmse: {} };
    }
  }

  function showError(elId, msg) {
    const el = document.getElementById(elId);
    if (el) el.innerHTML = `<div class="data-error mono">${msg}</div>`;
  }

  // Stages displayed in the single process bar under the video swiper.
  // The same bar is reused as the user swipes; renderBar repopulates it
  // for the newly-selected look.
  const STAGES = [
    { key: 'B',              en_title: 'B',                  zh_title: 'B',
      en_desc: 'bare-face input. The subject before makeup.',
      zh_desc: '素颜输入。化妆前的对象。' },
    { key: 'M',              en_title: 'M',                  zh_title: 'M',
      en_desc: 'made-up input. The target look for this row.',
      zh_desc: '上妆输入。本行对应的目标妆面。' },
    { key: 'M_bnd',          en_title: 'M + region boundaries',
                             zh_title: 'M + 分区边界',
      en_desc: 'eleven non-overlapping regions drawn on M via convex-hull polygons and priority claiming.',
      zh_desc: '在 M 上绘制十一个不重叠区域，由凸包多边形与优先级裁剪生成。' },
    { key: 'palette_gmm',    en_title: 'GMM palette',
                             zh_title: 'GMM palette',
      en_desc: 'raw per-region GMM output. One row per region; K swatches per row.',
      zh_desc: '每区域 GMM 原始输出。一区域一行，每行 K 个色号。' },
    { key: 'palette_merged', en_title: 'merged palette',
                             zh_title: '修剪后 palette',
      en_desc: 'after 打底色 reorder and replaceability classification. Trimmed-and-discarded entries are marked with a red ✕.',
      zh_desc: '经打底色重排与可替代性分类。被修剪丢弃的色号以红色 ✕ 标出。' },
    { key: 'strokes',        en_title: 'stroke regions',
                             zh_title: 'stroke regions',
      en_desc: 'bordered indicator per shade drawn on M, showing where each shade lands.',
      zh_desc: '每个色号的带边界指示器，绘制于 M 上，显示每色号的落点位置。' },
    { key: 'recon_over_M',   en_title: 'reconstructed makeup by replaying strokes',
                             zh_title: '通过笔触复演重建的妆面',
      en_desc: 'reconstructed makeup obtained by replaying the ordered brushstroke sequence onto B; composited over the original M outside the region union.',
      zh_desc: '将有序 brushstroke 序列重放到 B 上得到的重建妆面；区域之外保留原 M。' },
    { key: 'M_cmp',          en_title: 'M  (side-by-side reference)',
                             zh_title: 'M（对比参考）',
      en_desc: 'the original M shown again next to the reconstruction for direct visual comparison. The similarity is high — GMR recovers M to within RMSE inside the makeup mask.',
      zh_desc: '在重建妆面旁再次给出原始 M 以供直接视觉对照。两者相似度很高 —— GMR 在 makeup mask 内恢复 M 至 RMSE 误差内。' },
  ];

  // Render the bar contents for ONE look. The container itself is created
  // once by renderShowcase; this function only fills it.
  function renderBarContent(bId, look, rmse) {
    let html_ = '';
    for (const s of STAGES) {
      const fig = fileFor(bId, look, s.key);
      html_ += `<div class="ms-stage">`
            +    `<div class="ms-stage__fig"`
            +      ` data-modal-src="${fig}"`
            +      ` data-modal-alt="${s.en_title} · ${look}">`
            +      `<img src="${fig}" loading="lazy" alt="${s.en_title}" />`
            +    `</div>`
            +    `<div class="ms-stage__text">`
            +      `<div class="ms-stage__title mono">`
            +        `<span class="hl">`
            +          `<span class="zh">${s.zh_title}</span>`
            +          `<span class="en">${s.en_title}</span>`
            +        `</span>`
            +      `</div>`
            +      `<div class="ms-stage__desc">`
            +        `<span class="zh">${s.zh_desc}</span>`
            +        `<span class="en">${s.en_desc}</span>`
            +      `</div>`
            +    `</div>`
            +  `</div>`;
    }
    const rmseStr = (rmse === null || rmse === undefined) ? 'n/a'
                  : (typeof rmse === 'number' ? rmse.toFixed(2) : String(rmse));
    html_ += `<div class="ms-stage ms-stage--rmse">`
          +    `<div class="ms-stage__fig ms-stage__fig--num mono">${rmseStr}</div>`
          +    `<div class="ms-stage__text">`
          +      `<div class="ms-stage__title mono"><span class="hl">RMSE</span></div>`
          +      `<div class="ms-stage__desc">`
          +        `<span class="zh">在 0–255 标度上、makeup mask 内部统计；GMR(p=0.70, N=6) 配置下。</span>`
          +        `<span class="en">on 0–255 scale, inside the makeup mask; under GMR(p=0.70, N=6).</span>`
          +      `</div>`
          +    `</div>`
          +  `</div>`;
    return html_;
  }

  // Source-look credit shown beneath each showcase video.
  const LOOK_TAGS = {
    M1: 'Effect By 美图秀秀 · 美容 · 美妆 · 柔纱芭蕾',
    M2: 'Effect By 美图秀秀 · 美容 · 美妆 · 小猫眼',
    M3: 'Effect By 美图秀秀 · 美容 · 美妆 · 古风',
  };

  function renderShowcaseVideo(bId, look) {
    const poster = fileFor(bId, look, 'steps_poster');
    const mp4    = fileFor(bId, look, 'steps_mp4');
    const tag    = LOOK_TAGS[look] || '';
    return `<article class="ms-vid" data-look="${look}">`
         +   `<div class="ms-vid__shell">`
         +     `<video class="ms-vid__video" data-role="hover-mp4"`
         +       ` src="${mp4}" poster="${poster}"`
         +       ` loop muted playsinline preload="metadata"></video>`
         +     `<div class="ms-vid__label mono">${look}</div>`
         +   `</div>`
         +   `<div class="ms-vid__tag">${tag}</div>`
         + `</article>`;
  }

  function wireTabSelection(rootEl, bId, rmMap) {
    const strip = rootEl.querySelector('.ms-vstrip');
    const vids  = Array.from(rootEl.querySelectorAll('.ms-vid'));
    const tabs  = Array.from(rootEl.querySelectorAll('.ms-tab'));
    const bar   = rootEl.querySelector('.ms-bar');
    if (!strip || vids.length === 0 || !bar) return;

    let currentIdx = -1;
    function selectIdx(idx) {
      if (idx === currentIdx) return;
      currentIdx = idx;
      strip.style.setProperty('--sel-idx', String(idx));
      vids.forEach((v, i) => v.classList.toggle('ms-vid--selected', i === idx));
      tabs.forEach((t, i) => t.classList.toggle('ms-tab--active',  i === idx));
      const look = LOOKS[idx];
      bar.innerHTML = renderBarContent(bId, look, rmMap[look]);
    }

    tabs.forEach((t, i) => t.addEventListener('click', () => selectIdx(i)));
    vids.forEach((v, i) => v.addEventListener('click', () => selectIdx(i)));

    selectIdx(0);
  }

  // Build + wire the full video-swiper + process-bar block for one B
  // into the given container element. Reused by the showcase and by each
  // expanded gallery item.
  function mountMSBlock(el, bId, rmMap) {
    let videos = '';
    LOOKS.forEach((look) => { videos += renderShowcaseVideo(bId, look); });

    let tabs = '';
    LOOKS.forEach((look, i) => {
      tabs += `<button class="ms-tab mono" data-i="${i}" aria-label="${look}">`
           +    look
           +  `</button>`;
    });

    el.innerHTML =
      `<div class="ms">`
      + `  <div class="ms-videos">`
      + `    <div class="ms-vstrip">${videos}</div>`
      + `  </div>`
      + `  <div class="ms-tabs">${tabs}</div>`
      + `  <div class="ms-bar" data-modal-group></div>`
      + `</div>`;

    wireTabSelection(el, bId, rmMap || {});
    wireBarModalClicks(el);
  }

  async function renderShowcase(manifest) {
    const el = document.getElementById('showcase-grid');
    if (!el) return;
    if (!manifest || !manifest.showcase_id) {
      showError('showcase-grid', 'no showcase_id in manifest.json');
      return;
    }
    const sum = await loadBsummary(manifest.showcase_id);
    mountMSBlock(el, manifest.showcase_id, sum.per_look_rmse || {});
  }

  // ─ M · Motivation gallery: B + M1 + M2 + M3, static, spaced.
  function renderMotivation(manifest) {
    const el = document.getElementById('mot-gallery');
    if (!el || !manifest || !manifest.showcase_id) return;
    const base = `${RESULTS_ROOT}/${manifest.showcase_id}/`;
    const tiles = [
      { src: base + 'B.jpg',  label: 'bare' },
      { src: base + 'M1.jpg', label: 'M1' },
      { src: base + 'M2.jpg', label: 'M2' },
      { src: base + 'M3.jpg', label: 'M3' },
    ];
    el.innerHTML = tiles.map((t) =>
      `<figure class="mot-tile">`
      + `<img src="${t.src}" loading="lazy" alt="${t.label}" />`
      + `<figcaption class="mono">${t.label}</figcaption>`
      + `</figure>`).join('');
  }

  // ─ T · Teaser: input M2 (still) beside its replay MP4.
  function renderTeaser(manifest) {
    const el = document.getElementById('teaser-show');
    if (!el || !manifest || !manifest.showcase_id) return;
    const base   = `${RESULTS_ROOT}/${manifest.showcase_id}/`;
    const still  = base + 'M2.jpg';
    const mp4    = base + 'M2_steps_quality.mp4';
    const poster = base + 'M2_steps_poster.jpg';
    el.innerHTML =
      `<figure class="teaser-pane teaser-pane--still">`
      + `<img src="${still}" loading="lazy" alt="input M2" />`
      + `<figcaption class="mono">input look</figcaption>`
      + `</figure>`
      + `<div class="teaser-arrow">&rarr;</div>`
      + `<figure class="teaser-pane teaser-pane--video">`
      + `<video src="${mp4}" poster="${poster}" muted playsinline`
      + ` preload="metadata" data-role="teaser-mp4"></video>`
      + `<figcaption class="mono">hover to play &middot; computed makeup steps</figcaption>`
      + `</figure>`;
  }

  // ------------------------------------------------------------
  // 4b.  Image lightbox — series-aware (prev / next), zoom + pan
  // ------------------------------------------------------------
  const modalState = {
    zoom: 1, panX: 0, panY: 0, dragging: false, lastX: 0, lastY: 0,
    series: [], index: 0,
  };

  function ensureModal() {
    let m = document.getElementById('ms-modal');
    if (m) return m;
    m = document.createElement('div');
    m.id = 'ms-modal';
    m.className = 'ms-modal';
    m.hidden = true;
    m.innerHTML =
      `<div class="ms-modal__backdrop" data-action="close"></div>`
      + `<div class="ms-modal__stage">`
      +   `<img class="ms-modal__peek ms-modal__peek--prev" data-action="prev" alt="" draggable="false" />`
      +   `<div class="ms-modal__panel">`
      +     `<button class="ms-modal__nav ms-modal__nav--prev" data-action="prev" aria-label="previous">‹</button>`
      +     `<div class="ms-modal__viewport" data-role="viewport">`
      +       `<img class="ms-modal__img" alt="" draggable="false" />`
      +     `</div>`
      +     `<button class="ms-modal__nav ms-modal__nav--next" data-action="next" aria-label="next">›</button>`
      +     `<div class="ms-modal__bar">`
      +       `<span class="ms-modal__caption mono" data-role="caption"></span>`
      +       `<button class="ms-modal__btn" data-action="zoom-out" aria-label="zoom out">−</button>`
      +       `<button class="ms-modal__btn" data-action="reset">reset</button>`
      +       `<button class="ms-modal__btn" data-action="zoom-in" aria-label="zoom in">+</button>`
      +       `<span class="ms-modal__zoom mono" data-role="zoom">100%</span>`
      +       `<button class="ms-modal__btn ms-modal__btn--close" data-action="close" aria-label="close">×</button>`
      +     `</div>`
      +   `</div>`
      +   `<img class="ms-modal__peek ms-modal__peek--next" data-action="next" alt="" draggable="false" />`
      + `</div>`;
    document.body.appendChild(m);
    wireModalEvents(m);
    return m;
  }

  function applyTransform(m) {
    const img = m.querySelector('.ms-modal__img');
    img.style.transform = `translate(${modalState.panX}px, ${modalState.panY}px) scale(${modalState.zoom})`;
    const z = m.querySelector('[data-role="zoom"]');
    if (z) z.textContent = Math.round(modalState.zoom * 100) + '%';
  }

  function setZoom(m, z) {
    modalState.zoom = Math.max(0.25, Math.min(8, z));
    if (modalState.zoom <= 1.001) { modalState.panX = 0; modalState.panY = 0; }
    applyTransform(m);
  }

  // Load series[index] into the viewport, reset zoom, update nav state.
  // dir = 'left' | 'right' | null — triggers the slide-in animation.
  function showCurrent(m, dir) {
    const item = modalState.series[modalState.index];
    if (!item) return;
    const img = m.querySelector('.ms-modal__img');
    img.src = item.src;
    img.alt = item.alt || '';
    modalState.zoom = 1; modalState.panX = 0; modalState.panY = 0;
    applyTransform(m);

    if (dir) {
      img.classList.remove('slide-l', 'slide-r');
      void img.offsetWidth;                       // restart the animation
      img.classList.add(dir === 'right' ? 'slide-r' : 'slide-l');
    }

    const cap = m.querySelector('[data-role="caption"]');
    if (cap) cap.textContent =
      `${item.alt || ''}  ·  ${modalState.index + 1}/${modalState.series.length}`;

    // Dimmed peek previews of the neighbouring images.
    const prevItem = modalState.series[modalState.index - 1];
    const nextItem = modalState.series[modalState.index + 1];
    const peekPrev = m.querySelector('.ms-modal__peek--prev');
    const peekNext = m.querySelector('.ms-modal__peek--next');
    if (peekPrev) {
      if (prevItem) { peekPrev.src = prevItem.src; peekPrev.style.visibility = 'visible'; }
      else          { peekPrev.removeAttribute('src'); peekPrev.style.visibility = 'hidden'; }
    }
    if (peekNext) {
      if (nextItem) { peekNext.src = nextItem.src; peekNext.style.visibility = 'visible'; }
      else          { peekNext.removeAttribute('src'); peekNext.style.visibility = 'hidden'; }
    }

    // Disable prev at start, next at end (no wrap-around).
    const prev = m.querySelector('.ms-modal__nav--prev');
    const next = m.querySelector('.ms-modal__nav--next');
    if (prev) prev.disabled = (modalState.index <= 0);
    if (next) next.disabled = (modalState.index >= modalState.series.length - 1);
  }

  function step(m, delta) {
    const ni = modalState.index + delta;
    if (ni < 0 || ni >= modalState.series.length) return;
    modalState.index = ni;
    showCurrent(m, delta > 0 ? 'right' : 'left');
  }

  function openModalSeries(series, index) {
    const m = ensureModal();
    modalState.series = series;
    modalState.index  = index;
    showCurrent(m);
    m.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    const m = document.getElementById('ms-modal');
    if (m) m.hidden = true;
    document.body.style.overflow = '';
  }

  function wireModalEvents(m) {
    m.addEventListener('click', function (ev) {
      const btn = ev.target.closest('[data-action]');
      if (!btn) return;
      const action = btn.getAttribute('data-action');
      if (action === 'close')         closeModal();
      else if (action === 'prev')     step(m, -1);
      else if (action === 'next')     step(m, +1);
      else if (action === 'zoom-in')  setZoom(m, modalState.zoom * 1.25);
      else if (action === 'zoom-out') setZoom(m, modalState.zoom / 1.25);
      else if (action === 'reset')    setZoom(m, 1);
    });
    document.addEventListener('keydown', function (ev) {
      if (m.hidden) return;
      if (ev.key === 'Escape')                       closeModal();
      else if (ev.key === 'ArrowLeft')               step(m, -1);
      else if (ev.key === 'ArrowRight')              step(m, +1);
      else if (ev.key === '+' || ev.key === '=')     setZoom(m, modalState.zoom * 1.25);
      else if (ev.key === '-' || ev.key === '_')     setZoom(m, modalState.zoom / 1.25);
      else if (ev.key === '0')                       setZoom(m, 1);
    });
    const viewport = m.querySelector('[data-role="viewport"]');
    viewport.addEventListener('wheel', function (ev) {
      if (m.hidden) return;
      ev.preventDefault();
      const factor = ev.deltaY < 0 ? 1.12 : 1 / 1.12;
      setZoom(m, modalState.zoom * factor);
    }, { passive: false });
    const img = m.querySelector('.ms-modal__img');
    img.addEventListener('mousedown', function (ev) {
      if (modalState.zoom <= 1.001) return;
      modalState.dragging = true;
      modalState.lastX = ev.clientX;
      modalState.lastY = ev.clientY;
      ev.preventDefault();
    });
    document.addEventListener('mousemove', function (ev) {
      if (!modalState.dragging) return;
      modalState.panX += ev.clientX - modalState.lastX;
      modalState.panY += ev.clientY - modalState.lastY;
      modalState.lastX = ev.clientX;
      modalState.lastY = ev.clientY;
      applyTransform(m);
    });
    document.addEventListener('mouseup', function () { modalState.dragging = false; });
  }

  // Single delegated handler: clicking any [data-modal-src] builds a series
  // from sibling [data-modal-src] elements within the closest
  // [data-modal-group] container (fall back to just the clicked item).
  function wireBarModalClicks(rootEl) {
    rootEl.addEventListener('click', function (ev) {
      const hit = ev.target.closest('[data-modal-src]');
      if (!hit || !rootEl.contains(hit)) return;
      const group = hit.closest('[data-modal-group]') || rootEl;
      const nodes = Array.from(group.querySelectorAll('[data-modal-src]'));
      const series = nodes.map((n) => ({
        src: n.getAttribute('data-modal-src'),
        alt: n.getAttribute('data-modal-alt') || '',
      }));
      const index = Math.max(0, nodes.indexOf(hit));
      openModalSeries(series.length ? series : [{
        src: hit.getAttribute('data-modal-src'),
        alt: hit.getAttribute('data-modal-alt') || '',
      }], index);
    });
  }

  async function renderGallery(manifest) {
    const el = document.getElementById('gallery-strip');
    if (!el) return;
    if (!manifest || !Array.isArray(manifest.gallery_ids) || manifest.gallery_ids.length === 0) {
      el.innerHTML =
        '<div class="data-empty mono">'
        + '<span class="zh">画廊为空——manifest.json 中无 gallery_ids。</span>'
        + '<span class="en">no gallery yet — manifest.json has no gallery_ids.</span>'
        + '</div>';
      return;
    }

    // Build summary cache (per-look rmse needed for the expanded detail)
    const summaries = {};
    await Promise.all(manifest.gallery_ids.map(async (id) => {
      summaries[id] = await loadBsummary(id);
    }));

    // Row of selector cards (B on top, 3 M's below) + one shared detail
    // container beneath the whole row.
    let cards = '';
    for (const id of manifest.gallery_ids) {
      const sum  = summaries[id] || {};
      const mean = (sum.mean_rmse === null || sum.mean_rmse === undefined)
                 ? 'n/a' : (sum.mean_rmse).toFixed(2);
      let mThumbs = '';
      for (const look of LOOKS) {
        mThumbs += `<div class="gcard__m">`
                +    `<img src="${RESULTS_ROOT}/${id}/${look}.jpg" loading="lazy" alt="${id} ${look}" />`
                +    `<span class="gcard__mlabel mono">${look}</span>`
                +  `</div>`;
      }
      cards += `<button class="gcard" data-bid="${id}">`
            +    `<div class="gcard__b">`
            +      `<img src="${RESULTS_ROOT}/${id}/B.jpg" loading="lazy" alt="${id} bare" />`
            +    `</div>`
            +    `<div class="gcard__ms">${mThumbs}</div>`
            +    `<div class="gcard__meta mono">`
            +      `<span class="gcard__id">${id}</span>`
            +      `<span class="gcard__rmse">RMSE ${mean}</span>`
            +    `</div>`
            +  `</button>`;
    }

    el.innerHTML =
      `<div class="gallery-cards">${cards}</div>`
      + `<div class="gallery-detail" data-role="detail" hidden></div>`;

    // Delegated lightbox for any table cell rendered into the detail panel.
    wireBarModalClicks(el);

    const detail = el.querySelector('[data-role="detail"]');
    let openId = null;

    el.addEventListener('click', function (ev) {
      const card = ev.target.closest('.gcard');
      if (!card) return;
      const id = card.getAttribute('data-bid');

      // Toggle: clicking the open card collapses everything.
      if (id === openId) {
        openId = null;
        detail.hidden = true;
        detail.innerHTML = '';
        el.querySelectorAll('.gcard').forEach((c) => c.classList.remove('gcard--selected'));
        return;
      }

      openId = id;
      el.querySelectorAll('.gcard').forEach((c) =>
        c.classList.toggle('gcard--selected', c === card));
      const sum = summaries[id] || { per_look_rmse: {} };
      detail.hidden = false;
      detail.innerHTML =
        `<div class="gdetail">`
        + `  <div class="gdetail__table">${renderBgrid(id, sum.per_look_rmse || {})}</div>`
        + `  <aside class="gdetail__frame" data-role="vframe">`
        + `    <div class="gdetail__prompt mono">`
        + `      <span class="zh">点击表格中的 [step MP4] 查看上妆步骤回放</span>`
        + `      <span class="en">click a [step MP4] cell to replay the makeup steps</span>`
        + `    </div>`
        + `  </aside>`
        + `</div>`;
      detail.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });

    // Click a [step MP4] cell → play it in the side frame.
    el.addEventListener('click', function (ev) {
      const cell = ev.target.closest('[data-video-src]');
      if (!cell || !el.contains(cell)) return;
      const frame = el.querySelector('[data-role="vframe"]');
      if (!frame) return;
      const src    = cell.getAttribute('data-video-src');
      const poster = cell.getAttribute('data-video-poster') || '';
      const label  = cell.getAttribute('data-video-label') || '';
      frame.innerHTML =
        `<div class="gdetail__framelabel mono">${label}</div>`
        + `<video class="gdetail__video" src="${src}" poster="${poster}"`
        + ` autoplay loop muted playsinline controls></video>`;
    });
  }

  function renderRmseTable(rt) {
    const el = document.getElementById('rmse-table');
    if (!el) return;
    if (!rt) { showError('rmse-table', 'no rmse_table.json'); return; }

    let h = '<table class="rmse"><thead><tr>'
          + '<th class="mono"><span class="zh">对象</span><span class="en">Subject</span></th>'
          + '<th class="mono"><span class="zh">风格</span><span class="en">Look</span></th>'
          + '<th class="mono"><span class="zh">RMSE (0–255)</span><span class="en">RMSE (0–255)</span></th>'
          + '</tr></thead><tbody>';

    const fmt = (v) => (v === null || v === undefined) ? 'n/a'
                     : (typeof v === 'number' ? v.toFixed(2) : String(v));

    if (rt.showcase) {
      const s = rt.showcase;
      const looks = s.per_look_rmse || {};
      const tags = Object.keys(looks);
      tags.forEach((tag, i) => {
        h += '<tr>';
        if (i === 0) {
          h += `<td class="rmse__subject mono" rowspan="${tags.length}">`
            +  `<span class="zh">主对象</span><span class="en">showcase</span>`
            +  ` · ${s.B_id}</td>`;
        }
        h += `<td class="mono">${tag}</td><td class="mono">${fmt(looks[tag])}</td></tr>`;
      });
    }

    if (Array.isArray(rt.gallery)) {
      for (const s of rt.gallery) {
        h += `<tr>`
          +  `<td class="rmse__subject mono">${s.B_id}</td>`
          +  `<td class="mono"><span class="zh">三种风格均值</span><span class="en">mean across 3 looks</span></td>`
          +  `<td class="mono">${fmt(s.mean_rmse)}</td>`
          +  `</tr>`;
      }
    }

    if (rt.grand_mean !== null && rt.grand_mean !== undefined) {
      h += `<tr class="rmse__total"><td class="mono"><span class="zh">全部</span><span class="en">All</span></td>`
        +  `<td class="mono"><span class="zh">总均值</span><span class="en">grand mean</span></td>`
        +  `<td class="mono">${fmt(rt.grand_mean)}</td></tr>`;
    }

    h += '</tbody></table>';
    el.innerHTML = h;
  }

  // ------------------------------------------------------------
  // 5.  Hover-to-play for MP4 cells (delegated)
  // ------------------------------------------------------------
  function wireHoverMp4() {
    function toLastFrame(v) {
      const end = isFinite(v.duration) && v.duration > 0 ? v.duration : 0;
      if (end) { try { v.currentTime = Math.max(0, end - 0.04); } catch (e) {} }
    }
    document.body.addEventListener('mouseover', function (ev) {
      const v = ev.target.closest('video[data-role="hover-mp4"]');
      if (!v) return;
      try { v.currentTime = 0; } catch (e) {}     // hover replays from the start
      const p = v.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    });
    document.body.addEventListener('mouseout', function (ev) {
      const v = ev.target.closest('video[data-role="hover-mp4"]');
      if (!v) return;
      // Only pause when the mouse really leaves the video (not on child move)
      const to = ev.relatedTarget;
      if (to && v.contains(to)) return;
      v.pause();
      // Rest state shows the LAST frame (matches the poster), not frame 0.
      toLastFrame(v);
    });
  }

  // Teaser video: shows last frame (poster) at rest; hover plays from the
  // start once, stops on the last frame (no loop); leaving snaps to the
  // last frame again.
  function wireTeaserMp4() {
    function toLastFrame(v) {
      const end = isFinite(v.duration) && v.duration > 0 ? v.duration : 0;
      if (end) { try { v.currentTime = Math.max(0, end - 0.04); } catch (e) {} }
    }
    document.body.addEventListener('mouseover', function (ev) {
      const v = ev.target.closest('video[data-role="teaser-mp4"]');
      if (!v) return;
      try { v.currentTime = 0; } catch (e) {}
      const p = v.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    });
    document.body.addEventListener('mouseout', function (ev) {
      const v = ev.target.closest('video[data-role="teaser-mp4"]');
      if (!v) return;
      const to = ev.relatedTarget;
      if (to && v.contains(to)) return;
      v.pause();
      toLastFrame(v);
    });
    // When playback finishes, hold on the last frame (no loop).
    document.body.addEventListener('ended', function (ev) {
      const v = ev.target.closest('video[data-role="teaser-mp4"]');
      if (!v) return;
      toLastFrame(v);
    }, true);
  }

  // Scroll-spy: highlight the nav link of the section currently in view.
  function wireScrollSpy() {
    const links = Array.from(document.querySelectorAll('.topnav a[href^="#"]'));
    const map = new Map();
    links.forEach((a) => {
      const sec = document.getElementById(a.getAttribute('href').slice(1));
      if (sec) map.set(sec, a);
    });
    if (!map.size) return;

    const visible = new Set();
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) visible.add(e.target);
        else                  visible.delete(e.target);
      });
      let best = null, bestTop = Infinity;
      visible.forEach((sec) => {
        const t = sec.getBoundingClientRect().top;
        if (t < bestTop) { bestTop = t; best = sec; }
      });
      links.forEach((a) => a.classList.remove('topnav--active'));
      if (best && map.get(best)) map.get(best).classList.add('topnav--active');
    }, { rootMargin: '-12% 0px -72% 0px', threshold: 0 });

    map.forEach((_a, sec) => obs.observe(sec));
  }

  // ------------------------------------------------------------
  // 6.  Boot
  // ------------------------------------------------------------
  async function boot() {
    renderMath();
    const manifest = await loadManifest();
    const rt       = await loadRmseTable();
    renderMotivation(manifest);
    renderTeaser(manifest);
    await renderShowcase(manifest);
    await renderGallery(manifest);
    renderRmseTable(rt);
    wireHoverMp4();
    wireTeaserMp4();
    wireScrollSpy();
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    boot();
  } else {
    window.addEventListener('DOMContentLoaded', boot);
  }

})();
