const themeKey = 'hamz-dar-portfolio-theme';
const page = document.documentElement;
let theme = 'dark';

try {
  if (localStorage.getItem(themeKey) === 'light') theme = 'light';
} catch {
  // The theme still works when the browser disables local storage.
}
page.dataset.theme = theme;

window.addEventListener('pageswap', (event) => {
  connectProjectPhoto(event.viewTransition, event.activation?.entry?.url);
});
window.addEventListener('pagereveal', (event) => {
  connectProjectPhoto(event.viewTransition, window.navigation?.activation?.from?.url);
});

function connectProjectPhoto(transition, otherPage) {
  if (!transition || !otherPage || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const target = new URL(otherPage);
  if (target.origin !== location.origin) return;

  const slug = target.pathname.match(/\/projects\/([a-z-]+)\.html$/)?.[1];
  const currentProject = document.body.dataset.projectPage;
  const photo = currentProject && !slug
    ? document.querySelector('[data-transition-photo]')
    : !currentProject && slug
      ? document.querySelector(`[data-project-link="${slug}"] .project-image`)
      : null;
  if (!photo) return;

  const bounds = photo.getBoundingClientRect();
  if (bounds.bottom <= 0 || bounds.top >= window.innerHeight) return;

  photo.style.viewTransitionName = 'project-photo';
  const reset = () => photo.style.removeProperty('view-transition-name');
  transition.finished.then(reset, reset);
}

window.addEventListener('DOMContentLoaded', () => {
  const control = document.querySelector('.theme-control');
  control.querySelector(`[value="${theme}"]`).checked = true;
  control.hidden = false;
  keepLanguageAnchors();
  if (document.querySelector('[data-expandable]')) installMasthead();
  if (document.querySelector('.closing')) installClosingMessage();
  if (document.querySelector('.resume')) installResumeTimeline();
  if (document.querySelector('.drawing-dialog')) installDrawingViewer();

  control.addEventListener('change', ({ target }) => {
    page.dataset.theme = target.value;
    try {
      localStorage.setItem(themeKey, target.value);
    } catch {
      // The current selection remains active for this page.
    }
  });
}, { once: true });

function keepLanguageAnchors() {
  const languageLinks = document.querySelectorAll('.language-control a');

  function update() {
    for (const link of languageLinks) link.hash = location.hash;
  }

  update();
  window.addEventListener('hashchange', update);
}

function installMasthead() {
  const masthead = document.querySelector('[data-expandable]');
  let frame = 0;
  let travel;

  function update() {
    frame = 0;
    const progress = Math.min(1, Math.max(0, window.scrollY / travel));
    masthead.style.setProperty('--scroll-progress', progress.toFixed(3));
  }

  function measure() {
    const compactOffset = parseFloat(getComputedStyle(masthead).top);
    const outerPadding = parseFloat(getComputedStyle(masthead.parentElement).paddingTop);
    travel = Math.max(1, outerPadding - compactOffset);
    update();
  }

  measure();
  window.addEventListener('resize', measure);
  window.addEventListener('scroll', () => {
    if (!frame) frame = requestAnimationFrame(update);
  }, { passive: true });
}

function installClosingMessage() {
  if (!('IntersectionObserver' in window)) return;

  const closing = document.querySelector('.closing');
  const portrait = closing.querySelector('.portrait');
  const observer = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) return;
    closing.classList.add('is-visible');
    observer.disconnect();
  }, { threshold: .25 });

  closing.classList.add('writing-ready');
  observer.observe(portrait);
}

function installDrawingViewer() {
  const dialog = document.querySelector('.drawing-dialog');
  if (typeof dialog.showModal !== 'function') return;

  const link = document.querySelector('[data-drawing-link]');
  link.setAttribute('aria-haspopup', 'dialog');
  link.addEventListener('click', (event) => {
    if (event.button || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    dialog.querySelector('img').src = link.href;
    dialog.showModal();
  });
}

function installResumeTimeline() {
  const timeline = document.querySelector('.resume-visual');
  const plot = timeline.querySelector('.resume-plot');
  const labels = Array.from(timeline.querySelectorAll('.resume-entry'), (entry) => ({
    entry,
    start: Number(entry.dataset.start),
    label: entry.querySelector('.resume-label'),
    mark: entry.querySelector('.resume-dot'),
  }));
  const months = 204;
  const gap = 10;
  timeline.classList.add('is-laid-out');

  function arrangeLabels() {
    const rowHeight = Math.max(...labels.map(({ label }) => label.offsetHeight));
    const slots = labels.length - 1;
    const lastStart = labels.at(-1).start / months;
    const tail = timeline.clientHeight - plot.clientHeight;
    const minimumSpan = slots * (rowHeight + gap);
    const required = Math.max(minimumSpan / lastStart + tail, minimumSpan + rowHeight) + 2;
    timeline.style.setProperty('--content-height', `${Math.ceil(required)}px`);

    const span = Math.min(lastStart * plot.clientHeight, timeline.clientHeight - rowHeight);
    labels.forEach(({ entry, start, label, mark }, index) => {
      const offset = Math.round(index * span / slots);
      const x = label.offsetLeft - mark.offsetLeft - 7;
      const y = offset + 8 - (start / months) * plot.clientHeight;
      entry.style.setProperty('--label-y', `${offset}px`);
      entry.style.setProperty('--leader-length', `${Math.hypot(x, y)}px`);
      entry.style.setProperty('--leader-angle', `${Math.atan2(y, x)}rad`);
    });
  }

  arrangeLabels();
  window.addEventListener('resize', arrangeLabels);
  document.fonts?.ready.then(arrangeLabels);

  const playback = timeline.closest('.resume').querySelector('[data-resume-replay]');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0;
  let armed = true;

  function play() {
    cancelAnimationFrame(frame);
    timeline.classList.add('resume-ready');
    timeline.classList.remove('is-playing');
    frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => timeline.classList.add('is-playing'));
    });
  }

  playback.hidden = false;
  playback.addEventListener('click', play);

  motion.addEventListener('change', () => {
    if (!motion.matches) return;
    cancelAnimationFrame(frame);
    timeline.classList.remove('is-playing', 'resume-ready');
  });

  if (!('IntersectionObserver' in window)) return;
  if (!motion.matches) timeline.classList.add('resume-ready');

  const stage = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) armed = true;
    if (entry.intersectionRatio < .18 || !armed || motion.matches) return;
    armed = false;
    play();
  }, { rootMargin: '-52px 0px 0px', threshold: [0, .18] });
  stage.observe(timeline);
}
