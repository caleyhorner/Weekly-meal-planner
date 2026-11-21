CREATE TABLE "household_settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"household_size" integer DEFAULT 4 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "item_aliases" (
	"alias" text PRIMARY KEY NOT NULL,
	"item" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plan_days" (
	"date" date PRIMARY KEY NOT NULL,
	"recipe_id" uuid,
	"status" text DEFAULT 'recipe' NOT NULL,
	"servings_override" integer
);
--> statement-breakpoint
CREATE TABLE "recipe_ingredients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipe_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"group_label" text,
	"raw_text" text NOT NULL,
	"item" text NOT NULL,
	"amount" double precision,
	"unit" text,
	"prep_note" text,
	"category" text DEFAULT 'Other' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recipe_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipe_id" uuid NOT NULL,
	"url" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recipes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"servings" integer NOT NULL,
	"prep_minutes" integer,
	"cook_minutes" integer,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"steps" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"source_type" text NOT NULL,
	"source_label" text DEFAULT '' NOT NULL,
	"source_url" text,
	"hero_image_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shopping_have_it" (
	"week_start" date NOT NULL,
	"item" text NOT NULL,
	"have_it" boolean DEFAULT true NOT NULL,
	CONSTRAINT "shopping_have_it_week_start_item_pk" PRIMARY KEY("week_start","item")
);
--> statement-breakpoint
CREATE TABLE "staples" (
	"item" text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
ALTER TABLE "plan_days" ADD CONSTRAINT "plan_days_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_sources" ADD CONSTRAINT "recipe_sources_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "recipe_ingredients_recipe_idx" ON "recipe_ingredients" USING btree ("recipe_id");