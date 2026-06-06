const { insertSubmission, sendJson } = require('./_utils');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

module.exports = async function handler(request, response) {
  try {
    if (request.method !== 'POST') {
      response.setHeader('allow', 'POST');
      sendJson(response, 405, { error: 'Method not allowed' });
      return;
    }

    const body = request.body || {};
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    const message = typeof body.message === 'string' ? body.message.trim() : '';

    if (!name || !email || !message) {
      sendJson(response, 400, { error: 'Name, email and message are required' });
      return;
    }
    if (!EMAIL_RE.test(email)) {
      sendJson(response, 400, { error: 'Please enter a valid email address' });
      return;
    }
    // Honeypot field — bots fill hidden inputs, humans never see them.
    if (typeof body.company === 'string' && body.company.trim()) {
      sendJson(response, 200, { ok: true });
      return;
    }

    const saved = await insertSubmission({
      name,
      email,
      phone: typeof body.phone === 'string' ? body.phone.trim() : '',
      subject: typeof body.subject === 'string' ? body.subject.trim() : '',
      message,
    });

    sendJson(response, 201, { ok: true, id: saved.id });
  } catch (error) {
    sendJson(response, 500, { error: error.message || 'Server error' });
  }
};
