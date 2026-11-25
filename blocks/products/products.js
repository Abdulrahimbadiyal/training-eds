/*
 * Products block.
 *
 * Authoring (key / value rows):
 *   | products      |                          |
 *   | heading       | Products Catalogue       |
 *   | base-url      | https://dummyjson.com    |
 *   | all-products  | /products                |
 *   | product-url   | product-detail           |
 *
 * Reads the config, fetches `${base-url}${all-products}`, and renders the
 * returned products as a responsive card grid. Each card links to
 * `${product-url}?id=<id>` so it opens the matching product detail page.
 */

/* read the block's key/value rows into a config object */
function readConfig(block) {
  const config = {};
  [...block.children].forEach((row) => {
    const cells = [...row.children];
    if (cells.length >= 2) {
      const key = cells[0].textContent.trim().toLowerCase();
      config[key] = cells[1].textContent.trim();
    }
  });
  return config;
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function formatPrice(value) {
  const num = Number(value);
  if (Number.isNaN(num)) return '';
  return `$${num.toFixed(2)}`;
}

function buildCard(product, productUrl) {
  const card = el('li', 'products-card');

  // the whole card links to the matching product detail page
  const link = el('a', 'products-card-link');
  if (productUrl && product.id !== undefined) {
    const sep = productUrl.includes('?') ? '&' : '?';
    link.href = `${productUrl}${sep}id=${encodeURIComponent(product.id)}`;
  }
  link.setAttribute('aria-label', product.title || 'View product');
  card.append(link);

  const media = el('div', 'products-card-image');
  if (product.thumbnail || product.image) {
    const img = el('img');
    img.src = product.thumbnail || product.image;
    img.alt = product.title || '';
    img.loading = 'lazy';
    img.decoding = 'async';
    media.append(img);
  }
  link.append(media);

  const body = el('div', 'products-card-body');
  if (product.category) body.append(el('span', 'products-category', product.category));
  if (product.title) body.append(el('h3', 'products-title', product.title));
  if (product.description) body.append(el('p', 'products-desc', product.description));

  const footer = el('div', 'products-card-footer');
  if (product.price !== undefined) footer.append(el('span', 'products-price', formatPrice(product.price)));
  if (product.rating !== undefined) {
    const rating = el('span', 'products-rating');
    rating.append(el('span', 'products-star', '★'));
    rating.append(el('span', '', Number(product.rating).toFixed(1)));
    footer.append(rating);
  }
  body.append(footer);

  link.append(body);
  return card;
}

function titleCase(value) {
  return String(value || '')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/* build the filter + sort toolbar; returns its controls for wiring */
function buildToolbar(products) {
  const toolbar = el('div', 'products-toolbar');

  const search = el('div', 'products-search');
  const searchIcon = el('span', 'products-search-icon');
  searchIcon.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2"/><path d="M20 20l-4-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  const searchInput = el('input', 'products-search-input');
  searchInput.type = 'text';
  searchInput.placeholder = 'Search products';
  searchInput.autocomplete = 'off';
  searchInput.setAttribute('aria-label', 'Search products');
  searchInput.setAttribute('role', 'combobox');
  searchInput.setAttribute('aria-autocomplete', 'list');
  searchInput.setAttribute('aria-expanded', 'false');
  searchInput.setAttribute('aria-controls', 'products-suggestions');
  const suggestions = el('ul', 'products-suggestions');
  suggestions.id = 'products-suggestions';
  suggestions.setAttribute('role', 'listbox');
  suggestions.hidden = true;
  search.append(searchIcon, searchInput, suggestions);
  toolbar.append(search);

  const controls = el('div', 'products-controls');

  // --- filter popup (category + price) ---
  const categories = [...new Set(products.map((p) => p.category).filter(Boolean))].sort();
  const prices = products.map((p) => Number(p.price) || 0);
  const bounds = { min: Math.floor(Math.min(...prices)), max: Math.ceil(Math.max(...prices)) };

  const filterWrap = el('div', 'products-filter');
  const filterToggle = el('button', 'products-filter-toggle');
  filterToggle.type = 'button';
  filterToggle.setAttribute('aria-haspopup', 'dialog');
  filterToggle.setAttribute('aria-expanded', 'false');
  filterToggle.innerHTML = `
    <svg class="products-filter-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M3 5h18M6 12h12M10 19h4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
    <span>Filter</span>`;
  const badge = el('span', 'products-filter-badge');
  badge.hidden = true;
  filterToggle.append(badge);

  const panel = el('div', 'products-filter-panel');
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Filter products');
  panel.hidden = true;

  // category checkboxes
  const catSection = el('div', 'products-filter-section');
  catSection.append(el('h3', 'products-filter-heading', 'Category'));
  const catOptions = el('div', 'products-filter-options');
  categories.forEach((c) => {
    const opt = el('label', 'products-filter-check');
    const cb = el('input', 'products-filter-cat');
    cb.type = 'checkbox';
    cb.value = c;
    opt.append(cb, el('span', undefined, titleCase(c)));
    catOptions.append(opt);
  });
  catSection.append(catOptions);
  panel.append(catSection);

  // price range slider (dual handle)
  const priceSection = el('div', 'products-filter-section');
  const priceHead = el('div', 'products-filter-price-head');
  priceHead.append(el('h3', 'products-filter-heading', 'Price'));
  const priceValue = el('span', 'products-filter-price-value');
  priceHead.append(priceValue);
  priceSection.append(priceHead);

  const slider = el('div', 'products-price-slider');
  const fill = el('div', 'products-price-fill');
  const minInput = el('input', 'products-filter-min');
  minInput.type = 'range';
  minInput.min = bounds.min;
  minInput.max = bounds.max;
  minInput.value = bounds.min;
  minInput.setAttribute('aria-label', 'Minimum price');
  const maxInput = el('input', 'products-filter-max');
  maxInput.type = 'range';
  maxInput.min = bounds.min;
  maxInput.max = bounds.max;
  maxInput.value = bounds.max;
  maxInput.setAttribute('aria-label', 'Maximum price');
  slider.append(fill, minInput, maxInput);
  priceSection.append(slider);
  panel.append(priceSection);

  const span = Math.max(1, bounds.max - bounds.min);
  const pct = (v) => ((Number(v) - bounds.min) / span) * 100;
  const renderSlider = () => {
    const lo = Number(minInput.value);
    const hi = Number(maxInput.value);
    priceValue.textContent = `$${lo} – $${hi}`;
    fill.style.left = `${pct(lo)}%`;
    fill.style.right = `${100 - pct(hi)}%`;
  };
  minInput.addEventListener('input', () => {
    if (Number(minInput.value) > Number(maxInput.value)) minInput.value = maxInput.value;
    renderSlider();
  });
  maxInput.addEventListener('input', () => {
    if (Number(maxInput.value) < Number(minInput.value)) maxInput.value = minInput.value;
    renderSlider();
  });
  renderSlider();

  // footer actions
  const footer = el('div', 'products-filter-footer');
  const clearBtn = el('button', 'products-filter-clear', 'Clear all');
  clearBtn.type = 'button';
  const applyBtn = el('button', 'products-filter-apply button', 'Apply');
  applyBtn.type = 'button';
  footer.append(clearBtn, applyBtn);
  panel.append(footer);

  filterWrap.append(filterToggle, panel);
  controls.append(filterWrap);

  // sort
  const sortWrap = el('div', 'products-sort');
  sortWrap.append(el('span', 'products-sort-label', 'Sort'));
  const sortSelect = el('select', 'products-sort-select');
  sortSelect.setAttribute('aria-label', 'Sort products');
  [
    ['featured', 'Featured'],
    ['price-asc', 'Price: low to high'],
    ['price-desc', 'Price: high to low'],
    ['rating', 'Top rated'],
    ['name', 'Name: A to Z'],
  ].forEach(([value, label]) => {
    const opt = el('option', undefined, label);
    opt.value = value;
    sortSelect.append(opt);
  });
  sortWrap.append(sortSelect);
  controls.append(sortWrap);

  toolbar.append(controls);

  const getCategories = () => [...panel.querySelectorAll('.products-filter-cat:checked')].map((c) => c.value);
  const getPrice = () => ({
    min: Number(minInput.value) > bounds.min ? Number(minInput.value) : null,
    max: Number(maxInput.value) < bounds.max ? Number(maxInput.value) : null,
  });
  const refreshBadge = () => {
    const price = getPrice();
    const n = getCategories().length + (price.min != null || price.max != null ? 1 : 0);
    badge.hidden = n === 0;
    badge.textContent = String(n);
    filterToggle.classList.toggle('is-active', n > 0);
  };
  const clearAll = () => {
    panel.querySelectorAll('.products-filter-cat').forEach((c) => { c.checked = false; });
    minInput.value = bounds.min;
    maxInput.value = bounds.max;
    renderSlider();
  };

  const filter = {
    toggle: filterToggle,
    panel,
    clearBtn,
    applyBtn,
    getCategories,
    getPrice,
    refreshBadge,
    clearAll,
  };

  return {
    toolbar, searchInput, suggestions, sortSelect, filter,
  };
}

/* build one autocomplete suggestion row for a product */
function buildSuggestion(product, index, productUrl) {
  const li = el('li', 'products-suggestion');
  li.id = `products-suggestion-${index}`;
  li.setAttribute('role', 'option');
  li.dataset.id = product.id;

  const thumb = el('span', 'products-suggestion-thumb');
  if (product.thumbnail || product.image) {
    const img = el('img');
    img.src = product.thumbnail || product.image;
    img.alt = '';
    img.loading = 'lazy';
    thumb.append(img);
  }
  li.append(thumb);

  const info = el('span', 'products-suggestion-info');
  info.append(el('span', 'products-suggestion-name', product.title || 'Product'));
  if (product.category) info.append(el('span', 'products-suggestion-cat', titleCase(product.category)));
  li.append(info);

  if (product.price !== undefined) li.append(el('span', 'products-suggestion-price', formatPrice(product.price)));

  const sep = productUrl.includes('?') ? '&' : '?';
  li.dataset.href = `${productUrl}${sep}id=${encodeURIComponent(product.id)}`;
  return li;
}

/* wire the search box as an autocomplete over the product list */
function setupAutocomplete(searchInput, suggestions, products, productUrl) {
  const MAX = 7;
  let matches = [];
  let active = -1;

  const close = () => {
    suggestions.hidden = true;
    suggestions.replaceChildren();
    searchInput.setAttribute('aria-expanded', 'false');
    searchInput.removeAttribute('aria-activedescendant');
    active = -1;
  };

  const go = (product) => {
    const sep = productUrl.includes('?') ? '&' : '?';
    window.location.href = `${productUrl}${sep}id=${encodeURIComponent(product.id)}`;
  };

  const open = () => {
    const q = searchInput.value.trim().toLowerCase();
    if (!q) { close(); return; }
    matches = products
      .filter((p) => `${p.title || ''} ${p.category || ''}`.toLowerCase().includes(q))
      .slice(0, MAX);
    active = -1;
    if (!matches.length) {
      suggestions.replaceChildren(el('li', 'products-suggestion-empty', 'No matching products'));
    } else {
      suggestions.replaceChildren(...matches.map((p, i) => buildSuggestion(p, i, productUrl)));
    }
    suggestions.hidden = false;
    searchInput.setAttribute('aria-expanded', 'true');
  };

  const setActive = (index) => {
    const items = [...suggestions.querySelectorAll('.products-suggestion')];
    if (!items.length) return;
    active = (index + items.length) % items.length;
    items.forEach((it, i) => it.classList.toggle('is-active', i === active));
    searchInput.setAttribute('aria-activedescendant', items[active].id);
    items[active].scrollIntoView({ block: 'nearest' });
  };

  searchInput.addEventListener('input', open);
  searchInput.addEventListener('focus', () => { if (searchInput.value.trim()) open(); });
  searchInput.addEventListener('keydown', (e) => {
    if (suggestions.hidden) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(active + 1); } else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(active - 1); } else if (e.key === 'Enter' && active >= 0 && matches[active]) { e.preventDefault(); go(matches[active]); } else if (e.key === 'Escape') { close(); }
  });
  // mousedown fires before blur, so the navigation is not cancelled
  suggestions.addEventListener('mousedown', (e) => {
    const li = e.target.closest('.products-suggestion');
    if (!li || !li.dataset.href) return;
    e.preventDefault();
    window.location.href = li.dataset.href;
  });
  searchInput.addEventListener('blur', () => { window.setTimeout(close, 120); });
}

