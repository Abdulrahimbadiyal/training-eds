/*
 * Checkout block (checkout page).
 *
 * Authoring (key / value rows, all optional):
 *   | checkout     |            |
 *   | heading      | Checkout   |
 *   | cart-url     | /cart      |
 *   | products-url | /products  |
 *
 * Reads the cart from the shared cart module and renders a contact + shipping
 * form, a DEMO payment section (no real payment is taken), and an order
 * summary. Placing the order validates the form, clears the cart and shows a
 * confirmation. If the cart is empty it shows an empty state instead.
 */

import {
  getCart, cartTotals, clearCart, TAX_RATE,
} from '../../scripts/cart.js';

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function money(value) {
  return `$${(Number(value) || 0).toFixed(2)}`;
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

/* a labelled field; returns the wrapping element */
function field({
  name, label, type = 'text', required = true, placeholder = '', autocomplete, span = 1, inputmode, maxlength, pattern,
}) {
  const wrap = el('label', `checkout-field checkout-field-span-${span}`);
  wrap.append(el('span', 'checkout-field-label', label + (required ? '' : ' (optional)')));
  const input = el('input');
  input.name = name;
  input.type = type;
  if (required) input.required = true;
  if (placeholder) input.placeholder = placeholder;
  if (autocomplete) input.autocomplete = autocomplete;
  if (inputmode) input.inputMode = inputmode;
  if (maxlength) input.maxLength = maxlength;
  if (pattern) input.pattern = pattern;
  wrap.append(input);
  return wrap;
}

function buildSummary(items) {
  const totals = cartTotals();
  const summary = el('aside', 'checkout-summary');
  summary.append(el('h2', 'checkout-summary-title', `Order summary (${totals.count})`));

  const list = el('ul', 'checkout-summary-items');
  items.forEach((item) => {
    const li = el('li', 'checkout-summary-item');
    const media = el('span', 'checkout-summary-thumb');
    if (item.thumbnail) {
      const img = el('img');
      img.src = item.thumbnail;
      img.alt = '';
      img.loading = 'lazy';
      media.append(img);
    }
    media.append(el('span', 'checkout-summary-qty', String(item.qty)));
    li.append(media);
    const info = el('span', 'checkout-summary-info');
    info.append(el('span', 'checkout-summary-name', item.title || 'Product'));
    info.append(el('span', 'checkout-summary-each', `${money(item.price)} each`));
    li.append(info);
    li.append(el('span', 'checkout-summary-line', money(item.price * item.qty)));
    list.append(li);
  });
  summary.append(list);

  const rows = el('dl', 'checkout-summary-rows');
  const addRow = (label, value) => {
    const r = el('div', 'checkout-summary-row');
    r.append(el('dt', '', label));
    r.append(el('dd', '', value));
    rows.append(r);
  };
  addRow('Subtotal', money(totals.subtotal));
  addRow('Shipping', totals.shipping === 0 ? 'Free' : money(totals.shipping));
  addRow(`Estimated GST (${Math.round(TAX_RATE * 100)}%)`, money(totals.tax));
  summary.append(rows);

  const total = el('div', 'checkout-summary-total');
  total.append(el('span', '', 'Total'));
  total.append(el('span', 'checkout-summary-total-value', money(totals.total)));
  summary.append(total);

  return summary;
}

function buildForm(items, config) {
  const form = el('form', 'checkout-form');
  form.noValidate = false;

  // contact
  const contact = el('section', 'checkout-section');
  contact.append(el('h2', 'checkout-section-title', 'Contact'));
  const contactGrid = el('div', 'checkout-grid');
  contactGrid.append(field({
    name: 'email', label: 'Email', type: 'email', autocomplete: 'email', placeholder: 'you@example.com', span: 2,
  }));
  contact.append(contactGrid);
  form.append(contact);

  // shipping
  const shipping = el('section', 'checkout-section');
  shipping.append(el('h2', 'checkout-section-title', 'Shipping address'));
  const shipGrid = el('div', 'checkout-grid');
  shipGrid.append(field({ name: 'first-name', label: 'First name', autocomplete: 'given-name' }));
  shipGrid.append(field({ name: 'last-name', label: 'Last name', autocomplete: 'family-name' }));
  shipGrid.append(field({
    name: 'address', label: 'Address', autocomplete: 'street-address', span: 2,
  }));
  shipGrid.append(field({
    name: 'apartment', label: 'Apartment, suite, etc.', required: false, autocomplete: 'address-line2', span: 2,
  }));
  shipGrid.append(field({ name: 'city', label: 'City', autocomplete: 'address-level2' }));
  shipGrid.append(field({ name: 'state', label: 'State', autocomplete: 'address-level1' }));
  shipGrid.append(field({
    name: 'postcode', label: 'Postcode', autocomplete: 'postal-code', inputmode: 'numeric',
  }));
  shipGrid.append(field({
    name: 'phone', label: 'Phone', type: 'tel', autocomplete: 'tel',
  }));
  shipping.append(shipGrid);
  form.append(shipping);

  // delivery
  const delivery = el('section', 'checkout-section');
  delivery.append(el('h2', 'checkout-section-title', 'Delivery'));
  const methods = el('div', 'checkout-methods');
  [
    {
      id: 'standard', label: 'Standard', note: '3 to 5 business days', price: 'Included',
    },
    {
      id: 'express', label: 'Express', note: '1 to 2 business days', price: '$14.90',
    },
  ].forEach((m, i) => {
    const opt = el('label', 'checkout-method');
    const radio = el('input');
    radio.type = 'radio';
    radio.name = 'delivery';
    radio.value = m.id;
    if (i === 0) radio.checked = true;
    opt.append(radio);
    const body = el('span', 'checkout-method-body');
    body.append(el('span', 'checkout-method-label', m.label));
    body.append(el('span', 'checkout-method-note', m.note));
    opt.append(body);
    opt.append(el('span', 'checkout-method-price', m.price));
    methods.append(opt);
  });
  delivery.append(methods);
  form.append(delivery);

  // payment (demo)
  const payment = el('section', 'checkout-section');
  payment.append(el('h2', 'checkout-section-title', 'Payment'));
  payment.append(el('p', 'checkout-demo-note', 'Demo checkout: no real payment is taken. Use test values only, e.g. card 4242 4242 4242 4242.'));
  const payGrid = el('div', 'checkout-grid');
  payGrid.append(field({
    name: 'card-name', label: 'Name on card', autocomplete: 'cc-name', span: 2,
  }));
  payGrid.append(field({
    name: 'card-number', label: 'Card number', inputmode: 'numeric', placeholder: '4242 4242 4242 4242', maxlength: 19, span: 2,
  }));
  payGrid.append(field({
    name: 'card-expiry', label: 'Expiry (MM/YY)', placeholder: 'MM/YY', maxlength: 5,
  }));
  payGrid.append(field({
    name: 'card-cvc', label: 'CVC', inputmode: 'numeric', placeholder: '123', maxlength: 4,
  }));
  payment.append(payGrid);
  form.append(payment);

  // actions
  const actions = el('div', 'checkout-actions');
  const submit = el('button', 'checkout-place button', `Place order · ${money(cartTotals().total)}`);
  submit.type = 'submit';
  actions.append(submit);
  const back = el('a', 'checkout-back', 'Back to cart');
  back.href = config['cart-url'] || '/cart';
  actions.append(back);
  form.append(actions);

  return form;
}

function buildConfirmation(order, config) {
  const wrap = el('div', 'checkout-confirm');
  wrap.append(el('div', 'checkout-confirm-check', '✓'));
  wrap.append(el('h1', 'checkout-confirm-title', 'Thank you for your order'));
  wrap.append(el('p', 'checkout-confirm-text', `Order ${order.id} is confirmed. A receipt has been sent to ${order.email}.`));

  const meta = el('dl', 'checkout-confirm-meta');
  const addMeta = (k, v) => {
    meta.append(el('dt', '', k));
    meta.append(el('dd', '', v));
  };
  addMeta('Order number', order.id);
  addMeta('Items', String(order.count));
  addMeta('Total paid', money(order.total));
  wrap.append(meta);

  const link = el('a', 'checkout-confirm-link button', 'Continue shopping');
  link.href = config['products-url'] || '/products';
  wrap.append(link);
  return wrap;
}

function buildEmpty(config) {
  const empty = el('div', 'checkout-empty');
  empty.append(el('div', 'checkout-empty-icon', '\u{1F6D2}'));
  empty.append(el('h2', 'checkout-empty-title', 'Your cart is empty'));
  empty.append(el('p', 'checkout-empty-text', 'Add a product before heading to checkout.'));
  const link = el('a', 'checkout-empty-link button', 'Browse products');
  link.href = config['products-url'] || '/products';
  empty.append(link);
  return empty;
}

export default function decorate(block) {
  const config = readConfig(block);
  const heading = config.heading || 'Checkout';

  block.textContent = '';
  block.append(el('h1', 'checkout-title', heading));

  const items = getCart();
  if (!items.length) {
    block.append(buildEmpty(config));
    return;
  }

  const layout = el('div', 'checkout-layout');
  const form = buildForm(items, config);
  layout.append(form);
  layout.append(buildSummary(items));
  block.append(layout);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    const totals = cartTotals();
    const data = new FormData(form);
    const order = {
      id: `WSU-${Date.now().toString(36).toUpperCase()}`,
      email: data.get('email') || '',
      count: totals.count,
      total: totals.total,
    };
    clearCart();
    block.textContent = '';
    block.append(buildConfirmation(order, config));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}
