const bookLink = document.querySelector('[data-book-open]');
const bookDialog = document.querySelector('.book-reader');

if (bookLink && typeof bookDialog?.showModal === 'function') installBookReader();

function installBookReader() {
  const bookStage = bookDialog.querySelector('[data-book-stage]');
  const spread = bookDialog.querySelector('.book-spread');
  const leftPage = spread.querySelector('[data-page-left]');
  const rightPage = spread.querySelector('[data-page-right]');
  const sheet = spread.querySelector('.book-sheet');
  const front = sheet.querySelector('.book-front');
  const reverse = sheet.querySelector('.book-reverse');
  const status = bookDialog.querySelector('[data-book-status]');
  const previousButtons = bookDialog.querySelectorAll('[data-book-step="-1"]');
  const nextButtons = bookDialog.querySelectorAll('[data-book-step="1"]');
  const nextLabel = bookDialog.querySelector('[data-book-next-label]');
  const pageForm = bookDialog.querySelector('[data-book-jump]');
  const pageInput = pageForm.querySelector('input');
  const compact = matchMedia('(max-width: 680px)');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const total = 48;
  const german = document.documentElement.lang === 'de';
  const copy = german
    ? { cover: 'Umschlag der Broschüre', page: 'Seite', pages: 'Seiten', of: 'von',
        reset: 'Zum Umschlag', next: 'Weiter', nextPage: 'Nächste Seite' }
    : { cover: 'Brochure cover', page: 'Page', pages: 'Pages', of: 'of',
        reset: 'Back to cover', next: 'Next', nextPage: 'Next page' };
  const decoded = new Map();
  let currentPage = 1;
  let currentAnimation;
  let busy = false;
  let readerSession = 0;
  let pressX;

  function pageUrl(number) {
    const file = `page-${String(number).padStart(2, '0')}.webp`;
    return new URL(file, bookLink.href).href;
  }

  function preload(number) {
    if (number < 1 || number > total) return Promise.resolve();
    if (!decoded.has(number)) {
      const image = new Image();
      image.src = pageUrl(number);
      const ready = image.decode().catch(() => { decoded.delete(number); });
      decoded.set(number, ready);
    }
    return decoded.get(number);
  }

  function visiblePages(page) {
    if (compact.matches || page === 1 || page === total) return [page];
    const firstPage = page - page % 2;
    return [firstPage, firstPage + 1];
  }

  function putPage(image, number) {
    image.hidden = !number;
    image.alt = number === 1 ? copy.cover : number ? `${copy.page} ${number}` : '';
    if (number) image.src = pageUrl(number);
  }

  function show(pages, requestedPage = currentPage) {
    pageInput.value = requestedPage;
    spread.dataset.layout = pages.length === 1 ? 'single' : 'spread';
    putPage(leftPage, pages[0]);
    putPage(rightPage, pages[1]);
    const first = pages[0];
    const last = pages.at(-1);
    status.textContent = first === last ? `${copy.page} ${first} ${copy.of} ${total}` : `${copy.pages} ${first}–${last} ${copy.of} ${total}`;
    const atEnd = last === total;
    previousButtons.forEach((button) => { button.disabled = first === 1; });
    nextButtons.forEach((button) => { button.setAttribute('aria-label', atEnd ? copy.reset : copy.nextPage); });
    nextLabel.textContent = atEnd ? copy.reset : copy.next;
    [first - 2, first - 1, atEnd ? 1 : last + 1, last + 2].forEach(preload);
  }

  async function animate(element, frames, options) {
    const animation = element.animate(frames, options);
    currentAnimation = animation;
    await animation.finished;
    if (currentAnimation === animation) currentAnimation = undefined;
  }

  function turn(delta) {
    const pages = visiblePages(currentPage);
    const requestedPage = delta > 0 ? pages.at(-1) + 1 : pages[0] - 1;
    goToPage(requestedPage > total ? 1 : requestedPage, delta);
  }

  async function goToPage(destination, direction = 0) {
    if (busy || !bookDialog.open || !Number.isInteger(destination) || destination < 1 || destination > total) return;
    const previous = visiblePages(currentPage);
    const session = readerSession;
    const next = visiblePages(destination);
    busy = true;
    try {
      await Promise.all(next.map(preload));
      if (session !== readerSession) return;
      if (direction && !reducedMotion.matches && typeof spread.animate === 'function') {
        if (previous.length === 2 && next.length === 2) {
          const forward = direction > 0;
          sheet.dataset.direction = forward ? 'forward' : 'backward';
          front.src = pageUrl(previous[forward ? 1 : 0]);
          reverse.src = pageUrl(next[forward ? 0 : 1]);
          sheet.hidden = false;
          putPage(forward ? rightPage : leftPage, next[forward ? 1 : 0]);
          await animate(sheet, [
            { transform: 'rotateY(0deg)' },
            { transform: `rotateY(${forward ? -180 : 180}deg)` },
          ], { duration: 560, easing: 'cubic-bezier(.32,.12,.3,1)', fill: 'both' });
        } else {
          await animate(spread, [
            { transform: 'rotateY(0deg)', opacity: 1 },
            { transform: `rotateY(${-direction * 68}deg)`, opacity: .35 },
          ], { duration: 190, easing: 'ease-in' });
          if (session !== readerSession) return;
          show(next, destination);
          await animate(spread, [
            { transform: `rotateY(${direction * 58}deg)`, opacity: .35 },
            { transform: 'rotateY(0deg)', opacity: 1 },
          ], { duration: 245, easing: 'ease-out' });
        }
      }
      if (session === readerSession) {
        currentPage = destination;
        show(visiblePages(currentPage));
      }
    } catch (error) {
      if (error.name !== 'AbortError') throw error;
    } finally {
      if (session === readerSession) {
        sheet.hidden = true;
        sheet.getAnimations?.().forEach((animation) => animation.cancel());
        busy = false;
      }
    }
  }

  bookLink.setAttribute('aria-haspopup', 'dialog');
  bookLink.addEventListener('click', (event) => {
    if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    show(visiblePages(currentPage));
    bookDialog.showModal();
  });

  bookDialog.addEventListener('close', () => {
    readerSession += 1;
    currentAnimation?.cancel();
    currentAnimation = undefined;
    sheet.hidden = true;
    busy = false;
    pressX = undefined;
  });

  bookDialog.addEventListener('click', (event) => {
    const button = event.target.closest('[data-book-step]');
    if (button) turn(Number(button.dataset.bookStep));
  });

  pageForm.addEventListener('submit', (event) => {
    event.preventDefault();
    goToPage(pageInput.valueAsNumber);
  });

  bookDialog.addEventListener('keydown', (event) => {
    if (event.target === pageInput || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) return;
    event.preventDefault();
    turn(event.key === 'ArrowLeft' ? -1 : 1);
  });

  bookStage.addEventListener('pointerdown', (event) => { pressX = event.clientX; });
  bookStage.addEventListener('pointerup', (event) => {
    if (pressX === undefined) return;
    const distance = event.clientX - pressX;
    pressX = undefined;
    if (Math.abs(distance) > 34) turn(distance < 0 ? 1 : -1);
  });
  bookStage.addEventListener('pointercancel', () => { pressX = undefined; });

  compact.addEventListener('change', () => {
    if (!bookDialog.open) return;
    readerSession += 1;
    currentAnimation?.cancel();
    currentAnimation = undefined;
    sheet.hidden = true;
    busy = false;
    show(visiblePages(currentPage));
  });
}
