/*
 * Products block.
 *
 * Authoring (key / value rows):
 *   | products      |                          |
 *   | heading       | Products Catalogue       |
 *   | base-url      | https://dummyjson.com    |
 *   | all-products  | /products                |
 *
 * Reads the config, fetches `${base-url}${all-products}`, and renders the
 * returned products as a responsive card grid.
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

function buildCard(product) {
  const card = el('li', 'products-card');

  const media = el('div', 'products-card-image');
  if (product.thumbnail || product.image) {
    const img = el('img');
    img.src = product.thumbnail || product.image;
    img.alt = product.title || '';
    img.loading = 'lazy';
    img.decoding = 'async';
    media.append(img);
  }
  card.append(media);

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

  card.append(body);
  return card;
}

export default async function decorate(block) {
  const config = readConfig(block);
  const baseUrl = config['base-url'] || '';
  const path = config['all-products'] || '';

  block.textContent = '';

  if (config.heading) {
    block.append(el('h2', 'products-heading', config.heading));
  }

  const grid = el('ul', 'products-grid');
  block.append(grid);

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

    products.forEach((product) => grid.append(buildCard(product)));
    status.remove();
  } catch (e) {
    status.textContent = `Could not load products: ${e.message}`;
    status.classList.add('products-error');
  }
}
