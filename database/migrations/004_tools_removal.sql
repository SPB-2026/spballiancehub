-- 004_tools_removal.sql
-- Remove Kingshot Tools feature: drop tool_data table (exclusive to Tools).
-- No other table references tool_data, so a simple DROP is safe.

DROP TABLE IF EXISTS tool_data;
