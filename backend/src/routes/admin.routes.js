// ADMIN ROUTES — direct access, no login required.
const express = require('express');
const multer = require('multer');
const AdminService = require('../services/admin.service');
const EventService = require('../services/event.service');
const AnnouncementService = require('../services/announcement.service');
const MediaService = require('../services/media.service');
const MemberService = require('../services/member.service');
const Announcements = require('../models/announcements');
const NewsService = require('../services/news.service');
const NewsModel = require('../models/news');
const ArticleService = require('../services/article.service');
const ArticleModel = require('../models/articles');
const GiftService = require('../services/gift.service');

// Route-level guard: /:id must be a positive integer (prevents 500s on
// malformed paths like /gifts/sources-before-ordering or /gifts/12abc).
function giftId(req, res, next) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return next(require('../middleware/errors').httpError(404, 'Not found.'));
  req.params.id = id;
  next();
}
const SettingsService = require('../services/settings.service');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });

// Dashboard
router.get('/dashboard', asyncHandler(async (req, res) => res.json(await AdminService.dashboard())));

// ── Members (private data: Game User ID, email, stats) ─────────────────────
router.get('/members', asyncHandler(async (req, res) => res.json(await AdminService.listMembers())));
router.post('/members', asyncHandler(async (req, res) => res.status(201).json(await AdminService.createMember(req.body || {}))));
router.put('/members/:id', asyncHandler(async (req, res) => res.json(await AdminService.updateMember(Number(req.params.id), req.body || {}))));
router.delete('/members/:id', asyncHandler(async (req, res) => res.json(await AdminService.removeMember(Number(req.params.id)))));
router.post('/members/:id/reset-stats', asyncHandler(async (req, res) => res.json(await AdminService.resetMemberStats(Number(req.params.id)))));

// ── Events / Calendar ───────────────────────────────────────────────────────
router.get('/events', asyncHandler(async (req, res) => res.json(await EventService.adminList())));
router.post('/events', asyncHandler(async (req, res) => res.status(201).json(await EventService.create(req.body || {}))));
router.put('/events/:id', asyncHandler(async (req, res) => res.json(await EventService.update(Number(req.params.id), req.body || {}))));
router.delete('/events/:id', asyncHandler(async (req, res) => res.json(await EventService.remove(Number(req.params.id)))));

// ── News ────────────────────────────────────────────────────────────────────
router.get('/news', asyncHandler(async (req, res) => res.json({ categories: NewsService.CATEGORIES, items: await NewsModel.adminList() })));
router.post('/news', asyncHandler(async (req, res) => res.status(201).json(await NewsService.create(req.body || {}, req.admin?.name))));
router.put('/news/:id', asyncHandler(async (req, res) => res.json(await NewsService.update(Number(req.params.id), req.body || {}, req.admin?.name))));
router.delete('/news/:id', asyncHandler(async (req, res) => res.json(await NewsService.remove(Number(req.params.id)))));
router.post('/news/cover', upload.single('cover'), asyncHandler((req, res) => res.json({ cover: NewsService.uploadCover(req.file) })));

// ── Tips & Tricks articles ──────────────────────────────────────────────────
router.get('/articles', asyncHandler(async (req, res) => res.json({ categories: ArticleService.CATEGORIES, items: await ArticleModel.adminList() })));
router.post('/articles', asyncHandler(async (req, res) => res.status(201).json(await ArticleService.create(req.body || {}))));
router.put('/articles/:id', asyncHandler(async (req, res) => res.json(await ArticleService.update(Number(req.params.id), req.body || {}))));
router.delete('/articles/:id', asyncHandler(async (req, res) => res.json(await ArticleService.remove(Number(req.params.id)))));

// ── Gift codes ──────────────────────────────────────────────────────────────
router.get('/gifts', asyncHandler(async (req, res) => res.json(await GiftService.listAll())));
router.post('/gifts', asyncHandler(async (req, res) => res.status(201).json(await GiftService.create(req.body || {}))));