/* apply the current search / category / sort to the product list */
function filterAndSort(products, {
  search, categories, priceMin, priceMax, sort,
}) {
  let list = products.slice();

  const q = search.trim().toLowerCase();
  if (q) {
    list = list.filter((p) => `${p.title || ''} ${p.description || ''} ${p.category || ''}`
      .toLowerCase().includes(q));
  }
  if (categories && categories.length) {
    list = list.filter((p) => categories.includes(p.category));
  }
  if (priceMin != null) list = list.filter((p) => (Number(p.price) || 0) >= priceMin);
  if (priceMax != null) list = list.filter((p) => (Number(p.price) || 0) <= priceMax);

  switch (sort) {
    case 'price-asc': list.sort((a, b) => (a.price || 0) - (b.price || 0)); break;
    case 'price-desc': list.sort((a, b) => (b.price || 0) - (a.price || 0)); break;
    case 'rating': list.sort((a, b) => (b.rating || 0) - (a.rating || 0)); break;
    case 'name': list.sort((a, b) => String(a.title).localeCompare(String(b.title))); break;
    default: break; // featured keeps the API order
  }
  return list;
}

export default async function decorate(block) {
  const config = readConfig(block);
  const baseUrl = config['base-url'] || '';
  const path = config['all-products'] || '';
  const productUrl = config['product-url'] || 'product-detail';

  block.textContent = '';

  if (config.heading) {
    block.append(el('h2', 'products-heading', config.heading));
  }

  const status = el('p', 'products-status', 'Loading products…');
  block.append(status);

  let endpoint;
  try {
    endpoint = new URL(path, baseUrl).href;
  } catch (e) {
    status.textContent = 'Products block: a valid base-url and all-products path are required.';
    status.classList.add('products-error');
    return;
  }

  try {
    const response = await fetch(endpoint);
    if (!response.ok) throw new Error(`Request failed (${response.status})`);
    const data = await response.json();
    // dummyjson returns { products: [...] }; also accept a bare array
    const products = Array.isArray(data) ? data : (data.products || []);

    if (!products.length) {
      status.textContent = 'No products found.';
      return;
    }

    status.remove();

    const {
      toolbar, searchInput, suggestions, sortSelect, filter,
    } = buildToolbar(products);
    block.append(toolbar);
    setupAutocomplete(searchInput, suggestions, products, productUrl);

    const count = el('p', 'products-count');
    block.append(count);

    const grid = el('ul', 'products-grid');
    block.append(grid);

    const empty = el('p', 'products-empty', 'No products match your filters.');
    empty.hidden = true;
    block.append(empty);

    const apply = () => {
      const price = filter.getPrice();
      const list = filterAndSort(products, {
        search: searchInput.value,
        categories: filter.getCategories(),
        priceMin: price.min,
        priceMax: price.max,
        sort: sortSelect.value,
      });
      grid.replaceChildren(...list.map((product) => buildCard(product, productUrl)));
      count.textContent = `${list.length} product${list.length === 1 ? '' : 's'}`;
      empty.hidden = list.length > 0;
      filter.refreshBadge();
    };

    let searchTimer = null;
    searchInput.addEventListener('input', () => {
      window.clearTimeout(searchTimer);
      searchTimer = window.setTimeout(apply, 150);
    });
    sortSelect.addEventListener('change', apply);

    // filter popup: open / close and live apply
    const closeFilter = () => {
      filter.panel.hidden = true;
      filter.toggle.setAttribute('aria-expanded', 'false');
    };
    filter.toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = filter.panel.hidden;
      filter.panel.hidden = !open;
      filter.toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    filter.panel.addEventListener('click', (e) => e.stopPropagation());
    filter.panel.addEventListener('change', apply);
    filter.panel.addEventListener('input', (e) => {
      if (e.target.type === 'range' || e.target.type === 'number') apply();
    });
    filter.clearBtn.addEventListener('click', () => { filter.clearAll(); apply(); });
    filter.applyBtn.addEventListener('click', closeFilter);
    document.addEventListener('click', () => { if (!filter.panel.hidden) closeFilter(); });

    apply();
  } catch (e) {
    status.textContent = `Could not load products: ${e.message}`;
    status.classList.add('products-error');
  }
}
