import { useState } from 'react';
import { api } from '../services/api.js';

/**
 * Save a job by URL into the tracked pipeline. Captures any posting (LinkedIn or
 * elsewhere), scores it against the profile, dedupes, and tracks it. No scraping;
 * the user pastes the URL after finding the job themselves.
 */
export default function SaveJob({ onSaved }) {
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({
    url: '',
    title: '',
    company: '',
    location: '',
    remote: false,
  });

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function detectPortal(url) {
    try {
      const host = new URL(url).hostname.replace(/^www\./, '');
      if (host.includes('linkedin')) return 'LinkedIn';
      if (host.includes('naukri')) return 'Naukri';
      if (host.includes('indeed')) return 'Indeed';
      if (host.includes('wellfound') || host.includes('angel')) return 'Wellfound';
      return host;
    } catch {
      return '';
    }
  }

  async function save() {
    setError('');
    setMessage('');
    if (!/^https?:\/\//i.test(form.url.trim())) {
      setError('Paste a valid job URL starting with http(s).');
      return;
    }
    setSaving(true);
    try {
      const listing = await api.saveManualListing(form);
      setMessage(`Saved "${listing.title || listing.url}" (score ${listing.matchScore}).`);
      setForm({ url: '', title: '', company: '', location: '', remote: false });
      if (onSaved) onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  const detected = form.url ? detectPortal(form.url) : '';

  return (
    <div className="panel">
      <h2>Save a job to track</h2>
      <p className="muted">
        Found a job worth tracking? Paste its URL to add it to your pipeline, scored
        against your profile. You apply on the original site.
      </p>
      <label>
        Job URL (required){detected && <span className="muted"> — detected: {detected}</span>}
      </label>
      <input
        type="text"
        placeholder="https://www.linkedin.com/jobs/view/..."
        value={form.url}
        onChange={(e) => set('url', e.target.value)}
      />
      <div className="row">
        <div style={{ flex: 1 }}>
          <label>Title</label>
          <input type="text" value={form.title} onChange={(e) => set('title', e.target.value)} />
        </div>
        <div style={{ flex: 1 }}>
          <label>Company</label>
          <input type="text" value={form.company} onChange={(e) => set('company', e.target.value)} />
        </div>
      </div>
      <div className="row">
        <div style={{ flex: 1 }}>
          <label>Location</label>
          <input type="text" value={form.location} onChange={(e) => set('location', e.target.value)} />
        </div>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 24 }}>
          <input type="checkbox" checked={form.remote} onChange={(e) => set('remote', e.target.checked)} /> Remote
        </label>
      </div>
      <div style={{ marginTop: 14 }}>
        <button onClick={save} disabled={saving}>
          {saving ? 'Saving...' : 'Save & score job'}
        </button>{' '}
        {message && <span className="success">{message}</span>}
        {error && <span className="error">{error}</span>}
      </div>
    </div>
  );
}
