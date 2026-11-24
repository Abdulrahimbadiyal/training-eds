/*
 * Scroll Slider block.
 *
 * Mirrors the WSU "rich-background" statement sections as a sticky-stacking
 * scroll effect. Authoring: one row per slide, three cells per row:
 *   | scroll-slider                                   |
 *   | description text | (shield image) | ## HEADLINE  |
 *
 * Each slide is a full-viewport, full-width panel with a fixed background
 * image. As the page scrolls, each slide sticks and the next rises over it
 * like a curtain. Inside a slide: the description sits bottom-left, the
 * shield image sits centre, and the headline overlaps it to the right. On
 * entering view the shield scales in, the left text slides in from the left
 * and the headline slides in from the right.
 */

function el(tag, className) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
}

export default function decorate(block) {
  const slides = [...block.children];

  slides.forEach((slide) => {
    slide.classList.add('scroll-slider-slide');

    const cells = [...slide.children];
    const shieldCell = cells.find((c) => c.querySelector('picture'));
    const headlineCell = cells.find((c) => c.querySelector('h1, h2, h3, h4, h5, h6'));
    const leftCell = cells.find((c) => c !== shieldCell && c !== headlineCell);

    const content = el('div', 'scroll-slider-content');

    // left: description text (and any CTA), anchored bottom-left
    const left = el('div', 'scroll-slider-left');
    if (leftCell) {
      [...leftCell.childNodes].forEach((node) => left.append(node));
      left.querySelectorAll('p > a').forEach((a) => {
        a.closest('p').classList.add('button-container');
        a.classList.add('button');
      });
    }

    // shield image, centre
    const shield = el('div', 'scroll-slider-shield');
    const picture = shieldCell && shieldCell.querySelector('picture');
    if (picture) {
      const img = picture.querySelector('img');
      if (img) {
        img.setAttribute('loading', 'lazy');
        img.setAttribute('decoding', 'async');
      }
      shield.append(picture);
    }

    // headline, absolutely positioned over the shield's right side
    const headline = el('div', 'scroll-slider-headline');
    if (headlineCell) {
      headlineCell.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((h) => headline.append(h));
    }
    shield.append(headline);

    content.append(left, shield);
    slide.replaceChildren(content);
  });

  // reveal on scroll. Each slide is sticky, so IntersectionObserver is
  // unreliable here (it reports the pinned box); instead we drive the reveal
  // from scroll progress through the block, re-firing when scrolling back.
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    slides.forEach((slide) => slide.classList.add('animate-in'));
    return;
  }

  const update = () => {
    const vh = window.innerHeight;
    const blockTop = block.getBoundingClientRect().top + window.scrollY;
    const scrolled = window.scrollY - blockTop;
    slides.forEach((slide, i) => {
      // slide i begins rising into view once the previous slide is pinned
      const start = (i - 0.9) * vh;
      slide.classList.toggle('animate-in', scrolled > start);
    });
  };

  update();
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update, { passive: true });
}
