/*
 * Minimal client-side cart, shared across the storefront.
 *
 * State lives in localStorage (per browser) and every change dispatches a
 * `cart:updated` event on window so the header badge and the cart page stay
 * in sync. All reads/writes are guarded so a blocked storage (private mode)
 * degrades to an in-memory cart for the page session instead of throwing.
 */

const STORAGE_KEY = 'wsu-cart';
const EVENT = 'cart:updated';

// Australian GST, shown as an estimate on the cart page.
export const TAX_RATE = 0.1;
// Free shipping threshold; below it a flat rate applies.
export const FREE_SHIPPING_OVER = 100;
export const FLAT_SHIPPING = 9.9;

let memory = null; // fallback when localStorage is unavailable

function read() {
  if (memory) return memory;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return memory || [];
  }
}

function write(items) {
  memory = items;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    memory = null; // storage is the source of truth again
  } catch (e) {
    // keep the in-memory copy for this session
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { items: read() } }));
}

/** @returns {Array} the cart line items */
export function getCart() {
  const items = read();
  return Array.isArray(items) ? items : [];
}

/** Add a product (or bump its quantity if already present). */
export function addToCart(product, qty = 1) {
  if (!product || product.id === undefined || product.id === null) return getCart();
  const amount = Math.max(1, Number(qty) || 1);
  const items = getCart();
  const existing = items.find((i) => String(i.id) === String(product.id));
  if (existing) {
    existing.qty += amount;
  } else {
    items.push({
      id: product.id,
      title: product.title || 'Product',
      price: Number(product.price) || 0,
      thumbnail: product.thumbnail || product.image || '',
      category: product.category || '',
      qty: amount,
    });
  }
  write(items);
  return items;
}

/** Set an exact quantity; 0 or less removes the line. */
export function setQty(id, qty) {
  let items = getCart();
  const amount = Number(qty) || 0;
  if (amount <= 0) {
    items = items.filter((i) => String(i.id) !== String(id));
  } else {
    const line = items.find((i) => String(i.id) === String(id));
    if (line) line.qty = amount;
  }
  write(items);
  return items;
}

/** Remove a line entirely. */
export function removeFromCart(id) {
  write(getCart().filter((i) => String(i.id) !== String(id)));
  return getCart();
}

/** Empty the cart. */
export function clearCart() {
  write([]);
}

/** Total number of units in the cart. */
export function cartCount() {
  return getCart().reduce((n, i) => n + (Number(i.qty) || 0), 0);
}

/** Money breakdown for the cart summary. */
export function cartTotals() {
  const items = getCart();
  const subtotal = items.reduce((s, i) => s + (Number(i.price) || 0) * (Number(i.qty) || 0), 0);
  const shipping = subtotal === 0 || subtotal >= FREE_SHIPPING_OVER ? 0 : FLAT_SHIPPING;
  const tax = subtotal * TAX_RATE;
  const total = subtotal + shipping + tax;
  return {
    subtotal, shipping, tax, total, count: cartCount(),
  };
}

/** Subscribe to cart changes; returns an unsubscribe function. */
export function onCartChange(handler) {
  const wrapped = (e) => handler(e.detail ? e.detail.items : getCart());
  window.addEventListener(EVENT, wrapped);
  // keep carts in sync across tabs
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) handler(getCart());
  });
  return () => window.removeEventListener(EVENT, wrapped);
}

export { EVENT as CART_EVENT };
