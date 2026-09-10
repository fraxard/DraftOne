const { Resend } = require('resend');

// Helper to escape HTML in email templates to prevent HTML injection
function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// In-memory rate limiting map per warm serverless container
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 5;

function isRateLimited(ip) {
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  if (!record) {
    rateLimitMap.set(ip, { count: 1, firstRequest: now });
    return false;
  }
  if (now - record.firstRequest > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(ip, { count: 1, firstRequest: now });
    return false;
  }
  record.count += 1;
  return record.count > MAX_REQUESTS_PER_WINDOW;
}

// Known job identifier to official role title mapping
const ALLOWED_JOBS = {
  'sales-business-development-intern': 'Sales & Business Development Intern'
};

module.exports = async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    return res.status(200).end();
  }

  console.log('[DraftOne Application API] Received request:', req.method, req.url);

  // 1. Only allow POST method
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST', 'OPTIONS']);
    return res.status(405).json({
      success: false,
      error: 'Method ' + req.method + ' Not Allowed'
    });
  }

  // 2. Rate limiting check
  const clientIp = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    (req.socket && req.socket.remoteAddress) ||
    'unknown';
  if (isRateLimited(clientIp)) {
    return res.status(429).json({
      success: false,
      error: 'Too many requests. Please wait a minute and try again.'
    });
  }

  try {
    // 3. Parse request body if necessary
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        return res.status(400).json({
          success: false,
          error: 'Invalid JSON request payload.'
        });
      }
    }
    body = body || {};

    // 4. Honeypot check for spam protection
    if (body.website || body._gotcha) {
      // Silently accept honeypot bot submissions without emailing
      return res.status(200).json({
        success: true,
        message: 'Application received.'
      });
    }

    // 5. Extract and sanitize inputs
    const jobId = typeof body.jobId === 'string' ? body.jobId.trim() : 'sales-business-development-intern';
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
    const resume = typeof body.resume === 'string' ? body.resume.trim() : '';
    const message = typeof body.message === 'string' ? body.message.trim() : '';

    // 6. Server-side validation
    const jobTitle = ALLOWED_JOBS[jobId] || ALLOWED_JOBS['sales-business-development-intern'];

    // Name validation
    if (!name || name.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Please enter your full name (at least 2 characters).'
      });
    }
    if (name.length > 100) {
      return res.status(400).json({
        success: false,
        error: 'Name cannot exceed 100 characters.'
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a valid email address.'
      });
    }

    // Phone validation
    const phoneRegex = /^[+\d\s().-]{6,30}$/;
    if (!phone || !phoneRegex.test(phone)) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a valid phone number.'
      });
    }

    // Resume / CV link validation (must be a valid http or https URL)
    if (!resume) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a valid resume or CV link.'
      });
    }
    try {
      const parsedUrl = new URL(resume);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error('Invalid URL protocol');
      }
    } catch {
      return res.status(400).json({
        success: false,
        error: 'Please enter a valid web URL for your resume (e.g. Google Drive, LinkedIn, or Portfolio link).'
      });
    }

    // Message / Motivation validation
    if (!message || message.length < 5) {
      return res.status(400).json({
        success: false,
        error: 'Please explain why you want to join DraftOne (at least 5 characters).'
      });
    }
    if (message.length > 3000) {
      return res.status(400).json({
        success: false,
        error: 'Message is too long (maximum 3000 characters).'
      });
    }

    // 7. Verify Resend configuration
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error('[DraftOne Careers Error]: RESEND_API_KEY is not configured in environment variables.');
      return res.status(503).json({
        success: false,
        error: 'Email service is not configured. Please configure RESEND_API_KEY in Vercel environment variables.'
      });
    }

    const resend = new Resend(apiKey);
    const toEmail = process.env.CAREERS_EMAIL_TO || process.env.CONTACT_EMAIL_TO || 'admin@draftone.in';
    const fromEmail = process.env.CONTACT_EMAIL_FROM || 'DraftOne <admin@draftone.in>';

    const emailSubject = `New DraftOne Job Application — ${jobTitle}`;
    const submittedAt = new Date().toISOString();

    // Plain-text fallback email
    const emailText =
      `DRAFTONE JOB APPLICATION\n` +
      `==================================================\n\n` +
      `Position: ${jobTitle}\n\n` +
      `Applicant Details:\n` +
      `--------------------------------------------------\n` +
      `Full Name: ${name}\n` +
      `Email: ${email}\n` +
      `Phone: ${phone}\n` +
      `Resume / CV Link: ${resume}\n\n` +
      `Why they want to join DraftOne:\n` +
      `--------------------------------------------------\n` +
      `${message}\n\n` +
      `==================================================\n` +
      `Submitted at: ${submittedAt}\n` +
      `Sent to: ${toEmail}\n`;

    // Professional HTML email
    const emailHtml =
      `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #111111; max-width: 620px; margin: 0 auto; padding: 28px; border: 2px solid #0a0a0a; background-color: #ffffff;">` +
        `<div style="border-bottom: 3px solid #0a0a0a; padding-bottom: 16px; margin-bottom: 24px;">` +
          `<span style="font-size: 11px; font-weight: 800; letter-spacing: 0.18em; text-transform: uppercase; color: #888888; display: block; margin-bottom: 4px;">DraftOne Careers Portal</span>` +
          `<h1 style="font-size: 24px; font-weight: 800; color: #0a0a0a; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: -0.01em;">Job Application</h1>` +
          `<div style="display: inline-block; background-color: #f5e642; border: 2px solid #0a0a0a; padding: 4px 10px; font-size: 12px; font-weight: 700; text-transform: uppercase; color: #0a0a0a;">` +
            `Role: ${escapeHtml(jobTitle)}` +
          `</div>` +
        `</div>` +

        `<h2 style="font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #0a0a0a; margin: 20px 0 12px 0;">Applicant Information</h2>` +
        `<table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">` +
          `<tr>` +
            `<td style="padding: 10px 12px; font-weight: 700; width: 140px; color: #555555; border-bottom: 1px solid #eeeeee; font-size: 13px;">Full Name:</td>` +
            `<td style="padding: 10px 12px; color: #0a0a0a; font-weight: 600; border-bottom: 1px solid #eeeeee; font-size: 14px;">${escapeHtml(name)}</td>` +
          `</tr>` +
          `<tr>` +
            `<td style="padding: 10px 12px; font-weight: 700; color: #555555; border-bottom: 1px solid #eeeeee; font-size: 13px;">Email:</td>` +
            `<td style="padding: 10px 12px; border-bottom: 1px solid #eeeeee; font-size: 14px;"><a href="mailto:${escapeHtml(email)}" style="color: #0a0a0a; font-weight: 600; text-decoration: underline;">${escapeHtml(email)}</a></td>` +
          `</tr>` +
          `<tr>` +
            `<td style="padding: 10px 12px; font-weight: 700; color: #555555; border-bottom: 1px solid #eeeeee; font-size: 13px;">Phone:</td>` +
            `<td style="padding: 10px 12px; border-bottom: 1px solid #eeeeee; font-size: 14px;"><a href="tel:${escapeHtml(phone)}" style="color: #0a0a0a; text-decoration: none;">${escapeHtml(phone)}</a></td>` +
          `</tr>` +
          `<tr>` +
            `<td style="padding: 10px 12px; font-weight: 700; color: #555555; border-bottom: 1px solid #eeeeee; font-size: 13px;">Resume / CV Link:</td>` +
            `<td style="padding: 10px 12px; border-bottom: 1px solid #eeeeee; font-size: 14px;">` +
              `<a href="${escapeHtml(resume)}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #0a0a0a; color: #f5e642; padding: 6px 12px; font-size: 12px; font-weight: 700; text-decoration: none; border-radius: 2px;">View Resume / Portfolio &rarr;</a>` +
              `<div style="font-size: 11px; color: #777777; margin-top: 4px; word-break: break-all;">${escapeHtml(resume)}</div>` +
            `</td>` +
          `</tr>` +
        `</table>` +

        `<h2 style="font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #0a0a0a; margin: 20px 0 10px 0;">Why they want to join DraftOne:</h2>` +
        `<div style="background-color: #f9f9fb; border-left: 4px solid #e8180a; padding: 16px; font-size: 14px; line-height: 1.6; color: #111111; white-space: pre-wrap; margin-bottom: 24px;">` +
          escapeHtml(message) +
        `</div>` +

        `<div style="border-top: 1px solid #dddddd; padding-top: 16px; margin-top: 24px; font-size: 11px; color: #888888;">` +
          `<p style="margin: 0 0 4px 0;">Delivered to <strong>${escapeHtml(toEmail)}</strong> via DraftOne Careers System.</p>` +
          `<p style="margin: 0;">Reply directly to this email to contact the applicant at <strong>${escapeHtml(email)}</strong>.</p>` +
        `</div>` +
      `</div>`;

    // 8. Send email via Resend
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: toEmail,
      replyTo: email,
      subject: emailSubject,
      text: emailText,
      html: emailHtml
    });

    if (error) {
      console.error('[DraftOne Careers Resend Error]:', error);
      return res.status(502).json({
        success: false,
        error: 'Failed to deliver application via email service. Please try again later or email admin@draftone.in.'
      });
    }

    if (!data || !data.id) {
      console.error('[DraftOne Careers Warning]: No message ID returned from provider.');
      return res.status(500).json({
        success: false,
        error: 'Email provider did not return confirmation. Please try again later.'
      });
    }

    // 9. Successful response
    return res.status(200).json({
      success: true,
      message: 'Application received successfully.'
    });

  } catch (err) {
    console.error('[DraftOne Careers Unexpected Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'An unexpected error occurred while processing your application. Please try again later or email admin@draftone.in.'
    });
  }
};
