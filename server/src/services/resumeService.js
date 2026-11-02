/**
 * Resume ingestion service.
 *
 * Extracts text from an uploaded PDF and parses it heuristically into structured
 * profile fields. Low-confidence fields are left empty for the user to fill in
 * manually (requirement 1.2). No external AI call is required here.
 */
import { createRequire } from 'module';
import { normalizeWhitespace } from '../utils/text.js';
import { logger } from '../utils/logger.js';

// pdf-parse is CommonJS; load it via createRequire for ESM compatibility.
const require = createRequire(import.meta.url);

/**
 * A curated set of common tech skills to detect. This is intentionally simple and
 * extendable; anything not detected can be added by the user in the dashboard.
 */
const KNOWN_SKILLS = [
  'javascript', 'typescript', 'node.js', 'node', 'express', 'react', 'redux',
  'next.js', 'mongodb', 'mongoose', 'sql', 'postgresql', 'mysql', 'redis',
  'html', 'css', 'tailwind', 'sass', 'python', 'java', 'c++', 'c#', 'go',
  'rust', 'php', 'ruby', 'docker', 'kubernetes', 'aws', 'gcp', 'azure',
  'firebase', 'graphql', 'rest', 'git', 'ci/cd', 'jest', 'vitest', 'webpack',
  'vite', 'nestjs', 'django', 'flask', 'spring', 'kafka', 'rabbitmq',
];

const TITLE_HINTS = [
  'full stack', 'full-stack', 'fullstack', 'frontend', 'front-end', 'backend',
  'back-end', 'software engineer', 'software developer', 'web developer',
  'mern', 'developer', 'engineer',
];

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
const PHONE_RE = /(\+?\d[\d\s().-]{7,}\d)/;
const LINKEDIN_RE = /https?:\/\/(?:www\.)?linkedin\.com\/[^\s)]+/i;
const GITHUB_RE = /https?:\/\/(?:www\.)?github\.com\/[^\s)]+/i;
const URL_RE = /https?:\/\/[^\s)]+/gi;

/**
 * Extract plain text from a PDF buffer.
 * @param {Buffer} buffer
 * @returns {Promise<string>}
 */
export async function extractPdfText(buffer) {
  if (!Buffer.isBuffer(buffer)) {
    throw new Error('extractPdfText: expected a Buffer');
  }
  // Lazy require so test environments without the dependency can stub this module.
  const pdfParse = require('pdf-parse');
  const data = await pdfParse(buffer);
  return data.text || '';
}

/**
 * Parse extracted resume text into structured profile fields.
 * Pure function (no IO) so it is easy to unit-test.
 * @param {string} text
 * @returns {object} partial profile fields
 */
export function parseResumeText(text = '') {
  const flat = normalizeWhitespace(text);
  const lower = flat.toLowerCase();

  const email = (flat.match(EMAIL_RE) || [])[0] || '';
  const phone = (flat.match(PHONE_RE) || [])[0]?.trim() || '';
  const linkedin = (flat.match(LINKEDIN_RE) || [])[0] || '';
  const github = (flat.match(GITHUB_RE) || [])[0] || '';

  // Portfolio = first http(s) link that is not linkedin or github.
  const allUrls = flat.match(URL_RE) || [];
  const portfolio =
    allUrls.find((u) => !/linkedin\.com|github\.com/i.test(u)) || '';

  const skills = KNOWN_SKILLS.filter((skill) => {
    const re = new RegExp(`(^|[^a-z0-9])${skill.replace(/[.+#]/g, '\\$&')}([^a-z0-9]|$)`, 'i');
    return re.test(lower);
  });

  const titles = TITLE_HINTS.filter((t) => lower.includes(t));

  // Name heuristic: first non-empty line of the original text, if it looks like a name
  // (<= 4 words, mostly letters). Left empty if uncertain (requirement 1.2).
  let name = '';
  const firstLines = String(text).split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (firstLines.length) {
    const candidate = firstLines[0];
    const words = candidate.split(/\s+/);
    if (words.length <= 4 && /^[A-Za-z.\s]+$/.test(candidate)) {
      name = candidate;
    }
  }

  return {
    name,
    email,
    phone,
    links: { linkedin, github, portfolio },
    skills: dedupe(skills),
    titles: dedupe(titles),
    locations: [], // left for manual entry; low-confidence to parse reliably
    rawResumeText: text,
  };
}

function dedupe(arr) {
  return [...new Set(arr.map((s) => s.toLowerCase()))];
}

/**
 * Full ingest: buffer -> text -> structured fields.
 * @param {Buffer} buffer
 */
export async function ingestResume(buffer) {
  const text = await extractPdfText(buffer);
  const parsed = parseResumeText(text);
  logger.info(
    `Resume parsed: ${parsed.skills.length} skills, ${parsed.titles.length} title hints`
  );
  return parsed;
}
