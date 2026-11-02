import { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { parseList, listToText } from '../utils/list.js';

export default function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  // Raw text for comma-separated fields, so typing commas/spaces works normally.
  // These are parsed into arrays only at save time.
  const [skillsText, setSkillsText] = useState('');
  const [titlesText, setTitlesText] = useState('');
  const [locationsText, setLocationsText] = useState('');

  function syncListTextFrom(p) {
    setSkillsText(listToText(p.skills));
    setTitlesText(listToText(p.titles));
    setLocationsText(listToText(p.locations));
  }

  useEffect(() => {
    api
      .getProfile()
      .then((p) => {
        setProfile(p);
        syncListTextFrom(p);
      })
      .catch((e) => setError(e.message));
  }, []);

  function updateField(field, value) {
    setProfile((p) => ({ ...p, [field]: value }));
  }

  function updateLink(key, value) {
    setProfile((p) => ({ ...p, links: { ...p.links, [key]: value } }));
  }

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setStatus('Parsing resume...');
    try {
      const updated = await api.uploadResume(file);
      setProfile(updated);
      syncListTextFrom(updated);
      setStatus('Resume parsed. Review the fields below.');
    } catch (err) {
      setStatus('');
      setError(err.message);
    }
  }

  async function handleSave() {
    setError('');
    setStatus('Saving...');
    try {
      const { name, email, phone, links } = profile;
      const payload = {
        name,
        email,
        phone,
        links,
        skills: parseList(skillsText),
        titles: parseList(titlesText),
        locations: parseList(locationsText),
      };
      const saved = await api.updateProfile(payload);
      setProfile(saved);
      syncListTextFrom(saved);
      setStatus('Saved.');
    } catch (err) {
      setStatus('');
      setError(err.message);
    }
  }

  if (!profile) {
    return <div className="panel">{error ? <span className="error">{error}</span> : 'Loading...'}</div>;
  }

  return (
    <div>
      <h1>Profile</h1>

      <div className="panel">
        <h2>Upload base resume (PDF)</h2>
        <input type="file" accept="application/pdf" onChange={handleUpload} />
        <p className="muted">
          Uploading re-parses skills and links, merging with what you already have. Manual
          edits (like locations) are preserved.
        </p>
      </div>

      <div className="panel">
        <h2>Details</h2>
        <label>Name</label>
        <input type="text" value={profile.name || ''} onChange={(e) => updateField('name', e.target.value)} />
        <label>Email</label>
        <input type="text" value={profile.email || ''} onChange={(e) => updateField('email', e.target.value)} />
        <label>Phone</label>
        <input type="text" value={profile.phone || ''} onChange={(e) => updateField('phone', e.target.value)} />
        <label>LinkedIn</label>
        <input type="text" value={profile.links?.linkedin || ''} onChange={(e) => updateLink('linkedin', e.target.value)} />
        <label>GitHub</label>
        <input type="text" value={profile.links?.github || ''} onChange={(e) => updateLink('github', e.target.value)} />
        <label>Portfolio</label>
        <input type="text" value={profile.links?.portfolio || ''} onChange={(e) => updateLink('portfolio', e.target.value)} />

        <label>Skills (separate with commas)</label>
        <input
          type="text"
          placeholder="e.g. React, Node.js, MongoDB"
          value={skillsText}
          onChange={(e) => setSkillsText(e.target.value)}
        />
        <label>Titles (separate with commas)</label>
        <input
          type="text"
          placeholder="e.g. Full Stack Developer, Backend Engineer"
          value={titlesText}
          onChange={(e) => setTitlesText(e.target.value)}
        />
        <label>Locations (separate with commas)</label>
        <input
          type="text"
          placeholder="e.g. Bengaluru, Remote"
          value={locationsText}
          onChange={(e) => setLocationsText(e.target.value)}
        />

        <div style={{ marginTop: 14 }}>
          <button onClick={handleSave}>Save profile</button>{' '}
          {status && <span className="success">{status}</span>}
          {error && <span className="error">{error}</span>}
        </div>
      </div>
    </div>
  );
}
