// Database setup: ensures the schema exists (run `npm run migrate`) and seeds
// initial data ONLY when tables are empty. Run with:  npm run setup
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const env = require('../src/config/env');
const db = require('../src/config/db');

function iso(ms) { return new Date(ms).toISOString(); }
const now = Date.now();
const H = 3600 * 1000, D = 24 * H;

async function main() {
  // ── Admin ───────────────────────────────────────────────────────────────
  const adminCount = (await db.prepare('SELECT COUNT(*) c FROM admins').get()).c;
  if (adminCount === 0) {
    await db.prepare('INSERT INTO admins (username, email, name, password_hash) VALUES (?, ?, ?, ?)').run(
      'SPB-Admin',
      'admin@spb.hub',
      'Alliance Admin',
      bcrypt.hashSync(env.SEED_ADMIN_PASSWORD, 10)
    );
    console.log(`[setup] admin created — username: SPB-Admin (or admin@spb.hub) | password: ${env.SEED_ADMIN_PASSWORD}`);
  }

  // ── Settings ────────────────────────────────────────────────────────────
  const Settings = require('../src/models/settings');
  for (const [k, val] of Object.entries({
    alliance_name: 'SPB Alliance',
    tagline: 'Your Alliance Command Center',
    alliance_rank: 'Season 4 · Top 20%',
    announcement: 'Welcome to the new command center. Report war participation in the Events section and keep your profile up to date.',
    discord_url: 'https://discord.com',
    youtube_url: 'https://www.youtube.com',
    timezone: 'UTC',
    logo: '',
  })) {
    await Settings.set(k, val);
  }

  // ── Members ─────────────────────────────────────────────────────────────
  const members = [
    ['100234000', 'commander@spb.hub', 'Kaelen the Bold', 'R5', 'active', 4820, 9640, '2025-11-02', 'Founder of SPB. Keeper of the war council.'],
    ['100317000', 'ryder@spb.hub', 'Ryda Ironveil', 'R4', 'active', 3975, 8120, '2025-11-15', 'Leads defense operations and scouting.'],
    ['100422000', 'mora@spb.hub', 'Mora Duskbane', 'R4', 'active', 3610, 7480, '2025-12-01', 'Event coordinator. Don\'t miss her raids.'],
    ['100518000', 'tarn@spb.hub', 'Tarn Swiftarrow', 'R3', 'active', 2840, 5310, '2026-01-10', 'Ranged specialist, supply line manager.'],
    ['100609000', 'ilva@spb.hub', 'Ilva Thornheart', 'R3', 'active', 2510, 4930, '2026-01-28', 'Recruitment and tips librarian.'],
    ['100741000', 'bren@spb.hub', 'Bren Oakshield', 'R1', 'active', 1870, 3150, '2026-02-14', 'Siege engineer, coffee-powered.'],
    ['100856000', 'wren@spb.hub', 'Wren Nightquill', 'R1', 'active', 1420, 2660, '2026-03-30', 'New blood, sharp claws.'],
    ['100912000', 'casper@spb.hub', 'Casper Greymane', 'R1', 'inactive', 980, 1720, '2026-04-22', 'On a break — back soon, says the bird.'],
  ];
  const memberCount = (await db.prepare('SELECT COUNT(*) c FROM members').get()).c;
  if (memberCount === 0) {
    const ins = db.prepare('INSERT INTO members (game_user_id, email, name, role, status, bio, contributions, score, join_date, last_active) VALUES (?,?,?,?,?,?,?,?,?,?)');
    await db.transaction(async (rows) => {
      for (const [g, e, n, r, s, c, sc, j, b] of rows) {
        await ins.run(g, e, n, r, s, b, c, sc, j, iso(now - Math.random() * 2 * D));
      }
    })(members);
    console.log(`[setup] seeded ${members.length} members`);
    console.log('[setup] demo member login — Game User ID: 100234000 | Email: commander@spb.hub');
  }

  // ── Events ──────────────────────────────────────────────────────────────
  const eventCount = (await db.prepare('SELECT COUNT(*) c FROM events').get()).c;
  if (eventCount === 0) {
    const events = [
      ['Winter Supply Raid', 'Coordinate defensive escorts for the northern supply lines. All commanders confirm readiness 30 minutes before each wave.', 'war', now - 6 * D + 3 * H, now - 6 * D + 9 * H, 'Northern Pass'],
      ['SPB Weekly Tournament', '1v1 siege bracket. Entry is open to all active members; losers donate 100 contribution points to the alliance war fund.', 'tournament', now - 2 * D + 10 * H, now - 2 * D + 14 * H, 'Command Center'],
      ['Border War: East Keep', 'Three-wave assault on the East Keep. Waves at 14:00, 18:00 and 22:00 UTC. Bring siege units and keep shields ready.', 'war', now - 8 * H, now + 16 * H, 'East Keep'],
      ['Midweek Melee', 'Friendly 2v2 team battles to train new recruits. No contribution pressure — just skill and fun.', 'tournament', now + 3 * D + 9 * H, now + 3 * D + 13 * H, 'Training Grounds'],
      ['Anniversary Festival', 'One night of celebrations: gift code drop, alliance quiz, and a joint raid for the trophy pool.', 'social', now + 10 * D + 17 * H, now + 10 * D + 22 * H, 'Alliance Hall'],
    ];
    const ins = db.prepare('INSERT INTO events (title, description, category, starts_at, ends_at, location) VALUES (?,?,?,?,?,?)');
    await db.transaction(async (rows) => {
      for (const [title, description, category, startMs, endMs, location] of rows) {
        await ins.run(title, description, category, iso(startMs), iso(endMs), location);
      }
    })(events);
    console.log(`[setup] seeded ${events.length} events`);
  }

  // ── News (with original SVG covers) ─────────────────────────────────────
  const ROOT = path.resolve(__dirname, '..', '..');
  const NEWS_DIR = path.join(ROOT, 'uploads', 'news');
  fs.mkdirSync(NEWS_DIR, { recursive: true });

  function svgCover(filename, title, motif) {
    const file = path.join(NEWS_DIR, filename);
    if (fs.existsSync(file)) return `/uploads/news/${filename}`;
    const motifs = {
      swords: `<g stroke="#D4AF37" stroke-width="6" stroke-linecap="round" fill="none"><path d="M330 260 L570 100 M348 242 L552 146" opacity="0.9"/><path d="M570 260 L330 100 M552 242 L330 146" opacity="0.9"/><circle cx="450" cy="180" r="34" fill="#0B1728"/></g>`,
      crown: `<g fill="none" stroke="#D4AF37" stroke-width="7" stroke-linejoin="round"><path d="M330 220 L330 130 L390 175 L450 110 L510 175 L570 130 L570 220 Z"/><path d="M330 240 H570" opacity="0.7"/></g>`,
      banner: `<g fill="none" stroke="#D4AF37" stroke-width="6"><path d="M370 90 V270 M530 90 V270"/><path d="M370 110 H530 V230 H370 Z"/><path d="M400 150 H500 M400 180 H500 M400 210 H470" opacity="0.7"/></g>`,
    };
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 500">
<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#07111F"/><stop offset="1" stop-color="#0B1728"/></linearGradient></defs>
<rect width="900" height="500" fill="url(#bg)"/>
<rect x="14" y="14" width="872" height="472" fill="none" stroke="#B8942E" stroke-width="2" opacity="0.8"/>
<rect x="26" y="26" width="848" height="448" fill="none" stroke="#D4AF37" stroke-width="1" opacity="0.35"/>
${motifs[motif] || ''}
<text x="450" y="380" text-anchor="middle" font-family="Georgia, serif" font-size="44" fill="#F5F7FA" letter-spacing="4">${title}</text>
<text x="450" y="420" text-anchor="middle" font-family="Georgia, serif" font-size="17" fill="#D4AF37" letter-spacing="8">SPB ALLIANCE</text>
</svg>`;
    fs.writeFileSync(file, svg);
    return `/uploads/news/${filename}`;
  }

  const newsCount = (await db.prepare('SELECT COUNT(*) c FROM news').get()).c;
  if (newsCount === 0) {
    const news = [
      {
        title: 'East Keep: War Plan and Signups',
        category: 'war',
        cover: svgCover('cover-war.svg', 'EAST KEEP', 'swords'),
        summary: 'The three-wave assault on East Keep begins this week. Commanders need siege leads for wave two — signups open before Thursday.',
        body: `The war council has finalized the plan for East Keep. This is the first major assault of the season, and it will set the tone for the whole month.\n\nWaves are scheduled for 14:00, 18:00 and 22:00 UTC. Wave one is the softening blow: archers and cavalry only, no heavy siege. Wave two breaks the outer wall and is where siege leads are needed — that is the signup the commanders are asking for. Wave three is a full alliance push for the keep itself.\n\nEvery member is expected to contribute at least one attack per wave. If you are on a break this week, tell an officer so the roster stays accurate. Contribution points from the assault count double toward the season leaderboard.\n\nShields: keep them for wave three. Losing a shield at wave two is fine, losing it at wave one is a waste. The council is not going to be repeating that reminder twice.`,
        published: 1,
        published_at: iso(now - 1 * D),
        author: 'Kaelen the Bold',
      },
      {
        title: 'Midweek Melee: New Rule Set',
        category: 'tournament',
        cover: svgCover('cover-meele.svg', 'MIDWEEK MELEE', 'banner'),
        summary: 'Team 2v2 battles return with a new handicap rule so new recruits stop getting destroyed by commanders. Signups open in the tournament thread.',
        body: `The Midweek Melee is back, and with it the biggest complaint from last month: new members getting swatted by veteran commanders in the first round.\n\nThe new handicap rule is simple: in every 2v2 match, the combined contribution of the two weaker squads gets a +15% damage bonus. It is small, it is fair, and it lets recruits actually learn to play against veteran players instead of learning what a wall feels like.\n\nMatches are run in the Training Grounds with no resource cost. Winners of the bracket earn a spot in the Season Finals warm-up and 50 contribution points. Losers get the honor of being destroyed slightly less.\n\nSignups open in the tournament thread. Squads of two, no substitutions after the bracket is posted.`,
        published: 1,
        published_at: iso(now - 3 * D),
        author: 'Mora Duskbane',
      },
      {
        title: 'Welcome the New Recruits',
        category: 'community',
        cover: svgCover('cover-recruits.svg', 'NEW RECRUITS', 'crown'),
        summary: 'Four members joined this week. A short guide to their first week, and what the officers expect from the onboarding process.',
        body: `Four new members joined this week: Wren Nightquill, Casper Greymane, and two more who will be introduced at the festival. Every new recruit is the future of the alliance, and the onboarding process is what makes them stay.\n\nFirst-week routine: an officer sends each recruit the Tips & Tricks reading list (start with Beginner, then Alliance Strategy), a seat in the weekly Melee, and a buddy commander for war signups. Recruits should not be left alone with a wall of war talk they cannot follow.\n\nExpectations of recruits: be online for at least one alliance event per week, report your participation, and ask early. There is no stupid question in this alliance except "why do we need shields".\n\nRecruits who complete their first month in good standing move up the contribution track faster. The crown is waiting.`,
        published: 1,
        published_at: iso(now - 5 * D),
        author: 'Ilva Thornheart',
      },
    ];
    const ins = db.prepare('INSERT INTO news (title, category, cover, summary, body, published, published_at, author) VALUES (?,?,?,?,?,?,?,?)');
    await db.transaction(async (rows) => {
      for (const n of rows) await ins.run(n.title, n.category, n.cover, n.summary, n.body, n.published, n.published_at, n.author);
    })(news);
    console.log(`[setup] seeded ${news.length} news articles`);
  }

  // ── Tips & Tricks ───────────────────────────────────────────────────────
  const articleCount = (await db.prepare('SELECT COUNT(*) c FROM articles').get()).c;
  if (articleCount === 0) {
    const articles = [
      {
        title: 'Your First Seven Days: Beginner Roadmap',
        category: 'general',
        tags: 'new player, priorities',
        body: `The first week decides how fast you climb. Focus on three things and ignore everything else.\n\n1. Production before troops. A strong economy outlives an army. Keep your resource buildings one level ahead of your barracks.\n2. One troop type, mastered. Do not spread research across four troop types. Pick your main, hit its cap, then diversify.\n3. Alliance events over solo grinding. Alliance events pay more contribution per hour than almost anything solo. Your calendar page shows every event — attend them.\n\nBy day seven you should have: a solid resource base, one strong troop line, and 200+ contribution points. If you have that, you are ahead of half the server.`,
      },
      {
        title: 'Intermediate: Timing Your Upgrades',
        category: 'city',
        tags: 'upgrades, queues',
        body: `Intermediate players stop upgrading "whenever" and start upgrading "when it matters".\n\nThe golden rule: never start a long upgrade right before a war wave. If a wave is in 6 hours and your upgrade takes 12, do your research or wait. A stalled upgrade during war is the most expensive mistake in the game.\n\nSecond rule: batch upgrades into the night. Start your longest upgrade at the hour you log off; your resource buildings produce through the night anyway, and you lose nothing.\n\nThird rule: keep one speedup in reserve for emergencies, not for convenience. Speedups spent on routine upgrades are speedups stolen from war days.`,
      },
      {
        title: 'Advanced: Resource Math for War Weeks',
        category: 'resources',
        tags: 'economy, war, math',
        body: `Advanced play is arithmetic. A war week consumes roughly 2.5x your normal troop upkeep and training cost. You cannot spend war-week budget on peace-week luxuries.\n\nThe formula: (current stock + daily production × days to war) must cover (expected losses + expected retraining + 20% buffer). If the math fails, slow luxury upgrades until it does.\n\nProject your stock at war day using your current production numbers. If the projection is under 30% of expected cost, tell a commander before the week starts, not after. Early warnings are free; late warnings are arguments.`,
      },
      {
        title: 'Alliance Strategy: The Wave Structure',
        category: 'alliance',
        tags: 'war, coordination',
        body: `SPB runs three-wave war structures: soften, break, take. Understanding your role in each wave is what separates alliance members from alliance tourists.\n\nWave one: archers and cavalry. Job is to trade cheap units against the enemy frontline and burn their shields. Do not bring heavy units.\n\nWave two: siege breaks. Siege leads coordinate here; everyone else attacks on the lead's signal, not on their own. The war plan is posted in the event description — read it before the wave, do not "remember" it from last week.\n\nWave three: full push. Shields come off, heavy units commit, and the keep falls or it does not. Your participation in wave three is the single most measured thing about you as an alliance member.`,
      },
      {
        title: 'Events Guide: Where Points Actually Come From',
        category: 'events',
        tags: 'contribution, events',
        body: `Not all events are equal. Here is the honest ranking of contribution efficiency.\n\nWar waves: highest value by far, especially wave three. One attended wave beats a full day of solo quests.\n\nWeekly tournaments: solid value, and they build skill. The Melee handicap rule keeps losses cheap.\n\nSocial events: low contribution, high value for retention and recruitment. The festival is the best recruitment tool you own.\n\nThe Calendar page colors every event by status. Upcoming = plan around it, Ongoing = join now, Completed = check the report for what you missed.`,
      },
      {
        title: 'Resource Management: The 3-2-1 Stockpile',
        category: 'equipment',
        tags: 'stockpile, safety',
        body: `The 3-2-1 rule: keep 3 days of production as a base stockpile, 2 days as a war reserve, and 1 day as an emergency buffer you never touch except after a total loss.\n\nMost beginners hoard everything (wasting production caps) or spend everything (dying on war day). The 3-2-1 split avoids both problems.\n\nCheck your stockpile once a day, not ten times a day. Use careful manual calculation instead of mental math, and you will stop over-hoarding.`,
      },
      {
        title: 'Combat Basics: Unit Matchups That Matter',
        category: 'combat',
        tags: 'units, matchups',
        body: `Three matchup principles cover 90% of battles.\n\n1. Archers hate cavalry. Cavalry hunts archers open in the field. If you see a bare archer line, your cavalry wave has a free win.\n2. Siege dies to speed. Siege units have terrible defense against anything that moves. Never lead with them; always screen them.\n3. Shields decide wave three. A shielded defender takes half damage for its duration. Time your heavy pushes to hit between shield rotations, not into them.\n\nLearn your own unit's weakness first, then worry about the enemy's. Defensive awareness wins wars.`,
      },
      {
        title: 'Growth: From Member to Officer',
        category: 'f2p',
        tags: 'progression, roles',
        body: `Officers are not elected; they are grown. This is the actual path.\n\nMonths 1–2: consistent event attendance, 500+ contributions, clean conduct. This is the filter.\n\nMonths 2–4: take a small responsibility — a supply escort, a Melee squad, a recruit buddy. Officers are chosen from people who already run things.\n\nMonths 4+: the commanders talk. If your numbers and conduct hold, you will be offered an officer slot at the next review.\n\nThe role changes what you manage, not what you owe. Officers attend every wave too. The only difference is that now the alliance notices if you miss one.`,
      },
    ];
    const ins = db.prepare('INSERT INTO articles (title, category, body, tags, published, published_at) VALUES (?,?,?,?,1,?)');
    await db.transaction(async (rows) => {
      for (let i = 0; i < rows.length; i++) {
        const a = rows[i];
        await ins.run(a.title, a.category, a.body, a.tags, iso(now - (i + 2) * D));
      }
    })(articles);
    console.log(`[setup] seeded ${articles.length} tips articles`);
  }

  // ── Gift codes ──────────────────────────────────────────────────────────
  const giftCount = (await db.prepare('SELECT COUNT(*) c FROM gift_codes').get()).c;
  if (giftCount === 0) {
    const ins = db.prepare('INSERT INTO gift_codes (code, display_code, normalized_code, description, reward, max_uses, per_member_limit, active, expires_at) VALUES (?,?,?,?,?,?,?,?,?)');
    const codes = [
      ['KINGSHOTGIF', 'Kingshot official gift drop', '5 speedups + 10000 gold', 100, 1, 1, iso(now + 30 * D)],
      ['KS0803', 'Season 8 drop', '3 speedups + 5000 gold', 100, 1, 1, iso(now + 21 * D)],
      ['OFFICIALSTORE709', 'Official store celebration', '2 legendary speedups', 100, 1, 1, iso(now + 18 * D)],
      ['VIP777', 'VIP member drop', 'VIP crate + 10000 gold', 80, 1, 1, iso(now + 25 * D)],
      ['HAPPYCATDAY', 'Cat day community event', 'Festival crate + 5000 gold', 120, 1, 1, iso(now + 15 * D)],
      ['KS0810', 'Season 8 drop', '3 speedups + 1 shield', 100, 1, 1, iso(now + 28 * D)],
      ['KS0715', 'Season 7 drop', '2 speedups + 5000 gold', 100, 1, 1, iso(now + 12 * D)],
      ['KS0713', 'Season 7 drop', '1 speedup + 10000 gold', 100, 1, 1, iso(now + 10 * D)],
      ['Kingshot888', 'Lucky number drop', '8888 gold + 1 speedup', 150, 1, 1, iso(now + 20 * D)],
      ['SPB-START-25', 'Welcome pack for new recruits', '3 speedups + 5000 gold', 50, 1, 1, iso(now + 60 * D)],
      ['SPB-WAR-100', 'War week participation bonus', '10000 gold + 1 shield', 30, 1, 1, iso(now + 14 * D)],
      ['SPB-FEST-08', 'Anniversary festival code (drops during the event)', 'Festival crate', 100, 1, 0, iso(now + 21 * D)],
    ];
    await db.transaction(async (rows) => {
      for (const [code, desc, reward, max, per, act, exp] of rows) {
        const upper = code.toUpperCase();
        await ins.run(code, upper, upper, desc, reward, max, per, act, exp);
      }
    })(codes);
    console.log(`[setup] seeded ${codes.length} gift codes (try SPB-START-25)`);
  }

  console.log('[setup] done.');
  await db.close();
  process.exit(0);
}

main().catch((err) => {
  console.error('[setup] failed:', err.message);
  process.exit(1);
});
