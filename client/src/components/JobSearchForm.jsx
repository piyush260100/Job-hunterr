import { useEffect, useState } from 'react';
import { api } from '../services/api.js';

/**
 * LinkedIn job search form with a role field and LinkedIn's filters (date posted,
 * workplace type, experience level, job type, easy-apply, sort). Builds the search URL
 * on the server and opens it in the user's own browser session (compliant; no scraping).
 *
 * LinkedIn is the only job portal reachable on this network, so this focuses on it.
 */
const EMPTY_QUERY = {
  role: '',
  location: '',
  datePosted: 'day',
  workplace: [],
  experience: [],
  jobType: [],
  minSalary: '',
  minExperienceYears: '',
  easyApply: false,
  sort: 'date',
};

export default function JobSearchForm() {
  const [options, setOptions] = useState(null);
  const [notes, setNotes] = useState({});
  const [error, setError] = useState('');
  const [presets, setPresets] = useState([]);
  const [presetName, setPresetName] = useState('');
  const [presetMsg, setPresetMsg] = useState('');
  const [q, setQ] = useState({ ...EMPTY_QUERY });

  function loadPresets() {
    api.getPresets().then(setPresets).catch(() => {});
  }

  useEffect(() => {
    api
      .getLinkedInFilters()
      .then((res) => {
        setOptions(res.options);
        setNotes(res.notes || {});
      })
      .catch((e) => setError(e.message));
    loadPresets();
  }, []);

  async function openSearchFor(query) {
    setError('');
    try {
      const { url } = await api.buildSearch(query);
      window.open(url, '_blank', 'noopener');
    } catch (e) {
      setError(e.message);
    }
  }

  async function savePreset() {
    setPresetMsg('');
    setError('');
    const name = presetName.trim();
    if (!name) {
      setError('Enter a name for this search preset.');
      return;
    }
    try {
      await api.createPreset({ ...q, name });
      setPresetName('');
      setPresetMsg(`Saved preset "${name}".`);
      loadPresets();
    } catch (e) {
      setError(e.message);
    }
  }

  function runPreset(p) {
    // Load the preset into the form and open the search.
    const query = {
      role: p.role || '',
      location: p.location || '',
      datePosted: p.datePosted || 'any',
      workplace: p.workplace || [],
      experience: p.experience || [],
      jobType: p.jobType || [],
      minSalary: p.minSalary || '',
      minExperienceYears: p.minExperienceYears ?? '',
      easyApply: !!p.easyApply,
      sort: p.sort || 'date',
    };
    setQ(query);
    openSearchFor(query);
  }

  async function removePreset(id) {
    setError('');
    try {
      await api.deletePreset(id);
      loadPresets();
    } catch (e) {
      setError(e.message);
    }
  }

  function set(field, value) {
    setQ((prev) => ({ ...prev, [field]: value }));
  }

  function toggle(field, value) {
    setQ((prev) => {
      const list = prev[field];
      return {
        ...prev,
        [field]: list.includes(value) ? list.filter((v) => v !== value) : [...list, value],
      };
    });
  }

  function search() {
    return openSearchFor(q);
  }

  if (!options) {
    return <div className="panel">{error ? <span className="error">{error}</span> : 'Loading search...'}</div>;
  }

  return (
    <div className="panel">
      <h2>Search jobs on LinkedIn</h2>
      <p className="muted">
        Enter a role and filters, then open the exact search on LinkedIn in your own
        browser. LinkedIn is the only reachable portal on this network.
      </p>

      <div className="row">
        <div style={{ flex: 2 }}>
          <label>Role / keywords</label>
          <input
            type="text"
            placeholder="e.g. Senior Full Stack Developer"
            value={q.role}
            onChange={(e) => set('role', e.target.value)}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label>Location</label>
          <input
            type="text"
            placeholder="e.g. Bengaluru or India"
            value={q.location}
            onChange={(e) => set('location', e.target.value)}
          />
        </div>
      </div>

      <div className="row" style={{ marginTop: 8 }}>
        <div>
          <label>Date posted</label>
          <select value={q.datePosted} onChange={(e) => set('datePosted', e.target.value)}>
            {options.datePosted.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label>Sort by</label>
          <select value={q.sort} onChange={(e) => set('sort', e.target.value)}>
            {options.sort.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 24 }}>
          <input type="checkbox" checked={q.easyApply} onChange={(e) => set('easyApply', e.target.checked)} />
          Easy Apply only
        </label>
      </div>

      <FilterGroup title="Workplace" options={options.workplace} selected={q.workplace} onToggle={(v) => toggle('workplace', v)} />
      <FilterGroup title="Experience level" options={options.experience} selected={q.experience} onToggle={(v) => toggle('experience', v)} />
      <FilterGroup title="Job type" options={options.jobType} selected={q.jobType} onToggle={(v) => toggle('jobType', v)} />

      <div className="row" style={{ marginTop: 12 }}>
        <div>
          <label>Min experience (years)</label>
          <input
            type="number"
            min="0"
            style={{ width: 120 }}
            placeholder="e.g. 3"
            value={q.minExperienceYears}
            onChange={(e) => set('minExperienceYears', e.target.value)}
          />
        </div>
        <div>
          <label>Min salary</label>
          <select value={q.minSalary} onChange={(e) => set('minSalary', e.target.value)}>
            {(options.minSalary || []).map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>
      {q.minExperienceYears && notes.minExperienceYears && (
        <p className="muted" style={{ marginTop: 6 }}>{notes.minExperienceYears}</p>
      )}
      {q.minSalary && notes.minSalary && (
        <p className="muted" style={{ marginTop: 6 }}>{notes.minSalary}</p>
      )}

      <div style={{ marginTop: 14 }}>
        <button onClick={search}>Search on LinkedIn</button>{' '}
        {error && <span className="error">{error}</span>}
      </div>

      <hr style={{ borderColor: 'var(--border)', margin: '16px 0' }} />

      <h2>Saved searches</h2>
      <div className="row">
        <div style={{ flex: 1 }}>
          <label>Save current filters as a preset</label>
          <input
            type="text"
            placeholder="e.g. Remote senior MERN roles"
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
          />
        </div>
        <div>
          <button className="secondary" onClick={savePreset}>Save this search</button>
        </div>
      </div>
      {presetMsg && <p className="success">{presetMsg}</p>}

      {presets.length === 0 ? (
        <p className="muted">No saved searches yet. Set filters above and save one to re-run it later.</p>
      ) : (
        <div className="chips" style={{ marginTop: 10, flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
          {presets.map((p) => (
            <div key={p._id} className="preset-row">
              <div>
                <strong>{p.name}</strong>{' '}
                <span className="muted">
                  {[p.role || 'any role', p.location, ...(p.workplace || [])].filter(Boolean).join(' · ')}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => runPreset(p)}>Run</button>
                <button className="secondary" onClick={() => removePreset(p._id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FilterGroup({ title, options, selected, onToggle }) {
  return (
    <div style={{ marginTop: 12 }}>
      <label>{title}</label>
      <div className="chips">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            className={`chip ${selected.includes(o.value) ? 'chip-on' : ''}`}
            onClick={() => onToggle(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
