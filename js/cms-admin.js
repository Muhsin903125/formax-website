/* Formax Builders — CMS admin SPA.
   Loads the content document from /api/content, edits it with section tabs,
   and saves via PUT /api/content (Bearer = CMS password). The Submissions tab
   reads contact leads from /api/submissions. */
(function () {
  const SESSION_KEY = 'formaxCmsSession';
  const state = {
    activeTab: 'site',
    config: null,
    content: null,
    dirty: false,
    authenticated: false,
    token: sessionStorage.getItem(SESSION_KEY) || '',
  };

  const panel = document.getElementById('cms-panel');
  const statusEl = document.getElementById('cms-status');
  const loginEl = document.getElementById('cms-login');
  const loginForm = document.getElementById('cms-login-form');
  const passwordInput = document.getElementById('cms-password');
  const workspaceEl = document.getElementById('cms-workspace');
  const cloudinaryState = document.getElementById('cms-cloudinary-state');
  const saveButton = document.getElementById('cms-save');
  const reloadButton = document.getElementById('cms-reload');
  const logoutButton = document.getElementById('cms-logout');

  /* ---------- helpers ---------- */
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }
  const clone = (v) => JSON.parse(JSON.stringify(v));
  const pathParts = (p) => (Array.isArray(p) ? p : String(p).split('.'));

  function get(path, fallback = '') {
    let cursor = state.content;
    for (const part of pathParts(path)) {
      if (cursor == null) return fallback;
      cursor = cursor[part];
    }
    return cursor == null ? fallback : cursor;
  }
  function set(path, value) {
    const parts = pathParts(path);
    let cursor = state.content;
    parts.slice(0, -1).forEach((part) => {
      if (!cursor[part] || typeof cursor[part] !== 'object') cursor[part] = {};
      cursor = cursor[part];
    });
    cursor[parts[parts.length - 1]] = value;
    markDirty();
  }

  function setStatus(message, type) {
    statusEl.textContent = message;
    if (type === 'success' || type === 'error') showToast(message, type);
  }
  function showToast(message, type = 'info') {
    const existing = document.querySelector('.cms-toast');
    if (existing) existing.remove();
    const toast = el('div', `cms-toast cms-toast-${type}`, message);
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('cms-toast-visible'));
    const dismiss = () => {
      toast.classList.remove('cms-toast-visible');
      toast.addEventListener('transitionend', () => toast.remove(), { once: true });
    };
    toast.addEventListener('click', dismiss);
    setTimeout(dismiss, 3200);
  }
  function markDirty() { state.dirty = true; setStatus('Unsaved changes'); }

  function authHeaders() {
    return state.authenticated && state.token ? { authorization: `Bearer ${state.token}` } : {};
  }
  async function api(path, options = {}) {
    const { skipAuth, ...fetchOptions } = options;
    const response = await fetch(path, {
      ...fetchOptions,
      headers: {
        ...(fetchOptions.body && !(fetchOptions.body instanceof FormData) ? { 'content-type': 'application/json' } : {}),
        ...(skipAuth ? {} : authHeaders()),
        ...(options.headers || {}),
      },
    });
    const text = await response.text();
    const payload = text ? JSON.parse(text) : {};
    if (!response.ok) {
      const error = new Error(payload.error || 'Request failed');
      error.status = response.status;
      throw error;
    }
    return payload;
  }

  const authRequired = () => Boolean(state.config?.authRequired);

  function updateAuthUi() {
    const locked = authRequired() && !state.authenticated;
    loginEl.hidden = !locked;
    workspaceEl.hidden = locked;
    logoutButton.hidden = !authRequired() || !state.authenticated;
    saveButton.disabled = locked || !state.content;
    document.querySelectorAll('.cms-tab').forEach((tab) => { tab.disabled = locked; });
    if (locked) { panel.replaceChildren(); requestAnimationFrame(() => passwordInput.focus()); }
  }
  function clearSession(message) {
    state.authenticated = false; state.token = ''; state.content = null; state.dirty = false;
    sessionStorage.removeItem(SESSION_KEY);
    passwordInput.value = '';
    updateAuthUi();
    setStatus(message || 'Logged out');
  }
  async function verifyPassword(password) {
    await api('/api/session', { method: 'POST', skipAuth: true, body: JSON.stringify({ password }) });
    state.token = password; state.authenticated = true;
    sessionStorage.setItem(SESSION_KEY, password);
    updateAuthUi();
  }

  /* ---------- field builders ---------- */
  function sectionHead(title, body) {
    const head = el('div', 'cms-section-head');
    head.append(el('h1', '', title));
    if (body) head.append(el('p', '', body));
    return head;
  }
  function card(title, action) {
    const wrap = el('div', 'cms-card');
    const head = el('div', 'cms-card-header');
    head.append(el('h2', '', title));
    if (action) head.append(action);
    wrap.append(head);
    return wrap;
  }
  function field(label, path, options = {}) {
    const wrap = el('div', `cms-field${options.full ? ' full' : ''}`);
    const id = `f-${pathParts(path).join('-')}-${Math.random().toString(16).slice(2, 7)}`;
    const labelNode = el('label', '', label);
    labelNode.htmlFor = id;
    const input = options.multiline ? document.createElement('textarea') : document.createElement('input');
    input.id = id;
    if (!options.multiline) input.type = options.type || 'text';
    input.value = get(path, options.defaultValue || '');
    input.placeholder = options.placeholder || '';
    input.addEventListener('input', () => set(path, input.value));
    wrap.append(labelNode, input);
    return wrap;
  }
  function checkbox(label, path) {
    const wrap = el('label', 'cms-checkbox');
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = Boolean(get(path, false));
    input.addEventListener('change', () => set(path, input.checked));
    wrap.append(input, document.createTextNode(label));
    return wrap;
  }
  function listField(label, path, hint) {
    const wrap = el('div', 'cms-field full');
    const labelNode = el('label', '', `${label}${hint ? ` — ${hint}` : ' (one per line)'}`);
    const input = document.createElement('textarea');
    input.value = (get(path, []) || []).join('\n');
    input.addEventListener('input', () => {
      set(path, input.value.split('\n').map((l) => l.trim()).filter(Boolean));
    });
    wrap.append(labelNode, input);
    return wrap;
  }
  function imageField(label, path) {
    const wrap = el('div', 'cms-field full');
    const labelNode = el('label', '', label);
    const row = el('div', 'cms-image-row');
    const input = document.createElement('input');
    input.type = 'url';
    input.placeholder = 'https://… or upload';
    input.value = get(path, '');
    const preview = document.createElement('img');
    preview.className = 'cms-preview';
    preview.alt = '';
    if (input.value) preview.src = input.value;
    input.addEventListener('input', () => { set(path, input.value); preview.src = input.value; });
    row.append(input);
    if (state.config?.cloudinary?.enabled) {
      const upload = el('button', 'cms-button cms-button-secondary', 'Upload');
      upload.type = 'button';
      upload.addEventListener('click', async () => {
        upload.dataset.loading = 'true';
        try {
          const url = await pickAndUploadImage();
          if (url) { input.value = url; preview.src = url; set(path, url); }
        } catch (error) { setStatus(error.message, 'error'); }
        finally { delete upload.dataset.loading; }
      });
      row.append(upload);
    }
    wrap.append(labelNode, row, preview);
    return wrap;
  }
  function pickFiles(multiple) {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      if (multiple) input.multiple = true;
      input.addEventListener('change', () => resolve(Array.from(input.files || [])), { once: true });
      input.click();
    });
  }
  async function uploadToCloudinary(file) {
    setStatus('Uploading image…');
    const signature = await api('/api/cloudinary/signature', {
      method: 'POST', body: JSON.stringify({ folder: state.config.cloudinary.folder }),
    });
    const form = new FormData();
    form.append('file', file);
    form.append('api_key', signature.apiKey);
    form.append('timestamp', signature.timestamp);
    form.append('folder', signature.folder);
    form.append('signature', signature.signature);
    const res = await fetch(signature.uploadUrl, { method: 'POST', body: form });
    const payload = await res.json();
    if (!res.ok) throw new Error(payload.error?.message || 'Cloudinary upload failed');
    setStatus('Image uploaded', 'success');
    return payload.secure_url;
  }
  async function pickAndUploadImage() {
    const files = await pickFiles(false);
    if (!files.length) return '';
    return uploadToCloudinary(files[0]);
  }

  // Multi-image field with Cloudinary upload, thumbnails, remove, and URL paste.
  function galleryField(label, path) {
    const wrap = el('div', 'cms-field full');
    const head = el('div', 'cms-card-header');
    head.append(el('label', '', label));
    const enabled = Boolean(state.config?.cloudinary?.enabled);
    const upload = el('button', 'cms-button cms-button-secondary', enabled ? 'Upload images' : 'Cloudinary off');
    upload.type = 'button';
    upload.disabled = !enabled;
    if (enabled) {
      upload.addEventListener('click', async () => {
        upload.dataset.loading = 'true';
        try {
          const files = await pickFiles(true);
          const urls = [];
          for (const f of files) urls.push(await uploadToCloudinary(f)); // eslint-disable-line no-await-in-loop
          if (urls.length) { set(path, (get(path, []) || []).concat(urls)); render(); }
        } catch (error) { setStatus(error.message, 'error'); }
        finally { delete upload.dataset.loading; }
      });
    }
    head.append(upload);
    wrap.append(head);

    const list = el('div', 'cms-gallery');
    (get(path, []) || []).forEach((url, index) => {
      const cell = el('div', 'cms-gallery-item');
      const im = document.createElement('img');
      im.src = url; im.loading = 'lazy'; im.alt = '';
      const rm = el('button', 'cms-button cms-button-danger', '×');
      rm.type = 'button';
      rm.addEventListener('click', () => { const arr = get(path, []); arr.splice(index, 1); set(path, arr); render(); });
      cell.append(im, rm);
      list.append(cell);
    });
    wrap.append(list);

    const row = el('div', 'cms-image-row');
    const addInput = document.createElement('input');
    addInput.type = 'url';
    addInput.placeholder = '…or paste an image URL';
    const addBtn = el('button', 'cms-button cms-button-secondary', 'Add URL');
    addBtn.type = 'button';
    addBtn.addEventListener('click', () => {
      const v = addInput.value.trim();
      if (v) { set(path, (get(path, []) || []).concat(v)); render(); }
    });
    row.append(addInput, addBtn);
    wrap.append(row);
    return wrap;
  }
  function grid(children) {
    const node = el('div', 'cms-grid');
    children.forEach((c) => c && node.append(c));
    return node;
  }
  function collection(title, path, defaults, renderItem) {
    const add = el('button', 'cms-button cms-button-secondary', '+ Add');
    add.type = 'button';
    add.addEventListener('click', () => {
      const items = get(path, []);
      items.push(clone(defaults));
      set(path, items);
      render();
    });
    const wrap = card(title, add);
    const list = el('div', 'cms-collection');
    (get(path, []) || []).forEach((item, index) => {
      const itemPath = [...pathParts(path), index];
      const itemCard = el('div', 'cms-item-card');
      const head = el('div', 'cms-card-header');
      head.append(el('h3', '', item.title || item.name || item.label || item.number || `Item ${index + 1}`));
      const remove = el('button', 'cms-button cms-button-danger', 'Remove');
      remove.type = 'button';
      remove.addEventListener('click', () => {
        const items = get(path, []);
        items.splice(index, 1);
        set(path, items);
        render();
      });
      head.append(remove);
      itemCard.append(head, renderItem(itemPath, item, index));
      list.append(itemCard);
    });
    wrap.append(list);
    return wrap;
  }
  function pageHeroCard(key) {
    const wrap = card('Page Hero');
    wrap.append(grid([
      field('Label', `pages.${key}.label`),
      field('Title', `pages.${key}.title`),
      field('Body', `pages.${key}.body`, { multiline: true, full: true }),
      imageField('Hero Image', `pages.${key}.heroImage`),
    ]));
    return wrap;
  }

  /* ---------- renderers ---------- */
  function renderSite() {
    const wrap = card('Brand & Contact');
    wrap.append(grid([
      imageField('Logo (leave blank for text logo)', 'site.logo'),
      field('Company Name', 'site.name'),
      field('Tagline', 'site.tagline'),
      field('Established Year', 'site.established'),
      field('Email', 'site.email', { type: 'email' }),
      field('Phone', 'site.phone'),
      field('WhatsApp Number (digits, incl. country code)', 'site.whatsapp', { placeholder: '919876543210' }),
      field('Address', 'site.address'),
      field('License Text', 'site.license'),
      field('Instagram URL', 'site.instagram', { type: 'url' }),
      field('Facebook URL', 'site.facebook', { type: 'url' }),
      field('LinkedIn URL', 'site.linkedin', { type: 'url' }),
      field('YouTube URL', 'site.youtube', { type: 'url' }),
      field('Footer / Meta Description', 'site.description', { multiline: true, full: true }),
    ]));
    panel.replaceChildren(sectionHead('Site', 'Global brand details used in the header, footer, contact links and SEO.'), wrap);
  }

  function renderHome() {
    const hero = card('Hero');
    hero.append(grid([
      field('Eyebrow', 'home.hero.eyebrow'),
      field('Headline (last word is highlighted gold)', 'home.hero.headline'),
      field('Body', 'home.hero.body', { multiline: true, full: true }),
      field('Primary Button Label', 'home.hero.primaryCta.label'),
      field('Primary Button Link', 'home.hero.primaryCta.href'),
      field('Secondary Button Label', 'home.hero.secondaryCta.label'),
      field('Secondary Button Link', 'home.hero.secondaryCta.href'),
    ]));
    hero.append(grid([imageField('Hero Image (leave blank for text-only hero)', 'home.hero.image')]));

    const about = card('About Block');
    about.append(grid([
      field('Label', 'home.about.label'),
      field('Title', 'home.about.title'),
      imageField('Image', 'home.about.image'),
      field('Badge Number', 'home.about.badgeNumber'),
      field('Badge Text', 'home.about.badgeText'),
    ]));
    about.append(listField('Paragraphs', 'home.about.paragraphs'));

    const si = card('Services Intro');
    si.append(grid([
      field('Label', 'home.servicesIntro.label'),
      field('Title', 'home.servicesIntro.title'),
      field('Body', 'home.servicesIntro.body', { multiline: true, full: true }),
    ]));
    const pi = card('Projects Intro');
    pi.append(grid([
      field('Label', 'home.projectsIntro.label'),
      field('Title', 'home.projectsIntro.title'),
      field('Body', 'home.projectsIntro.body', { multiline: true, full: true }),
    ]));
    const cta = card('CTA Banner');
    cta.append(grid([
      field('Label', 'home.ctaBanner.label'),
      field('Title', 'home.ctaBanner.title'),
      field('Body', 'home.ctaBanner.body', { multiline: true, full: true }),
      field('Button Label', 'home.ctaBanner.ctaLabel'),
      field('Button Link', 'home.ctaBanner.ctaHref'),
      imageField('Background Image', 'home.ctaBanner.image'),
    ]));

    panel.replaceChildren(
      sectionHead('Home', 'The homepage hero, about block, stats, and section intros.'),
      hero,
      collection('Hero Slides', 'home.hero.slides', { label: 'Category', image: '' }, (p) =>
        grid([field('Label', [...p, 'label']), imageField('Image', [...p, 'image'])])),
      about,
      collection('About Highlights', 'home.about.highlights', { icon: 'check', title: 'Highlight', body: '' }, (p) =>
        grid([field('Icon name (building, leaf, ruler, sofa, bolt, drop, hammer, clipboard, trophy, shield, clock, star, lock, handshake, sprout, check)', [...p, 'icon']), field('Title', [...p, 'title']), field('Body', [...p, 'body'], { multiline: true, full: true })])),
      collection('Stats', 'home.stats', { number: '0', suffix: '+', label: 'Metric' }, (p) =>
        grid([field('Number', [...p, 'number']), field('Suffix', [...p, 'suffix']), field('Label', [...p, 'label'])])),
      si, pi, cta
    );
  }

  function renderAbout() {
    const mission = card('Mission');
    mission.append(grid([field('Label', 'about.mission.label'), field('Title', 'about.mission.title'), field('Body', 'about.mission.body', { multiline: true, full: true })]));
    const vision = card('Vision');
    vision.append(grid([field('Label', 'about.vision.label'), field('Title', 'about.vision.title'), field('Body', 'about.vision.body', { multiline: true, full: true })]));
    const story = card('Story');
    story.append(listField('Story Paragraphs', 'about.story'));

    panel.replaceChildren(
      sectionHead('About', 'The about page: story, mission, vision, values, process and team.'),
      pageHeroCard('about'),
      story, mission, vision,
      collection('Values', 'about.values', { icon: 'shield', title: 'Value', body: '' }, (p) =>
        grid([field('Icon name (building, leaf, ruler, sofa, bolt, drop, hammer, clipboard, trophy, shield, clock, star, lock, handshake, sprout, check)', [...p, 'icon']), field('Title', [...p, 'title']), field('Body', [...p, 'body'], { multiline: true, full: true })])),
      collection('Process Steps', 'about.process', { number: '01', title: 'Step', body: '' }, (p) =>
        grid([field('Number', [...p, 'number']), field('Title', [...p, 'title']), field('Body', [...p, 'body'], { multiline: true, full: true })])),
      collection('Team', 'about.team', { name: 'Name', role: 'Role', image: '' }, (p) =>
        grid([field('Name', [...p, 'name']), field('Role', [...p, 'role']), imageField('Photo', [...p, 'image'])]))
    );
  }

  function renderServices() {
    panel.replaceChildren(
      sectionHead('Services', 'The services shown on the home and services pages.'),
      pageHeroCard('services'),
      collection('Services', 'services', { icon: 'building', title: 'New Service', slug: '', summary: '', details: '', image: '', features: [] }, (p) => {
        const wrap = el('div', 'cms-nested');
        wrap.append(grid([
          field('Icon name (building, leaf, ruler, sofa, bolt, drop, hammer, clipboard, trophy, shield, clock, star, lock, handshake, sprout, check)', [...p, 'icon']),
          field('Title', [...p, 'title']),
          field('Slug', [...p, 'slug']),
          field('Summary', [...p, 'summary'], { full: true }),
          field('Details', [...p, 'details'], { multiline: true, full: true }),
          imageField('Image', [...p, 'image']),
        ]));
        wrap.append(listField('Features', [...p, 'features']));
        return wrap;
      }),
      collection('Design Styles', 'designStyles', { name: 'New Style', tagline: '', body: '', image: '' }, (p) =>
        grid([
          field('Name', [...p, 'name']),
          field('Tagline', [...p, 'tagline']),
          imageField('Image', [...p, 'image']),
          field('Description', [...p, 'body'], { multiline: true, full: true }),
        ]))
    );
  }

  function renderProjects() {
    panel.replaceChildren(
      sectionHead('Projects', 'Portfolio entries. Each project gets its own detail page via its slug.'),
      pageHeroCard('projects'),
      collection('Projects', 'projects', {
        slug: '', title: 'New Project', category: 'Residential', location: '', year: '', value: '',
        image: '', gallery: [], summary: '', details: '', stats: [], featured: false,
      }, (p) => {
        const wrap = el('div', 'cms-nested');
        wrap.append(grid([
          field('Title', [...p, 'title']),
          field('Slug (URL id)', [...p, 'slug']),
          field('Category', [...p, 'category']),
          field('Location', [...p, 'location']),
          field('Year', [...p, 'year']),
          field('Value', [...p, 'value']),
          imageField('Cover Image', [...p, 'image']),
          field('Summary', [...p, 'summary'], { multiline: true, full: true }),
          field('Details', [...p, 'details'], { multiline: true, full: true }),
        ]));
        wrap.append(checkbox('Featured (shown first on home)', [...p, 'featured']));
        wrap.append(galleryField('Gallery (upload or paste URLs)', [...p, 'gallery']));
        wrap.append(collection('Project Stats', [...p, 'stats'], { number: '', label: '' }, (sp) =>
          grid([field('Number', [...sp, 'number']), field('Label', [...sp, 'label'])])));
        return wrap;
      })
    );
  }

  function renderTestimonials() {
    panel.replaceChildren(
      sectionHead('Testimonials', 'Client quotes shown on the homepage.'),
      collection('Testimonials', 'testimonials', { quote: '', name: 'Client Name', role: '', avatar: '' }, (p) =>
        grid([
          field('Quote', [...p, 'quote'], { multiline: true, full: true }),
          field('Name', [...p, 'name']),
          field('Role / Company', [...p, 'role']),
          imageField('Avatar (optional)', [...p, 'avatar']),
        ]))
    );
  }

  function renderCertifications() {
    panel.replaceChildren(
      sectionHead('Certifications', 'Shown as the scrolling trust strip and on the about page.'),
      collection('Certifications', 'certifications', { icon: 'trophy', title: 'Certification', body: '' }, (p) =>
        grid([field('Icon name (building, leaf, ruler, sofa, bolt, drop, hammer, clipboard, trophy, shield, clock, star, lock, handshake, sprout, check)', [...p, 'icon']), field('Title', [...p, 'title']), field('Body', [...p, 'body'], { multiline: true, full: true })]))
    );
  }

  function renderContact() {
    const info = card('Contact Details');
    info.append(grid([
      field('Office Title', 'contact.officeTitle'),
      field('Office Address', 'contact.officeAddress', { multiline: true }),
      field('Email Title', 'contact.emailTitle'),
      field('Phone Title', 'contact.phoneTitle'),
      field('Form Title', 'contact.formTitle'),
      field('Form Body', 'contact.formBody', { multiline: true, full: true }),
      field('Hours Title', 'contact.hoursTitle'),
      field('Map Title', 'contact.mapTitle'),
      field('Map Body', 'contact.mapBody', { multiline: true, full: true }),
      field('Map Embed (iframe HTML, optional)', 'contact.mapEmbed', { multiline: true, full: true }),
    ]));
    info.append(listField('Emails', 'contact.emails'));
    info.append(listField('Phones', 'contact.phones'));
    panel.replaceChildren(
      sectionHead('Contact', 'Contact page details and working hours. Form submissions appear under the Submissions tab.'),
      pageHeroCard('contact'),
      info,
      collection('Working Hours', 'contact.hours', { days: 'Monday – Friday', time: '9:00 AM – 6:00 PM' }, (p) =>
        grid([field('Days', [...p, 'days']), field('Time', [...p, 'time'])]))
    );
  }

  async function renderSubmissions() {
    panel.replaceChildren(sectionHead('Submissions', 'Contact-form leads saved to your SQLite database.'), el('p', 'cms-status', 'Loading submissions…'));
    let data;
    try {
      data = await api('/api/submissions');
    } catch (error) {
      panel.replaceChildren(sectionHead('Submissions'), el('div', 'cms-empty', error.message));
      return;
    }
    const subs = data.submissions || [];
    const head = sectionHead('Submissions', `${subs.length} lead${subs.length === 1 ? '' : 's'} from your contact form.`);
    if (!subs.length) { panel.replaceChildren(head, el('div', 'cms-empty', 'No submissions yet.')); return; }

    const list = el('div', 'cms-subs');
    subs.forEach((s) => {
      const item = el('div', `cms-sub${s.isRead ? '' : ' unread'}`);
      const top = el('div', 'cms-sub-head');
      const name = el('strong', '', s.name || 'Unknown');
      if (!s.isRead) name.append(' ', el('span', 'cms-badge', 'New'));
      top.append(name, el('span', 'when', new Date(s.createdAt).toLocaleString()));
      const meta = el('div', 'cms-sub-meta');
      if (s.email) { const a = el('a', '', s.email); a.href = `mailto:${s.email}`; meta.append(a); }
      if (s.phone) { const a = el('a', '', s.phone); a.href = `tel:${s.phone}`; meta.append(a); }
      if (s.subject) meta.append(el('span', '', s.subject));
      const msg = el('div', 'cms-sub-msg', s.message);
      const actions = el('div', 'cms-sub-actions');
      const toggle = el('button', 'cms-button cms-button-secondary', s.isRead ? 'Mark unread' : 'Mark read');
      toggle.type = 'button';
      toggle.addEventListener('click', async () => {
        try { await api('/api/submissions', { method: 'PATCH', body: JSON.stringify({ id: s.id, isRead: !s.isRead }) }); renderSubmissions(); }
        catch (e) { setStatus(e.message, 'error'); }
      });
      const del = el('button', 'cms-button cms-button-danger', 'Delete');
      del.type = 'button';
      del.addEventListener('click', async () => {
        if (!confirm('Delete this submission?')) return;
        try { await api(`/api/submissions?id=${s.id}`, { method: 'DELETE' }); renderSubmissions(); }
        catch (e) { setStatus(e.message, 'error'); }
      });
      actions.append(toggle, del);
      item.append(top, meta, msg, actions);
      list.append(item);
    });
    panel.replaceChildren(head, list);
  }

  const RENDERERS = {
    site: renderSite, home: renderHome, about: renderAbout, services: renderServices,
    projects: renderProjects, testimonials: renderTestimonials, certifications: renderCertifications,
    contact: renderContact, submissions: renderSubmissions,
  };

  function render() {
    updateAuthUi();
    document.querySelectorAll('.cms-tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === state.activeTab));
    saveButton.style.display = state.activeTab === 'submissions' ? 'none' : '';
    if (authRequired() && !state.authenticated) return;
    if (state.activeTab === 'submissions') { RENDERERS.submissions(); return; }
    if (!state.content) return;
    RENDERERS[state.activeTab]();
  }

  async function load() {
    setStatus('Loading…');
    reloadButton.dataset.loading = 'true';
    try { await _load(); }
    catch (error) { setStatus(error.message, 'error'); }
    finally { delete reloadButton.dataset.loading; }
  }
  async function _load() {
    state.config = await api('/api/config', { skipAuth: true });
    state.authenticated = !state.config.authRequired;
    if (state.config.authRequired && state.token) {
      try { await verifyPassword(state.token); }
      catch { state.token = ''; state.authenticated = false; sessionStorage.removeItem(SESSION_KEY); }
    }
    updateAuthUi();

    const payload = await api('/api/content');
    state.content = payload.content;
    state.dirty = false;

    cloudinaryState.textContent = state.config.cloudinary.enabled
      ? `Cloudinary ready (${state.config.cloudinary.cloudName})`
      : 'Cloudinary not configured — paste image URLs directly.';

    if (authRequired() && !state.authenticated) { setStatus('Login required'); return; }
    render();
    setStatus('Ready');
  }

  async function save() {
    if (!state.content) return;
    saveButton.dataset.loading = 'true';
    try {
      setStatus('Saving…');
      const payload = await api('/api/content', { method: 'PUT', body: JSON.stringify(state.content) });
      state.content = payload.content;
      state.dirty = false;
      render();
      setStatus('All changes saved', 'success');
    } catch (error) {
      if (error.status === 401) { clearSession('Login required'); return; }
      setStatus(error.message, 'error');
    } finally { delete saveButton.dataset.loading; }
  }

  /* ---------- wiring ---------- */
  document.querySelectorAll('.cms-tab').forEach((tab) => {
    tab.addEventListener('click', () => { state.activeTab = tab.dataset.tab; render(); });
  });
  saveButton.addEventListener('click', save);
  reloadButton.addEventListener('click', load);
  logoutButton.addEventListener('click', () => clearSession('Logged out'));
  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const password = passwordInput.value.trim();
    try { setStatus('Checking password…'); await verifyPassword(password); await load(); }
    catch (error) { clearSession(error.message); passwordInput.value = password; passwordInput.select(); }
  });
  window.addEventListener('beforeunload', (event) => {
    if (!state.dirty) return;
    event.preventDefault();
    event.returnValue = '';
  });

  load();
})();
