/*
 * Scroll Slider block (scroll "slide-up" stack).
 *
 * Authoring: one row per slide, three cells per row (the three columns).
 *   | scroll-slider                       |
 *   | Column A | Column B | Column C      |  <- slide 1
 *   | Column A | Column B | Column C      |  <- slide 2
 *   | Column A | Column B | Column C      |  <- slide 3
 *
 * Each slide is a full-viewport, full-width panel. As the page scrolls, each
 * slide sticks to the top and the next one slides up over it, one by one.
 * Within a slide the cells lay out as three columns that rise in when the
 * slide becomes active.
 */

export default function decorate(block) {
  const slides = [...block.children];

  slides.forEach((slide, index) => {
    slide.classList.add('scroll-slider-slide');
    slide.style.setProperty('--slide-index', index);

    // the authored cells become the columns, wrapped for the grid
    const inner = document.createElement('div');
    inner.className = 'scroll-slider-inner';
    [...slide.children].forEach((cell) => {
      cell.classList.add('scroll-slider-col');
      inner.append(cell);
    });
    slide.replaceChildren(inner);
  });

  // reveal a slide's columns once it is the one on screen
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    slides.forEach((slide) => slide.classList.add('is-active'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) entry.target.classList.add('is-active');
    });
  }, { threshold: 0.5 });

  slides.forEach((slide) => observer.observe(slide));
}
