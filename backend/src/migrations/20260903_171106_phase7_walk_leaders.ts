import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "walks_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"people_id" integer
  );
  
  CREATE TABLE "_walks_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"people_id" integer
  );
  
  ALTER TABLE "walks" DROP CONSTRAINT "walks_leader_id_people_id_fk";
  
  ALTER TABLE "_walks_v" DROP CONSTRAINT "_walks_v_version_leader_id_people_id_fk";
  
  DROP INDEX "walks_leader_idx";
  DROP INDEX "_walks_v_version_version_leader_idx";
  ALTER TABLE "walks_rels" ADD CONSTRAINT "walks_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."walks"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "walks_rels" ADD CONSTRAINT "walks_rels_people_fk" FOREIGN KEY ("people_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_walks_v_rels" ADD CONSTRAINT "_walks_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_walks_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_walks_v_rels" ADD CONSTRAINT "_walks_v_rels_people_fk" FOREIGN KEY ("people_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "walks_rels_order_idx" ON "walks_rels" USING btree ("order");
  CREATE INDEX "walks_rels_parent_idx" ON "walks_rels" USING btree ("parent_id");
  CREATE INDEX "walks_rels_path_idx" ON "walks_rels" USING btree ("path");
  CREATE INDEX "walks_rels_people_id_idx" ON "walks_rels" USING btree ("people_id");
  CREATE INDEX "_walks_v_rels_order_idx" ON "_walks_v_rels" USING btree ("order");
  CREATE INDEX "_walks_v_rels_parent_idx" ON "_walks_v_rels" USING btree ("parent_id");
  CREATE INDEX "_walks_v_rels_path_idx" ON "_walks_v_rels" USING btree ("path");
  CREATE INDEX "_walks_v_rels_people_id_idx" ON "_walks_v_rels" USING btree ("people_id");
  -- Hand-added: carry every existing single leader over as the first (and
  -- only) entry of the new leaders list, drafts included, before the old
  -- column goes.
  INSERT INTO "walks_rels" ("order", "parent_id", "path", "people_id")
    SELECT 1, "id", 'leaders', "leader_id" FROM "walks" WHERE "leader_id" IS NOT NULL;
  INSERT INTO "_walks_v_rels" ("order", "parent_id", "path", "people_id")
    SELECT 1, "id", 'leaders', "version_leader_id" FROM "_walks_v" WHERE "version_leader_id" IS NOT NULL;
  ALTER TABLE "walks" DROP COLUMN "leader_id";
  ALTER TABLE "_walks_v" DROP COLUMN "version_leader_id";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "walks_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_walks_v_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "walks" ADD COLUMN "leader_id" integer;
  ALTER TABLE "_walks_v" ADD COLUMN "version_leader_id" integer;
  -- Hand-added: the first listed leader becomes the single leader again.
  UPDATE "walks" w SET "leader_id" = r."people_id"
    FROM (
      SELECT DISTINCT ON ("parent_id") "parent_id", "people_id"
      FROM "walks_rels" WHERE "path" = 'leaders' ORDER BY "parent_id", "order" ASC
    ) r
    WHERE r."parent_id" = w."id";
  UPDATE "_walks_v" v SET "version_leader_id" = r."people_id"
    FROM (
      SELECT DISTINCT ON ("parent_id") "parent_id", "people_id"
      FROM "_walks_v_rels" WHERE "path" = 'leaders' ORDER BY "parent_id", "order" ASC
    ) r
    WHERE r."parent_id" = v."id";
  DROP TABLE "walks_rels" CASCADE;
  DROP TABLE "_walks_v_rels" CASCADE;
  ALTER TABLE "walks" ADD CONSTRAINT "walks_leader_id_people_id_fk" FOREIGN KEY ("leader_id") REFERENCES "public"."people"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_walks_v" ADD CONSTRAINT "_walks_v_version_leader_id_people_id_fk" FOREIGN KEY ("version_leader_id") REFERENCES "public"."people"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "walks_leader_idx" ON "walks" USING btree ("leader_id");
  CREATE INDEX "_walks_v_version_version_leader_idx" ON "_walks_v" USING btree ("version_leader_id");`)
}
