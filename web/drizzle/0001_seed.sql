INSERT INTO "household_settings" ("id", "household_size") VALUES (1, 4) ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "staples" ("item") VALUES ('salt'), ('pepper'), ('olive oil'), ('water') ON CONFLICT DO NOTHING;
