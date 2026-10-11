/**
 * First Choice Plumbing & Excavating Co: website quote form → email
 *
 * Cloud Run function (Node 22). Receives JSON from the quote forms on the
 * classic and premium sites and emails it to the business inbox over SMTP.
 *
 * Env vars: SMTP_USER, SMTP_PASS (secret), ALLOWED_ORIGIN (comma-separated),
 * optional MAIL_TO, MAIL_FROM, SMTP_HOST, SMTP_PORT, SMTP_SECURE,
 * TURNSTILE_SECRET (turns on the CAPTCHA check; set the site key in the website JS too).
 */
const nodemailer = require('nodemailer');

const MAIL_TO   = process.env.MAIL_TO   || 'info@1stchoiceplumbingservice.com';
const MAIL_FROM = process.env.MAIL_FROM || process.env.SMTP_USER;
const HONEYPOT  = 'website';

const FIELDS = {
  name:    { label: 'Name',             max: 100 },
  fname:   { label: 'First name',       max: 60 },
  lname:   { label: 'Last name',        max: 60 },
  phone:   { label: 'Phone',            max: 25 },
  email:   { label: 'Email',            max: 254 },
  address: { label: 'Property address', max: 200 },
  service: { label: 'Service needed',   max: 60 },
  urgency: { label: 'Urgency',          max: 40 },
  message: { label: 'Message',          max: 2000 },
  page:    { label: 'Sent from',        max: 100 }
};

// Only the options the forms offer: anything else becomes "Other" so visitors can't write the subject line
const SERVICES = new Set([
  // classic site
  'Emergency Plumbing Repair', 'Drain Cleaning / Unclogging', 'Water Heater Install / Repair',
  'Pipe Repair / Replacement', 'Leak Detection', 'Bathroom Plumbing', 'Kitchen Plumbing',
  'Sewer Line Services', 'Water Softener / Filtration', 'Commercial Plumbing',
  'Plumbing Inspection', 'Other',
  'Sewer Line Excavation', 'Water Line Excavation', 'Storm Drains / Catch Basins', 'Yard Drainage / French Drains',
  'Foundation / Basement Excavation', 'Grading / Site Prep', 'Septic Systems',
  // premium site
  'Emergency repair', 'Drain cleaning', 'Water heater', 'Leak detection', 'Sewer line',
  'Repiping', 'Excavation / sewer & water lines', 'Drainage / grading', 'Septic system', 'Something else'
]);
const URGENCIES = new Set(['Emergency (ASAP)', 'Within 24 Hours', 'This Week', 'Flexible / Planning Ahead']);

let transporter;
function getTransporter() {
  transporter ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
  return transporter;
}

// ── Rate limiting (per instance; deploy with a low --max-instances to bound the total) ──
const RATE_LIMIT  = 5;              // requests per IP
const RATE_WINDOW = 60 * 1000;      // per minute
const HOURLY_CAP  = 40;             // emails per instance per hour, whatever the IP
const _ratemap = new Map();
let hourly = { count: 0, start: Date.now() };

function isRateLimited(ip) {
  const now = Date.now();
  if (now - hourly.start > 60 * 60 * 1000) hourly = { count: 0, start: now };
  if (hourly.count >= HOURLY_CAP) return true;

  const entry = _ratemap.get(ip) || { count: 0, start: now };
  if (now - entry.start > RATE_WINDOW) { entry.count = 0; entry.start = now; }
  entry.count++;
  _ratemap.set(ip, entry);
  if (_ratemap.size > 5000) {
    for (const [k, v] of _ratemap) if (now - v.start > RATE_WINDOW) _ratemap.delete(k);
  }
  return entry.count > RATE_LIMIT;
}

// Browsers only: blocks other websites from using the endpoint. Scripts can fake Origin,
// which is why the rate limits above exist.
function handleCors(req, res) {
  const allowed = (process.env.ALLOWED_ORIGIN || '').split(',').map(o => o.trim()).filter(Boolean);
  const origin  = req.headers.origin || '';
  if (!allowed.length || !allowed.includes(origin)) {
    res.status(403).json({ error: 'Forbidden' });
    return true;
  }
  res.set('Access-Control-Allow-Origin', origin);
  res.set('Vary', 'Origin');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  res.set('Access-Control-Max-Age', '3600');
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return true;
  }
  return false;
}

