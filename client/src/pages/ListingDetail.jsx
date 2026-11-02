import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api.js';

const STATUSES = ['new', 'saved', 'applied', 'rejected', 'interview'];

export default function ListingDetail() {
  const { id } = useParams();
  const [listing, setListing] = useState(null);
  const [error, setError] = useState('');
  const [tailoring, setTailoring] = useState(false);
  const [message, setMessage] = useState('');

  function load() {
    api.getListing(id).then(setListing).catch((e) => setError(e.message));
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [id]);

  async function setStatus(status) {
    setError('');
    try {
      const updated = await api.setListingStatus(id, status);
      setListing(updated);
    } catch (e) {
      setError(e.message);
    }
  }

  function downloadText(filename, content) {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function copyText(content) {
    try {
      await navigator.clipboard.writeText(content);
      setMessage('Copied to clipboard.');
    } catch {
      setError('Could not copy to clipboard.');
    }
  }

  function safeName(suffix) {
    const base = `${(listing.company || 'job').replace(/[^a-z0-9]+/gi, '_')}_${suffix}`;
    return `${base}.txt`.toLowerCase();
  }

  async function tailor() {
    setError('');
    setMessage('');
    setTailoring(true);
    try {
      const updated = await api.tailorListing(id);
      setListing(updated);
      setMessage('Tailored documents generated below. Review and edit before using.');
    } catch (e) {
      setError(e.message);
    } finally {
      setTailoring(false);
    }
  }

  if (!listing) {
    return <div className="panel">{error ? <span className="error">{error}</span> : 'Loading...'}</div>;
  }

  return (
    <div>
      <p><Link to="/">&larr; Back to dashboard</Link></p>
      <h1>{listing.title}</h1>

      <div className="panel">
        <p>
          <strong>{listing.company}</strong> · {listing.remote ? 'Remote' : listing.location}{' '}
          · <span className="score">{listing.matchScore}/100</span>
          {listing.isStrongMatch && <span className="badge strong" style={{ marginLeft: 6 }}>strong match</span>}
        </p>
        <p className="muted">Source: {listing.sourceKey}</p>
        {listing.url && (
          <p><a href={listing.url} target="_blank" rel="noreferrer"><button>Apply on source site</button></a></p>
        )}

        <label>Status</label>
        <div className="row">
          {STATUSES.map((s) => (
            <button
              key={s}
              className={listing.status === s ? '' : 'secondary'}
              onClick={() => setStatus(s)}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="panel">
        <h2>Description</h2>
        <p style={{ whiteSpace: 'pre-wrap' }}>{listing.description || 'No description provided.'}</p>
      </div>

      <div className="panel">
        <h2>Tailored documents (optional)</h2>
        <p className="muted">
          Requires an LLM API key configured on the server. You review, edit, and submit
          everything yourself.
        </p>
        <button onClick={tailor} disabled={tailoring}>
          {tailoring ? 'Generating...' : 'Generate tailored resume & cover letter'}
        </button>
        {message && <p className="success">{message}</p>}
        {error && <p className="error">{error}</p>}

        {listing.tailoredDocs?.resume && (
          <>
            <label>Tailored resume</label>
            <textarea rows="10" readOnly value={listing.tailoredDocs.resume} />
            <div className="row" style={{ marginTop: 8 }}>
              <button className="secondary" onClick={() => downloadText(safeName('resume'), listing.tailoredDocs.resume)}>
                Download resume
              </button>
              <button className="secondary" onClick={() => copyText(listing.tailoredDocs.resume)}>
                Copy resume
              </button>
            </div>
          </>
        )}
        {listing.tailoredDocs?.coverLetter && (
          <>
            <label>Cover letter</label>
            <textarea rows="10" readOnly value={listing.tailoredDocs.coverLetter} />
            <div className="row" style={{ marginTop: 8 }}>
              <button className="secondary" onClick={() => downloadText(safeName('cover_letter'), listing.tailoredDocs.coverLetter)}>
                Download cover letter
              </button>
              <button className="secondary" onClick={() => copyText(listing.tailoredDocs.coverLetter)}>
                Copy cover letter
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
