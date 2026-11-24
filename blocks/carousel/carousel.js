import { createOptimizedPicture } from '../../scripts/aem.js';

function updateActive(block, index) {
  block.dataset.active = index;
  block.querySelectorAll('.carousel-slide').forEach((slide, i) => {
    slide.setAttribute('aria-hidden', i !== index);
    slide.querySelectorAll('a, button').forEach((el) => {
      if (i === index) el.removeAttribute('tabindex');
      else el.setAttribute('tabindex', '-1');
    });
  });
  block.querySelectorAll('.carousel-dot').forEach((dot, i) => {
    dot.setAttribute('aria-current', i === index);
  });
}

function goToSlide(block, index) {
  const track = block.querySelector('.carousel-track');
  const slides = block.querySelectorAll('.carousel-slide');
  const total = slides.length;
  const next = (index + total) % total; // wrap around
  track.scrollTo({ left: slides[next].offsetLeft, behavior: 'smooth' });
  updateActive(block, next);
}

export default function decorate(block) {
  const rows = [...block.children];

  // build the track and slides
  const track = document.createElement('ul');
  track.className = 'carousel-track';

  rows.forEach((row, i) => {
    const slide = document.createElement('li');
    slide.className = 'carousel-slide';
    slide.dataset.index = i;

    // move cells into the slide and classify them
    while (row.firstElementChild) slide.append(row.firstElementChild);
    [...slide.children].forEach((cell) => {
      if (cell.querySelector('picture') && cell.children.length === 1) {
        cell.className = 'carousel-slide-image';
      } else {
        cell.className = 'carousel-slide-content';
      }
    });

    track.append(slide);
  });

  // optimize images
  track.querySelectorAll('picture > img').forEach((img) => {
    img.closest('picture').replaceWith(
      createOptimizedPicture(img.src, img.alt, false, [{ width: '1200' }]),
    );
  });

  // wrapper accessibility
  block.setAttribute('role', 'region');
  block.setAttribute('aria-roledescription', 'carousel');
  block.setAttribute('aria-label', 'Carousel');

  block.replaceChildren(track);

  // only add controls when there is more than one slide
  const total = rows.length;
  if (total > 1) {
    // prev / next buttons
    const nav = document.createElement('div');
    nav.className = 'carousel-nav';

    const prev = document.createElement('button');
    prev.type = 'button';
    prev.className = 'carousel-prev';
    prev.setAttribute('aria-label', 'Previous slide');
    prev.addEventListener('click', () => goToSlide(block, Number(block.dataset.active) - 1));

    const next = document.createElement('button');
    next.type = 'button';
    next.className = 'carousel-next';
    next.setAttribute('aria-label', 'Next slide');
    next.addEventListener('click', () => goToSlide(block, Number(block.dataset.active) + 1));

    nav.append(prev, next);

    // dots
    const dots = document.createElement('div');
    dots.className = 'carousel-dots';
    for (let i = 0; i < total; i += 1) {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'carousel-dot';
      dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
      dot.addEventListener('click', () => goToSlide(block, i));
      dots.append(dot);
    }

    block.append(nav, dots);

    // keep active state in sync when the user swipes or scrolls
    let ticking = false;
    track.addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        const index = Math.round(track.scrollLeft / track.clientWidth);
        if (index !== Number(block.dataset.active)) updateActive(block, index);
        ticking = false;
      });
    });

    // keyboard support
    block.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') goToSlide(block, Number(block.dataset.active) - 1);
      if (e.key === 'ArrowRight') goToSlide(block, Number(block.dataset.active) + 1);
    });
  }

  updateActive(block, 0);
}
