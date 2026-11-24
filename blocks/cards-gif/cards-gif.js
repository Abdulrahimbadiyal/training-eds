/*
 * Cards GIF block (WSU "International Study" statement, image-right).
 *
 * Authoring (one row, two cells):
 *   | cards-gif                          |
 *   | Heading + CTA | (image / gif)      |
 *
 * Full-viewport crimson panel: the heading and CTA sit on the left and slide
 * in from the left; a shield-masked image/gif sits on the right and slides in
 * from the right. If no image is authored, a bundled International Study gif
 * is used.
 */

function el(tag, className) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}

function buildScrollArrow(block) {
  const arrow = el('div', 'scroll-arrow');
  arrow.setAttribute('role', 'button');
  arrow.setAttribute('tabindex', '0');
  arrow.setAttribute('aria-label', 'Scroll to next section');
  arrow.innerHTML = '<span class="arrow-icon"></span>';

  const scrollNext = () => {
    const wrapper = block.parentElement;
    let target = wrapper && wrapper.nextElementSibling;
    if (!target) {
      let node = block;
      while (node.parentElement && node.parentElement.tagName !== 'MAIN') node = node.parentElement;
      target = node.nextElementSibling;
    }
    if (!target) return;
    const header = document.querySelector('header');
    const headerH = header && window.innerWidth < 992 ? header.getBoundingClientRect().height : 0;
    const top = target.getBoundingClientRect().top + window.scrollY - headerH;
    window.scrollTo({ top, behavior: 'smooth' });
  };

  arrow.addEventListener('click', scrollNext);
  arrow.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      scrollNext();
    }
  });
  return arrow;
}

export default function decorate(block) {
  const row = block.firstElementChild;
  if (!row) return;
  const cells = [...row.children];
  const textCell = cells[0];
  const imageCell = cells[1];

  const content = el('div', 'cards-gif-content');

  // text side (left)
  const textContainer = el('div', 'text-container');
  const dotPattern = el('div', 'dot-pattern');
  dotPattern.setAttribute('aria-hidden', 'true');
  textContainer.append(dotPattern);
  if (textCell) {
    [...textCell.children].forEach((node) => textContainer.append(node));
    textContainer.querySelectorAll('p > a').forEach((a) => {
      a.closest('p').classList.add('button-container');
      a.classList.add('button');
    });
    // the first non-button paragraph is the headline
    const lead = textContainer.querySelector('p:not(.button-container)');
    if (lead) lead.classList.add('cards-gif-heading');
  }

  // image side (right)
  const imageContainer = el('div', 'image-container');
  let picture = imageCell && imageCell.querySelector('picture');
  if (!picture) {
    picture = document.createElement('picture');
    const img = document.createElement('img');
    img.src = '/blocks/cards-gif/img/international.gif';
    img.alt = '';
    img.loading = 'lazy';
    picture.append(img);
  }
  imageContainer.append(picture);

  content.append(textContainer, imageContainer, buildScrollArrow(block));
  block.replaceChildren(content);

  // slide-in on scroll (desktop); static on small screens / reduced motion
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (window.innerWidth < 992 || reduce) {
    block.classList.add('animate-in');
    return;
  }
  // drive from scroll position (reliable viewport detection, like the reference)
  const reveal = () => {
    const rect = block.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.85 && rect.bottom > 0) {
      block.classList.add('animate-in');
    } else {
      block.classList.remove('animate-in');
    }
  };
  reveal();
  window.addEventListener('scroll', reveal, { passive: true });
  window.addEventListener('resize', reveal, { passive: true });
}
