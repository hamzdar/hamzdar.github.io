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
  if (document.querySelector('.name-row')) installMasthead();
  if (document.querySelector('.closing')) installClosingMessage();
  if (document.querySelector('.drawing-dialog')) installDrawingViewer();
  enableSketchTrail();

  control.addEventListener('change', ({ target }) => {
    page.dataset.theme = target.value;
    try {
      localStorage.setItem(themeKey, target.value);
    } catch {
      // The current selection remains active for this page.
    }
  });
}, { once: true });

function installMasthead() {
  const masthead = document.querySelector('.name-row');
  const intro = document.querySelector('.intro');
  let frame = 0;
  let travel;

  function update() {
    frame = 0;
    const progress = Math.min(1, Math.max(0, window.scrollY / travel));
    masthead.style.setProperty('--scroll-progress', progress.toFixed(3));
    masthead.classList.toggle('is-compact', progress === 1);
  }

  function measure() {
    const compactOffset = parseFloat(getComputedStyle(masthead).top);
    travel = Math.max(1, intro.offsetTop + intro.offsetHeight - compactOffset);
    update();
  }

  measure();
  window.addEventListener('resize', measure);
  window.addEventListener('scroll', () => {
    if (!frame) frame = requestAnimationFrame(update);
  }, { passive: true });
}

function enableSketchTrail() {
  const canvas = document.querySelector('.sketch-trail');
  const ink = canvas.getContext('2d');
  if (!ink) return;

  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const lifetime = 2050;
  const strokes = [];
  let lastPoint;
  let lastMidpoint;
  let pressure = .5;
  let frame = 0;
  let width;
  let height;

  function resetPen() {
    lastPoint = undefined;
    lastMidpoint = undefined;
    pressure = .5;
  }

  function resize() {
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    const scale = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    ink.setTransform(scale, 0, 0, scale, 0, 0);
    ink.lineCap = 'round';
    strokes.length = 0;
    resetPen();
  }

  function draw(now) {
    ink.clearRect(0, 0, width, height);
    while (strokes.length && now - strokes[0].time >= lifetime) strokes.shift();
    if (motion.matches) strokes.length = 0;
    ink.strokeStyle = page.dataset.theme === 'light' ? '#3c3730' : '#e2dacc';

    for (const stroke of strokes) {
      const remaining = 1 - Math.max(0, now - stroke.time) / lifetime;
      ink.globalAlpha = stroke.opacity * remaining ** 1.8;
      ink.lineWidth = stroke.width;
      ink.beginPath();
      ink.moveTo(stroke.from.x, stroke.from.y);
      ink.quadraticCurveTo(stroke.control.x, stroke.control.y, stroke.to.x, stroke.to.y);
      ink.stroke();
    }

    frame = strokes.length ? requestAnimationFrame(draw) : 0;
  }

  function record(sample, now) {
    const next = { x: sample.clientX, y: sample.clientY, time: sample.timeStamp };
    const previous = lastPoint;
    lastPoint = next;
    if (!previous) return;

    const distance = Math.hypot(next.x - previous.x, next.y - previous.y);
    if (distance === 0) return;

    const delay = next.time - previous.time;
    if (delay > 150 && distance > 32) {
      lastMidpoint = undefined;
      pressure = .5;
      return;
    }

    const elapsed = Math.min(40, Math.max(4, delay));
    const targetPressure = 1 / (1 + 1.8 * distance / elapsed);
    pressure += (targetPressure - pressure) * .32;
    const midpoint = { x: (previous.x + next.x) / 2, y: (previous.y + next.y) / 2 };

    strokes.push({
      from: lastMidpoint ?? previous,
      control: previous,
      to: midpoint,
      time: now,
      width: .55 + 1.8 * pressure,
      opacity: .18 + .46 * pressure,
    });
    lastMidpoint = midpoint;
  }

  function sketch(event) {
    if (event.pointerType !== 'mouse' || motion.matches) return;
    const now = performance.now();
    const samples = event.getCoalescedEvents?.();
    for (const sample of samples?.length ? samples : [event]) record(sample, now);
    if (!frame && strokes.length) frame = requestAnimationFrame(draw);
  }

  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('pointermove', sketch, { passive: true });
  window.addEventListener('blur', resetPen);
  document.documentElement.addEventListener('pointerleave', resetPen);
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
