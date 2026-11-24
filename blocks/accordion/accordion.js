export default function decorate(block) {
  [...block.children].forEach((row) => {
    // row has two cells: [label, body]
    const label = row.children[0];
    const body = row.children[1];

    // build the summary (clickable header)
    const summary = document.createElement('summary');
    summary.className = 'accordion-item-label';
    summary.append(...label.childNodes);

    // style the body
    if (body) body.className = 'accordion-item-body';

    // build <details> and move content into it
    const details = document.createElement('details');
    details.className = 'accordion-item';
    details.append(summary);
    if (body) details.append(body);

    // replace the original row
    row.replaceWith(details);
  });

  // single-item mode: opening one closes all the others
  const items = block.querySelectorAll('details');
  items.forEach((item) => {
    item.addEventListener('toggle', () => {
      if (!item.open) return;
      items.forEach((other) => {
        if (other !== item) other.open = false;
      });
    });
  });
}
