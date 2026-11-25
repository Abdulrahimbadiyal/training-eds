/*
 * Slider carousel block (WSU "Schools at Western Sydney").
 *
 * Authoring (key / value rows, then one row per card):
 *   | slider-carousel (shield, brand-refresh)                       |
 *   | slider-title  | Schools at Western Sydney                     |
 *   | slider-button | [View All Schools](https://.../schools)       |
 *   | [image](school-url) | School of Arts                          |
 *   | [image](school-url) | School of Business                      |
 *   | ...                                                            |
 *
 * The title and button rows are optional. Every other row is a card:
 * the first cell holds a (linked) image, the second its content
 * (school name, and optionally a short description and a button).
 */

const GAP = 40; // px gap between slides, matches the reference track

function el(tag, className) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}

function getPerView() {
  const w = window.innerWidth;
  if (w >= 1100) return 3;
  if (w >= 700) return 2;
  return 1;
}

/* classify a row: 'title' / 'button' config rows, or a card */
function rowKind(row) {
  const cells = [...row.children];
  const first = cells[0];
  if (!first) return null;
  const key = first.textContent.trim().toLowerCase();
  if (!first.querySelector('picture, img')) {
    if (key === 'slider-title') return 'title';
    if (key === 'slider-button') return 'button';
  }
  return 'card';
}

function buildCard(row) {
  const cells = [...row.children];
  const card = el('article', 'slider-carousel-slide');

  // image side (first cell)
  const imageWrap = el('div', 'slider-carousel-image');
  const imageCell = cells[0];
  if (imageCell) {
    while (imageCell.firstChild) imageWrap.append(imageCell.firstChild);
  }
  card.append(imageWrap);

  // content side (second cell): school name + optional desc / button
  const content = el('div', 'slider-carousel-content');
  const contentCell = cells[1];
  if (contentCell) {
    while (contentCell.firstChild) content.append(contentCell.firstChild);
    content.querySelectorAll('p > a').forEach((a) => {
      const p = a.closest('p');
      if (p.textContent.trim() === a.textContent.trim()) {
        p.classList.add('button-container');
        a.classList.add('button');
      }
    });
    if (!content.querySelector('.slider-carousel-name')) {
      const name = content.querySelector('h1, h2, h3, h4, h5, h6, p:not(.button-container)');
      if (name) name.classList.add('slider-carousel-name');
    }
  }
  card.append(content);

  // make the whole image keyboard/tap friendly
  const link = imageWrap.querySelector('a');
  if (link) link.setAttribute('aria-label', content.textContent.trim() || link.getAttribute('title') || 'School');

  return card;
}

export default function decorate(block) {
  const rows = [...block.children];

  let titleCell = null;
  let buttonLink = null;
  const cardRows = [];
  rows.forEach((row) => {
    const kind = rowKind(row);
    if (kind === 'title') [, titleCell] = [...row.children];
    else if (kind === 'button') buttonLink = row.querySelector('a');
    else if (kind === 'card') cardRows.push(row);
  });

  // header: title + "view all" button
  const header = el('div', 'slider-carousel-header');
  const titleWrap = el('div', 'slider-carousel-title');
  if (titleCell) {
    while (titleCell.firstChild) titleWrap.append(titleCell.firstChild);
  }
  header.append(titleWrap);
  if (buttonLink) {
    buttonLink.classList.add('button', 'slider-carousel-viewall');
    const btnWrap = el('div', 'slider-carousel-viewall-wrap');
    btnWrap.append(buttonLink);
    header.append(btnWrap);
  }

  // viewport + track
  const viewport = el('div', 'slider-carousel-viewport');
  const track = el('div', 'slider-carousel-track');
  const slides = cardRows.map((row) => buildCard(row));
  slides.forEach((s) => track.append(s));
  viewport.append(track);

  // pagination + controls
  const pagination = el('div', 'slider-carousel-pagination');
  const controls = el('div', 'slider-carousel-controls');
  const prev = el('button', 'slider-carousel-prev button');
  prev.type = 'button';
  prev.setAttribute('aria-label', 'Previous slide');
  prev.textContent = '← Back';
  const next = el('button', 'slider-carousel-next button');
  next.type = 'button';
  next.setAttribute('aria-label', 'Next slide');
  next.textContent = 'Next →';
  controls.append(prev, pagination, next);

  block.replaceChildren(header, viewport, controls);

  // --- carousel state ---
  const state = { page: 0, pages: 1, perView: getPerView() };

  function slideStep() {
    const vw = viewport.clientWidth;
    const slideW = (vw - GAP * (state.perView - 1)) / state.perView;
    return { slideW, vw };
  }

  function apply() {
    const { slideW, vw } = slideStep();
    let x = state.page * state.perView * (slideW + GAP);
    const maxX = Math.max(0, slides.length * (slideW + GAP) - GAP - vw);
    x = Math.min(x, maxX);
    track.style.transform = `translateX(${-x}px)`;
    [...pagination.children].forEach((dot, i) => {
      const active = i === state.page;
      dot.classList.toggle('slider-carousel-dot-active', active);
      dot.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    prev.disabled = state.page === 0;
    next.disabled = state.page >= state.pages - 1;
  }

  function goTo(page) {
    state.page = Math.max(0, Math.min(page, state.pages - 1));
    apply();
  }

  function buildDots() {
    pagination.replaceChildren();
    for (let i = 0; i < state.pages; i += 1) {
      const dot = el('button', 'slider-carousel-dot');
      dot.type = 'button';
      dot.setAttribute('role', 'tab');
      dot.setAttribute('aria-label', `Go to slide group ${i + 1} of ${state.pages}`);
      dot.addEventListener('click', () => goTo(i));
      pagination.append(dot);
    }
    pagination.setAttribute('role', 'tablist');
    pagination.setAttribute('aria-label', 'Carousel pagination');
  }

  function layout() {
    const perView = getPerView();
    state.perView = perView;
    track.style.setProperty('--spv', perView);
    const pages = Math.max(1, Math.ceil(slides.length / perView));
    if (pages !== state.pages) {
      state.pages = pages;
      buildDots();
    }
    state.page = Math.min(state.page, pages - 1);
    apply();
  }

  prev.addEventListener('click', () => goTo(state.page - 1));
  next.addEventListener('click', () => goTo(state.page + 1));

  layout();

  let rafId = null;
  window.addEventListener('resize', () => {
    if (rafId) return;
    rafId = window.requestAnimationFrame(() => {
      rafId = null;
      layout();
    });
  }, { passive: true });

  // touch / drag to swipe
  let startX = 0;
  let dragging = false;
  viewport.addEventListener('pointerdown', (e) => {
    dragging = true;
    startX = e.clientX;
  });
  viewport.addEventListener('pointerup', (e) => {
    if (!dragging) return;
    dragging = false;
    const dx = e.clientX - startX;
    if (Math.abs(dx) > 40) goTo(state.page + (dx < 0 ? 1 : -1));
  });
  viewport.addEventListener('pointerleave', () => { dragging = false; });
}
