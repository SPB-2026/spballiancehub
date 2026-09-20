-- 006_member_email_optional.sql
-- Members no longer require an email address. The column stays UNIQUE —
-- Postgres treats multiple NULLs as distinct, so any number of members can
-- have no email without conflicting with each other. Existing rows keep
-- their current email values untouched.

ALTER TABLE members ALTER COLUMN email DROP NOT NULL;
