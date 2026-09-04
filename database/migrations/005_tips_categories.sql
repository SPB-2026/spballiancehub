-- 005_tips_categories.sql
-- Update Tips & Tricks categories to the new 10-category system.
-- Old: beginner, intermediate, advanced, alliance, events, resources, combat, growth
-- New: general, heroes, city, resources, combat, alliance, events, formations, equipment, f2p

UPDATE articles SET category = 'general'   WHERE category = 'beginner';
UPDATE articles SET category = 'city'      WHERE category = 'intermediate';
UPDATE articles SET category = 'resources' WHERE category = 'advanced';
UPDATE articles SET category = 'equipment' WHERE category = 'resources' AND title = 'Resource Management: The 3-2-1 Stockpile';
UPDATE articles SET category = 'f2p'       WHERE category = 'growth';
-- Safety: any remaining old categories → general
UPDATE articles SET category = 'general' WHERE category NOT IN ('general','heroes','city','resources','combat','alliance','events','formations','equipment','f2p');
