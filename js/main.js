/* Formax Builders — interactivity. Runs after site-content.js renders the
   page (listens for the `site:rendered` event) plus a few page-load behaviours. */
(function () {
  const qs = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- Header shadow on scroll ---- */
  function initHeader() {
    const header = qs('#site-header');
    if (!header) return;
    // Pages without a dark hero behind the header need a solid bar so the
    // light nav text stays legible.
    const hasHero = qs('.hero') || qs('.page-hero');
    if (!hasHero) { header.classList.add('scrolled'); return; }
    const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 30);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---- Auto-playing project carousels (landing + projects page) ---- */
  function initProjectCarousels() {
    qsa('.pcar-wrap').forEach((wrap) => {
      const track = qs('.pcar-track', wrap);
      const cards = qsa(':scope > a', track);
      const dotsWrap = qs('.pcar-dots', wrap);
      if (!cards.length) return;
      let page = 0;
      let timer = null;
      const perView = () => (window.innerWidth <= 560 ? 1 : window.innerWidth <= 900 ? 2 : 3);
      const pageCount = () => Math.max(1, Math.ceil(cards.length / perView()));

      function render() {
        const pv = perView();
        const pages = pageCount();
        if (page >= pages) page = 0;
        const gap = parseFloat(getComputedStyle(track).gap) || 24;
        track.style.transform = `translateX(-${page * pv * (cards[0].offsetWidth + gap)}px)`;
        if (dotsWrap) {
          dotsWrap.innerHTML = Array.from({ length: pages }, (_, i) => `<button${i === page ? ' class="active"' : ''} aria-label="Page ${i + 1}"></button>`).join('');
          qsa('button', dotsWrap).forEach((b, i) => b.addEventListener('click', () => { page = i; render(); restart(); }));
        }
      }
      function start() {
        if (wrap.hasAttribute('data-autoplay') && !reduceMotion && pageCount() > 1) {
          timer = setInterval(() => { page = (page + 1) % pageCount(); render(); }, 4500);
        }
      }
      function stop() { if (timer) { clearInterval(timer); timer = null; } }
      function restart() { stop(); start(); }

      render();
      start();
      wrap.addEventListener('mouseenter', stop);
      wrap.addEventListener('mouseleave', start);
      window.addEventListener('resize', render);
    });
  }

  /* ---- Mobile nav ---- */
  function initNav() {
    const burger = qs('#hamburger');
    const links = qs('#nav-links');
    if (!burger || !links) return;
    let backdrop = qs('.nav-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.className = 'nav-backdrop';
      document.body.appendChild(backdrop);
    }
    const isDesktopSpa = () => document.body.classList.contains('spa-on');
    const toggle = (open) => {
      const isOpen = open ?? !links.classList.contains('active');
      links.classList.toggle('active', isOpen);
      backdrop.classList.toggle('active', isOpen);
      burger.classList.toggle('active', isOpen);
      burger.setAttribute('aria-expanded', String(isOpen));
      // keep the SPA's no-scroll state intact when closing on desktop
      document.body.style.overflow = isOpen ? 'hidden' : (isDesktopSpa() ? 'hidden' : '');
    };
    burger.addEventListener('click', () => toggle());
    backdrop.addEventListener('click', () => toggle(false));
    qsa('a', links).forEach((a) => a.addEventListener('click', () => toggle(false)));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') toggle(false); });
  }

  /* ---- Hero slider ---- */
  function initHero() {
    const slides = qsa('.hero-slide');
    const dots = qsa('.hero-dot');
    if (slides.length < 2) return;
    let current = 0;
    let timer;
    const go = (i) => {
      current = (i + slides.length) % slides.length;
      slides.forEach((s, idx) => s.classList.toggle('active', idx === current));
      dots.forEach((d, idx) => d.classList.toggle('active', idx === current));
    };
    const start = () => { if (!reduceMotion) timer = setInterval(() => go(current + 1), 6000); };
    const stop = () => clearInterval(timer);
    dots.forEach((d, i) => d.addEventListener('click', () => { stop(); go(i); start(); }));
    start();
  }

  /* ---- Scroll reveal ---- */
  function initReveal() {
    const items = qsa('[data-reveal]');
    if (!items.length) return;
    if (reduceMotion || !('IntersectionObserver' in window)) {
      items.forEach((el) => el.classList.add('in'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    items.forEach((el) => io.observe(el));
  }

  /* ---- Animated counters ---- */
  function initCounters() {
    const nums = qsa('.num[data-count]');
    if (!nums.length) return;
    const animate = (el) => {
      const raw = String(el.dataset.count || '');
      const target = parseFloat(raw.replace(/[^\d.]/g, ''));
      const suffix = el.dataset.suffix || '';
      if (!isFinite(target)) { el.textContent = raw + suffix; return; }
      if (reduceMotion) { el.textContent = target + suffix; return; }
      const dur = 1400;
      const t0 = performance.now();
      const tick = (now) => {
        const p = Math.min((now - t0) / dur, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * eased) + suffix;
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    if (!('IntersectionObserver' in window)) { nums.forEach(animate); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { animate(e.target); io.unobserve(e.target); } });
    }, { threshold: 0.5 });
    nums.forEach((el) => io.observe(el));
  }

  /* ---- Project filter ---- */
  function initFilters() {
    const filters = qs('#project-filters');
    const grid = qs('#projects-grid');
    if (!filters || !grid) return;
    filters.addEventListener('click', (e) => {
      const btn = e.target.closest('.filter-btn');
      if (!btn) return;
      qsa('.filter-btn', filters).forEach((b) => b.classList.toggle('active', b === btn));
      const f = btn.dataset.filter;
      qsa('.project-card', grid).forEach((card) => {
        const show = f === 'All' || card.dataset.category === f;
        card.style.display = show ? '' : 'none';
      });
    });
  }

  /* ---- Lightbox (project gallery) ---- */
  function initLightbox() {
    const zoomables = qsa('[data-zoom]');
    if (!zoomables.length) return;
    const srcs = zoomables.map((img) => img.getAttribute('src'));
    let index = 0;

    const box = document.createElement('div');
    box.className = 'lightbox';
    box.innerHTML = `
      <button class="lb-close" aria-label="Close">&times;</button>
      <button class="lb-nav lb-prev" aria-label="Previous">&#8249;</button>
      <img alt="">
      <button class="lb-nav lb-next" aria-label="Next">&#8250;</button>`;
    document.body.appendChild(box);
    const imgEl = qs('img', box);

    const show = (i) => { index = (i + srcs.length) % srcs.length; imgEl.src = srcs[index]; };
    const open = (i) => { show(i); box.classList.add('open'); document.body.style.overflow = 'hidden'; };
    const close = () => { box.classList.remove('open'); document.body.style.overflow = ''; };

    zoomables.forEach((img, i) => img.addEventListener('click', () => open(i)));
    qs('.lb-close', box).addEventListener('click', close);
    qs('.lb-prev', box).addEventListener('click', () => show(index - 1));
    qs('.lb-next', box).addEventListener('click', () => show(index + 1));
    box.addEventListener('click', (e) => { if (e.target === box) close(); });
    document.addEventListener('keydown', (e) => {
      if (!box.classList.contains('open')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') show(index - 1);
      if (e.key === 'ArrowRight') show(index + 1);
    });
  }

  /* ---- Contact form ---- */
  function initContactForm() {
    const form = qs('#contact-form');
    if (!form) return;
    const note = qs('#cf-note');
    const submit = qs('#cf-submit');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      note.className = 'form-note';
      const data = Object.fromEntries(new FormData(form).entries());
      if (!data.name || !data.email || !data.message) {
        note.className = 'form-note err';
        note.textContent = 'Please fill in your name, email and project details.';
        return;
      }
      submit.disabled = true;
      const label = submit.querySelector('span');
      const original = label ? label.textContent : '';
      if (label) label.textContent = 'Sending…';
      try {
        const res = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(data),
        });
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(payload.error || 'Something went wrong. Please try again.');
        form.reset();
        note.className = 'form-note ok';
        note.textContent = 'Thank you! Your request has been received — we’ll be in touch within 1–2 business days.';
      } catch (err) {
        note.className = 'form-note err';
        note.textContent = err.message;
      } finally {
        submit.disabled = false;
        if (label) label.textContent = original;
      }
    });
  }

  /* ---- Footer year (static fallback) ---- */
  function initYear() {
    qsa('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });
  }

  /* ---- Horizontal single-page app (desktop) ---- */
  function initSpa() {
    const track = qs('#hpanels');
    if (!track) return;
    const panels = qsa('.panel', track);
    const dotsWrap = qs('#panel-dots');
    const labels = panels.map((p) => p.dataset.panel);
    const pretty = { home: 'Home', about: 'About', services: 'Services', projects: 'Projects', contact: 'Contact' };
    let index = 0;
    let locked = false;
    const isDesktop = () => window.matchMedia('(min-width: 901px)').matches;

    if (dotsWrap) {
      dotsWrap.innerHTML = panels
        .map((p, i) => `<button data-label="${pretty[p.dataset.panel] || p.dataset.panel}" aria-label="Go to ${pretty[p.dataset.panel] || ''}"${i === 0 ? ' class="active"' : ''}></button>`)
        .join('');
    }
    const dots = dotsWrap ? qsa('button', dotsWrap) : [];

    function update() {
      dots.forEach((d, i) => d.classList.toggle('active', i === index));
      qsa('[data-nav]').forEach((a) => {
        if (a.dataset.nav === labels[index]) a.setAttribute('aria-current', 'page');
        else a.removeAttribute('aria-current');
      });
      const header = qs('#site-header');
      if (header) header.classList.toggle('scrolled', index !== 0);
    }
    function goTo(i, smooth = true) {
      index = Math.max(0, Math.min(panels.length - 1, i));
      if (isDesktop()) {
        track.style.transition = smooth ? '' : 'none';
        track.style.transform = `translateX(-${index * 100}vw)`;
      } else {
        panels[index].scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
      }
      update();
    }

    // Only intercept anchor nav triggers (a[data-panel]); panel <section>s also
    // carry data-panel, so matching them would swallow real links inside panels.
    document.addEventListener('click', (e) => {
      const t = e.target.closest('a[data-panel]');
      if (!t) return;
      const i = labels.indexOf(t.dataset.panel);
      if (i < 0) return;
      e.preventDefault();
      goTo(i);
      const links = qs('#nav-links');
      const burger = qs('#hamburger');
      const backdrop = qs('.nav-backdrop');
      if (links && links.classList.contains('active')) {
        links.classList.remove('active');
        if (backdrop) backdrop.classList.remove('active');
        if (burger) { burger.classList.remove('active'); burger.setAttribute('aria-expanded', 'false'); }
        document.body.style.overflow = isDesktop() ? 'hidden' : '';
      }
    });
    dots.forEach((d, i) => d.addEventListener('click', () => goTo(i)));

    window.addEventListener('keydown', (e) => {
      if (!isDesktop()) return;
      const tag = document.activeElement ? document.activeElement.tagName : '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); goTo(index + 1); }
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); goTo(index - 1); }
    });

    // Wheel → horizontal navigation (debounced); respect internal panel scroll
    window.addEventListener('wheel', (e) => {
      if (!isDesktop() || locked) return;
      const delta = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      if (Math.abs(delta) < 24) return;
      const inner = panels[index].querySelector('.panel-inner');
      if (inner && inner.scrollHeight > inner.clientHeight + 4) {
        const atTop = inner.scrollTop <= 0;
        const atBottom = inner.scrollTop + inner.clientHeight >= inner.scrollHeight - 1;
        if (delta > 0 ? !atBottom : !atTop) return; // let the panel scroll internally first
      }
      locked = true;
      setTimeout(() => { locked = false; }, 950);
      goTo(index + (delta > 0 ? 1 : -1));
    }, { passive: true });

    function applyMode() {
      document.body.classList.toggle('spa-on', isDesktop());
      if (isDesktop()) {
        track.style.transition = 'none';
        track.style.transform = `translateX(-${index * 100}vw)`;
        requestAnimationFrame(() => { track.style.transition = ''; });
      } else {
        track.style.transform = 'none';
      }
    }
    applyMode();
    window.addEventListener('resize', applyMode);

    const hash = (location.hash || '').replace('#', '');
    if (hash && labels.includes(hash)) goTo(labels.indexOf(hash), false);
    update();
  }

  function initAll() {
    initHeader();
    initNav();
    initHero();
    initReveal();
    initCounters();
    initFilters();
    initLightbox();
    initContactForm();
    initYear();
    initSpa();
    initProjectCarousels();
  }

  // Content is injected asynchronously; run after it lands.
  document.addEventListener('site:rendered', initAll);
})();
