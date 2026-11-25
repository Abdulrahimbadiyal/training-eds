/*
 * Product detail block (PDP).
 *
 * Authoring (key / value rows):
 *   | product-detail |                         |
 *   | base-url       | https://dummyjson.com   |
 *   | product-path   | /products               |
 *   | back-url       | /tools/preview/products.html |
 *   | back-label     | Back to products        |
 *
 * Reads the product id from the page URL (`?id=<id>`), fetches
 * `${base-url}${product-path}/${id}`, and renders the full product detail.
 * If no id is present it falls back to the `default-id` row, else id 1.
 */

import { addToCart } from '../../scripts/cart.js';

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

function money(value) {
  const num = Number(value);
  if (Number.isNaN(num)) return '';
  return `$${num.toFixed(2)}`;
}

/* rating as an overlaid pair of star rows, so halves show cleanly */
function buildStars(rating, count) {
  const wrap = el('div', 'product-detail-rating');
  const stars = el('span', 'product-detail-stars');
  stars.setAttribute('aria-hidden', 'true');
  const base = el('span', 'product-detail-stars-base', '★★★★★');
  const fill = el('span', 'product-detail-stars-fill', '★★★★★');
  const pct = (Math.max(0, Math.min(5, Number(rating) || 0)) / 5) * 100;
  fill.style.width = `${pct}%`;
  stars.append(base, fill);
  wrap.append(stars);

  const value = el('span', 'product-detail-rating-value', (Number(rating) || 0).toFixed(2));
  wrap.append(value);
  if (count) wrap.append(el('span', 'product-detail-rating-count', `(${count} reviews)`));
  wrap.setAttribute('aria-label', `Rated ${(Number(rating) || 0).toFixed(2)} out of 5`);
  return wrap;
}

function buildGallery(product) {
  const gallery = el('div', 'product-detail-gallery');
  const images = (product.images && product.images.length)
    ? product.images
    : [product.thumbnail].filter(Boolean);

  const stage = el('div', 'product-detail-stage');
  const main = el('img', 'product-detail-main-image');
  main.src = images[0] || '';
  main.alt = product.title || '';
  main.decoding = 'async';
  stage.append(main);

  if (product.discountPercentage) {
    stage.append(el('span', 'product-detail-badge', `-${Math.round(product.discountPercentage)}%`));
  }
  gallery.append(stage);

  if (images.length > 1) {
    const thumbs = el('div', 'product-detail-thumbs');
    images.forEach((src, i) => {
      const btn = el('button', 'product-detail-thumb');
      btn.type = 'button';
      btn.setAttribute('aria-label', `View image ${i + 1}`);
      if (i === 0) btn.classList.add('product-detail-thumb-active');
      const img = el('img');
      img.src = src;
      img.alt = '';
      img.loading = 'lazy';
      btn.append(img);
      btn.addEventListener('click', () => {
        main.src = src;
        thumbs.querySelectorAll('.product-detail-thumb-active')
          .forEach((t) => t.classList.remove('product-detail-thumb-active'));
        btn.classList.add('product-detail-thumb-active');
      });
      thumbs.append(btn);
    });
    gallery.append(thumbs);
  }
  return gallery;
}

function specRow(label, value) {
  if (value === undefined || value === null || value === '') return null;
  const row = el('div', 'product-detail-spec');
  row.append(el('dt', 'product-detail-spec-label', label));
  row.append(el('dd', 'product-detail-spec-value', String(value)));
  return row;
}

