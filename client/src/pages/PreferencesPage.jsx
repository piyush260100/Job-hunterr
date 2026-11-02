import { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { parseList, listToText } from '../utils/list.js';

export default function PreferencesPage() {
  const [prefs, setPrefs] = useState(null);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  // Raw text for comma-separated fields so typing commas/spaces works normally.
  const [titlesText, setTitlesText] = useState('');
  const [keywordsText, setKeywordsText] = useState('');
  const [locationsText, setLocationsText] = useState('');

  function syncListTextFrom(p) {
    setTitlesText(listToText(p.titles));
    setKeywordsText(listToText(p.keywords));
    setLocationsText(listToText(p.locations));
  }

  useEffect(() => {
    api
      .getPreferences()
      .then((p) => {
        setPrefs(p);
        syncListTextFrom(p);
      })
      .catch((e) => setError(e.message));
  }, []);

  function set(field, value) {
    setPrefs((p) => ({ ...p, [field]: value }));
  }

  async function handleSave() {
    setError('');
    setStatus('Saving...');
    try {
      const payload = {
        ...prefs,
        titles: parseList(titlesText),
        keywords: parseList(keywordsText),
        locations: parseList(locationsText),
      };
      const saved = await api.updatePreferences(payload);
      setPrefs(saved);
      syncListTextFrom(saved);
      setStatus('Saved. Applies on the next fetch cycle.');
    } catch (err) {
      setStatus('');
      setError(err.message);
    }
  }

  if (!prefs) {
    return <div className="panel">{error ? <span className="error">{error}</span> : 'Loading...'}</div>;
  }

  return (
    <div>
      <h1>Search preferences</h1>
      <div className="panel">
        <label>Target titles (separate with commas)</label>
        <input
          type="text"
          placeholder="e.g. Full Stack Developer, Backend Engineer"
          value={titlesText}
          onChange={(e) => setTitlesText(e.target.value)}
        />

        <label>Keywords / skills (separate with commas)</label>
        <input
          type="text"
          placeholder="e.g. React, Node.js, MongoDB"
          value={keywordsText}
          onChange={(e) => setKeywordsText(e.target.value)}
        />

        <label>Locations (separate with commas)</label>
        <input
          type="text"
          placeholder="e.g. Bengaluru, Remote"
          value={locationsText}
          onChange={(e) => setLocationsText(e.target.value)}
        />

        <div className="row">
          <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="checkbox" checked={!!prefs.remote} onChange={(e) => set('remote', e.target.checked)} /> Remote
          </label>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="checkbox" checked={!!prefs.onsite} onChange={(e) => set('onsite', e.target.checked)} /> Onsite
          </label>
        </div>

        <label>Strong-match threshold (0-100)</label>
        <input type="number" value={prefs.strongMatchThreshold ?? 70} onChange={(e) => set('strongMatchThreshold', Number(e.target.value))} />

        <label>Fetch interval (minutes)</label>
        <input type="number" value={prefs.fetchIntervalMinutes ?? 15} onChange={(e) => set('fetchIntervalMinutes', Number(e.target.value))} />

        <div style={{ marginTop: 14 }}>
          <button onClick={handleSave}>Save preferences</button>{' '}
          {status && <span className="success">{status}</span>}
          {error && <span className="error">{error}</span>}
        </div>
      </div>
    </div>
  );
}
