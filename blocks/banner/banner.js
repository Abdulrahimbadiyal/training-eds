/*
 * Banner block (WSU crimson statement panel).
 *
 * Authoring (one row, two cells):
 *   | banner (student)                      |
 *   | (picture)  |  ## Heading              |
 *   |            |  Body copy               |
 *   |            |  [Apply Now](url)        |
 *
 * Full-viewport crimson panel: a shield-masked image slides in from the left,
 * the headline and copy slide in from the right, with a scroll chevron below.
 */

function buildScrollArrow(block) {
  const arrow = document.createElement('div');
  arrow.className = 'scroll-arrow';
  arrow.setAttribute('role', 'button');
  arrow.setAttribute('tabindex', '0');
  arrow.setAttribute('aria-label', 'Scroll to next section');
  arrow.innerHTML = '<span class="arrow-icon"></span>';

  const scrollNext = () => {
    const wrapper = block.parentElement;
    let target = wrapper && wrapper.nextElementSibling;
    if (!target) {
      let el = block;
      while (el.parentElement && el.parentElement.tagName !== 'MAIN') el = el.parentElement;
      target = el.nextElementSibling;
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
  const cols = [...row.children];
  if (cols.length < 2) return;
  const [imageCol, textCol] = cols;

  const picture = imageCol.querySelector('picture');
  if (!picture) return;

  const content = document.createElement('div');
  content.className = 'banner-content';

  // image side, with decorative dot pattern behind
  const imageContainer = document.createElement('div');
  imageContainer.className = 'image-container';
  const dotPattern = document.createElement('div');
  dotPattern.className = 'dot-pattern';
  dotPattern.setAttribute('aria-hidden', 'true');
  imageContainer.append(dotPattern, picture);

  // text side
  const textContainer = document.createElement('div');
  textContainer.className = 'text-container';
  [...textCol.children].forEach((node) => {
    // drop the authored "arrow down" note (the chevron is generated)
    if (node.tagName === 'P' && node.textContent.trim().toLowerCase() === 'arrow down') {
      node.remove();
      return;
    }
    textContainer.append(node);
  });

  // turn a trailing link into the pill button
  textContainer.querySelectorAll('p > a').forEach((a) => {
    a.closest('p').classList.add('button-container');
    a.classList.add('button');
  });

  content.append(imageContainer, textContainer, buildScrollArrow(block));
  block.replaceChildren(content);

  // slide-in on scroll (desktop); static on small screens / reduced motion
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (window.innerWidth < 992 || reduce) {
    block.classList.add('animate-in');
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      block.classList.add('animate-in');
      observer.unobserve(block);
    });
  }, { threshold: 0.2 });
  observer.observe(block);
}
