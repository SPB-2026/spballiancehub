import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import Emblem from '../components/Emblem.jsx';
import { Button } from '../components/ui.jsx';
import { useAuth } from '../hooks/useAuth.jsx';

// Shown instead of the whole site until a visitor is verified. Two states:
//  - arrived via /enter/:token → show the one-time Game ID form
//  - arrived any other way (no token) → show a plain locked message, with
//    nothing to type or guess at
export default function AccessGate() {
  const { token } = useParams();
  const { verifyMember } = useAuth();
  const [gameId, setGameId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await verifyMember(gameId.trim(), token);
      // Drop the token from the URL and let the app re-render as verified.
      window.history.replaceState(null, '', '/');
      window.location.reload();
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 40 }}>
      <div style={{ textAlign: 'center', maxWidth: 420, width: '100%' }}>
        <Emblem size={70} className="mx-auto" />

        {token ? (
          <>
            <h1 className="mt-2" style={{ fontSize: 28 }}>Enter your Game ID</h1>
            <p style={{ color: 'var(--text-2)', margin: '10px 0 22px' }}>
              One-time check — this unlocks the alliance hub on this device going forward.
            </p>
            <form onSubmit={onSubmit}>
              <input
                className="input"
                style={{ textAlign: 'center', fontSize: 18, letterSpacing: '0.04em' }}
                placeholder="9-digit Game User ID"
                inputMode="numeric"
                maxLength={9}
                value={gameId}
                onChange={(e) => setGameId(e.target.value.replace(/\D/g, ''))}
                autoFocus
              />
              {error ? <p style={{ color: 'var(--red)', marginTop: 10, fontSize: 13.5 }}>{error}</p> : null}
              <Button type="submit" className="mt-2" loading={busy} style={{ width: '100%' }}>
                Continue
              </Button>
            </form>
          </>
        ) : (
          <>
            <h1 className="mt-2" style={{ fontSize: 28 }}>This alliance hub is private</h1>
            <p style={{ color: 'var(--text-2)', margin: '10px 0 0' }}>
              Ask your alliance for access.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
