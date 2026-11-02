import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api.js';
import JobSearchForm from '../components/JobSearchForm.jsx';
import SaveJob from '../components/SaveJob.jsx';

const STATUSES = ['', 'new', 'saved', 'applied', 'rejected', 'interview'];

export default function DashboardPage() {
  const [listings, setListings] = useState([]);
  const [filters, setFilters] = useState({ status: '', minScore: '' });
  const [error, setError] = useState('');
  const [connectedSources, setConnectedSources] = useState([]);
  const [fetching, setFetching] = useState(false);
  const [fetchMsg, setFetchMsg] = useState('');

  function load() {
    api.getListings(filters).then(setListings).catch((e) => setError(e.message));
  }

  useEffect(() => {
    // Offer in-app fetching only when a CREDENTIALED official source is connected
    // (e.g. the LinkedIn official API). Keyless sources like Remotive are excluded
    // because they are blocked by the network here and would only error.
    api
      .getSources()
      .then((all) =>
        setConnectedSources(all.filter((s) => s.effective && s.requiresCredentials))
      )
      .catch(() => {});
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [filters]);

  async function runFetch() {
    setError('');
    setFetchMsg('');
    setFetching(true);
    try {
      const summary = await api.runFetch();
      const errored = Object.entries(summary.perSource || {})
        .filter(([, v]) => v.status !== 'ok')
        .map(([k, v]) => `${k}: ${v.status}`);
      let msg = `Fetched ${summary.inserted} new jobs (${summary.strongMatches} strong matches).`;
      if (errored.length) msg += ` Sources with issues — ${errored.join(', ')}.`;
      setFetchMsg(msg);
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setFetching(false);
    }
  }

  const hasConnectedSource = connectedSources.length > 0;

  return (
    <div>
      <h1>Dashboard</h1>

      {hasConnectedSource && (
        <div className="panel">
          <h2>Connected job sources</h2>
          <p className="muted">
            Fetching pulls jobs directly into this app from your connected official
            source(s): {connectedSources.map((s) => s.label).join(', ')}.
          </p>
          <button onClick={runFetch} disabled={fetching}>
            {fetching ? 'Fetching...' : 'Fetch jobs now'}
          </button>{' '}
          {fetchMsg && <span className="success">{fetchMsg}</span>}
        </div>
      )}

      <JobSearchForm />

      <SaveJob onSaved={load} />

      <div className="panel">
        <h2>Tracked jobs</h2>
        <div className="row">
          <div>
            <label>Status</label>
            <select value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s || 'All'}</option>
              ))}
            </select>
          </div>
          <div>
            <label>Min score</label>
            <input
              type="number"
              style={{ width: 90 }}
              value={filters.minScore}
              onChange={(e) => setFilters((f) => ({ ...f, minScore: e.target.value }))}
            />
          </div>
        </div>
        {error && <p className="error">{error}</p>}
      </div>

      <div className="panel">
        <table>
          <thead>
            <tr>
              <th>Score</th>
              <th>Title</th>
              <th>Company</th>
              <th>Location</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {listings.map((l) => (
              <tr key={l._id}>
                <td className="score">
                  {l.matchScore}
                  {l.isStrongMatch && <span className="badge strong" style={{ marginLeft: 6 }}>strong</span>}
                </td>
                <td><Link to={`/listings/${l._id}`}>{l.title || '(untitled)'}</Link></td>
                <td>{l.company}</td>
                <td>{l.remote ? 'Remote' : l.location}</td>
                <td><span className="badge">{l.status}</span></td>
              </tr>
            ))}
            {listings.length === 0 && (
              <tr><td colSpan="5" className="muted">No jobs yet. Use "Search jobs on LinkedIn" above, then paste a job URL into "Save a job to track".</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
