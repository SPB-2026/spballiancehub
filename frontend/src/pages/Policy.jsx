import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import { Badge } from '../components/ui.jsx';

const UPDATED = '29 August 2026';

const POLICIES = {
  privacy: {
    title: 'Privacy Policy',
    intro: 'The SPB Alliance Hub is a private command center for verified members of the SPB Alliance in Kingshot. This policy explains what we store, who can see it, and what we never do with it.',
    sections: [
      {
        h: 'What we collect',
        p: [
          'Account credentials — your Kingshot Game User ID (exactly 9 digits) and the email address registered by an alliance officer. These are used only to verify that you are a real SPB member, and they are visible to admins only. No other member can see them.',
          'Public profile — your display name, rank (R5–R1), avatar, bio, contributions and power. These are shown to other members on the Members page, profiles and leaderboard.',
          'Activity — your last-active time and gift-code redemptions.',
        ],
      },
      {
        h: 'What we never do',
        p: [
          'We do not run advertising, tracking pixels or third-party analytics on this site.',
          'We do not sell, rent or share member data with anyone outside the alliance.',
          'We do not store payment information — gift codes are redeemed in-app and only the fact of redemption is recorded.',
          'We do not collect anything you did not type into this hub yourself.',
        ],
      },
      {
        h: 'Security',
        p: [
          'Sessions use HTTP-only cookies with a 72-hour admin and 30-day member lifetime, passwords are hashed with bcrypt, login attempts are rate-limited, and every admin action is logged in an audit trail. Admin and member accounts are fully separate systems.',
        ],
      },
      {
        h: 'Your data, your say',
        p: [
          'Ask R5 (Alliance Leader) to correct your bio, change your avatar, or remove your account entirely — removal is immediate and your access ends at once. Contact the alliance through the address shown in the footer.',
        ],
      },
    ],
  },

  terms: {
    title: 'Terms of Service',
    intro: 'By signing in to the SPB Alliance Hub you agree to these terms. They are short, plain and final — the command does not negotiate with its own members.',
    sections: [
      {
        h: 'Who may use this site',
        p: [
          'The hub is private. Access is limited to verified SPB Alliance members, identified by a 9-digit Kingshot Game User ID plus the email an officer registered for you. If you do not have those credentials, an officer added you by mistake or you are a tourist — please leave.',
        ],
      },
      {
        h: 'Your account',
        p: [
          'You are responsible for keeping your login credentials secret. If you suspect someone is using your hub account, tell an officer immediately. The command may set any account to inactive or banned at its discretion, and an inactive account cannot sign in until reactivated.',
        ],
      },
      {
        h: 'Permitted use',
        p: [
          'Use the hub for what it exists for: alliance news, war planning, event coordination, tips and gift codes. Be the kind of member you would want to have in your own war wave.',
        ],
      },
      {
        h: 'Prohibited use',
        p: [
          'Harassing, threatening or discriminating against other members. Leaking private member data (Game User IDs or emails are admin-visible only — never share them). Attempting to bypass authentication, scrape the site, or probe the API. Any attempt to use the hub against the alliance\u2019s interest.',
        ],
      },
      {
        h: 'No warranty',
        p: [
          'The hub and everything in it — schedules, tips, gift codes — are provided as-is, with all the reliability of a volunteer-run operation. Kingshot is developed by a third party and this site is not affiliated with or endorsed by them. War plans change; so does the game. We do the best we can with what we have.',
        ],
      },
      {
        h: 'Changes to these terms',
        p: [
          'The command may update the hub and these terms as the alliance grows. Continuing to use the site after changes means you accept them. Significant changes will be announced on the Home page board.',
        ],
      },
      {
        h: 'Contact',
        p: [
          'Questions or disputes: contact any R4 or R5, or email the address in the footer. Only R5 holds the final word.',
        ],
      },
    ],
  },

  guidelines: {
    title: 'Community Guidelines',
    intro: 'SPB wins because we act like one unit. These guidelines describe the standard every member is held to, from R1 recruits to R5 command.',
    sections: [
      {
        h: 'Be a team player',
        p: [
          'Attend the events you can. If a war or drill has your name on the plan and you cannot make it, say so to the command before it starts — silence is the only real failure. Report in when you arrive; the command tracks who is actually showing up.',
        ],
      },
      {
        h: 'Communication',
        p: [
          'Wherever the alliance communicates — in-game or on our Discord — the same standard applies: no personal attacks, no flaming, no spam, no flooding. Say what you would say with the whole alliance listening.',
          'Never share a member\u2019s private data. Game User IDs and emails are admin-only on purpose.',
        ],
      },
      {
        h: 'In-game conduct',
        p: [
          'No griefing, scumming or self-dealing against SPB members — in wars, in resource raids, in gift-code redemptions. Follow the posted war plans and signals; if you disagree with the plan, raise it with the command before the wave, not mid-attack. Exploit nothing that hurts an ally, and report bugs to the command instead of farming them quietly.',
        ],
      },
      {
        h: 'Gift codes',
        p: [
          'Gift codes are alliance rewards with per-member limits. Redeeming beyond your limit, or reselling codes outside the alliance, is a strike offense.',
        ],
      },
      {
        h: 'Enforcement',
        p: [
          'Officers enforce a simple ladder: a private warning, then repeated offenses mean the account is set to inactive, and severe or repeat offenses mean a ban. Decisions are made by the officer on duty and reviewed by a commander (R4) or the leader (R5). If you believe you were dealt with unfairly, appeal to a rank above the one that ruled against you — R5\u2019s ruling is final.',
        ],
      },
      {
        h: 'The standard',
        p: [
          'When in doubt, ask: would I be comfortable saying this in front of Kaelen? If not, do not say it. That is the whole system.',
        ],
      },
    ],
  },

  copyright: {
    title: 'Copyright / IP Policy',
    intro: 'What belongs to SPB, what belongs to members, and how to report a problem — in three parts and one contact address.',
    sections: [
      {
        h: 'SPB alliance property',
        p: [
          'The SPB name, emblem, branding, design system and original content created for this hub (news dispatches, tip guides, war reports, artwork made for the alliance) belong to the SPB Alliance. They may be shared within the alliance and used to represent it. They may not be reused outside the alliance — on other sites, in other alliances, for sale — without the leader\u2019s written approval.',
        ],
      },
      {
        h: 'Third-party and game content',
        p: [
          'Kingshot is a third-party game. This hub deliberately hosts no Kingshot artwork, characters, icons or other copyrighted assets — all SPB visuals are original. Any reference to the game here is factual (schedules, mechanics, event names) and made in good faith by an unaffiliated player alliance. If a rights holder believes anything on this site is not fair, see the takedown process below and it will be resolved quickly.',
        ],
      },
      {
        h: 'Member content',
        p: [
          'Tips and news written by members remain that member\u2019s work, credited by name when published. By publishing through the hub you grant the alliance a non-exclusive right to display it to members and keep it in the knowledge base. Take your content with you if you leave the alliance — but what is published stays in the archive.',
        ],
      },
      {
        h: 'Takedown / infringement reports',
        p: [
          'If you believe content on this site infringes your copyright, contact the command through the footer address with: (1) identification of the work, (2) the exact URL on this hub, (3) a statement of good-faith belief, and (4) your name and contact details. The command reviews reports within 48 hours and removes or corrects infringing material that checks out. False reports that take down legitimate alliance content are handled under the Community Guidelines.',
        ],
      },
    ],
  },
};

