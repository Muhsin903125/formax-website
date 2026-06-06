const test = require('node:test');
const assert = require('node:assert');
const {
  normalizeContent,
  validateContent,
  createCloudinarySignature,
} = require('../lib/content-store');

test('normalizeContent fills defaults for empty input', () => {
  const c = normalizeContent({});
  assert.equal(c.site.name, 'Formax Builders');
  assert.ok(Array.isArray(c.services));
  assert.ok(c.home.hero.primaryCta.label);
  assert.ok(typeof c.updatedAt === 'string');
});

test('normalizeContent preserves provided values and explicit empty arrays', () => {
  const c = normalizeContent({ site: { name: 'Acme' }, services: [] });
  assert.equal(c.site.name, 'Acme');
  assert.deepEqual(c.services, []);
  // unspecified sections still get defaults
  assert.ok(c.contact.emails.length >= 0);
});

test('validateContent throws when a required section is missing', () => {
  assert.throws(() =>
    validateContent({ site: {}, home: { hero: {} }, services: [], projects: [], testimonials: [], certifications: [], about: {} })
  ); // contact missing
});

test('validateContent passes for normalized content', () => {
  assert.ok(validateContent(normalizeContent({})));
});

test('createCloudinarySignature is deterministic and ignores excluded keys', () => {
  const a = createCloudinarySignature({ folder: 'f', timestamp: 1 }, 'secret');
  const b = createCloudinarySignature({ folder: 'f', timestamp: 1, api_key: 'x', file: 'y' }, 'secret');
  assert.equal(a, b);
  assert.match(a, /^[a-f0-9]{40}$/);
});
