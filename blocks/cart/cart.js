/*
 * Cart block (cart page).
 *
 * Authoring (key / value rows, all optional):
 *   | cart         |            |
 *   | heading      | Your Cart  |
 *   | products-url | /products  |
 *
 * Renders the current cart (from the shared cart module): each line item with
 * image, name, unit price, a quantity stepper and a line total, plus a summary
 * panel with subtotal, shipping, estimated tax and the order total. Re-renders
 * on every cart change so the page and the header badge stay in sync.
 */

import {
  getCart, setQty, removeFromCart, cartTotals, onCartChange, TAX_RATE,
} from '../../scripts/cart.js';

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function money(value) {
  const num = Number(value) || 0;
  return `$${num.toFixed(2)}`;
}

function readConfig(block) {
  const config = {};
  [...block.children].forEach((row) => {
    const cells = [...row.children];
    if (cells.length >= 2) {
      config[cells[0].textContent.trim().toLowerCase()] = cells[1].textContent.trim();
    }
  });
  return config;
}

function buildLineItem(item) {
  const row = el('article', 'cart-item');
  row.dataset.id = item.id;

  const media = el('div', 'cart-item-image');
  if (item.thumbnail) {
    const img = el('img');
    img.src = item.thumbnail;
    img.alt = item.title || '';
    img.loading = 'lazy';
    media.append(img);
  }
  row.append(media);

  const info = el('div', 'cart-item-info');
  if (item.category) info.append(el('span', 'cart-item-category', item.category));
  info.append(el('h3', 'cart-item-title', item.title || 'Product'));
  info.append(el('span', 'cart-item-unit', `${money(item.price)} each`));
  row.append(info);

  // quantity stepper
  const qty = el('div', 'cart-item-qty');
  const minus = el('button', 'cart-qty-btn', '−');
  minus.type = 'button';
  minus.setAttribute('aria-label', `Decrease quantity of ${item.title || 'item'}`);
  const value = el('span', 'cart-qty-value', String(item.qty));
  const plus = el('button', 'cart-qty-btn', '+');
  plus.type = 'button';
  plus.setAttribute('aria-label', `Increase quantity of ${item.title || 'item'}`);
  minus.addEventListener('click', () => setQty(item.id, item.qty - 1));
  plus.addEventListener('click', () => setQty(item.id, item.qty + 1));
  qty.append(minus, value, plus);
  row.append(qty);

  const line = el('div', 'cart-item-line');
  line.append(el('span', 'cart-item-total', money(item.price * item.qty)));
  const remove = el('button', 'cart-item-remove', 'Remove');
  remove.type = 'button';
  remove.setAttribute('aria-label', `Remove ${item.title || 'item'} from cart`);
  remove.addEventListener('click', () => removeFromCart(item.id));
  line.append(remove);
  row.append(line);

  return row;
}

function buildSummary(productsUrl, checkoutUrl) {
  const totals = cartTotals();
  const summary = el('aside', 'cart-summary');
  summary.append(el('h2', 'cart-summary-title', 'Order summary'));

  const rows = el('dl', 'cart-summary-rows');
  const addRow = (label, valueText, cls) => {
    const r = el('div', `cart-summary-row${cls ? ` ${cls}` : ''}`);
    r.append(el('dt', '', label));
    r.append(el('dd', '', valueText));
    rows.append(r);
  };
  addRow('Subtotal', money(totals.subtotal));
  addRow('Shipping', totals.shipping === 0 ? 'Free' : money(totals.shipping));
  addRow(`Estimated GST (${Math.round(TAX_RATE * 100)}%)`, money(totals.tax));
  summary.append(rows);

  const totalRow = el('div', 'cart-summary-total');
  totalRow.append(el('span', '', 'Total'));
  totalRow.append(el('span', 'cart-summary-total-value', money(totals.total)));
  summary.append(totalRow);

  const checkout = el('a', 'cart-checkout button', 'Checkout');
  checkout.href = checkoutUrl;
  summary.append(checkout);

  const cont = el('a', 'cart-continue');
  cont.href = productsUrl;
  cont.textContent = 'Continue shopping';
  summary.append(cont);

  return summary;
}

function buildEmpty(productsUrl) {
  const empty = el('div', 'cart-empty');
  empty.append(el('div', 'cart-empty-icon', '\u{1F6D2}'));
  empty.append(el('h2', 'cart-empty-title', 'Your cart is empty'));
  empty.append(el('p', 'cart-empty-text', 'Browse the catalogue and add a few products to get started.'));
  const link = el('a', 'cart-empty-link button', 'Browse products');
  link.href = productsUrl;
  empty.append(link);
  return empty;
}

export default function decorate(block) {
  const config = readConfig(block);
  const heading = config.heading || 'Your Cart';
  const productsUrl = config['products-url'] || '/products';
  const checkoutUrl = config['checkout-url'] || '/checkout';

  block.textContent = '';

  const header = el('div', 'cart-header');
  header.append(el('h1', 'cart-title', heading));
  const count = el('span', 'cart-count');
  header.append(count);
  block.append(header);

  const body = el('div', 'cart-body');
  block.append(body);

  function render() {
    const items = getCart();
    count.textContent = items.length
      ? `${cartTotals().count} item${cartTotals().count === 1 ? '' : 's'}`
      : '';
    body.textContent = '';

    if (!items.length) {
      body.classList.add('is-empty');
      body.append(buildEmpty(productsUrl));
      return;
    }
    body.classList.remove('is-empty');

    const list = el('div', 'cart-items');
    const head = el('div', 'cart-items-head');
    ['Product', 'Quantity', 'Total'].forEach((h, i) => {
      head.append(el('span', `cart-col cart-col-${['product', 'qty', 'total'][i]}`, h));
    });
    list.append(head);
    items.forEach((item) => list.append(buildLineItem(item)));
    body.append(list);
    body.append(buildSummary(productsUrl, checkoutUrl));
  }

  render();
  onCartChange(render);
}
