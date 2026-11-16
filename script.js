'use strict';
const photos = [...document.querySelectorAll('.photo')];
const dialog = document.querySelector('#lightbox');
const fullImage = document.querySelector('#lightbox-image');
const previous = document.querySelector('#previous');
const next = document.querySelector('#next');
let current = 0;
let opener;
let groupPhotos = [];
function showImage(index) {
  current = (index + groupPhotos.length) % groupPhotos.length;
  const image = groupPhotos[current].querySelector('img');
  fullImage.src = image.getAttribute('src');
  fullImage.alt = image.alt;
  document.querySelector('#lightbox-count').textContent = `${String(current + 1).padStart(2, '0')} / ${String(groupPhotos.length).padStart(2, '0')}`;
}
photos.forEach((photo, index) => { photo.dataset.photoIndex = index; });
document.querySelectorAll('.gallery').forEach(track => {
  track.addEventListener('click', event => {
    const clicked = event.target.closest('.photo');
    if (!clicked) return;
    const photo = photos[Number(clicked.dataset.photoIndex)];
    opener = clicked;
    const group = photo.closest('.gallery-group');
    groupPhotos = photos.filter(item => item.closest('.gallery-group') === group);
    document.querySelector('#lightbox-category').textContent = group.querySelector('h3').textContent;
    showImage(groupPhotos.indexOf(photo));
    dialog.showModal();
    document.body.classList.add('modal-open');
  });
});
document.querySelector('#close-lightbox').addEventListener('click', () => dialog.close());
previous.addEventListener('click', () => showImage(current - 1));
next.addEventListener('click', () => showImage(current + 1));
dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
dialog.addEventListener('close', () => {
  document.body.classList.remove('modal-open');
  if (opener) opener.focus({ preventScroll: true });
});
dialog.addEventListener('keydown', event => {
  if (event.key === 'ArrowLeft') { event.preventDefault(); showImage(current - 1); }
  if (event.key === 'ArrowRight') { event.preventDefault(); showImage(current + 1); }
});
const backToTop = document.querySelector('#back-to-top');
backToTop.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  document.querySelector('#page-title').focus({ preventScroll: true });
});
const glassHeader = document.querySelector('.side-header');
const darkSurfaces = [...document.querySelectorAll('.hero, .portfolio')];
const navigation = [...document.querySelectorAll('.nav-link')];
const sections = navigation.map(link => document.querySelector(link.getAttribute('href')));
let scheduled = false;
function updateNavigation() {
  const boundary = window.innerHeight * 0.4;
  let active = sections[0];
  sections.forEach(section => { if (section.getBoundingClientRect().top <= boundary) active = section; });
  navigation.forEach(link => {
    if (link.getAttribute('href') === `#${active.id}`) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
  if (window.matchMedia('(max-width:760px)').matches) {
    const headerBox = glassHeader.getBoundingClientRect();
    const materialY = headerBox.top + headerBox.height / 2;
    const onDark = darkSurfaces.some(surface => {
      const box = surface.getBoundingClientRect();
      return box.top <= materialY && box.bottom > materialY;
    });
    glassHeader.dataset.glassTheme = onDark ? 'dark' : 'light';
  }
  const buttonBox = backToTop.getBoundingClientRect();
  const buttonY = buttonBox.top + buttonBox.height / 2;
  backToTop.dataset.glassTheme = darkSurfaces.some(surface => {
    const box = surface.getBoundingClientRect();
    return box.top <= buttonY && box.bottom > buttonY;
  }) ? 'dark' : 'light';
  const showBackToTop = window.scrollY > Math.max(450, window.innerHeight * 0.7);
  backToTop.classList.toggle('is-visible', showBackToTop);
  backToTop.setAttribute('aria-hidden', String(!showBackToTop));
  backToTop.tabIndex = showBackToTop ? 0 : -1;
  scheduled = false;
}
window.addEventListener('scroll', () => {
  if (!scheduled) { scheduled = true; window.requestAnimationFrame(updateNavigation); }
}, { passive: true });
window.addEventListener('resize', updateNavigation);
window.addEventListener('pageshow', updateNavigation);
updateNavigation();

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
document.querySelectorAll('.gallery-group').forEach(group => {
  const track = group.querySelector('.gallery');
  const stage = group.querySelector('.slider-stage');
  const sequence = document.createElement('div');
  sequence.className = 'gallery-sequence';
  while (track.firstChild) sequence.append(track.firstChild);
  track.append(sequence);
  const copy = sequence.cloneNode(true);
  copy.setAttribute('aria-hidden', 'true');
  copy.querySelectorAll('.photo').forEach(photo => { photo.tabIndex = -1; });
  track.append(copy);
  let animation;
  let seeking = false;
  let seekFrame = 0;
  let distance = 0;
  let visible = false;
  const speed = 38; // Constant pixels per second, independent of the number of photos.
  function syncPlayback() {
    if (animation) {
      if (seeking || reducedMotion.matches || !visible || document.hidden || dialog.open) animation.pause();
      else animation.play();
    }
  }
  function measure() {
    const width = sequence.getBoundingClientRect().width;
    if (!width || Math.abs(width - distance) < 0.5) return;
    const progress = animation && distance ? ((Number(animation.currentTime) || 0) / (distance / speed * 1000)) % 1 : 0;
    window.cancelAnimationFrame(seekFrame);
    seeking = false;
    if (animation) animation.cancel();
    distance = width;
    const duration = distance / speed * 1000;
    animation = track.animate([
      { transform: 'translateX(0)' },
      { transform: `translateX(-${distance}px)` }
    ], { duration, iterations: Infinity, easing: 'linear' });
    animation.currentTime = progress * duration;
    syncPlayback();
  }
  function advance(direction) {
    if (!animation || !distance) return;
    window.cancelAnimationFrame(seekFrame);
    const startOffset = ((Number(animation.currentTime) || 0) * speed / 1000) % distance;
    let amount = stage.clientWidth * 0.425 * direction;
    if (window.matchMedia('(max-width:760px)').matches) {
      const starts = [...sequence.querySelectorAll('.photo')].map(photo => photo.offsetLeft);
      const target = direction > 0
        ? (starts.find(offset => offset > startOffset + 2) ?? distance)
        : ([...starts].reverse().find(offset => offset < startOffset - 2) ?? starts[starts.length - 1] - distance);
      amount = target - startOffset;
    }
    seeking = true;
    syncPlayback();
    function applyOffset(offset) {
      animation.currentTime = ((offset % distance + distance) % distance) / speed * 1000;
    }
    if (reducedMotion.matches) {
      applyOffset(startOffset + amount);
      seeking = false;
      syncPlayback();
      return;
    }
    const started = performance.now();
    function step(now) {
      const progress = Math.min((now - started) / 400, 1);
      const eased = progress * progress * (3 - 2 * progress);
      applyOffset(startOffset + amount * eased);
      if (progress < 1) seekFrame = window.requestAnimationFrame(step);
      else { seeking = false; syncPlayback(); }
    }
    seekFrame = window.requestAnimationFrame(step);
  }
  group.querySelector('.slider-previous').addEventListener('click', () => advance(-1));
  group.querySelector('.slider-next').addEventListener('click', () => advance(1));
  document.addEventListener('visibilitychange', syncPlayback);
  dialog.addEventListener('close', syncPlayback);
  new MutationObserver(syncPlayback).observe(dialog, { attributes: true, attributeFilter: ['open'] });
  new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    syncPlayback();
  }, { threshold: 0 }).observe(stage);
  new ResizeObserver(measure).observe(sequence);
  reducedMotion.addEventListener('change', syncPlayback);
  measure();
  syncPlayback();
});

// Reveal sections once, without delaying image downloads or the moving ribbons.
const revealTargets = document.querySelectorAll('.section-heading, .group-heading, .slider-stage, .info-photo, .info-copy, .contact h2, .contact-links, footer');
if ('IntersectionObserver' in window && !reducedMotion.matches) {
  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.remove('reveal-pending');
      revealObserver.unobserve(entry.target);
    });
  }, { threshold: 0, rootMargin: '0px 0px -40px 0px' });
  revealTargets.forEach(element => {
    element.classList.add('reveal-pending');
    revealObserver.observe(element);
  });
  // Keyboard navigation must never land on an invisible element.
  document.addEventListener('focusin', event => {
    const target = event.target.closest('.reveal-pending');
    if (target) { target.classList.remove('reveal-pending'); revealObserver.unobserve(target); }
  });
  reducedMotion.addEventListener('change', () => {
    if (!reducedMotion.matches) return;
    revealTargets.forEach(element => element.classList.remove('reveal-pending'));
    revealObserver.disconnect();
  });
}
