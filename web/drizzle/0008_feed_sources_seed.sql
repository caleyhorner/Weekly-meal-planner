-- The household's first recipe websites. Feeds are found automatically on the first check.
INSERT INTO "feed_sources" ("name", "site_url") VALUES
  ('RecipeTin Eats', 'https://www.recipetineats.com'),
  ('Jamie Oliver', 'https://www.jamieoliver.com')
ON CONFLICT ("site_url") DO NOTHING;
