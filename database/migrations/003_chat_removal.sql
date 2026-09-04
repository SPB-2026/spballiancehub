-- 003_chat_removal
-- The Chat feature (alliance chat, DMs, groups, mentions, per-message
-- translation, and the GIF library that only served chat) has been removed
-- from the product. On fresh installs migration 001 no longer creates these
-- objects; this migration removes them from databases that predate the
-- removal. Every statement is idempotent.

-- Chat tables (messages, notifications, DMs, groups, read cursors,
-- translation cache) and the chat-only GIF library.
DROP TABLE IF EXISTS chat_mention_notifs;
DROP TABLE IF EXISTS chat_dm_messages;
DROP TABLE IF EXISTS chat_dm_convs;
DROP TABLE IF EXISTS chat_group_members;
DROP TABLE IF EXISTS chat_group_messages;
DROP TABLE IF EXISTS chat_groups;
DROP TABLE IF EXISTS chat_conv_reads;
DROP TABLE IF EXISTS chat_translations;
DROP TABLE IF EXISTS chat_messages;
DROP TABLE IF EXISTS gif_library;
DROP TABLE IF EXISTS gif_sync_state;

-- Chat-related member column (preferred translation language).
ALTER TABLE members DROP COLUMN IF EXISTS chat_lang;

-- Chat-related website settings rows.
DELETE FROM settings WHERE key IN ('chat_lifetime_hours', 'gif_enabled');
