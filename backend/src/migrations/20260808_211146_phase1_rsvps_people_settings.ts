import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_rsvps_status" AS ENUM('confirmed', 'waitlist', 'cancelled');
  CREATE TABLE "rsvps" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"walk_id" integer NOT NULL,
  	"name" varchar NOT NULL,
  	"email" varchar NOT NULL,
  	"note" varchar,
  	"status" "enum_rsvps_status" DEFAULT 'confirmed',
  	"website" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "people" ADD COLUMN "contact_email" varchar;
  ALTER TABLE "people" ADD COLUMN "show_contact" boolean DEFAULT false;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "rsvps_id" integer;
  ALTER TABLE "site_settings" ADD COLUMN "linkedin" varchar;
  ALTER TABLE "site_settings" ADD COLUMN "default_share_image_id" integer;
  ALTER TABLE "rsvps" ADD CONSTRAINT "rsvps_walk_id_walks_id_fk" FOREIGN KEY ("walk_id") REFERENCES "public"."walks"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "rsvps_walk_idx" ON "rsvps" USING btree ("walk_id");
  CREATE INDEX "rsvps_updated_at_idx" ON "rsvps" USING btree ("updated_at");
  CREATE INDEX "rsvps_created_at_idx" ON "rsvps" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_rsvps_fk" FOREIGN KEY ("rsvps_id") REFERENCES "public"."rsvps"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_default_share_image_id_media_id_fk" FOREIGN KEY ("default_share_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_rsvps_id_idx" ON "payload_locked_documents_rels" USING btree ("rsvps_id");
  CREATE INDEX "site_settings_default_share_image_idx" ON "site_settings" USING btree ("default_share_image_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "rsvps" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "rsvps" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_rsvps_fk";
  
  ALTER TABLE "site_settings" DROP CONSTRAINT "site_settings_default_share_image_id_media_id_fk";
  
  DROP INDEX "payload_locked_documents_rels_rsvps_id_idx";
  DROP INDEX "site_settings_default_share_image_idx";
  ALTER TABLE "people" DROP COLUMN "contact_email";
  ALTER TABLE "people" DROP COLUMN "show_contact";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "rsvps_id";
  ALTER TABLE "site_settings" DROP COLUMN "linkedin";
  ALTER TABLE "site_settings" DROP COLUMN "default_share_image_id";
  DROP TYPE "public"."enum_rsvps_status";`)
}