// Cloudflare Turnstile CAPTCHA: only enforced once TURNSTILE_SECRET is set
async function passesTurnstile(token, ip) {
  if (!process.env.TURNSTILE_SECRET) return true;
  if (typeof token !== 'string' || !token) return false;
  try {
    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: new URLSearchParams({ secret: process.env.TURNSTILE_SECRET, response: token, remoteip: ip })
    });
    return (await r.json()).success === true;
  } catch (err) {
    console.error('turnstile:', err);
    return false;
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const isValidEmail = e => /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/.test(e);

function isValidPhone(phone) {
  let d = String(phone).replace(/\D/g, '');
  if (d.length === 11 && d[0] === '1') d = d.slice(1);
  // 10-digit US number: area code and exchange can't start with 0 or 1
  return /^[2-9]\d{2}[2-9]\d{6}$/.test(d) && !/^(\d)\1{9}$/.test(d);
}

function buildHtml(rows) {
  const body = rows.map(([label, value]) =>
    `<tr><td style="padding:8px 12px;border:1px solid #ddd;font-weight:bold;background:#fafafa;white-space:nowrap">${escapeHtml(label)}</td>` +
    `<td style="padding:8px 12px;border:1px solid #ddd">${escapeHtml(value).replace(/\n/g, '<br>')}</td></tr>`).join('');
  return `
    <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto">
      <h2 style="background:#0b3d91;color:#fff;padding:16px 20px;margin:0;border-radius:6px 6px 0 0">New website quote request</h2>
      <table style="width:100%;border-collapse:collapse;font-size:14px">${body}</table>
      <p style="margin-top:16px;color:#999;font-size:12px">Sent from the First Choice Plumbing &amp; Excavating Co website</p>
    </div>`;
}

exports.sendQuote = async (req, res) => {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });

  // Cloud Run appends the real client IP last; earlier entries are whatever the caller sent
  const ip = req.headers['x-forwarded-for']?.split(',').pop().trim() || req.socket?.remoteAddress || 'unknown';
  if (isRateLimited(ip)) return res.status(429).json({ error: 'Too many requests. Please wait a minute and try again.' });

  const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};

  // Bots fill the hidden field; pretend it worked so they don't retry
  if (body[HONEYPOT]) return res.json({ success: true });

  if (!(await passesTurnstile(body['cf-turnstile-response'], ip))) {
    return res.status(400).json({ error: 'Please complete the security check and try again.' });
  }

  const f = {};
  for (const [key, { max }] of Object.entries(FIELDS)) {
    if (typeof body[key] === 'string' && body[key].trim()) f[key] = body[key].trim().slice(0, max);
  }
  if (f.service && !SERVICES.has(f.service)) f.service = 'Other';
  if (f.urgency && !URGENCIES.has(f.urgency)) delete f.urgency;

  const name = f.name || [f.fname, f.lname].filter(Boolean).join(' ');
  if (!name)                              return res.status(400).json({ error: 'Your name is required.' });
  if (!f.phone || !isValidPhone(f.phone)) return res.status(400).json({ error: 'Please enter a valid 10-digit phone number.' });
  if (f.email && !isValidEmail(f.email))  return res.status(400).json({ error: 'Please enter a valid email address.' });

  const rows = Object.keys(FIELDS).filter(k => f[k]).map(k => [FIELDS[k].label, f[k]]);
  const text = rows.map(([label, value]) => `${label}: ${value}`).join('\n');

  try {
    await getTransporter().sendMail({
      from:    { name: 'First Choice Plumbing & Excavating Co', address: MAIL_FROM },
      to:      MAIL_TO,
      replyTo: f.email,
      subject: `New quote request: ${f.service || 'Plumbing'}`,
      text,
      html:    buildHtml(rows)
    });
    hourly.count++;
    res.json({ success: true });
  } catch (err) {
    console.error('sendQuote:', err);
    res.status(500).json({ error: 'Unable to send your request.' });
  }
};
