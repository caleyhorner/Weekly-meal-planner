-- Recipes imported from photos had no chosen picture; lists used to fall back to the first
-- photo. Pictures are now chosen explicitly, so set that photo as the picture once.
UPDATE "recipes" r
SET "hero_image_url" = (
  SELECT s."url" FROM "recipe_sources" s
  WHERE s."recipe_id" = r."id"
  ORDER BY s."position"
  LIMIT 1
)
WHERE r."hero_image_url" IS NULL;
