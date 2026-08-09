import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "submissions" ALTER COLUMN "submitter_id" DROP NOT NULL;
  ALTER TABLE "submissions" ADD COLUMN "submitter_name" varchar;
  ALTER TABLE "submissions" ADD COLUMN "submitter_email" varchar;
  ALTER TABLE "submissions" ADD COLUMN "where_you_shoot" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "submissions" ALTER COLUMN "submitter_id" SET NOT NULL;
  ALTER TABLE "submissions" DROP COLUMN "submitter_name";
  ALTER TABLE "submissions" DROP COLUMN "submitter_email";
  ALTER TABLE "submissions" DROP COLUMN "where_you_shoot";`)
}