function buildInfo(product) {
  const info = el('div', 'product-detail-info');

  if (product.category) info.append(el('span', 'product-detail-eyebrow', product.category));
  info.append(el('h1', 'product-detail-title', product.title || 'Product'));

  const metaLine = el('div', 'product-detail-meta');
  if (product.brand) metaLine.append(el('span', 'product-detail-brand', product.brand));
  if (product.sku) metaLine.append(el('span', 'product-detail-sku', `SKU ${product.sku}`));
  if (metaLine.children.length) info.append(metaLine);

  info.append(buildStars(product.rating, product.reviews && product.reviews.length));

  // price: treat `price` as the final price, derive the struck list price
  const price = el('div', 'product-detail-price');
  price.append(el('span', 'product-detail-price-now', money(product.price)));
  if (product.discountPercentage) {
    const list = Number(product.price) / (1 - Number(product.discountPercentage) / 100);
    price.append(el('span', 'product-detail-price-was', money(list)));
    price.append(el('span', 'product-detail-price-off', `Save ${Math.round(product.discountPercentage)}%`));
  }
  info.append(price);

  const avail = el('div', 'product-detail-availability');
  const inStock = (product.stock ?? 0) > 0;
  const dot = el('span', `product-detail-stock-dot ${inStock ? 'is-in' : 'is-out'}`);
  avail.append(dot);
  avail.append(el('span', '', product.availabilityStatus || (inStock ? 'In Stock' : 'Out of Stock')));
  if (inStock && product.stock) avail.append(el('span', 'product-detail-stock-count', `${product.stock} available`));
  info.append(avail);

  if (product.description) info.append(el('p', 'product-detail-description', product.description));

  // quantity + add to cart (prototype)
  const buyRow = el('div', 'product-detail-buy');
  const qty = el('div', 'product-detail-qty');
  const minus = el('button', 'product-detail-qty-btn', '−');
  minus.type = 'button';
  minus.setAttribute('aria-label', 'Decrease quantity');
  const qtyValue = el('span', 'product-detail-qty-value', '1');
  const plus = el('button', 'product-detail-qty-btn', '+');
  plus.type = 'button';
  plus.setAttribute('aria-label', 'Increase quantity');
  let n = 1;
  const render = () => { qtyValue.textContent = String(n); minus.disabled = n <= 1; };
  minus.addEventListener('click', () => { if (n > 1) { n -= 1; render(); } });
  plus.addEventListener('click', () => { if (n < (product.stock || 99)) { n += 1; render(); } });
  qty.append(minus, qtyValue, plus);
  render();

  const addBtn = el('button', 'product-detail-add button', 'Add to cart');
  addBtn.type = 'button';
  addBtn.disabled = !inStock;
  addBtn.addEventListener('click', () => {
    addToCart({
      id: product.id,
      title: product.title,
      price: product.price,
      thumbnail: product.thumbnail || (product.images && product.images[0]),
      category: product.category,
    }, n);
    addBtn.textContent = `Added ${n} to cart`;
    addBtn.classList.add('is-added');
    window.setTimeout(() => {
      addBtn.textContent = 'Add to cart';
      addBtn.classList.remove('is-added');
    }, 1600);
  });
  buyRow.append(qty, addBtn);
  info.append(buyRow);

  if (product.minimumOrderQuantity > 1) {
    info.append(el('p', 'product-detail-note', `Minimum order quantity: ${product.minimumOrderQuantity}`));
  }

  // specs
  const dims = product.dimensions
    ? `${product.dimensions.width} x ${product.dimensions.height} x ${product.dimensions.depth} cm`
    : '';
  const specs = el('dl', 'product-detail-specs');
  [
    specRow('Warranty', product.warrantyInformation),
    specRow('Shipping', product.shippingInformation),
    specRow('Return policy', product.returnPolicy),
    specRow('Weight', product.weight ? `${product.weight} g` : ''),
    specRow('Dimensions', dims),
  ].filter(Boolean).forEach((r) => specs.append(r));
  if (specs.children.length) info.append(specs);

  if (product.tags && product.tags.length) {
    const tags = el('div', 'product-detail-tags');
    product.tags.forEach((t) => tags.append(el('span', 'product-detail-tag', t)));
    info.append(tags);
  }

  return info;
}

function buildReviews(product) {
  if (!product.reviews || !product.reviews.length) return null;
  const section = el('section', 'product-detail-reviews');
  section.append(el('h2', 'product-detail-reviews-title', `Customer reviews (${product.reviews.length})`));
  const list = el('div', 'product-detail-reviews-list');
  product.reviews.forEach((r) => {
    const card = el('article', 'product-detail-review');
    const head = el('div', 'product-detail-review-head');
    head.append(el('span', 'product-detail-review-name', r.reviewerName || 'Anonymous'));
    if (r.date) {
      const d = new Date(r.date);
      if (!Number.isNaN(d.getTime())) {
        head.append(el('span', 'product-detail-review-date', d.toLocaleDateString()));
      }
    }
    card.append(head);
    card.append(buildStars(r.rating));
    if (r.comment) card.append(el('p', 'product-detail-review-text', r.comment));
    list.append(card);
  });
  section.append(list);
  return section;
}

export default async function decorate(block) {
  const config = readConfig(block);
  const baseUrl = config['base-url'] || 'https://dummyjson.com';
  const productPath = config['product-path'] || '/products';
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id') || config['default-id'] || '1';

  block.textContent = '';

  const status = el('p', 'product-detail-status', 'Loading product…');
  block.append(status);

  let endpoint;
  try {
    endpoint = new URL(`${productPath.replace(/\/$/, '')}/${id}`, baseUrl).href;
  } catch (e) {
    status.textContent = 'Product detail: a valid base-url and product-path are required.';
    status.classList.add('product-detail-error');
    return;
  }

  try {
    const response = await fetch(endpoint);
    if (!response.ok) throw new Error(`Request failed (${response.status})`);
    const product = await response.json();

    const layout = el('div', 'product-detail-layout');
    layout.append(buildGallery(product));
    layout.append(buildInfo(product));

    const frag = document.createDocumentFragment();

    if (config['back-url']) {
      const back = el('a', 'product-detail-back');
      back.href = config['back-url'];
      back.textContent = `← ${config['back-label'] || 'Back to products'}`;
      frag.append(back);
    }
    frag.append(layout);

    const reviews = buildReviews(product);
    if (reviews) frag.append(reviews);

    block.textContent = '';
    block.append(frag);
  } catch (e) {
    status.textContent = `Could not load this product: ${e.message}`;
    status.classList.add('product-detail-error');
  }
}
