import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "walks" ADD COLUMN "route_geo" jsonb;
  ALTER TABLE "_walks_v" ADD COLUMN "version_route_geo" jsonb;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "walks" DROP COLUMN "route_geo";
  ALTER TABLE "_walks_v" DROP COLUMN "version_route_geo";`)
}
