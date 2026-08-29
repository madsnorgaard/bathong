import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Phase 5: the walk closes its loop.
 *
 * - essays.relatedWalk (single) becomes essays.walks (hasMany, rels table);
 *   existing values are MOVED into essays_rels before the column goes.
 * - walks.resultEssay is dropped: the reverse side is now join fields
 *   (essays / frames / albums), which are virtual and need no columns.
 * - frames.walk (single) is new.
 * - albums is a new drafts-enabled collection holding plain media.
 *
 * Generated with `payload migrate:create` and hand-edited: the statements
 * the generator re-emitted for earlier hand-written migrations (route_geo,
 * top_pick) were removed. The .json snapshot next to this file re-baselines
 * the generator, so future migrations diff cleanly again.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  CREATE TYPE "public"."enum_albums_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__albums_v_version_status" AS ENUM('draft', 'published');
  CREATE TABLE "albums" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"slug" varchar,
  	"intro" varchar,
  	"photographer_id" integer,
  	"credit_override" varchar,
  	"date" timestamp(3) with time zone,
  	"published_date" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_albums_status" DEFAULT 'draft'
  );

  CREATE TABLE "albums_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" integer,
  	"walks_id" integer
  );

  CREATE TABLE "_albums_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_slug" varchar,
  	"version_intro" varchar,
  	"version_photographer_id" integer,
  	"version_credit_override" varchar,
  	"version_date" timestamp(3) with time zone,
  	"version_published_date" timestamp(3) with time zone,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__albums_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );

  CREATE TABLE "_albums_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" integer,
  	"walks_id" integer
  );

  ALTER TABLE "albums" ADD CONSTRAINT "albums_photographer_id_people_id_fk" FOREIGN KEY ("photographer_id") REFERENCES "public"."people"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "albums_rels" ADD CONSTRAINT "albums_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."albums"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "albums_rels" ADD CONSTRAINT "albums_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "albums_rels" ADD CONSTRAINT "albums_rels_walks_fk" FOREIGN KEY ("walks_id") REFERENCES "public"."walks"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_albums_v" ADD CONSTRAINT "_albums_v_parent_id_albums_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."albums"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_albums_v" ADD CONSTRAINT "_albums_v_version_photographer_id_people_id_fk" FOREIGN KEY ("version_photographer_id") REFERENCES "public"."people"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_albums_v_rels" ADD CONSTRAINT "_albums_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_albums_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_albums_v_rels" ADD CONSTRAINT "_albums_v_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_albums_v_rels" ADD CONSTRAINT "_albums_v_rels_walks_fk" FOREIGN KEY ("walks_id") REFERENCES "public"."walks"("id") ON DELETE cascade ON UPDATE no action;
  CREATE UNIQUE INDEX "albums_slug_idx" ON "albums" USING btree ("slug");
  CREATE INDEX "albums_photographer_idx" ON "albums" USING btree ("photographer_id");
  CREATE INDEX "albums_updated_at_idx" ON "albums" USING btree ("updated_at");
  CREATE INDEX "albums_created_at_idx" ON "albums" USING btree ("created_at");
  CREATE INDEX "albums__status_idx" ON "albums" USING btree ("_status");
  CREATE INDEX "albums_rels_order_idx" ON "albums_rels" USING btree ("order");
  CREATE INDEX "albums_rels_parent_idx" ON "albums_rels" USING btree ("parent_id");
  CREATE INDEX "albums_rels_path_idx" ON "albums_rels" USING btree ("path");
  CREATE INDEX "albums_rels_media_id_idx" ON "albums_rels" USING btree ("media_id");
  CREATE INDEX "albums_rels_walks_id_idx" ON "albums_rels" USING btree ("walks_id");
  CREATE INDEX "_albums_v_parent_idx" ON "_albums_v" USING btree ("parent_id");
  CREATE INDEX "_albums_v_version_version_slug_idx" ON "_albums_v" USING btree ("version_slug");
  CREATE INDEX "_albums_v_version_version_photographer_idx" ON "_albums_v" USING btree ("version_photographer_id");
  CREATE INDEX "_albums_v_version_version_updated_at_idx" ON "_albums_v" USING btree ("version_updated_at");
  CREATE INDEX "_albums_v_version_version_created_at_idx" ON "_albums_v" USING btree ("version_created_at");
  CREATE INDEX "_albums_v_version_version__status_idx" ON "_albums_v" USING btree ("version__status");
  CREATE INDEX "_albums_v_created_at_idx" ON "_albums_v" USING btree ("created_at");
  CREATE INDEX "_albums_v_updated_at_idx" ON "_albums_v" USING btree ("updated_at");
  CREATE INDEX "_albums_v_latest_idx" ON "_albums_v" USING btree ("latest");
  CREATE INDEX "_albums_v_rels_order_idx" ON "_albums_v_rels" USING btree ("order");
  CREATE INDEX "_albums_v_rels_parent_idx" ON "_albums_v_rels" USING btree ("parent_id");
  CREATE INDEX "_albums_v_rels_path_idx" ON "_albums_v_rels" USING btree ("path");
  CREATE INDEX "_albums_v_rels_media_id_idx" ON "_albums_v_rels" USING btree ("media_id");
  CREATE INDEX "_albums_v_rels_walks_id_idx" ON "_albums_v_rels" USING btree ("walks_id");

  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "albums_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_albums_fk" FOREIGN KEY ("albums_id") REFERENCES "public"."albums"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_albums_id_idx" ON "payload_locked_documents_rels" USING btree ("albums_id");

  ALTER TABLE "frames" ADD COLUMN "walk_id" integer;
  ALTER TABLE "frames" ADD CONSTRAINT "frames_walk_id_walks_id_fk" FOREIGN KEY ("walk_id") REFERENCES "public"."walks"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "frames_walk_idx" ON "frames" USING btree ("walk_id");

  ALTER TABLE "essays_rels" ADD COLUMN "walks_id" integer;
  ALTER TABLE "_essays_v_rels" ADD COLUMN "walks_id" integer;
  ALTER TABLE "essays_rels" ADD CONSTRAINT "essays_rels_walks_fk" FOREIGN KEY ("walks_id") REFERENCES "public"."walks"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_essays_v_rels" ADD CONSTRAINT "_essays_v_rels_walks_fk" FOREIGN KEY ("walks_id") REFERENCES "public"."walks"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "essays_rels_walks_id_idx" ON "essays_rels" USING btree ("walks_id");
  CREATE INDEX "_essays_v_rels_walks_id_idx" ON "_essays_v_rels" USING btree ("walks_id");

  -- Move every existing relatedWalk into the hasMany rels BEFORE the column goes.
  INSERT INTO "essays_rels" ("order", "parent_id", "path", "walks_id")
    SELECT 1, "id", 'walks', "related_walk_id" FROM "essays" WHERE "related_walk_id" IS NOT NULL;
  INSERT INTO "_essays_v_rels" ("order", "parent_id", "path", "walks_id")
    SELECT 1, "id", 'version.walks', "version_related_walk_id" FROM "_essays_v" WHERE "version_related_walk_id" IS NOT NULL;

  ALTER TABLE "essays" DROP CONSTRAINT "essays_related_walk_id_walks_id_fk";
  ALTER TABLE "_essays_v" DROP CONSTRAINT "_essays_v_version_related_walk_id_walks_id_fk";
  ALTER TABLE "walks" DROP CONSTRAINT "walks_result_essay_id_essays_id_fk";
  ALTER TABLE "_walks_v" DROP CONSTRAINT "_walks_v_version_result_essay_id_essays_id_fk";
  DROP INDEX "essays_related_walk_idx";
  DROP INDEX "_essays_v_version_version_related_walk_idx";
  DROP INDEX "walks_result_essay_idx";
  DROP INDEX "_walks_v_version_version_result_essay_idx";
  ALTER TABLE "essays" DROP COLUMN "related_walk_id";
  ALTER TABLE "_essays_v" DROP COLUMN "version_related_walk_id";
  ALTER TABLE "walks" DROP COLUMN "result_essay_id";
  ALTER TABLE "_walks_v" DROP COLUMN "version_result_essay_id";`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "essays" ADD COLUMN "related_walk_id" integer;
  ALTER TABLE "_essays_v" ADD COLUMN "version_related_walk_id" integer;
  ALTER TABLE "walks" ADD COLUMN "result_essay_id" integer;
  ALTER TABLE "_walks_v" ADD COLUMN "version_result_essay_id" integer;
  ALTER TABLE "essays" ADD CONSTRAINT "essays_related_walk_id_walks_id_fk" FOREIGN KEY ("related_walk_id") REFERENCES "public"."walks"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_essays_v" ADD CONSTRAINT "_essays_v_version_related_walk_id_walks_id_fk" FOREIGN KEY ("version_related_walk_id") REFERENCES "public"."walks"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "walks" ADD CONSTRAINT "walks_result_essay_id_essays_id_fk" FOREIGN KEY ("result_essay_id") REFERENCES "public"."essays"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_walks_v" ADD CONSTRAINT "_walks_v_version_result_essay_id_essays_id_fk" FOREIGN KEY ("version_result_essay_id") REFERENCES "public"."essays"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "essays_related_walk_idx" ON "essays" USING btree ("related_walk_id");
  CREATE INDEX "_essays_v_version_version_related_walk_idx" ON "_essays_v" USING btree ("version_related_walk_id");
  CREATE INDEX "walks_result_essay_idx" ON "walks" USING btree ("result_essay_id");
  CREATE INDEX "_walks_v_version_version_result_essay_idx" ON "_walks_v" USING btree ("version_result_essay_id");

  -- The first linked walk goes back into the single column; the rest is lost by design.
  UPDATE "essays" e SET "related_walk_id" = r."walks_id"
    FROM "essays_rels" r WHERE r."parent_id" = e."id" AND r."path" = 'walks' AND r."order" = 1;
  UPDATE "_essays_v" v SET "version_related_walk_id" = r."walks_id"
    FROM "_essays_v_rels" r WHERE r."parent_id" = v."id" AND r."path" = 'version.walks' AND r."order" = 1;
  DELETE FROM "essays_rels" WHERE "path" = 'walks';
  DELETE FROM "_essays_v_rels" WHERE "path" = 'version.walks';

  ALTER TABLE "essays_rels" DROP CONSTRAINT "essays_rels_walks_fk";
  ALTER TABLE "_essays_v_rels" DROP CONSTRAINT "_essays_v_rels_walks_fk";
  DROP INDEX "essays_rels_walks_id_idx";
  DROP INDEX "_essays_v_rels_walks_id_idx";
  ALTER TABLE "essays_rels" DROP COLUMN "walks_id";
  ALTER TABLE "_essays_v_rels" DROP COLUMN "walks_id";

  ALTER TABLE "frames" DROP CONSTRAINT "frames_walk_id_walks_id_fk";
  DROP INDEX "frames_walk_idx";
  ALTER TABLE "frames" DROP COLUMN "walk_id";

  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_albums_fk";
  DROP INDEX "payload_locked_documents_rels_albums_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "albums_id";

  ALTER TABLE "albums" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "albums_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_albums_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_albums_v_rels" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "albums" CASCADE;
  DROP TABLE "albums_rels" CASCADE;
  DROP TABLE "_albums_v" CASCADE;
  DROP TABLE "_albums_v_rels" CASCADE;
  DROP TYPE "public"."enum_albums_status";
  DROP TYPE "public"."enum__albums_v_version_status";`)
}
