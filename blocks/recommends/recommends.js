import { createOptimizedPicture } from '../../scripts/aem.js';

function cellText(cell) {
  return cell ? cell.textContent.trim() : '';
}

/* "50% Off" -> { big: "50%", small: "Off" } */
function splitDiscount(text) {
  const match = text.match(/^(\S+)\s*(.*)$/);
  if (!match) return { big: text, small: '' };
  return { big: match[1], small: match[2].trim() };
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

/* read the text lines of a cell (one per paragraph, falling back to line breaks) */
function cellLines(cell) {
  if (!cell) return [];
  const paras = [...cell.querySelectorAll('p')];
  if (paras.length) return paras.map((p) => p.textContent.trim()).filter(Boolean);
  return cellText(cell).split('\n').map((s) => s.trim()).filter(Boolean);
}

/* normalise a product row into fields, supporting two authoring models:
   - wide:   [image | range | discount | title | description | price | original]
   - compact:[image | content]  where content is up to 6 lines in the above order */
function readProduct(cells) {
  const picture = cells[0] ? cells[0].querySelector('picture') : null;
  if (cells.length >= 4) {
    return {
      picture,
      range: cellText(cells[1]),
      discount: cellText(cells[2]),
      title: cellText(cells[3]),
      desc: cellText(cells[4]),
      now: cellText(cells[5]),
      was: cellText(cells[6]),
    };
  }
  const [range = '', discount = '', title = '', desc = '', now = '', was = ''] = cellLines(cells[1]);
  return {
    picture, range, discount, title, desc, now, was,
  };
}

function buildCard(cells) {
  const data = readProduct(cells);
  const card = el('li', 'recommends-card');

  const media = el('div', 'recommends-card-media');

  if (data.range) {
    const key = data.range.toLowerCase().replace(/[^a-z0-9]/g, '');
    media.append(el('span', `recommends-badge recommends-badge-${key}`, data.range));
  }

  if (data.discount) {
    const { big, small } = splitDiscount(data.discount);
    const badge = el('span', 'recommends-discount');
    badge.append(el('strong', '', big));
    if (small) badge.append(el('small', '', small));
    media.append(badge);
  }

  if (data.picture) {
    media.append(data.picture);
  } else {
    // fall back to a built-in product placeholder so text-only authoring still looks complete
    const placeholder = el('img', 'recommends-card-placeholder');
    placeholder.src = '/blocks/recommends/machine.svg';
    placeholder.alt = '';
    placeholder.loading = 'lazy';
    media.append(placeholder);
  }
  card.append(media);

  const body = el('div', 'recommends-card-body');
  if (data.title) body.append(el('p', 'recommends-card-title', data.title));
  if (data.desc) body.append(el('p', 'recommends-card-desc', data.desc));

  const footer = el('div', 'recommends-card-footer');
  const price = el('div', 'recommends-price');
  if (data.now) price.append(el('span', 'recommends-price-now', data.now));
  if (data.was) price.append(el('span', 'recommends-price-was', data.was));
  footer.append(price);

  const add = el('button', 'recommends-add');
  add.type = 'button';
  add.setAttribute('aria-label', data.title ? `Add ${data.title} to basket` : 'Add to basket');
  footer.append(add);

  body.append(footer);
  card.append(body);
  return card;
}

/* group authored rows into tabs: a row with only its first cell filled starts a new tab */
function parseTabs(rows) {
  const tabs = [];
  let current = null;
  rows.forEach((row) => {
    const cells = [...row.children];
    const filled = cells.filter((c) => c.textContent.trim() || c.querySelector('picture'));
    const isHeader = filled.length === 1
      && filled[0] === cells[0]
      && !cells[0].querySelector('picture');

    if (isHeader) {
      current = { label: cellText(cells[0]), products: [] };
      tabs.push(current);
    } else {
      if (!current) {
        current = { label: 'Products', products: [] };
        tabs.push(current);
      }
      current.products.push(cells);
    }
  });
  return tabs;
}

export default function decorate(block) {
  const tabs = parseTabs([...block.children]);

  const head = el('div', 'recommends-head');
  const tablist = el('div', 'recommends-tabs');
  tablist.setAttribute('role', 'tablist');

  const nav = el('div', 'recommends-nav');
  const prev = el('button', 'recommends-arrow recommends-prev');
  prev.type = 'button';
  prev.setAttribute('aria-label', 'Previous products');
  const next = el('button', 'recommends-arrow recommends-next');
  next.type = 'button';
  next.setAttribute('aria-label', 'Next products');
  nav.append(prev, next);
  head.append(tablist, nav);

  const panels = el('div', 'recommends-panels');
  const tabButtons = [];

  tabs.forEach((tab, i) => {
    const btn = el('button', 'recommends-tab', tab.label);
    btn.type = 'button';
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
    if (i === 0) btn.classList.add('is-active');
    tablist.append(btn);
    tabButtons.push(btn);

    const panel = el('div', 'recommends-panel');
    panel.setAttribute('role', 'tabpanel');
    if (i === 0) panel.classList.add('is-active');
    const track = el('ul', 'recommends-track');
    tab.products.forEach((cells) => track.append(buildCard(cells)));
    panel.append(track);
    panels.append(panel);
  });

  block.replaceChildren(head, panels);

  // optimize same-origin images; leave external (e.g. preview) images untouched
  panels.querySelectorAll('picture > img').forEach((img) => {
    try {
      const url = new URL(img.src, window.location.href);
      if (url.origin === window.location.origin) {
        img.closest('picture').replaceWith(
          createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]),
        );
      }
    } catch (e) {
      // keep the original image
    }
  });

  const activeTrack = () => panels.querySelector('.recommends-panel.is-active .recommends-track');

  function updateNav() {
    const track = activeTrack();
    if (!track) return;
    const max = track.scrollWidth - track.clientWidth;
    const scrollable = max > 1;
    prev.disabled = !scrollable || track.scrollLeft <= 1;
    next.disabled = !scrollable || track.scrollLeft >= max - 1;
  }

  function step(dir) {
    const track = activeTrack();
    const card = track.querySelector('.recommends-card');
    const gap = parseInt(getComputedStyle(track).columnGap, 10) || 16;
    const amount = card ? card.getBoundingClientRect().width + gap : track.clientWidth * 0.8;
    track.scrollBy({ left: dir * amount, behavior: 'smooth' });
  }

  prev.addEventListener('click', () => step(-1));
  next.addEventListener('click', () => step(1));

  panels.querySelectorAll('.recommends-track').forEach((track) => {
    track.addEventListener('scroll', () => {
      window.requestAnimationFrame(updateNav);
    }, { passive: true });
  });

  function activate(index) {
    tabButtons.forEach((btn, i) => {
      const on = i === index;
      btn.classList.toggle('is-active', on);
      btn.setAttribute('aria-selected', on ? 'true' : 'false');
      panels.children[i].classList.toggle('is-active', on);
    });
    const track = activeTrack();
    if (track) track.scrollTo({ left: 0 });
    updateNav();
  }

  tabButtons.forEach((btn, i) => btn.addEventListener('click', () => activate(i)));

  updateNav();
  window.addEventListener('resize', () => window.requestAnimationFrame(updateNav));
}
