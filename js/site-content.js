/* Formax Builders — hydrate static pages from /api/content (SQLite-backed CMS).
   Renders the shared header + footer on every page and the per-page content
   based on <body data-page="…">. Falls back to the static seed JSON when the
   API is unavailable (e.g. fully static hosting). */
(function () {
  const esc = (value) =>
    String(value == null ? '' : value).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));

  const qs = (sel, root = document) => root.querySelector(sel);
  const setHtml = (sel, html) => { const n = qs(sel); if (n) n.innerHTML = html; };

  const img = (src, alt, cls, w, h) =>
    src ? `<img src="${esc(src)}" alt="${esc(alt || '')}" loading="lazy"${cls ? ` class="${cls}"` : ''}${w ? ` width="${w}" height="${h || w}"` : ''}>` : '';

  const accentLast = (text) => {
    const words = String(text || '').trim().split(' ');
    if (words.length < 2) return esc(text);
    const last = words.pop();
    return `${esc(words.join(' '))} <span class="accent">${esc(last)}</span>`;
  };

  const initials = (name) =>
    String(name || '')
      .split(' ')
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase();

  const tel = (value) => String(value || '').replace(/[^\d+]/g, '');
  // Attribute-based so it composes with existing class lists without clashing.
  const reveal = (delay) => ` data-reveal${delay ? ` data-delay="${delay}"` : ''}`;

  async function fetchContent() {
    try {
      const res = await fetch('/api/content', { cache: 'no-store' });
      if (res.ok) return (await res.json()).content;
    } catch (_) { /* fall through to static seed */ }
    const fallback = await fetch('data/site-content.json', { cache: 'no-store' });
    if (!fallback.ok) throw new Error('Unable to load site content');
    return fallback.json();
  }

  /* ---------------- Icons ---------------- */
  const ICONS = {
    arrow: '<svg viewBox="0 0 24 24" fill="none"><path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    instagram: '<svg viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="2"/><circle cx="17.5" cy="6.5" r="1.2" fill="currentColor"/></svg>',
    facebook: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 9h3V6h-3c-2.2 0-4 1.8-4 4v2H7v3h3v7h3v-7h3l1-3h-4v-2c0-.6.4-1 1-1z"/></svg>',
    linkedin: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6.94 7A1.94 1.94 0 1 1 5 5.06 1.94 1.94 0 0 1 6.94 7zM5.5 9h2.88v9.5H5.5zm5 0h2.76v1.3h.04a3.03 3.03 0 0 1 2.72-1.5c2.91 0 3.45 1.92 3.45 4.41v5.29h-2.88v-4.69c0-1.12 0-2.56-1.56-2.56s-1.8 1.22-1.8 2.48v4.77H10.5z"/></svg>',
    youtube: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M23 12s0-3.2-.4-4.7a2.5 2.5 0 0 0-1.76-1.77C19.27 5.1 12 5.1 12 5.1s-7.27 0-8.84.43A2.5 2.5 0 0 0 1.4 7.3 26.1 26.1 0 0 0 1 12a26.1 26.1 0 0 0 .4 4.7 2.5 2.5 0 0 0 1.76 1.77C4.73 18.9 12 18.9 12 18.9s7.27 0 8.84-.43A2.5 2.5 0 0 0 22.6 16.7 26.1 26.1 0 0 0 23 12zM9.75 15.27V8.73L15.5 12z"/></svg>',
    whatsapp: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.5 15.3L2 22l4.8-1.5A10 10 0 1 0 12 2zm5.8 14.2c-.2.7-1.4 1.3-2 1.4-.5.1-1.1.1-1.8-.1-.4-.1-1-.3-1.6-.6-2.9-1.2-4.7-4.1-4.9-4.3-.1-.2-1.1-1.5-1.1-2.8s.7-2 .9-2.2c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 1.9c.1.2.1.4 0 .5l-.4.6c-.1.2-.3.3-.1.6.1.3.6 1.1 1.4 1.7 1 .8 1.7 1.1 2 1.2.2.1.4.1.5-.1l.7-.8c.2-.2.3-.2.6-.1l1.8.9c.3.1.4.2.5.3.1.2.1.6-.1 1z"/></svg>',
    email: '<svg viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" stroke-width="2"/><path d="m4 7 8 6 8-6" stroke="currentColor" stroke-width="2"/></svg>',
    phone: '<svg viewBox="0 0 24 24" fill="none"><path d="M5 4h3l2 5-2.5 1.5a11 11 0 0 0 5 5L19 13l5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
    pin: '<svg viewBox="0 0 24 24" fill="none"><path d="M12 22s7-6 7-12a7 7 0 1 0-14 0c0 6 7 12 7 12z" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="10" r="2.5" stroke="currentColor" stroke-width="2"/></svg>',
  };

  /* ---------------- Custom content icons (replace emojis) ---------------- */
  const svgIcon = (inner) =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
  const ICON_SET = {
    building: svgIcon('<path d="M3 21h18"/><path d="M6 21V7l6-4 6 4v14"/><path d="M10 21v-4h4v4"/><path d="M9.5 10h.01M14.5 10h.01M9.5 13.5h.01M14.5 13.5h.01"/>'),
    leaf: svgIcon('<path d="M5 21c0-8 5-13 15-13 0 9-6 13-13 13H5z"/><path d="M5 21c2.5-5 6-8 10-9.5"/>'),
    ruler: svgIcon('<path d="M3 17 17 3l4 4L7 21z"/><path d="M7.5 6.5l2 2M11 5l1.5 1.5M5 11l1.5 1.5M14 7.5l1.5 1.5"/>'),
    sofa: svgIcon('<path d="M5 11V8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3"/><path d="M3 12a2 2 0 0 1 2 2v3h14v-3a2 2 0 0 1 2-2 2 2 0 0 0-2 2"/><path d="M3 14v3M21 14v3M7 20v-3M17 20v-3"/>'),
    bolt: svgIcon('<path d="M13 2 4 13h6l-1 9 9-12h-6l1-8z"/>'),
    drop: svgIcon('<path d="M12 3s6 5.5 6 11a6 6 0 0 1-12 0c0-5.5 6-11 6-11z"/><path d="M9.5 14a2.5 2.5 0 0 0 2.5 2.5"/>'),
    hammer: svgIcon('<path d="M14.5 5.5 19 10l-2 2-4.5-4.5z"/><path d="m12.5 7.5-9 9 2.5 2.5 9-9"/><path d="M13 3.5 17 7"/>'),
    clipboard: svgIcon('<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2"/><path d="M9 11h6M9 15h4"/>'),
    trophy: svgIcon('<path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 5H4v1a3 3 0 0 0 3 3M17 5h3v1a3 3 0 0 1-3 3"/><path d="M12 14v3M8.5 21h7M10 21l.5-4h3l.5 4"/>'),
    shield: svgIcon('<path d="M12 3 5 6v5c0 5 3 8 7 10 4-2 7-5 7-10V6z"/><path d="m9 12 2 2 4-4"/>'),
    clock: svgIcon('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>'),
    star: svgIcon('<path d="M12 3.5 14.6 9l5.9.8-4.3 4.1 1 5.9L12 17l-5.2 2.8 1-5.9L3.5 9.8 9.4 9z"/>'),
    lock: svgIcon('<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/><path d="M12 15v2"/>'),
    handshake: svgIcon('<path d="m12 8 2-2a2 2 0 0 1 3 0l3 3-5 5"/><path d="M3 11 8 6a2 2 0 0 1 3 0l3 3"/><path d="m3 11 4 4 2-2M11 15l2 2 2-2"/>'),
    sprout: svgIcon('<path d="M12 21v-9"/><path d="M12 13C9 13 6.5 11 6.5 7 10 7 12 9.5 12 13z"/><path d="M12 11c0-3.5 2.5-6 6-6 0 4-2.5 6-6 6z"/>'),
    check: svgIcon('<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-5"/>'),
  };
  const iconSvg = (name) => ICON_SET[name] || ICON_SET.check;

  /* ---------------- Header & footer ---------------- */
  const NAV = [
    ['index.html', 'home', 'Home'],
    ['about.html', 'about', 'About'],
    ['services.html', 'services', 'Services'],
    ['projects.html', 'projects', 'Projects'],
    ['contact.html', 'contact', 'Contact'],
  ];

  function brandMarkup(site) {
    if (site.logo) return `<img class="brand-logo" src="${esc(site.logo)}" alt="${esc(site.name)}">`;
    return `<img class="brand-logo" src="assets/logo-full.png" alt="${esc(site.name || 'Formax Builders')}">`;
  }

  function renderHeader(c) {
    const active = document.body.dataset.page;
    const spa = active === 'spa';
    const links = NAV.map(([href, key, label]) =>
      spa
        ? `<a href="#${key}" data-panel="${key}" data-nav="${key}">${label}</a>`
        : `<a href="${href}" data-nav="${key}"${active === key ? ' aria-current="page"' : ''}>${label}</a>`
    ).join('');
    const brandHref = spa ? '#home' : 'index.html';
    const ctaHref = spa ? '#contact' : 'contact.html';
    setHtml('#site-header', `
      <div class="container nav">
        <a class="brand" href="${brandHref}"${spa ? ' data-panel="home"' : ''} aria-label="${esc(c.site.name)} home">${brandMarkup(c.site)}</a>
        <button class="hamburger" id="hamburger" aria-label="Open menu" aria-expanded="false">
          <span></span><span></span><span></span>
        </button>
        <nav class="nav-links" id="nav-links" aria-label="Primary">
          ${links}
          <a class="menu-cta btn btn--primary" href="${ctaHref}"${spa ? ' data-panel="contact"' : ''}>Get a Quote ${ICONS.arrow}</a>
        </nav>
      </div>`);
  }

  function socialLinks(site) {
    const out = [];
    if (site.instagram) out.push(`<a href="${esc(site.instagram)}" target="_blank" rel="noopener" aria-label="Instagram">${ICONS.instagram}</a>`);
    if (site.facebook) out.push(`<a href="${esc(site.facebook)}" target="_blank" rel="noopener" aria-label="Facebook">${ICONS.facebook}</a>`);
    if (site.linkedin) out.push(`<a href="${esc(site.linkedin)}" target="_blank" rel="noopener" aria-label="LinkedIn">${ICONS.linkedin}</a>`);
    if (site.youtube) out.push(`<a href="${esc(site.youtube)}" target="_blank" rel="noopener" aria-label="YouTube">${ICONS.youtube}</a>`);
    return out.join('');
  }

  function renderFooter(c) {
    const year = new Date().getFullYear();
    setHtml('#site-footer', `
      <div class="container footer-min">
        <div class="socials">${socialLinks(c.site)}</div>
        <span class="footer-copy">© ${year} ${esc(c.site.name)}. ${esc(c.site.license || '')} · <a href="privacy.html">Privacy &amp; Terms</a></span>
      </div>`);
  }

  function renderWhatsApp(c) {
    const node = qs('#wa-float');
    if (!node) return;
    if (!c.site.whatsapp) { node.remove(); return; }
    node.href = `https://wa.me/${esc(tel(c.site.whatsapp))}`;
    node.innerHTML = ICONS.whatsapp;
    node.setAttribute('aria-label', 'Chat on WhatsApp');
    node.target = '_blank';
    node.rel = 'noopener';
  }

  /* ---------------- Reusable blocks ---------------- */
  function pageHero(page, crumbLabel) {
    return `
      <div class="page-hero">
        <div class="container">
          <p class="breadcrumb"><a href="index.html">Home</a> / ${esc(crumbLabel)}</p>
          <span class="eyebrow">${esc(page.label)}</span>
          <h1>${esc(page.title)}</h1>
          ${page.body ? `<p>${esc(page.body)}</p>` : ''}
        </div>
      </div>`;
  }

  function serviceCard(s, i) {
    const feats = (s.features || []).map((f) => `<span>${esc(f)}</span>`).join('');
    return `
      <article${reveal((i % 3) + 1)}>
        <div class="service-card">
          <div class="ic">${iconSvg(s.icon)}</div>
          <h3>${esc(s.title)}</h3>
          <p>${esc(s.details || s.summary)}</p>
          ${feats ? `<div class="feats">${feats}</div>` : ''}
        </div>
      </article>`;
  }

  // Construction-photo service card; details/features reveal on hover.
  function serviceBox(s, i, compact) {
    const feats = !compact && (s.features || []).length
      ? `<ul class="sb-feats">${s.features.slice(0, 4).map((f) => `<li>${esc(f)}</li>`).join('')}</ul>` : '';
    return `
      <article class="svc-card${compact ? ' svc-card--sm' : ''}"${reveal((i % 3) + 1)}>
        <div class="svc-bg" style="background-image:url('${esc(s.image)}')"></div>
        <div class="svc-content">
          <span class="svc-no">${String(i + 1).padStart(2, '0')}</span>
          <div class="ic">${iconSvg(s.icon)}</div>
          <h3>${esc(s.title)}</h3>
          <p>${esc(compact ? s.summary : (s.details || s.summary))}</p>
          ${feats}
        </div>
      </article>`;
  }

  function projectCard(p, i, featuredFirst) {
    const featured = featuredFirst && i === 0 ? ' is-featured' : '';
    return `
      <a class="project-card${featured}" href="project.html?slug=${encodeURIComponent(p.slug)}" data-category="${esc(p.category)}">
        ${img(p.image, p.title)}
        <div class="pc-overlay">
          <span class="cat">${esc(p.category)}</span>
          <h3>${esc(p.title)}</h3>
          <div class="meta"><span>${esc(p.location)}</span><span>${esc(p.year)}</span></div>
          <span class="disc">Discover ${ICONS.arrow}</span>
        </div>
      </a>`;
  }

  // Shared editorial project card used by the landing carousel and projects.html.
  function featCard(p, i) {
    return `
      <a class="feat-card" href="project.html?slug=${encodeURIComponent(p.slug)}">
        <div class="feat-img">${img(p.image, p.title)}<span class="feat-no">${String(i + 1).padStart(2, '0')}</span></div>
        <div class="feat-meta">
          <h3>${esc(p.title)}</h3>
          <div class="feat-sub"><span>${esc(p.category)}</span><span>${esc(p.year)}</span></div>
          <span class="feat-go">View project ${ICONS.arrow}</span>
        </div>
      </a>`;
  }

  // Raw Wall portrait card carousel (auto-playing) — shared by landing + projects page.
  function projectCarousel(projects, autoplay) {
    return `
      <div class="pcar-wrap"${autoplay ? ' data-autoplay' : ''}>
        <div class="pcar"><div class="pcar-track">${projects.map((p) => `
          <a class="rw-card" href="project.html?slug=${encodeURIComponent(p.slug)}">
            <div class="rw-ph">
              ${img(p.image, p.title)}
              <div class="rw-cap"><span class="cat">${esc(p.category)}</span><h3>${esc(p.title)}</h3></div>
            </div>
          </a>`).join('')}</div></div>
        <div class="pcar-dots"></div>
      </div>`;
  }

  function testimonialCard(t, i) {
    const av = t.avatar ? `<img src="${esc(t.avatar)}" alt="${esc(t.name)}">` : esc(initials(t.name));
    return `
      <article${reveal((i % 3) + 1)}>
        <div class="testi">
          <span class="quote-mark">“</span>
          <p>${esc(t.quote)}</p>
          <div class="testi-author">
            <span class="av">${av}</span>
            <div><h4>${esc(t.name)}</h4><span>${esc(t.role)}</span></div>
          </div>
        </div>
      </article>`;
  }

  /* ---------------- Page renderers ---------------- */
  function heroHtml(c, spa) {
    const h = c.home.hero;
    const words = String(h.headline || '').trim().split(' ');
    const last = words.pop();
    const headline = `${esc(words.join(' '))} <em>${esc(last)}</em>`;
    const primary = spa
      ? `<a class="btn btn--outline" href="#contact" data-panel="contact">${esc(h.primaryCta.label)} ${ICONS.arrow}</a>`
      : `<a class="btn btn--outline" href="${esc(h.primaryCta.href)}">${esc(h.primaryCta.label)} ${ICONS.arrow}</a>`;
    const secondary = spa
      ? `<a class="text-link" href="#projects" data-panel="projects">${esc(h.secondaryCta.label)} ${ICONS.arrow}</a>`
      : `<a class="text-link" href="${esc(h.secondaryCta.href)}">${esc(h.secondaryCta.label)} ${ICONS.arrow}</a>`;
    return `
      <div class="hero-inner container${h.image ? ' hero-inner--split' : ''}">
        <div class="hero-main">
          <div class="hero-top">
            <span>Est. ${esc(c.site.established || '2017')}</span>
            <span class="hero-rule"></span>
            <span>${esc(c.site.license || h.eyebrow || 'Licensed &amp; Insured')}</span>
          </div>
          <h1 class="hero-display">${headline}</h1>
          <div class="hero-row">
            <p class="hero-sub">${esc(h.body)}</p>
            <div class="hero-cta">${primary}${secondary}</div>
          </div>
          <div class="hero-index">
            ${(c.home.stats || []).slice(0, 3).map((s) => `<div class="hero-idx"><span class="iv">${esc(s.number)}${esc(s.suffix || '')}</span><span class="il">${esc(s.label)}</span></div>`).join('')}
          </div>
        </div>
        ${h.image ? `<div class="hero-media"><div class="hero-media-badge">${esc(c.site.established || '2017')}</div><img src="${esc(h.image)}" alt="${esc(c.site.name)}" width="1100" height="825" fetchpriority="high" loading="eager"></div>` : ''}
      </div>`;
  }

  function renderHome(c) {
    setHtml('#hero', heroHtml(c));

    const a = c.home.about;
    setHtml('#home-about', `
      <div class="container about-grid">
        <div class="about-copy"${reveal()}>
          <span class="eyebrow">${esc(a.label)}</span>
          <h2 style="font-size:clamp(1.5rem,3vw,2.3rem);margin:0.8rem 0 1rem">${esc(a.title)}</h2>
          ${(a.paragraphs || []).map((p) => `<p>${esc(p)}</p>`).join('')}
          <div class="about-statbar">
            ${(c.home.stats || []).map((s) => `<div><div class="num">${esc(s.number)}${esc(s.suffix || '')}</div><div class="lbl">${esc(s.label)}</div></div>`).join('')}
          </div>
          <div class="about-highlights">
            ${(a.highlights || []).map((hl) => `<div class="hl"><div class="ic">${iconSvg(hl.icon)}</div><div><h4>${esc(hl.title)}</h4><p>${esc(hl.body)}</p></div></div>`).join('')}
          </div>
          <a class="btn btn--primary" href="about.html">More About Us ${ICONS.arrow}</a>
        </div>
        <div class="about-media"${reveal(1)}>
          ${img(a.image, a.title)}
          <div class="about-badge"><div class="n">${esc(a.badgeNumber)}</div><div class="t">${esc(a.badgeText)}</div></div>
        </div>
      </div>`);

    const si = c.home.servicesIntro;
    setHtml('#home-services', `
      <div class="container">
        <div class="section-head center"${reveal()}>
          <span class="eyebrow">${esc(si.label)}</span><h2>${esc(si.title)}</h2><p>${esc(si.body)}</p>
        </div>
        <div class="services-grid">${(c.services || []).slice(0, 6).map(serviceCard).join('')}</div>
        <div style="text-align:center;margin-top:2.5rem"><a class="btn btn--outline" href="services.html">All Services ${ICONS.arrow}</a></div>
      </div>`);

    const pi = c.home.projectsIntro;
    const featured = (c.projects || []).filter((p) => p.featured).concat((c.projects || []).filter((p) => !p.featured)).slice(0, 5);
    setHtml('#home-projects', `
      <div class="container">
        <div class="section-head"${reveal()}>
          <span class="eyebrow">${esc(pi.label)}</span><h2>${esc(pi.title)}</h2><p>${esc(pi.body)}</p>
        </div>
        <div class="projects-grid">${featured.map((p, i) => projectCard(p, i, true)).join('')}</div>
        <div style="text-align:center;margin-top:2.5rem"><a class="btn btn--outline" href="projects.html">View All Projects ${ICONS.arrow}</a></div>
      </div>`);

    const certs = c.certifications || [];
    setHtml('#home-certs', `
      <p class="label">Certified · Licensed · Insured · Award-winning</p>
      <div class="marquee">
        <div class="marquee-track">
          ${[...certs, ...certs].map((ct) => `<span class="marquee-item"><span class="ic">${iconSvg(ct.icon)}</span>${esc(ct.title)}</span>`).join('')}
        </div>
      </div>`);

    setHtml('#home-testi', `
      <div class="container">
        <div class="section-head center"${reveal()}>
          <span class="eyebrow">Testimonials</span><h2>What Our Clients Say</h2>
          <p>Real experiences from partners who trusted us with their projects.</p>
        </div>
        <div class="testi-grid">${(c.testimonials || []).map(testimonialCard).join('')}</div>
      </div>`);

    const cta = c.home.ctaBanner;
    setHtml('#home-cta', `
      <div class="container">
        <div class="cta-banner"${reveal()}>
          <span class="eyebrow" style="color:var(--gold)">${esc(cta.label)}</span>
          <h2>${esc(cta.title)}</h2>
          <p>${esc(cta.body)}</p>
          <a class="btn btn--primary" href="${esc(cta.ctaHref)}">${esc(cta.ctaLabel)} ${ICONS.arrow}</a>
        </div>
      </div>`);
  }

  function renderAbout(c) {
    setHtml('#page-hero', pageHero(c.pages.about, 'About'));
    const ab = c.about;
    setHtml('#about-story', `
      <div class="container about-grid">
        <div${reveal()}>
          <span class="eyebrow">Our Story</span>
          <h2 style="font-size:clamp(1.5rem,3vw,2.3rem);margin:0.8rem 0 1rem">${esc(c.pages.about.title)}</h2>
          ${(ab.story || []).map((p) => `<p style="color:var(--text-muted);margin-bottom:1.1rem">${esc(p)}</p>`).join('')}
        </div>
        <div class="about-media"${reveal(1)}>${img(c.home.about.image, c.site.name)}
          <div class="about-badge"><div class="n">${esc(c.site.established)}</div><div class="t">Since</div></div>
        </div>
      </div>`);

    setHtml('#about-mv', `
      <div class="container">
        <div class="mv-grid">
          <div class="mv-card"${reveal()}><span class="eyebrow">${esc(ab.mission.label)}</span><h3>${esc(ab.mission.title)}</h3><p>${esc(ab.mission.body)}</p></div>
          <div class="mv-card dark"${reveal(1)}><span class="eyebrow">${esc(ab.vision.label)}</span><h3>${esc(ab.vision.title)}</h3><p>${esc(ab.vision.body)}</p></div>
        </div>
      </div>`);

    setHtml('#about-values', `
      <div class="container">
        <div class="section-head center"${reveal()}><span class="eyebrow">What We Stand For</span><h2>Our Values</h2></div>
        <div class="value-grid">${(ab.values || []).map((v, i) => `<div class="value"${reveal((i % 4) + 1)}><div class="ic">${iconSvg(v.icon)}</div><h4>${esc(v.title)}</h4><p>${esc(v.body)}</p></div>`).join('')}</div>
      </div>`);

    setHtml('#about-process', `
      <div class="container">
        <div class="section-head center"${reveal()}><span class="eyebrow">How We Work</span><h2>Our Process</h2></div>
        <div class="process">${(ab.process || []).map((s, i) => `<div class="process-step"${reveal((i % 4) + 1)}><div class="n">${esc(s.number)}</div><h4>${esc(s.title)}</h4><p>${esc(s.body)}</p></div>`).join('')}</div>
      </div>`);

    setHtml('#about-team', `
      <div class="container">
        <div class="section-head center"${reveal()}><span class="eyebrow">The People</span><h2>Meet the Team</h2></div>
        <div class="team-grid">${(ab.team || []).map((m, i) => `<div class="team-card"${reveal((i % 4) + 1)}>${img(m.image, m.name)}<div class="info"><h4>${esc(m.name)}</h4><span>${esc(m.role)}</span></div></div>`).join('')}</div>
      </div>`);

    setHtml('#about-certs', `
      <div class="container">
        <div class="section-head center"${reveal()}><span class="eyebrow">Trust &amp; Compliance</span><h2>Certifications &amp; Awards</h2></div>
        <div class="cert-grid">${(c.certifications || []).map((ct) => `<div class="cert"><span class="ic">${iconSvg(ct.icon)}</span><div><h4>${esc(ct.title)}</h4><p>${esc(ct.body)}</p></div></div>`).join('')}</div>
      </div>`);
  }

  function renderServices(c) {
    setHtml('#page-hero', pageHero(c.pages.services, 'Services'));
    setHtml('#services-list', `
      <div class="container">
        <div class="svc-grid">${(c.services || []).map((s, i) => serviceBox(s, i, false)).join('')}</div>
      </div>`);

    const styles = c.designStyles || [];
    if (styles.length) {
      setHtml('#services-styles', `
        <div class="container">
          <div class="section-head center"${reveal()}>
            <span class="eyebrow">Design Styles</span><h2 class="panel-title">Aesthetics We Build</h2>
            <p>Tell us the look you love — we build across these signature design languages.</p>
          </div>
          <div class="style-grid">
            ${styles.map((d, i) => `
              <article class="style-box"${reveal((i % 3) + 1)}>
                <div class="style-img">${img(d.image, d.name)}<span class="style-no">${String(i + 1).padStart(2, '0')}</span></div>
                <div class="style-body">
                  <h3>${esc(d.name)}</h3>
                  ${d.tagline ? `<span class="style-tag">${esc(d.tagline)}</span>` : ''}
                  <p>${esc(d.body)}</p>
                </div>
              </article>`).join('')}
          </div>
        </div>`);
    }

    setHtml('#services-cta', `
      <div class="container"><div class="cta-banner"${reveal()}>
        <h2>${esc(c.home.ctaBanner.title)}</h2><p>${esc(c.home.ctaBanner.body)}</p>
        <a class="btn btn--primary" href="contact.html">${esc(c.home.ctaBanner.ctaLabel)} ${ICONS.arrow}</a>
      </div></div>`);
  }

  function renderProjects(c) {
    // Exact Raw Wall Studio projects.html model: two-tone "OUR PROJECTS" title,
    // a 3-up portrait carousel with the title overlaid at the bottom, and dots.
    const title = (c.pages.projects && c.pages.projects.title) || 'Our Projects';
    const words = title.trim().split(' ');
    const first = words.shift();
    setHtml('#projects-list', `
      <div class="container">
        <h1 class="rw-title"><b>${esc(first)}</b> ${esc(words.join(' '))}</h1>
        ${projectCarousel(c.projects || [], true)}
      </div>`);
  }

  function renderProjectDetail(c) {
    const slug = new URLSearchParams(location.search).get('slug');
    const list = c.projects || [];
    const idx = list.findIndex((p) => p.slug === slug);
    const p = list[idx];
    if (!p) {
      setHtml('#project-detail', `<div class="page-hero"><div class="container"><h1>Project not found</h1><p><a class="text-link" href="projects.html">Back to projects ${ICONS.arrow}</a></p></div></div>`);
      document.title = 'Project not found · ' + c.site.name;
      return;
    }
    document.title = `${p.title} · ${c.site.name}`;
    const gallery = [p.image, ...(p.gallery || [])].filter(Boolean);
    const prev = list[(idx - 1 + list.length) % list.length];
    const next = list[(idx + 1) % list.length];
    setHtml('#project-detail', `
      <div class="page-hero">
        <div class="container">
          <p class="breadcrumb"><a href="index.html">Home</a> / <a href="projects.html">Projects</a> / ${esc(p.title)}</p>
          <span class="eyebrow">${esc(p.category)}</span>
          <h1>${esc(p.title)}</h1>
        </div>
      </div>
      <section class="section">
        <div class="container">
          <div class="project-detail-meta">
            ${[['Category', p.category], ['Location', p.location], ['Year', p.year], ['Value', p.value]]
              .filter(([, v]) => v).map(([k, v]) => `<div><div class="k">${esc(k)}</div><div class="v">${esc(v)}</div></div>`).join('')}
          </div>
          <div style="max-width:760px">
            <p style="font-size:1.15rem;color:var(--text)">${esc(p.summary)}</p>
            ${p.details ? `<p style="color:var(--text-muted);margin-top:1rem">${esc(p.details)}</p>` : ''}
          </div>
          ${(p.stats && p.stats.length) ? `<div class="project-detail-meta" style="border-bottom:none">${p.stats.map((s) => `<div><div class="v" style="color:var(--gold-deep)">${esc(s.number)}</div><div class="k">${esc(s.label)}</div></div>`).join('')}</div>` : ''}
          <div class="gallery" id="project-gallery">${gallery.map((g) => `<img src="${esc(g)}" alt="${esc(p.title)}" loading="lazy" data-zoom>`).join('')}</div>
          <div class="project-nav">
            <a class="text-link" href="project.html?slug=${encodeURIComponent(prev.slug)}">← ${esc(prev.title)}</a>
            <a class="text-link" href="project.html?slug=${encodeURIComponent(next.slug)}">${esc(next.title)} →</a>
          </div>
        </div>
      </section>`);
  }

  function renderContact(c) {
    setHtml('#page-hero', pageHero(c.pages.contact, 'Contact'));
    const ct = c.contact;
    const contactRows = [
      ct.officeAddress && { ic: ICONS.pin, k: ct.officeTitle, v: esc(ct.officeAddress).replace(/\n/g, '<br>') },
      ...(ct.phones || []).map((ph) => ({ ic: ICONS.phone, k: ct.phoneTitle, v: `<a href="tel:${esc(tel(ph))}">${esc(ph)}</a>` })),
      ...(ct.emails || []).map((em) => ({ ic: ICONS.email, k: ct.emailTitle, v: `<a href="mailto:${esc(em)}">${esc(em)}</a>` })),
    ].filter(Boolean);

    setHtml('#contact-body', `
      <div class="container contact-grid">
        <div${reveal()}>
          <span class="eyebrow">${esc(ct.formTitle)}</span>
          <h2 style="font-size:clamp(1.4rem,3vw,2rem);margin:0.7rem 0 0.4rem">Request a Free Quote</h2>
          <p style="color:var(--text-muted);margin-bottom:1.8rem">${esc(ct.formBody)}</p>
          <form id="contact-form" novalidate>
            <div class="field"><label for="cf-name">Full Name *</label><input id="cf-name" name="name" required placeholder="Your full name"></div>
            <div class="field"><label for="cf-email">Email *</label><input id="cf-email" name="email" type="email" required placeholder="you@email.com"></div>
            <div class="field"><label for="cf-phone">Phone</label><input id="cf-phone" name="phone" placeholder="+91 …"></div>
            <div class="field"><label for="cf-subject">Project Type</label>
              <select id="cf-subject" name="subject">
                <option value="">Select…</option>
                <option>Residential</option><option>Commercial</option><option>Industrial</option>
                <option>Renovation</option><option>Interior Design</option><option>Other</option>
              </select>
            </div>
            <div class="field"><label for="cf-message">Project Details *</label><textarea id="cf-message" name="message" required placeholder="Tell us about your project, timeline and budget…"></textarea></div>
            <input class="hp" type="text" name="company" tabindex="-1" autocomplete="off" aria-hidden="true">
            <div class="cf-actions"><button class="btn btn--primary" type="submit" id="cf-submit"><span>Send Request</span> ${ICONS.arrow}</button> </div>
            <div class="form-note" id="cf-note" role="status"></div>
          </form>
        </div>
        <div${reveal(1)}>
          <div class="contact-info-card">
            <h3>Get in touch</h3>
            ${contactRows.map((r) => `<div class="contact-item"><span class="ic">${r.ic}</span><div><div class="k">${esc(r.k)}</div><div class="v">${r.v}</div></div></div>`).join('')}
            <div class="contact-item"><span class="ic">${ICONS.whatsapp}</span><div><div class="k">WhatsApp</div><div class="v"><a href="https://wa.me/${esc(tel(c.site.whatsapp))}" target="_blank" rel="noopener">Chat with us</a></div></div></div>
          </div>
          ${(ct.hours && ct.hours.length) ? `<div class="contact-info-card" style="margin-top:1.5rem;background:var(--bg-alt);color:var(--text)"><h3 style="font-size:1.2rem">${esc(ct.hoursTitle)}</h3>${ct.hours.map((hr) => `<div class="contact-item" style="border-color:var(--line)"><div style="display:flex;justify-content:space-between;width:100%"><span>${esc(hr.days)}</span><strong>${esc(hr.time)}</strong></div></div>`).join('')}</div>` : ''}
        </div>
      </div>
      ${ct.mapEmbed ? `<div class="container"><div class="map-wrap" style="margin-top:3rem">${ct.mapEmbed}</div></div>` : ''}`);
  }

  function renderPrivacy(c) {
    const pv = c.privacy;
    setHtml('#page-hero', pageHero({ heroImage: c.pages.about.heroImage, label: 'Legal', title: 'Privacy & Terms', body: '' }, 'Privacy'));
    const sec = (title, body) => body ? `<h3 style="margin:2rem 0 0.6rem">${esc(title)}</h3><p style="color:var(--text-muted);white-space:pre-line">${esc(body)}</p>` : '';
    setHtml('#privacy-body', `
      <div class="container" style="max-width:780px">
        ${pv.policyLastUpdated ? `<p style="color:var(--text-muted)">Last updated: ${esc(pv.policyLastUpdated)}</p>` : ''}
        ${pv.policyIntro ? `<p style="font-size:1.1rem;margin-top:1rem">${esc(pv.policyIntro)}</p>` : ''}
        ${sec('Data We Collect', pv.dataWeCollect)}
        ${sec('How We Use Your Data', pv.howWeUse)}
        ${sec('Cookies & Tracking', pv.cookies)}
        ${sec('Your Data Rights', pv.yourRights)}
        ${sec('Changes to This Policy', pv.changes)}
        <p style="margin-top:2rem">Questions? Email <a class="text-link" href="mailto:${esc(c.site.email)}">${esc(c.site.email)}</a></p>
      </div>`);
  }

  /* ---------------- Single-page horizontal app (desktop) ---------------- */
  function renderSpa(c) {
    setHtml('#panel-home', heroHtml(c, true));

    const a = c.home.about;
    setHtml('#panel-about', `
      <div class="panel-inner">
        <div class="container about-grid">
          <div class="panel-card">
            <span class="eyebrow">${esc(a.label)}</span>
            <h2 class="panel-title">${esc(a.title)}</h2>
            ${(a.paragraphs || []).slice(0, 1).map((p) => `<p style="color:var(--text-muted)">${esc(p)}</p>`).join('')}
            <div class="about-statbar">${(c.home.stats || []).map((s) => `<div><div class="num">${esc(s.number)}${esc(s.suffix || '')}</div><div class="lbl">${esc(s.label)}</div></div>`).join('')}</div>
            <a class="btn btn--primary" href="about.html">Full Story ${ICONS.arrow}</a>
          </div>
          <div class="about-media">${img(a.image, a.title)}<div class="about-badge"><div class="n">${esc(a.badgeNumber)}</div><div class="t">${esc(a.badgeText)}</div></div></div>
        </div>
      </div>`);

    const si = c.home.servicesIntro;
    setHtml('#panel-services', `
      <div class="panel-inner">
        <div class="container">
          <div class="section-head center"><span class="eyebrow">${esc(si.label)}</span><h2 class="panel-title">${esc(si.title)}</h2></div>
          <div class="svc-grid svc-grid--compact">${(c.services || []).map((s, i) => serviceBox(s, i, true)).join('')}</div>
          <div class="panel-foot"><a class="btn btn--outline" href="services.html">Service details ${ICONS.arrow}</a></div>
        </div>
      </div>`);

    const pi = c.home.projectsIntro;
    const feat = (c.projects || []).filter((p) => p.featured).concat((c.projects || []).filter((p) => !p.featured));
    setHtml('#panel-projects', `
      <div class="panel-inner">
        <div class="container">
          <div class="section-head"><span class="eyebrow">${esc(pi.label)}</span><h2 class="panel-title">${esc(pi.title)}</h2></div>
          ${projectCarousel(feat, true)}
          <div class="panel-foot"><a class="btn btn--outline" href="projects.html">All projects ${ICONS.arrow}</a></div>
        </div>
      </div>`);

    const ct = c.contact;
    setHtml('#panel-contact', `
      <div class="panel-inner panel-contact">
        <div class="container contact-grid">
          <div class="panel-card">
            <span class="eyebrow">${esc(ct.formTitle)}</span>
            <h2 class="panel-title">Request a Free Quote</h2>
            <form id="contact-form" novalidate>
              <div class="cf-row">
                <div class="field"><label for="cf-name">Name *</label><input id="cf-name" name="name" required></div>
                <div class="field"><label for="cf-email">Email *</label><input id="cf-email" name="email" type="email" required></div>
              </div>
              <div class="cf-row">
                <div class="field"><label for="cf-phone">Phone</label><input id="cf-phone" name="phone"></div>
                <div class="field"><label for="cf-subject">Project Type</label><select id="cf-subject" name="subject"><option value="">Select…</option><option>Residential</option><option>Commercial</option><option>Industrial</option><option>Renovation</option><option>Other</option></select></div>
              </div>
              <div class="field"><label for="cf-message">Project Details *</label><textarea id="cf-message" name="message" required></textarea></div>
              <input class="hp" type="text" name="company" tabindex="-1" autocomplete="off" aria-hidden="true">
              <div class="cf-actions"><button class="btn btn--primary" type="submit" id="cf-submit"><span>Send Request</span> ${ICONS.arrow}</button> </div>
              <div class="form-note" id="cf-note" role="status"></div>
            </form>
          </div>
          <div class="contact-info-card">
            <h3>Get in touch</h3>
            ${ct.officeAddress ? `<div class="contact-item"><span class="ic">${ICONS.pin}</span><div><div class="k">${esc(ct.officeTitle)}</div><div class="v">${esc(ct.officeAddress).replace(/\n/g, '<br>')}</div></div></div>` : ''}
            ${(ct.phones || []).map((ph) => `<div class="contact-item"><span class="ic">${ICONS.phone}</span><div><div class="k">${esc(ct.phoneTitle)}</div><div class="v"><a href="tel:${esc(tel(ph))}">${esc(ph)}</a></div></div></div>`).join('')}
            ${(ct.emails || []).map((em) => `<div class="contact-item"><span class="ic">${ICONS.email}</span><div><div class="k">${esc(ct.emailTitle)}</div><div class="v"><a href="mailto:${esc(em)}">${esc(em)}</a></div></div></div>`).join('')}
            <div class="contact-socials">${socialLinks(c.site)}</div>
            <p class="panel-copy">© ${new Date().getFullYear()} ${esc(c.site.name)} · ${esc(c.site.license || '')}</p>
          </div>
        </div>
      </div>`);
  }

  const PAGES = {
    home: renderHome,
    spa: renderSpa,
    about: renderAbout,
    services: renderServices,
    projects: renderProjects,
    project: renderProjectDetail,
    contact: renderContact,
    privacy: renderPrivacy,
  };

  function applySeo(c) {
    const page = document.body.dataset.page;
    const titles = {
      spa: `${c.site.name} — ${c.site.tagline}`,
      home: `${c.site.name} — ${c.site.tagline}`,
      about: `About · ${c.site.name}`,
      services: `Services · ${c.site.name}`,
      projects: `Projects · ${c.site.name}`,
      contact: `Contact · ${c.site.name}`,
      privacy: `Privacy & Terms · ${c.site.name}`,
    };
    if (titles[page] && page !== 'project') document.title = titles[page];
    const desc = qs('meta[name="description"]');
    if (desc && !desc.content) desc.content = c.site.description;
  }

  async function init() {
    let content;
    try {
      content = await fetchContent();
    } catch (error) {
      setHtml('#site-header', `<div class="container nav"><a class="brand" href="index.html"><span class="brand-mark">F</span><span>Formax <b>Builders</b></span></a></div>`);
      console.error(error);
      return;
    }
    window.__formax = content;
    renderHeader(content);
    renderFooter(content);
    renderWhatsApp(content);
    applySeo(content);
    const renderer = PAGES[document.body.dataset.page];
    if (renderer) renderer(content);
    document.dispatchEvent(new CustomEvent('site:rendered', { detail: content }));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
