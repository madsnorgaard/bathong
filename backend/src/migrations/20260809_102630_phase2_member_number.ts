import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "people" ADD COLUMN "member_number" numeric;
  CREATE UNIQUE INDEX "people_member_number_idx" ON "people" USING btree ("member_number");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "people_member_number_idx";
  ALTER TABLE "people" DROP COLUMN "member_number";`)
}
