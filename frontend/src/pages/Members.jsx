import React from 'react';
import { useAsync } from '../hooks/useAsync.js';
import api from '../services/api.js';
import { LoadingBox, EmptyState, ErrorState } from '../components/ui.jsx';
import Avatar from '../components/Avatar.jsx';
import Emblem from '../components/Emblem.jsx';
import { IconBolt } from '../components/icons.jsx';
import { num, fmtDate } from '../utils/format.js';

const ROLE_LABEL = { R5: 'R5', R4: 'R4', R3: 'R3', R2: 'R2', R1: 'R1' };

export default function Members() {
  const { data, loading, error, reload } = useAsync(() => api.get('/members'), []);

  if (loading) return <div className="page"><LoadingBox label="Summoning the roster…" /></div>;
  if (error) return <div className="page"><ErrorState error={error} onRetry={reload} /></div>;

  const members = data;

  return (
    <div className="page">
      <div className="members-head">
        <div className="members-head-left">
          <span className="mh-badge" aria-hidden="true"><Emblem size={30} /></span>
          <h1 className="page-title">Alliance members</h1>
        </div>
        <span className="mh-count"><span className="status-dot" aria-hidden="true" />{num(members.length)} Members</span>
      </div>
      <p className="page-sub mb-2">
        Every member's public profile. Private details such as Game User ID and email are visible to admins only.
      </p>

      {members.length === 0 ? (
        <EmptyState icon="🛡️" title="No members registered">Once the command registers members, their profiles appear here.</EmptyState>
      ) : (
        <div className="member-rows">
          {members.map((m) => {
            return (
              <div className="card card-hover member-row" key={m.id}>
                <span className="mr-avatar-wrap">
                  <Avatar src={m.avatar} name={m.name} size={62} />
                  <span
                    className={`mr-avatar-dot st-${m.status}`}
                    title={m.status}
                    aria-label={`Status: ${m.status}`}
                  />
                </span>

                <div className="mr-id">
                  <span className="mr-role">{ROLE_LABEL[m.role] || m.role}</span>
                  <span className="mr-name">{m.name}</span>
                  <span className="mr-contrib" title={`${num(m.contributions)} contributions`}>
                    <IconBolt /> {num(m.contributions)} contributions
                  </span>
                </div>

                <div className="mr-score">
                  <span className="mr-score-label"><b>Alliance</b> Power</span>
                  <span className="mr-score-value">{num(m.score)}</span>
                </div>

                <div className="mr-status">
                  <span className={`mr-pill st-${m.status}`}>{m.status}</span>
                  <span className="mr-since">Since {fmtDate(m.join_date, { year: 'numeric', month: 'short' })}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
