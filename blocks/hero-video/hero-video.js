/*
 * Hero Video block (WSU "Charge Towards Change" hero).
 *
 * Authoring (one row, two cells):
 *   | hero-video                                             |
 *   | <video url>  |  (picture = brand shield)              |
 *   |              |  # CHARGE / # TOWARDS / # CHANGE         |
 *   |              |  [APPLY NOW](url)                        |
 *   |              |  arrow down                              |
 *
 * The block fills the viewport below the header with the looping video, lays
 * the white brand shield beside the stacked headline, turns the first link
 * into a red pill button, and reveals a bouncing scroll chevron.
 */

const VIDEO_RE = /\.(mp4|webm|ogg)(\?.*)?$/i;

function isVideoLink(a) {
  return a && VIDEO_RE.test(a.getAttribute('href') || '');
}

/* Pulls the video URL out of the block, consuming whatever cell held it. */
function readVideo(block) {
  const cells = [...block.querySelectorAll(':scope > div > div')];
  let src = null;
  cells.forEach((cell) => {
    if (src) return;
    const link = cell.querySelector('a[href]');
    const text = cell.textContent.trim();
    if (isVideoLink(link)) {
      src = link.href;
      cell.remove();
    } else if (!cell.querySelector('h1, h2, h3, h4, h5, h6, picture') && VIDEO_RE.test(text)) {
      src = text;
      cell.remove();
    }
  });
  return src;
}

/* The authored heading is one line per word (e.g. three headings, or one
   heading with <br>s). Normalise to a single heading whose lines are spans,
   so it reads as one headline but still stacks line by line. The middle line
   of a three-line headline with no explicit emphasis gets the serif-italic
   accent the brand uses (matches "TOWARDS" on the reference). */
function buildHeadline(cell) {
  const headings = [...cell.querySelectorAll('h1, h2, h3, h4, h5, h6')];
  let lines = [];
  if (headings.length > 1) {
    lines = headings.map((h) => [...h.childNodes]);
  } else if (headings.length === 1) {
    // split a single heading on <br>
    const parts = [];
    let current = [];
    headings[0].childNodes.forEach((node) => {
      if (node.nodeName === 'BR') {
        parts.push(current);
        current = [];
      } else {
        current.push(node);
      }
    });
    parts.push(current);
    lines = parts;
  }
  if (!lines.length) return null;

  const tag = (headings[0] && headings[0].tagName) || 'H1';
  const merged = document.createElement(tag);
  const hasEmphasis = headings.some((h) => h.querySelector('em, i'));
  lines.forEach((nodes, i) => {
    const line = document.createElement('span');
    line.className = 'hero-video-line';
    // strip <sup>/<sub> wrappers authors sometimes add, keep their text
    nodes.forEach((node) => {
      if (node.nodeType === 1 && /^(SUP|SUB)$/.test(node.tagName)) {
        line.append(...node.childNodes);
      } else {
        line.append(node);
      }
    });
    // three lines, no authored emphasis: make the middle line the serif accent
    if (!hasEmphasis && lines.length === 3 && i === 1) {
      const em = document.createElement('em');
      em.append(...line.childNodes);
      line.append(em);
    }
    merged.append(line);
  });
  headings.forEach((h) => h.remove());
  return merged;
}

function buildScrollButton() {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'hero-video-scroll';
  button.setAttribute('aria-label', 'Scroll to next section');
  button.innerHTML = '<span class="arrow-icon"></span>';
  button.addEventListener('click', () => {
    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    const header = document.querySelector('header');
    const headerH = header ? header.getBoundingClientRect().height : 0;
    const top = window.scrollY + window.innerHeight - headerH;
    window.scrollTo({ top, behavior });
  });
  return button;
}

function revealOnScroll(content) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    content.classList.add('is-visible');
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      content.classList.add('is-visible');
      observer.disconnect();
    });
  }, { threshold: 0.2 });
  observer.observe(content);
}

export default function decorate(block) {
  const src = readVideo(block);

  // whatever authored cell still holds the shield + headline + button
  const contentCell = block.querySelector(':scope > div > div') || block.querySelector(':scope > div');

  const content = document.createElement('div');
  content.className = 'hero-video-content';

  const shield = contentCell && contentCell.querySelector('picture');
  if (shield) content.append(shield);

  const text = document.createElement('div');
  text.className = 'hero-video-text';
  if (contentCell) {
    const headline = buildHeadline(contentCell);
    if (headline) text.append(headline);
    // the first remaining link becomes the CTA button
    const link = contentCell.querySelector('a[href]');
    if (link) {
      link.classList.add('hero-video-button');
      text.append(link);
    }
  }
  content.append(text);

  const media = document.createElement('div');
  media.className = 'hero-video-media';
  if (src && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const video = document.createElement('video');
    video.className = 'hero-video-bg';
    video.muted = true;
    video.defaultMuted = true;
    video.loop = true;
    video.autoplay = true;
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    video.setAttribute('aria-hidden', 'true');
    video.preload = 'auto';
    video.src = src;
    media.append(video);
    video.play().catch(() => {});
  }

  block.replaceChildren(media, content, buildScrollButton());
  revealOnScroll(content);
}
