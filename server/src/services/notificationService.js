/**
 * Notifications for strong matches.
 *
 * Supports email (nodemailer/SMTP) and optional Telegram. When neither channel is
 * configured, sending is a no-op so the listing simply remains in the dashboard
 * (requirement 7.2). Idempotency (requirement 7.3 / Property 4) is enforced by the
 * caller via the Listing.notified flag.
 */
import nodemailer from 'nodemailer';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';

let cachedTransport = null;

function emailConfigured(cfg) {
  const s = cfg.notifications?.smtp || {};
  return Boolean(s.host && s.user && s.pass && s.to);
}

function telegramConfigured(cfg) {
  const t = cfg.notifications?.telegram || {};
  return Boolean(t.botToken && t.chatId);
}

export function anyChannelConfigured(cfg = config) {
  return emailConfigured(cfg) || telegramConfigured(cfg);
}

function getTransport(cfg) {
  if (cachedTransport) return cachedTransport;
  const s = cfg.notifications.smtp;
  cachedTransport = nodemailer.createTransport({
    host: s.host,
    port: s.port,
    secure: s.port === 465,
    auth: { user: s.user, pass: s.pass },
  });
  return cachedTransport;
}

function buildMessage(listing) {
  const lines = [
    `New strong match (${listing.matchScore}/100)`,
    `${listing.title} — ${listing.company || 'Unknown company'}`,
    listing.location ? `Location: ${listing.location}` : '',
    listing.url ? `Apply: ${listing.url}` : '',
  ].filter(Boolean);
  return lines.join('\n');
}

async function sendEmail(cfg, listing) {
  const s = cfg.notifications.smtp;
  const transport = getTransport(cfg);
  await transport.sendMail({
    from: s.from || s.user,
    to: s.to,
    subject: `Job Hunter: strong match — ${listing.title}`,
    text: buildMessage(listing),
  });
}

async function sendTelegram(cfg, listing) {
  const t = cfg.notifications.telegram;
  if (typeof fetch !== 'function') return;
  const url = `https://api.telegram.org/bot${t.botToken}/sendMessage`;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: t.chatId, text: buildMessage(listing) }),
  });
}

/**
 * Send a notification for a listing through all configured channels.
 * Returns true if at least one channel sent; false if none configured.
 */
export async function notifyStrongMatch(listing, cfg = config) {
  let sent = false;
  if (emailConfigured(cfg)) {
    await sendEmail(cfg, listing);
    sent = true;
  }
  if (telegramConfigured(cfg)) {
    await sendTelegram(cfg, listing);
    sent = true;
  }
  if (!sent) {
    logger.debug('No notification channel configured; skipping send.');
  }
  return sent;
}
