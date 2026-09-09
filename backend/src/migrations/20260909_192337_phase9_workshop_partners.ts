import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "workshops_partners" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"url" varchar,
  	"logo_id" integer
  );
  
  CREATE TABLE "_workshops_v_version_partners" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"url" varchar,
  	"logo_id" integer,
  	"_uuid" varchar
  );
  
  ALTER TABLE "workshops" DROP CONSTRAINT "workshops_partner_logo_id_media_id_fk";
  
  ALTER TABLE "_workshops_v" DROP CONSTRAINT "_workshops_v_version_partner_logo_id_media_id_fk";
  
  DROP INDEX "workshops_partner_partner_logo_idx";
  DROP INDEX "_workshops_v_version_partner_version_partner_logo_idx";
  ALTER TABLE "workshops_partners" ADD CONSTRAINT "workshops_partners_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "workshops_partners" ADD CONSTRAINT "workshops_partners_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."workshops"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_workshops_v_version_partners" ADD CONSTRAINT "_workshops_v_version_partners_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_workshops_v_version_partners" ADD CONSTRAINT "_workshops_v_version_partners_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_workshops_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "workshops_partners_order_idx" ON "workshops_partners" USING btree ("_order");
  CREATE INDEX "workshops_partners_parent_id_idx" ON "workshops_partners" USING btree ("_parent_id");
  CREATE INDEX "workshops_partners_logo_idx" ON "workshops_partners" USING btree ("logo_id");
  CREATE INDEX "_workshops_v_version_partners_order_idx" ON "_workshops_v_version_partners" USING btree ("_order");
  CREATE INDEX "_workshops_v_version_partners_parent_id_idx" ON "_workshops_v_version_partners" USING btree ("_parent_id");
  CREATE INDEX "_workshops_v_version_partners_logo_idx" ON "_workshops_v_version_partners" USING btree ("logo_id");
  -- Hand-added: an existing single partner becomes the first (and only)
  -- entry of the new partners list, drafts included, before the old
  -- columns go. Array row ids are varchars; a derived one is fine.
  INSERT INTO "workshops_partners" ("_order", "_parent_id", "id", "name", "url", "logo_id")
    SELECT 1, "id", 'migrated-partner-' || "id", "partner_name", "partner_url", "partner_logo_id"
    FROM "workshops"
    WHERE "partner_name" IS NOT NULL OR "partner_logo_id" IS NOT NULL;
  INSERT INTO "_workshops_v_version_partners" ("_order", "_parent_id", "name", "url", "logo_id", "_uuid")
    SELECT 1, "id", "version_partner_name", "version_partner_url", "version_partner_logo_id", 'migrated-partner-v-' || "id"
    FROM "_workshops_v"
    WHERE "version_partner_name" IS NOT NULL OR "version_partner_logo_id" IS NOT NULL;
  ALTER TABLE "workshops" DROP COLUMN "partner_name";
  ALTER TABLE "workshops" DROP COLUMN "partner_url";
  ALTER TABLE "workshops" DROP COLUMN "partner_logo_id";
  ALTER TABLE "_workshops_v" DROP COLUMN "version_partner_name";
  ALTER TABLE "_workshops_v" DROP COLUMN "version_partner_url";
  ALTER TABLE "_workshops_v" DROP COLUMN "version_partner_logo_id";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "workshops_partners" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_workshops_v_version_partners" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "workshops" ADD COLUMN "partner_name" varchar;
  ALTER TABLE "workshops" ADD COLUMN "partner_url" varchar;
  ALTER TABLE "workshops" ADD COLUMN "partner_logo_id" integer;
  ALTER TABLE "_workshops_v" ADD COLUMN "version_partner_name" varchar;
  ALTER TABLE "_workshops_v" ADD COLUMN "version_partner_url" varchar;
  ALTER TABLE "_workshops_v" ADD COLUMN "version_partner_logo_id" integer;
  -- Hand-added: the first listed partner becomes the single partner again,
  -- copied back before its table drops.
  UPDATE "workshops" w SET
    "partner_name" = p."name", "partner_url" = p."url", "partner_logo_id" = p."logo_id"
    FROM (
      SELECT DISTINCT ON ("_parent_id") "_parent_id", "name", "url", "logo_id"
      FROM "workshops_partners" ORDER BY "_parent_id", "_order" ASC
    ) p
    WHERE p."_parent_id" = w."id";
  UPDATE "_workshops_v" v SET
    "version_partner_name" = p."name", "version_partner_url" = p."url", "version_partner_logo_id" = p."logo_id"
    FROM (
      SELECT DISTINCT ON ("_parent_id") "_parent_id", "name", "url", "logo_id"
      FROM "_workshops_v_version_partners" ORDER BY "_parent_id", "_order" ASC
    ) p
    WHERE p."_parent_id" = v."id";
  DROP TABLE "workshops_partners" CASCADE;
  DROP TABLE "_workshops_v_version_partners" CASCADE;
  ALTER TABLE "workshops" ADD CONSTRAINT "workshops_partner_logo_id_media_id_fk" FOREIGN KEY ("partner_logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_workshops_v" ADD CONSTRAINT "_workshops_v_version_partner_logo_id_media_id_fk" FOREIGN KEY ("version_partner_logo_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "workshops_partner_partner_logo_idx" ON "workshops" USING btree ("partner_logo_id");
  CREATE INDEX "_workshops_v_version_partner_version_partner_logo_idx" ON "_workshops_v" USING btree ("version_partner_logo_id");`)
}
