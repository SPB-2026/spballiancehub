// Default Kingshot gift-code sources.
//
// Every URL in this file was fetched and verified from this server on
// 2026-09-01 (HTTP 200 with real code lists in the raw HTML). Sources that
// block server-side fetchers (403 / anti-bot) are shipped DISABLED — the
// fetcher never bypasses CAPTCHAs or access controls, it simply marks the
// source as unavailable and moves on.
//
// This is the DEFAULT set. Admins can add/edit/enable/disable sources from
// the Admin → Giftcodes panel (persisted in the `settings` table under the
// `gift_code_sources` key, which overrides this list entirely).
//
// Shape per entry:
//   name    display name (1–60 chars)
//   url     https-only page URL (must be a page that lists gift codes)
//   enabled false = skipped by scheduled fetches (kept for reference)
//   note    optional admin-facing note
module.exports = [
  {
    name: 'SuperCheats',
    url: 'https://www.supercheats.com/kingshot-codes',
    enabled: true,
  },
  {
    name: 'Destructoid',
    url: 'https://www.destructoid.com/kingshot-codes/',
    enabled: true,
  },
  {
    name: 'Buffhub',
    url: 'https://buffhub.com/blog/kingshot/kingshot-gift-code.html',
    enabled: true,
  },
  {
    name: 'Lootbar',
    url: 'https://lootbar.com/blog/en/newest-kingshot-gift-codes.html',
    enabled: true,
  },
  {
    name: 'GamesRadar',
    url: 'https://www.gamesradar.com/games/strategy/kingshot-codes-gift/',
    enabled: true,
  },
  {
    name: 'KingshotRewards',
    url: 'https://kingshotrewards.com/',
    enabled: true,
  },
  {
    name: 'GamingOnPhone',
    url: 'https://www.gamingonphone.com/guides/kingshot-redeem-codes-and-how-to-use-them/',
    enabled: true,
  },
  {
    name: 'AllThings.H',
    url: 'https://allthings.how/kingshot-codes/',
    enabled: false,
    note: 'Returns HTTP 403 to server-side fetchers (anti-bot). Left disabled — never bypass.',
  },
  {
    name: 'Reddit r/KingShot',
    url: 'https://old.reddit.com/r/KingShot',
    enabled: false,
    note: 'Returns HTTP 403 to server-side fetchers. Left disabled — never bypass.',
  },
];
