import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_workshops_booking_status" AS ENUM('open', 'full', 'closed');
  CREATE TYPE "public"."enum_workshops_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__workshops_v_version_booking_status" AS ENUM('open', 'full', 'closed');
  CREATE TYPE "public"."enum__workshops_v_version_status" AS ENUM('draft', 'published');
  CREATE TABLE "workshops_practical_info" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"line" varchar
  );
  
  CREATE TABLE "workshops" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"slug" varchar,
  	"date" timestamp(3) with time zone,
  	"end_time" timestamp(3) with time zone,
  	"venue_name" varchar,
  	"venue_address" varchar,
  	"description" jsonb,
  	"capacity" numeric,
  	"price" numeric,
  	"price_includes" varchar,
  	"booking_url" varchar,
  	"booking_status" "enum_workshops_booking_status" DEFAULT 'open',
  	"contact_id" integer,
  	"partner_name" varchar,
  	"partner_url" varchar,
  	"partner_logo_id" integer,
  	"hero_image_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_workshops_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "workshops_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"people_id" integer
  );
  
  CREATE TABLE "_workshops_v_version_practical_info" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"line" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_workshops_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_slug" varchar,
  	"version_date" timestamp(3) with time zone,
  	"version_end_time" timestamp(3) with time zone,
  	"version_venue_name" varchar,
  	"version_venue_address" varchar,
  	"version_description" jsonb,
  	"version_capacity" numeric,
  	"version_price" numeric,
  	"version_price_includes" varchar,
  	"version_booking_url" varchar,
  	"version_booking_status" "enum__workshops_v_version_booking_status" DEFAULT 'open',
  	"version_contact_id" integer,
  	"version_partner_name" varchar,
  	"version_partner_url" varchar,
  	"version_partner_logo_id" integer,
  	"version_hero_image_id" integer,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__workshops_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "_workshops_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"people_id" integer
  );
  
  ALTER TABLE "rsvps" ALTER COLUMN "walk_id" DROP NOT NULL;
  ALTER TABLE "albums_rels" ADD COLUMN "workshops_id" integer;
  ALTER TABLE "_albums_v_rels" ADD COLUMN "workshops_id" integer;
  ALTER TABLE "rsvps" ADD COLUMN "workshop_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "workshops_id" integer;
  ALTER TABLE "workshops_practical_info" ADD CONSTRAINT "workshops_practical_info_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."workshops"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "workshops" ADD CONSTRAINT "workshops_contact_id_people_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."people"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "workshops" ADD CONSTRAINT "workshops_partner_logo_id_media_id_fk" FOREIGN KEY ("partner_logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "workshops" ADD CONSTRAINT "workshops_hero_image_id_media_id_fk" FOREIGN KEY ("hero_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "workshops_rels" ADD CONSTRAINT "workshops_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."workshops"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "workshops_rels" ADD CONSTRAINT "workshops_rels_people_fk" FOREIGN KEY ("people_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_workshops_v_version_practical_info" ADD CONSTRAINT "_workshops_v_version_practical_info_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_workshops_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_workshops_v" ADD CONSTRAINT "_workshops_v_parent_id_workshops_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."workshops"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_workshops_v" ADD CONSTRAINT "_workshops_v_version_contact_id_people_id_fk" FOREIGN KEY ("version_contact_id") REFERENCES "public"."people"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_workshops_v" ADD CONSTRAINT "_workshops_v_version_partner_logo_id_media_id_fk" FOREIGN KEY ("version_partner_logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_workshops_v" ADD CONSTRAINT "_workshops_v_version_hero_image_id_media_id_fk" FOREIGN KEY ("version_hero_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_workshops_v_rels" ADD CONSTRAINT "_workshops_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_workshops_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_workshops_v_rels" ADD CONSTRAINT "_workshops_v_rels_people_fk" FOREIGN KEY ("people_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "workshops_practical_info_order_idx" ON "workshops_practical_info" USING btree ("_order");
  CREATE INDEX "workshops_practical_info_parent_id_idx" ON "workshops_practical_info" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "workshops_slug_idx" ON "workshops" USING btree ("slug");
  CREATE INDEX "workshops_contact_idx" ON "workshops" USING btree ("contact_id");
  CREATE INDEX "workshops_partner_partner_logo_idx" ON "workshops" USING btree ("partner_logo_id");
  CREATE INDEX "workshops_hero_image_idx" ON "workshops" USING btree ("hero_image_id");
  CREATE INDEX "workshops_updated_at_idx" ON "workshops" USING btree ("updated_at");
  CREATE INDEX "workshops_created_at_idx" ON "workshops" USING btree ("created_at");
  CREATE INDEX "workshops__status_idx" ON "workshops" USING btree ("_status");
  CREATE INDEX "workshops_rels_order_idx" ON "workshops_rels" USING btree ("order");
  CREATE INDEX "workshops_rels_parent_idx" ON "workshops_rels" USING btree ("parent_id");
  CREATE INDEX "workshops_rels_path_idx" ON "workshops_rels" USING btree ("path");
  CREATE INDEX "workshops_rels_people_id_idx" ON "workshops_rels" USING btree ("people_id");
  CREATE INDEX "_workshops_v_version_practical_info_order_idx" ON "_workshops_v_version_practical_info" USING btree ("_order");
  CREATE INDEX "_workshops_v_version_practical_info_parent_id_idx" ON "_workshops_v_version_practical_info" USING btree ("_parent_id");
  CREATE INDEX "_workshops_v_parent_idx" ON "_workshops_v" USING btree ("parent_id");
  CREATE INDEX "_workshops_v_version_version_slug_idx" ON "_workshops_v" USING btree ("version_slug");
  CREATE INDEX "_workshops_v_version_version_contact_idx" ON "_workshops_v" USING btree ("version_contact_id");
  CREATE INDEX "_workshops_v_version_partner_version_partner_logo_idx" ON "_workshops_v" USING btree ("version_partner_logo_id");
  CREATE INDEX "_workshops_v_version_version_hero_image_idx" ON "_workshops_v" USING btree ("version_hero_image_id");
  CREATE INDEX "_workshops_v_version_version_updated_at_idx" ON "_workshops_v" USING btree ("version_updated_at");
  CREATE INDEX "_workshops_v_version_version_created_at_idx" ON "_workshops_v" USING btree ("version_created_at");
  CREATE INDEX "_workshops_v_version_version__status_idx" ON "_workshops_v" USING btree ("version__status");
  CREATE INDEX "_workshops_v_created_at_idx" ON "_workshops_v" USING btree ("created_at");
  CREATE INDEX "_workshops_v_updated_at_idx" ON "_workshops_v" USING btree ("updated_at");
  CREATE INDEX "_workshops_v_latest_idx" ON "_workshops_v" USING btree ("latest");
  CREATE INDEX "_workshops_v_rels_order_idx" ON "_workshops_v_rels" USING btree ("order");
  CREATE INDEX "_workshops_v_rels_parent_idx" ON "_workshops_v_rels" USING btree ("parent_id");
  CREATE INDEX "_workshops_v_rels_path_idx" ON "_workshops_v_rels" USING btree ("path");
  CREATE INDEX "_workshops_v_rels_people_id_idx" ON "_workshops_v_rels" USING btree ("people_id");
  ALTER TABLE "albums_rels" ADD CONSTRAINT "albums_rels_workshops_fk" FOREIGN KEY ("workshops_id") REFERENCES "public"."workshops"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_albums_v_rels" ADD CONSTRAINT "_albums_v_rels_workshops_fk" FOREIGN KEY ("workshops_id") REFERENCES "public"."workshops"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "rsvps" ADD CONSTRAINT "rsvps_workshop_id_workshops_id_fk" FOREIGN KEY ("workshop_id") REFERENCES "public"."workshops"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_workshops_fk" FOREIGN KEY ("workshops_id") REFERENCES "public"."workshops"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "albums_rels_workshops_id_idx" ON "albums_rels" USING btree ("workshops_id");
  CREATE INDEX "_albums_v_rels_workshops_id_idx" ON "_albums_v_rels" USING btree ("workshops_id");
  CREATE INDEX "rsvps_workshop_idx" ON "rsvps" USING btree ("workshop_id");
  CREATE INDEX "payload_locked_documents_rels_workshops_id_idx" ON "payload_locked_documents_rels" USING btree ("workshops_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "workshops_practical_info" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "workshops" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "workshops_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_workshops_v_version_practical_info" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_workshops_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_workshops_v_rels" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "workshops_practical_info" CASCADE;
  DROP TABLE "workshops" CASCADE;
  DROP TABLE "workshops_rels" CASCADE;
  DROP TABLE "_workshops_v_version_practical_info" CASCADE;
  DROP TABLE "_workshops_v" CASCADE;
  DROP TABLE "_workshops_v_rels" CASCADE;
  -- Hand-edited: the CASCADE above already removed the FKs that point at
  -- workshops, so these drops must tolerate their absence.
  ALTER TABLE "albums_rels" DROP CONSTRAINT IF EXISTS "albums_rels_workshops_fk";
  
  ALTER TABLE "_albums_v_rels" DROP CONSTRAINT IF EXISTS "_albums_v_rels_workshops_fk";
  
  ALTER TABLE "rsvps" DROP CONSTRAINT IF EXISTS "rsvps_workshop_id_workshops_id_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_workshops_fk";
  
  DROP INDEX "albums_rels_workshops_id_idx";
  DROP INDEX "_albums_v_rels_workshops_id_idx";
  DROP INDEX "rsvps_workshop_idx";
  DROP INDEX "payload_locked_documents_rels_workshops_id_idx";
  -- Hand-added: workshop RSVPs have no walk, so they cannot survive the
  -- return to a NOT NULL walk column. A destructive down, like phase7's.
  DELETE FROM "rsvps" WHERE "walk_id" IS NULL;
  ALTER TABLE "rsvps" ALTER COLUMN "walk_id" SET NOT NULL;
  ALTER TABLE "albums_rels" DROP COLUMN "workshops_id";
  ALTER TABLE "_albums_v_rels" DROP COLUMN "workshops_id";
  ALTER TABLE "rsvps" DROP COLUMN "workshop_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "workshops_id";
  DROP TYPE "public"."enum_workshops_booking_status";
  DROP TYPE "public"."enum_workshops_status";
  DROP TYPE "public"."enum__workshops_v_version_booking_status";
  DROP TYPE "public"."enum__workshops_v_version_status";`)
}
