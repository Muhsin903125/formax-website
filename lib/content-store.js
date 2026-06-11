const crypto = require('node:crypto');

/**
 * The single source of truth for Formax Builders site content.
 * The whole document is stored as one JSON blob in SQLite (see lib/db.js) and
 * hydrated into the static pages at runtime (see js/site-content.js).
 */
const defaultContent = {
  site: {
    name: 'Formax Builders',
    tagline: 'Building Your Future',
    description:
      'Premium construction services from foundation to finish. We deliver exceptional quality, safety, and craftsmanship for residential and commercial projects.',
    email: 'projects@formaxbuilders.com',
    phone: '+91 98765 43210',
    whatsapp: '919876543210',
    address: 'Thrissur, Kerala, India',
    instagram: 'https://instagram.com/formaxbuilders',
    facebook: 'https://www.facebook.com/profile.php?id=61590441039128',
    linkedin: 'https://www.linkedin.com/in/formax-builders-b105b5414/',
    youtube: 'https://www.youtube.com/@formaxbuilders',
    logo: 'assets/logo-full.png',
    established: '2017',
    license: 'Licensed, bonded & insured',
  },
  home: {
    hero: {
      eyebrow: 'Est. 2017 · Licensed & Insured',
      headline: 'Building Your Future',
      body: 'Premium construction services from foundation to finish. We deliver exceptional quality, safety, and craftsmanship for residential and commercial projects.',
      primaryCta: { label: 'Get Free Quote', href: 'contact.html' },
      secondaryCta: { label: 'View Projects', href: 'projects.html' },
      image: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&q=80&w=1100',
      slides: [],
    },
    about: {
      label: 'About Us',
      title: 'Complete Construction Services Since 2017',
      image: '',
      badgeNumber: '2017',
      badgeText: 'Established',
      paragraphs: [],
      highlights: [],
    },
    stats: [],
    servicesIntro: {
      label: 'What We Do',
      title: 'Our Services',
      body: 'Comprehensive construction solutions from foundation to finish.',
    },
    projectsIntro: {
      label: 'Portfolio',
      title: 'Featured Projects',
      body: 'Showcasing our most impressive construction achievements.',
    },
    ctaBanner: {
      label: "Let's Build",
      title: 'Ready to build something extraordinary?',
      body: "Tell us about your project and we'll turn your vision into reality.",
      ctaLabel: 'Start Your Project',
      ctaHref: 'contact.html',
      image: '',
    },
  },
  pages: {
    about: { heroImage: '', label: 'About Us', title: 'Building Trust, One Project at a Time', body: '' },
    services: { heroImage: '', label: 'What We Do', title: 'Construction Services', body: '' },
    projects: { heroImage: '', label: 'Portfolio', title: 'Our Projects', body: '' },
    contact: { heroImage: '', label: 'Get In Touch', title: 'Start Your Project', body: '' },
  },
  services: [],
  projects: [],
  testimonials: [],
  certifications: [],
  designStyles: [
    {
      name: 'Box-Model / Minimalist',
      tagline: 'Clean lines, honest materials',
      body: 'Pure geometric volumes, uninterrupted planes and a restrained palette. We let light, proportion and craftsmanship do the talking — nothing excessive, everything intentional.',
      image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=900',
    },
    {
      name: 'Fusion / Traditional Hybrid',
      tagline: 'Heritage meets modern',
      body: 'A balance of timeless craftsmanship and contemporary comfort — traditional motifs, natural stone and woodwork reimagined with modern layouts, glazing and finishes.',
      image: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&q=80&w=900',
    },
    {
      name: 'Tropical Contemporary',
      tagline: 'Open, breezy, light-filled',
      body: 'Designed for warm climates — cross-ventilation, deep shade, indoor-outdoor living and lush courtyards paired with clean contemporary detailing and natural textures.',
      image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&q=80&w=900',
    },
  ],
  about: {
    story: [],
    mission: { label: 'Our Mission', title: 'Mission', body: '' },
    vision: { label: 'Our Vision', title: 'Vision', body: '' },
    values: [],
    process: [],
    team: [],
  },
  contact: {
    officeTitle: 'Headquarters',
    officeAddress: 'Thrissur, Kerala\nIndia',
    emailTitle: 'Email Us',
    emails: ['projects@formaxbuilders.com'],
    phoneTitle: 'Call Us',
    phones: ['+91 98765 43210'],
    formTitle: "Let's Start a Conversation",
    formBody: 'Tell us about your project, timeline, and budget. Our team replies within 1–2 business days.',
    hoursTitle: 'Working Hours',
    hours: [],
    mapTitle: 'Find Us',
    mapBody: 'Visit our office or schedule a site visit anywhere in the region.',
    mapEmbed: '',
  },
  privacy: {
    policyLastUpdated: '',
    policyIntro: '',
    dataWeCollect: '',
    howWeUse: '',
    cookies: '',
    yourRights: '',
    changes: '',
  },
  updatedAt: null,
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function objectOrEmpty(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function arrayOr(fallback, value) {
  return Array.isArray(value) ? value : clone(fallback);
}

function mergeObject(fallback, value) {
  return { ...fallback, ...objectOrEmpty(value) };
}

function normalizeContent(input) {
  const source = objectOrEmpty(input);
  const fallback = clone(defaultContent);

  const home = mergeObject(fallback.home, source.home);
  const homeHero = mergeObject(fallback.home.hero, home.hero);
  const homeAbout = mergeObject(fallback.home.about, home.about);
  const pages = mergeObject(fallback.pages, source.pages);
  const about = mergeObject(fallback.about, source.about);
  const contact = mergeObject(fallback.contact, source.contact);

  return {
    site: mergeObject(fallback.site, source.site),
    home: {
      ...home,
      hero: {
        ...homeHero,
        primaryCta: mergeObject(fallback.home.hero.primaryCta, homeHero.primaryCta),
        secondaryCta: mergeObject(fallback.home.hero.secondaryCta, homeHero.secondaryCta),
        slides: arrayOr(fallback.home.hero.slides, homeHero.slides),
      },
      about: {
        ...homeAbout,
        paragraphs: arrayOr(fallback.home.about.paragraphs, homeAbout.paragraphs),
        highlights: arrayOr(fallback.home.about.highlights, homeAbout.highlights),
      },
      stats: arrayOr(fallback.home.stats, home.stats),
      servicesIntro: mergeObject(fallback.home.servicesIntro, home.servicesIntro),
      projectsIntro: mergeObject(fallback.home.projectsIntro, home.projectsIntro),
      ctaBanner: mergeObject(fallback.home.ctaBanner, home.ctaBanner),
    },
    pages: {
      about: mergeObject(fallback.pages.about, pages.about),
      services: mergeObject(fallback.pages.services, pages.services),
      projects: mergeObject(fallback.pages.projects, pages.projects),
      contact: mergeObject(fallback.pages.contact, pages.contact),
    },
    services: arrayOr(fallback.services, source.services),
    projects: arrayOr(fallback.projects, source.projects),
    testimonials: arrayOr(fallback.testimonials, source.testimonials),
    certifications: arrayOr(fallback.certifications, source.certifications),
    designStyles: arrayOr(fallback.designStyles, source.designStyles),
    about: {
      ...about,
      story: arrayOr(fallback.about.story, about.story),
      mission: mergeObject(fallback.about.mission, about.mission),
      vision: mergeObject(fallback.about.vision, about.vision),
      values: arrayOr(fallback.about.values, about.values),
      process: arrayOr(fallback.about.process, about.process),
      team: arrayOr(fallback.about.team, about.team),
    },
    contact: {
      ...contact,
      emails: arrayOr(fallback.contact.emails, contact.emails),
      phones: arrayOr(fallback.contact.phones, contact.phones),
      hours: arrayOr(fallback.contact.hours, contact.hours),
    },
    privacy: mergeObject(fallback.privacy, source.privacy),
    updatedAt:
      typeof source.updatedAt === 'string' && source.updatedAt ? source.updatedAt : new Date().toISOString(),
  };
}

function validateContent(input) {
  const required = ['site', 'home', 'services', 'projects', 'testimonials', 'certifications', 'about', 'contact'];
  for (const section of required) {
    if (!(section in objectOrEmpty(input))) {
      throw new Error(`Missing CMS section: ${section}`);
    }
  }
  if (!Array.isArray(input.services)) throw new Error('CMS section services must be an array');
  if (!Array.isArray(input.projects)) throw new Error('CMS section projects must be an array');
  if (!objectOrEmpty(input.home).hero) throw new Error('CMS section home.hero is required');
  return true;
}

function createCloudinarySignature(params, apiSecret) {
  if (!apiSecret) throw new Error('Cloudinary API secret is required');
  const excluded = new Set(['api_key', 'cloud_name', 'file', 'resource_type', 'signature']);
  const signatureBase = Object.entries(objectOrEmpty(params))
    .filter(([key, value]) => !excluded.has(key) && value !== undefined && value !== null && value !== '')
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => {
      const normalizedValue = Array.isArray(value) ? value.join(',') : String(value);
      return `${key}=${normalizedValue}`;
    })
    .join('&');
  return crypto.createHash('sha1').update(`${signatureBase}${apiSecret}`).digest('hex');
}

function parseCloudinaryUrl(value) {
  if (!value) return {};
  try {
    const url = new URL(value);
    if (url.protocol !== 'cloudinary:') return {};
    return {
      cloudName: url.hostname || '',
      apiKey: decodeURIComponent(url.username || ''),
      apiSecret: decodeURIComponent(url.password || ''),
    };
  } catch {
    return {};
  }
}

function resolveCloudinaryConfig(input = {}, env = process.env) {
  const parsedUrl = parseCloudinaryUrl(input.url || env.CLOUDINARY_URL);
  return {
    cloudName: input.cloudName || env.CLOUDINARY_CLOUD_NAME || parsedUrl.cloudName || '',
    apiKey: input.apiKey || env.CLOUDINARY_API_KEY || parsedUrl.apiKey || '',
    apiSecret: input.apiSecret || env.CLOUDINARY_API_SECRET || parsedUrl.apiSecret || '',
    folder: input.folder || env.CLOUDINARY_FOLDER || 'formax/cms',
  };
}

module.exports = {
  defaultContent,
  normalizeContent,
  validateContent,
  createCloudinarySignature,
  parseCloudinaryUrl,
  resolveCloudinaryConfig,
};
