import React, { useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import Emblem from '../components/Emblem.jsx';
import { Button } from '../components/ui.jsx';
import { useAuth } from '../hooks/useAuth.jsx';

// Shown instead of the whole site until a visitor is verified. Two states:
//  - arrived via /enter/:token → the one-time Governor ID form
//  - arrived any other way (no token) → a plain "private" message that
//    points back to the access link
// A visitor who is already verified never sees either: opening the access
// link again simply takes them straight in.
export default function AccessGate() {
  const { token } = useParams();
  const { verifyMember, memberVerified } = useAuth();
  const [governorId, setGovernorId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (memberVerified) return <Navigate to="/" replace />;

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      // On success the verified state flips and the redirect above takes over.
      await verifyMember(governorId.trim(), token);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
      setBusy(false);
    }
  }

  return (
    <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 40 }}>
      <div style={{ textAlign: 'center', maxWidth: 420, width: '100%' }}>
        <Emblem size={70} className="mx-auto" />

        {token ? (
          <>
            <h1 className="mt-2" style={{ fontSize: 28 }}>Enter your Governor ID</h1>
            <p style={{ color: 'var(--text-2)', margin: '10px 0 22px' }}>
              One quick check. After this, the site remembers you on this device.
            </p>
            <form onSubmit={onSubmit}>
              <input
                className="input"
                style={{ textAlign: 'center', fontSize: 20, letterSpacing: '0.04em' }}
                placeholder="9-digit Governor ID"
                aria-label="Governor ID"
                inputMode="numeric"
                maxLength={9}
                value={governorId}
                onChange={(e) => setGovernorId(e.target.value.replace(/\D/g, ''))}
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
              Open the access link your alliance leader shared in the alliance chat.
              If you've used it before, opening it again takes you straight in.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