// ── Gift code discovery (Kingshot fetcher) — admin-only ────────────────────
// All routes below sit under /api/admin, which is guarded by requireAdmin +
// the audit middleware at app level — members cannot reach any of them.
// These literal-segment routes MUST be registered before the /gifts/:id
// routes — Express matches in registration order, and "fetch"/"sources"
// would otherwise be captured as a :id value.
router.post(
  '/gifts/fetch',
  asyncHandler(async (req, res) => res.status(202).json(await GiftService.fetchNow()))
);
router.get(
  '/gifts/fetch/status',
  asyncHandler(async (req, res) => res.json(await GiftService.fetchStatus()))
);
router.get(
  '/gifts/fetch/logs',
  asyncHandler(async (req, res) => res.json(await GiftService.fetchLogs(req.query.limit)))
);
router.put(
  '/gifts/sources',
  asyncHandler(async (req, res) => res.json({ sources: await GiftService.saveSources(req.body || {}) }))
);
router.get(
  '/gifts/sources',
  asyncHandler(async (req, res) => res.json({ sources: await GiftService.getSources() }))
);
router.post(
  '/gifts/:id/approve',
  giftId,
  asyncHandler(async (req, res) => res.json(await GiftService.approve(req.params.id)))
);
router.post(
  '/gifts/:id/reject',
  giftId,
  asyncHandler(async (req, res) => res.json(await GiftService.reject(req.params.id)))
);
router.post(
  '/gifts/:id/mark-expired',
  giftId,
  asyncHandler(async (req, res) => res.json(await GiftService.markExpired(req.params.id)))
);

// Original CRUD — registered AFTER the literal discovery routes above.
router.put('/gifts/:id', giftId, asyncHandler(async (req, res) => res.json(await GiftService.update(req.params.id, req.body || {}))));
router.delete('/gifts/:id', giftId, asyncHandler(async (req, res) => res.json(await GiftService.remove(req.params.id))));
router.get('/gifts/:id/redemptions', giftId, asyncHandler(async (req, res) => res.json(await GiftService.redemptions(req.params.id))));

// ── Announcements ───────────────────────────────────────────────────────────
router.get('/announcements', asyncHandler(async (req, res) => res.json({ items: await AnnouncementService.list(), active: await Announcements.countActive() })));
router.post('/announcements', asyncHandler(async (req, res) => res.status(201).json(await AnnouncementService.create(req.body || {}))));
router.put('/announcements/:id', asyncHandler(async (req, res) => res.json(await AnnouncementService.update(Number(req.params.id), req.body || {}))));
router.delete('/announcements/:id', asyncHandler(async (req, res) => res.json(await AnnouncementService.remove(Number(req.params.id)))));

// ── Media library ───────────────────────────────────────────────────────────
router.get('/media', asyncHandler(async (req, res) => res.json(await MediaService.list())));
router.post('/media', upload.single('image'), asyncHandler(async (req, res) => res.status(201).json(await MediaService.upload(req.file, req.admin?.name))));
router.delete('/media/:id', asyncHandler(async (req, res) => res.json(await MediaService.remove(Number(req.params.id)))));

// ── Member photo upload (admin) ────────────────────────────────────────────
router.post('/members/:id/photo', upload.single('avatar'), asyncHandler(async (req, res) => {
  res.json(await MemberService.uploadAvatar(Number(req.params.id), req.file));
}));

// ── Admin accounts ──────────────────────────────────────────────────────────
router.get('/admins', asyncHandler(async (req, res) => res.json(await AdminService.listAdmins())));
router.post('/admins', asyncHandler(async (req, res) => res.status(201).json(await AdminService.createAdmin(req.body || {}))));
router.put('/admins/:id', asyncHandler(async (req, res) => res.json(await AdminService.updateAdmin(Number(req.params.id), req.body || {}))));
router.delete('/admins/:id', asyncHandler(async (req, res) => res.json(await AdminService.removeAdmin(Number(req.params.id), req.admin?.id ?? 0))));

// ── Activity log (audit trail) ──────────────────────────────────────────────
router.get('/activity', asyncHandler(async (req, res) => res.json(await AdminService.activity(Number(req.query.limit) || 200))));
router.delete('/activity', asyncHandler(async (req, res) => res.json(await AdminService.clearActivity())));

// ── Settings & social links ─────────────────────────────────────────────────
router.get('/settings', asyncHandler(async (req, res) => res.json(await SettingsService.publicSettings())));
router.put('/settings', asyncHandler(async (req, res) => res.json(await SettingsService.updateMany(req.body || {}, req.admin?.name))));
router.post('/settings/logo', upload.single('logo'), asyncHandler(async (req, res) => res.json(await SettingsService.uploadLogo(req.file))));

module.exports = router;
