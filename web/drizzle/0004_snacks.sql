CREATE TABLE "week_snacks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"week_start" date NOT NULL,
	"recipe_id" uuid NOT NULL,
	"multiplier" double precision DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "kind" text DEFAULT 'dinner' NOT NULL;--> statement-breakpoint
ALTER TABLE "week_snacks" ADD CONSTRAINT "week_snacks_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "week_snacks_week_idx" ON "week_snacks" USING btree ("week_start");