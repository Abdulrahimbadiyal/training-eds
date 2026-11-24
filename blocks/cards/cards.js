import { createOptimizedPicture } from '../../scripts/aem.js';

/* classify the cells already sitting inside a card <li> */
function classifyCells(li) {
  [...li.children].forEach((cell) => {
    if (cell.children.length === 1 && cell.querySelector('picture')) {
      cell.className = 'cards-card-image';
    } else {
      cell.className = 'cards-card-body';
    }
  });
}

/* a self-contained cell holds both an image and its own copy (image + caption).
   Split it into a proper image + body card. */
function cardFromCell(cell) {
  const li = document.createElement('li');
  const picture = cell.querySelector('picture');

  const image = document.createElement('div');
  image.className = 'cards-card-image';
  image.append(picture);
  li.append(image);

  const body = document.createElement('div');
  body.className = 'cards-card-body';
  [...cell.childNodes].forEach((node) => {
    if (node.nodeType !== Node.TEXT_NODE || node.textContent.trim()) body.append(node);
  });
  if (body.childNodes.length) li.append(body);

  return li;
}

export default function decorate(block) {
  const ul = document.createElement('ul');
  ul.className = 'cards-list';

  [...block.children].forEach((row) => {
    const cells = [...row.children];
    // every cell carries its own image AND text -> each cell is its own card
    const cellsAreCards = cells.length > 1
      && cells.every((cell) => cell.querySelector('picture') && cell.textContent.trim());

    if (cellsAreCards) {
      cells.forEach((cell) => ul.append(cardFromCell(cell)));
    } else {
      const li = document.createElement('li');
      while (row.firstElementChild) li.append(row.firstElementChild);
      classifyCells(li);
      ul.append(li);
    }
  });

  ul.querySelectorAll('picture > img').forEach((img) => img.closest('picture').replaceWith(createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }])));
  block.replaceChildren(ul);
}
