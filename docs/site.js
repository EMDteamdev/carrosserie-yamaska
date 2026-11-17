// Carrosserie Yamaska v2 — interactions. Démo locale : aucune réservation ni envoi réels.
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const mobile = matchMedia('(max-width: 820px)');
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

// ----- En-tête, menu, barre d’action mobile -----
const header = $('#entete'), menu = $('.menu'), nav = $('#navigation'), dock = $('.dock');
let ticking = false;
function onScroll() {
  ticking = false;
  const y = scrollY;
  header.classList.toggle('scrolled', y > 24);
  dock?.classList.toggle('show', y > innerHeight * 0.55);
}
addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
onScroll();
function setMenu(open) {
  menu.setAttribute('aria-expanded', String(open));
  menu.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
  nav.classList.toggle('open', open);
  document.documentElement.style.overflow = open ? 'hidden' : '';
}
menu.addEventListener('click', () => setMenu(menu.getAttribute('aria-expanded') !== 'true'));
nav.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && nav.classList.contains('open')) { setMenu(false); menu.focus(); } });
mobile.addEventListener('change', () => setMenu(false));

// ----- Apparitions : déclenchées avant l’entrée, contenu visible sans observateur -----
const reveals = $$('.reveal');
if ('IntersectionObserver' in window && !reduce.matches) {
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px 60px 0px' });
  reveals.forEach(el => io.observe(el));
} else reveals.forEach(el => el.classList.add('in'));

// ----- Vidéos d’ambiance : chargées à l’approche, arrêtées hors écran -----
$$('[data-ambient]').forEach(scene => {
  const video = $('video', scene), toggle = $('.film-toggle', scene);
  if (!video) return;
  let userPaused = false, visible = false;
  const load = () => { if (!video.src) { video.src = mobile.matches && video.dataset.srcMobile ? video.dataset.srcMobile : video.dataset.src; } };
  const sync = () => {
    if (reduce.matches) { video.pause(); return; }
    if (visible && !userPaused && !document.hidden) { load(); if (video.paused) video.play().catch(() => {}); }
    else if (!video.paused) video.pause();
  };
  if ('IntersectionObserver' in window) new IntersectionObserver(es => { visible = es[0].isIntersecting; sync(); }, { rootMargin: '120px 0px' }).observe(video);
  else { visible = true; sync(); }
  document.addEventListener('visibilitychange', sync);
  reduce.addEventListener('change', sync);
  if (toggle) {
    if (reduce.matches) { userPaused = true; toggle.setAttribute('aria-pressed', 'true'); toggle.firstElementChild.textContent = 'Lire la vidéo'; }
    toggle.addEventListener('click', () => {
      userPaused = !userPaused;
      toggle.setAttribute('aria-pressed', String(userPaused));
      toggle.firstElementChild.textContent = userPaused ? 'Lire la vidéo' : 'Mettre en pause';
      if (!userPaused && reduce.matches) { load(); video.play().catch(() => {}); } else sync();
    });
  }
});

// ----- Rubans de logos : pause manuelle et hors écran -----
const ribbons = $$('[data-marquee]');
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver(es => es.forEach(e => e.target.classList.toggle('off', !e.isIntersecting)), { rootMargin: '80px 0px' });
  ribbons.forEach(r => io.observe(r));
}
const ribbonToggle = $('.ribbon-toggle');
ribbonToggle?.addEventListener('click', () => {
  const paused = ribbonToggle.getAttribute('aria-pressed') !== 'true';
  ribbonToggle.setAttribute('aria-pressed', String(paused));
  ribbonToggle.textContent = paused ? 'Reprendre le défilement' : 'Mettre en pause';
  ribbonToggle.parentElement.classList.toggle('paused', paused);
});

// ----- Chiffres de l’atelier -----
const counters = $$('[data-count]');
if (counters.length && 'IntersectionObserver' in window && !reduce.matches) {
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    io.unobserve(e.target);
    const end = +e.target.dataset.count; let n = 0;
    e.target.textContent = '0';
    const step = () => { n++; e.target.textContent = n; if (n < end) setTimeout(step, 260); };
    setTimeout(step, 200);
  }), { threshold: 0.6 });
  counters.forEach(c => io.observe(c));
}

// ----- Ouvert / fermé selon l’horaire affiché (heure de Saint-Hyacinthe) -----
(function openStatus() {
  const targets = $$('[data-open-status]');
  if (!targets.length) return;
  let parts;
  try {
    parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date()).map(p => [p.type, p.value]));
  } catch { return; }
  const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday);
  const t = (+parts.hour % 24) * 60 + +parts.minute;
  const close = day === 5 ? 15 * 60 : 17 * 60;
  const weekday = day >= 1 && day <= 5;
  let open = false, text;
  if (weekday && t >= 480 && t < close) {
    if (t >= 720 && t < 780) text = 'Pause du midi · retour à 13 h';
    else { open = true; text = `Ouvert · jusqu’à ${close / 60} h`; }
  } else if (weekday && t < 480) text = 'Fermé · ouvre à 8 h';
  else text = (day === 5 && t >= close) || day === 6 || day === 0 ? 'Fermé · ouvre lundi à 8 h' : 'Fermé · ouvre demain à 8 h';
  targets.forEach(el => { el.textContent = text; el.hidden = false; el.classList.add(open ? 'open' : 'closed'); });
})();