export default function PolicyPage({ which }) {
  const { settings } = useAuth();
  const policy = POLICIES[which];
  if (!policy) return null;
  const contact = settings?.contact_email;

  return (
    <div className="page">
      <div className="article">
        <div className="article-head">
          <h1>{policy.title}</h1>
          <div className="article-meta">
            <Badge kind="gold">SPB Alliance</Badge>
            <span>Last updated {UPDATED}</span>
          </div>
        </div>
        <p className="article-meta" style={{ marginBottom: 24, color: 'var(--text-2)', fontStyle: 'italic' }}>
          {policy.intro}
        </p>
        <div className="policy-body">
          {policy.sections.map((s) => (
            <section key={s.h} className="policy-section">
              <h2>{s.h}</h2>
              {s.p.map((par, i) => <p key={i}>{par}</p>)}
            </section>
          ))}
          {contact ? (
            <section className="policy-section">
              <h2>Contact</h2>
              <p>
                For anything covered by this document, reach the alliance at{' '}
                <a href={`mailto:${contact}`} style={{ color: 'var(--gold-bright)' }}>{contact}</a>.
              </p>
            </section>
          ) : null}
        </div>
        <div style={{ marginTop: 28, paddingTop: 18, borderTop: '1px solid var(--border)' }}>
          <Link to="/" className="view-all" style={{ fontSize: 13.5 }}>← Back to Home</Link>
        </div>
      </div>
    </div>
  );
}
