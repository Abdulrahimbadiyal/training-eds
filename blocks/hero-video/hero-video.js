import { createOptimizedPicture } from '../../scripts/aem.js';

/*
 * Hero Banner block (video background)
 *
 * Authoring (DA):
 *   | Hero Banner                                   |
 *   | https://your-cdn/path/video.mp4               |  <- video link (hyperlink or plain text)
 *   | (optional poster image)                       |  <- shown until the video loads / if autoplay is blocked
 *   | # CHARGE TOWARDS CHANGE                       |  <- heading
 *   | [APPLY NOW](https://your-link)                |  <- button
 *
 * The video row and poster row are optional-order: the block finds them by content.
 */

function findVideoSource(block) {
  let src = null;
  [...block.children].forEach((row) => {
    if (src) return;
    const a = row.querySelector('a[href]');
    const text = row.textContent.trim();
    if (a && /\.(mp4|webm|ogg)(\?.*)?$/i.test(a.href)) {
      src = a.href;
      row.remove();
    } else if (/^https?:\/\/\S+\.(mp4|webm|ogg)(\?.*)?$/i.test(text)) {
      src = text;
      row.remove();
    }
  });
  return src;
}

function findPoster(block) {
  let poster = null;
  [...block.children].forEach((row) => {
    if (poster) return;
    const pic = row.querySelector('picture');
    // a row that is only a picture = poster image
    if (pic && !row.textContent.trim()) {
      poster = pic.querySelector('img');
      row.remove();
    }
  });
  return poster;
}

function buildVideo(src, poster) {
  const video = document.createElement('video');
  video.className = 'hero-banner-video';
  video.muted = true;
  video.defaultMuted = true;
  video.loop = true;
  video.autoplay = true;
  video.playsInline = true;
  video.preload = 'metadata';
  video.setAttribute('aria-hidden', 'true');
  if (poster) video.poster = poster.src;
  video.src = src;
  return video;
}

function buildScrollArrow(block) {
  const arrow = document.createElement('button');
  arrow.type = 'button';
  arrow.className = 'hero-banner-scroll';
  arrow.setAttribute('aria-label', 'Scroll down');
  arrow.addEventListener('click', () => {
    const next = block.closest('.section')?.nextElementSibling;
    if (next) next.scrollIntoView({ behavior: 'smooth' });
    else window.scrollBy({ top: block.offsetHeight, behavior: 'smooth' });
  });
  return arrow;
}

export default function decorate(block) {
  const src = findVideoSource(block);
  const poster = findPoster(block);

  // wrap remaining authored content (heading, text, button) as the overlay
  const content = document.createElement('div');
  content.className = 'hero-banner-content';
  content.append(...block.children);

  // turn the first link in the content into a button
  content.querySelectorAll('a').forEach((a) => {
    a.classList.add('hero-banner-button');
  });

  const media = document.createElement('div');
  media.className = 'hero-banner-media';

  if (src) {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (poster) {
      const img = document.createElement('img');
      img.className = 'hero-banner-poster';
      img.src = poster.src;
      img.alt = '';
      media.append(img);
    }
    if (!reduceMotion) {
      const video = buildVideo(src, poster);
      media.append(video);
      video.play().catch(() => {
        // autoplay blocked: poster (if any) stays visible
      });
    }
  } else if (poster) {
    // no video authored: behave as a normal image hero
    const picture = poster.closest('picture') || poster;
    media.append(picture);
  }

  block.replaceChildren(media, content, buildScrollArrow(block));
  block.classList.add(src ? 'has-video' : 'no-video');
}