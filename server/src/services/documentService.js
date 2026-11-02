/**
 * Optional AI-tailored document generation.
 *
 * Enabled only when an LLM API key is configured (requirement 6.2). Produces a
 * tailored resume + cover letter as editable text for the user to review and
 * download. Never sends the documents anywhere (requirement 6.4).
 *
 * The provider call is isolated behind callProvider() so the specific LLM SDK can
 * be swapped without touching the rest of the app.
 */
import { config } from '../config/env.js';
import { getOrCreateProfile } from './profileService.js';
import { logger } from '../utils/logger.js';

export function isTailoringEnabled(cfg = config) {
  return Boolean(cfg.llm?.apiKey);
}

function buildPrompt(profile, listing) {
  return [
    'You are helping a job seeker tailor application materials.',
    '',
    'CANDIDATE PROFILE:',
    `Name: ${profile.name || 'N/A'}`,
    `Skills: ${(profile.skills || []).join(', ')}`,
    `Titles: ${(profile.titles || []).join(', ')}`,
    '',
    'RESUME TEXT:',
    (profile.rawResumeText || '').slice(0, 6000),
    '',
    'TARGET JOB:',
    `Title: ${listing.title}`,
    `Company: ${listing.company}`,
    `Description: ${(listing.description || '').slice(0, 4000)}`,
    '',
    'TASK: Produce two clearly separated sections:',
    '1) A tailored one-page resume summary emphasizing relevant experience.',
    '2) A concise, specific cover letter for this role.',
    'Return plain text with headings "=== RESUME ===" and "=== COVER LETTER ===".',
  ].join('\n');
}

/**
 * Provider-agnostic call. Currently supports an OpenAI-compatible chat endpoint.
 * Returns the raw generated text.
 */
async function callProvider(cfg, prompt) {
  const { provider, apiKey } = cfg.llm;
  if (typeof fetch !== 'function') {
    throw new Error('Global fetch is unavailable; Node 18+ is required.');
  }

  // Default to an OpenAI-compatible endpoint; extend here for other providers.
  const endpoint =
    provider === 'anthropic'
      ? 'https://api.anthropic.com/v1/messages'
      : 'https://api.openai.com/v1/chat/completions';

  if (provider === 'anthropic') {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-latest',
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!res.ok) throw new Error(`LLM provider error: HTTP ${res.status}`);
    const data = await res.json();
    return data.content?.[0]?.text || '';
  }

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.4,
    }),
  });
  if (!res.ok) throw new Error(`LLM provider error: HTTP ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

/** Split the model output into resume + cover letter sections. */
function splitSections(text) {
  const resumeMatch = text.split('=== COVER LETTER ===');
  const resume = (resumeMatch[0] || '').replace('=== RESUME ===', '').trim();
  const coverLetter = (resumeMatch[1] || '').trim();
  return { resume, coverLetter };
}

/**
 * Generate tailored documents for a listing.
 * @returns {Promise<{resume:string, coverLetter:string}>}
 */
export async function generateTailoredDocs(listing, cfg = config) {
  if (!isTailoringEnabled(cfg)) {
    throw new Error('Tailoring is not enabled (no LLM API key).');
  }
  const profile = await getOrCreateProfile();
  const prompt = buildPrompt(profile, listing);
  logger.info(`Generating tailored docs for listing ${listing._id}`);
  const text = await callProvider(cfg, prompt);
  const { resume, coverLetter } = splitSections(text);
  // Fallback: if the model didn't use the markers, keep the whole text as the cover letter.
  if (!resume && !coverLetter) {
    return { resume: '', coverLetter: text.trim() };
  }
  return { resume, coverLetter };
}
