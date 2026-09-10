const { Resend } = require('resend');

// Helper to escape HTML in email templates
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

module.exports = async function handler(req, res) {
 // 1. Only allow POST method
 if (req.method !== 'POST') {
 res.setHeader('Allow', ['POST']);
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
 // Return safe message without revealing internal spam handling or sending email
 return res.status(200).json({
 success: true,
 message: 'Message received.'
 });
 }

 // 5. Extract and sanitize inputs
 const name = typeof body.name === 'string' ? body.name.trim() : '';
 const email = typeof body.email === 'string' ? body.email.trim() : '';
 const message = typeof body.message === 'string' ? body.message.trim() : '';

 // 6. Server-side validation
 if (!name || name.length < 2) {
 return res.status(400).json({
 success: false,
 error: 'Please enter your name (at least 2 characters).'
 });
 }

 if (name.length > 100) {
 return res.status(400).json({
 success: false,
 error: 'Name cannot exceed 100 characters.'
 });
 }

 const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
 if (!email || !emailRegex.test(email)) {
 return res.status(400).json({
 success: false,
 error: 'Please enter a valid email address.'
 });
 }

 if (!message || message.length < 5) {
 return res.status(400).json({
 success: false,
 error: 'Please enter your message (at least 5 characters).'
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
 console.error('[DraftOne Contact Error]: RESEND_API_KEY is not configured in environment variables.');
 return res.status(503).json({
 success: false,
 error: 'Email service is not yet configured. Please configure RESEND_API_KEY in Vercel environment variables.'
 });
 }

 const resend = new Resend(apiKey);
 const toEmail = process.env.CONTACT_EMAIL_TO || 'admin@draftone.in';
 const fromEmail = process.env.CONTACT_EMAIL_FROM || 'DraftOne <admin@draftone.in>';

 const emailText =
 'New contact form submission from DraftOne website:\n\n' +
 'Name: ' + name + '\n' +
 'Email: ' + email + '\n\n' +
 'Message:\n' + message + '\n\n' +
 'Submitted at: ' + new Date().toISOString();

 const emailHtml =
 '<div style=font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif; line-height: 1.6; color: #111111; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #eaeaea; border-radius: 8px;>' +
 '<h2 style=font-size: 20px; font-weight: 700; margin-top: 0; padding-bottom: 12px; border-bottom: 2px solid #111111;>New DraftOne Contact Submission</h2>' +
 '<table style=width: 100%; border-collapse: collapse; margin-top: 16px;>' +
 '<tr><td style=padding: 8px 0; font-weight: 600; width: 100px; color: #666666;>Name:</td><td style=padding: 8px 0; color: #111111;>' + escapeHtml(name) + '</td></tr>' +
 '<tr><td style=padding: 8px 0; font-weight: 600; color: #666666;>Email:</td><td style=padding: 8px 0; color: #111111;><a href=mailto:' + escapeHtml(email) + ' style=color: #111111; text-decoration: underline;>' + escapeHtml(email) + '</a></td></tr>' +
 '</table>' +
 '<div style=margin-top: 20px;><p style=font-weight: 600; color: #666666; margin-bottom: 8px;>Message:</p>' +
 '<div style=background-color: #f7f7f7; border-left: 3px solid #111111; padding: 14px 16px; border-radius: 4px; white-space: pre-wrap; font-size: 15px;>' + escapeHtml(message) + '</div></div>' +
 '<hr style=border: none; border-top: 1px solid #eee; margin: 24px 0 16px 0;>' +
 '<p style=font-size: 12px; color: #888888; margin: 0;>Sent to ' + escapeHtml(toEmail) + ' via DraftOne Contact Form on ' + new Date().toLocaleString() + '.</p>' +
 '</div>';

 // 8. Send via Resend
 const { data, error } = await resend.emails.send({
 from: fromEmail,
 to: toEmail,
 replyTo: email,
 subject: 'New DraftOne Contact Form Submission',
 text: emailText,
 html: emailHtml
 });

 if (error) {
 console.error('[DraftOne Resend API Error]:', error);
 return res.status(502).json({
 success: false,
 error: 'Failed to deliver message via email service. Please try again later or email admin@draftone.in.'
 });
 }

 if (!data || !data.id) {
 console.error('[DraftOne Resend Delivery Warning]: No message ID returned from provider.');
 return res.status(500).json({
 success: false,
 error: 'Email provider did not return confirmation. Please try again later.'
 });
 }

 return res.status(200).json({
 success: true,
 message: 'Thank you! Your message has been sent successfully.'
 });

 } catch (err) {
 console.error('[DraftOne Unexpected Error]:', err);
 return res.status(500).json({
 success: false,
 error: 'An unexpected error occurred. Please try again later or email us at admin@draftone.in.'
 });
 }
};
