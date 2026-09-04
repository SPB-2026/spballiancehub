import React from 'react';
import { Link } from 'react-router-dom';
import Emblem from '../components/Emblem.jsx';

export default function NotFound() {
  return (
    <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 40 }}>
      <div style={{ textAlign: 'center', maxWidth: 420 }}>
        <Emblem size={70} className="mx-auto" />
        <h1 className="mt-2" style={{ fontSize: 40 }}>404</h1>
        <p style={{ color: 'var(--text-2)', margin: '10px 0 22px' }}>
          These coordinates are not on the alliance map. The page you seek has wandered off.
        </p>
        <Link to="/" className="btn btn-gold">Return to Command Center</Link>
      </div>
    </div>
  );
}
