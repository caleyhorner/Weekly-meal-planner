CREATE TABLE "dinner_parties" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"date" date,
	"guests" integer DEFAULT 8 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "party_dishes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"party_id" uuid NOT NULL,
	"recipe_id" uuid NOT NULL,
	"multiplier" double precision,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "party_have_it" (
	"party_id" uuid NOT NULL,
	"item" text NOT NULL,
	CONSTRAINT "party_have_it_party_id_item_pk" PRIMARY KEY("party_id","item")
);
--> statement-breakpoint
ALTER TABLE "party_dishes" ADD CONSTRAINT "party_dishes_party_id_dinner_parties_id_fk" FOREIGN KEY ("party_id") REFERENCES "public"."dinner_parties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "party_dishes" ADD CONSTRAINT "party_dishes_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "party_have_it" ADD CONSTRAINT "party_have_it_party_id_dinner_parties_id_fk" FOREIGN KEY ("party_id") REFERENCES "public"."dinner_parties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "party_dishes_party_idx" ON "party_dishes" USING btree ("party_id");