// ----- Demande de rendez-vous (démonstration) -----
const form = $('#request-form');
if (form) {
  const daysRoot = $('#booking-days'), slotsRoot = $('#booking-slots'), pick = $('#booking-pick');
  const result = $('#request-result'), summary = $('#summary'), copyStatus = $('#copy-status');
  const service = form.elements.service;
  const wanted = new URLSearchParams(location.search).get('service');
  if ([...service.options].some(o => o.value === wanted)) service.value = wanted;
  const fmtDay = new Intl.DateTimeFormat('fr-CA', { weekday: 'short' }), fmtMonth = new Intl.DateTimeFormat('fr-CA', { month: 'short' });
  const fmtLong = new Intl.DateTimeFormat('fr-CA', { weekday: 'long', day: 'numeric', month: 'long' });
  const days = []; const d = new Date(); d.setHours(12, 0, 0, 0);
  while (days.length < 8) { d.setDate(d.getDate() + 1); if (d.getDay() >= 1 && d.getDay() <= 5) days.push(new Date(d)); }
  const slotsFor = date => date.getDay() === 5 ? ['8 h 30', '9 h 30', '10 h 30', '13 h 30'] : ['8 h 30', '9 h 30', '10 h 30', '13 h 30', '14 h 30', '15 h 30'];
  let chosenDay = null, chosenSlot = null;
  const group = (root, sel) => root.addEventListener('keydown', e => {
    const items = $$(sel, root), i = items.indexOf(document.activeElement);
    if (i < 0) return;
    const move = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!move) return;
    e.preventDefault(); items[(i + move + items.length) % items.length].focus();
  });
  function updatePick() {
    form.elements.visit_date.value = chosenDay ? fmtLong.format(chosenDay) : '';
    form.elements.visit_time.value = chosenSlot || '';
    pick.textContent = chosenDay && chosenSlot ? `Créneau fictif choisi : ${fmtLong.format(chosenDay)} à ${chosenSlot}.` : chosenDay ? `${fmtLong.format(chosenDay)} — choisissez une heure.` : 'Sélectionnez une date et une heure.';
    result.hidden = true;
  }
  function renderSlots() {
    slotsRoot.innerHTML = '';
    slotsFor(chosenDay).forEach(s => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'slot'; b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', 'false'); b.textContent = s;
      b.addEventListener('click', () => { chosenSlot = s; $$('.slot', slotsRoot).forEach(x => x.setAttribute('aria-checked', String(x === b))); updatePick(); });
      slotsRoot.append(b);
    });
  }
  days.forEach(date => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'day'; b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', 'false');
    b.setAttribute('aria-label', fmtLong.format(date));
    b.innerHTML = `<small>${fmtDay.format(date).replace('.', '')}</small><b>${date.getDate()}</b><i>${fmtMonth.format(date)}</i>`;
    b.addEventListener('click', () => { chosenDay = date; chosenSlot = null; $$('.day', daysRoot).forEach(x => x.setAttribute('aria-checked', String(x === b))); renderSlots(); updatePick(); });
    daysRoot.append(b);
  });
  group(daysRoot, '.day'); group(slotsRoot, '.slot');
  form.addEventListener('input', e => { e.target.classList?.remove('invalid'); result.hidden = true; });
  form.addEventListener('submit', e => {
    e.preventDefault();
    const bad = $$('[required]', form).filter(f => !f.checkValidity());
    $$('.invalid', form).forEach(f => f.classList.remove('invalid'));
    if (bad.length) { bad.forEach(f => f.classList.add('invalid')); bad[0].focus(); bad[0].reportValidity?.(); return; }
    const data = new FormData(form);
    const when = data.get('visit_date') ? `Date souhaitée (simulation) : ${data.get('visit_date')}${data.get('visit_time') ? ' à ' + data.get('visit_time') : ''}\nAucune réservation effectuée.\n\n` : '';
    const text = `Bonjour,\n\nJe souhaite discuter d’une réparation pour mon véhicule.\n\n${when}Nom : ${data.get('name')}\nTéléphone : ${data.get('phone') || 'Non indiqué'}\nCourriel : ${data.get('email')}\nVéhicule : ${data.get('vehicle') || 'À préciser'}\nBesoin : ${service.options[service.selectedIndex].text}\n\n${data.get('message')}\n\nMerci de me contacter pour la suite.`;
    summary.value = text;
    $('#email-draft').href = 'mailto:reception@carrosserieyamaska.com?subject=' + encodeURIComponent('Demande — ' + (data.get('vehicle') || 'réparation automobile')) + '&body=' + encodeURIComponent(text);
    copyStatus.textContent = '';
    result.hidden = false; result.focus({ preventScroll: true });
    result.scrollIntoView({ behavior: reduce.matches ? 'auto' : 'smooth', block: 'center' });
  });
  $('#copy').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(summary.value); copyStatus.textContent = 'Message copié. Aucun envoi effectué.'; }
    catch { summary.focus(); summary.select(); copyStatus.textContent = 'Sélectionnez et copiez le texte ci-dessus.'; }
  });
}
