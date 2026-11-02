import { useEffect, useState } from 'react';
import { api } from '../services/api.js';

/**
 * Global status banner. Polls /api/health and warns when the server is unreachable
 * or the database is not connected, so the user understands why data features are
 * unavailable before they click anything.
 */
export default function StatusBanner() {
  const [state, setState] = useState({ loading: true, serverUp: false, dbConnected: false });

  async function check() {
    try {
      const h = await api.getHealth();
      setState({ loading: false, serverUp: true, dbConnected: Boolean(h.dbConnected) });
    } catch {
      setState({ loading: false, serverUp: false, dbConnected: false });
    }
  }

  useEffect(() => {
    check();
    const id = setInterval(check, 10000); // re-check every 10s
    return () => clearInterval(id);
  }, []);

  if (state.loading) return null;

  // Everything healthy: no banner.
  if (state.serverUp && state.dbConnected) return null;

  if (!state.serverUp) {
    return (
      <div className="banner banner-error">
        Can't reach the backend at the API URL. Make sure the server is running
        (<code>npm run dev</code> in <code>/server</code>).
      </div>
    );
  }

  // Server up but DB not connected.
  return (
    <div className="banner banner-warn">
      Database not connected. Browsing and diagnostics work, but saving or loading jobs,
      profile, and preferences is disabled. Add <code>MONGODB_URI</code> to
      {' '}<code>server/.env</code> and the server will reconnect automatically.
    </div>
  );
}
