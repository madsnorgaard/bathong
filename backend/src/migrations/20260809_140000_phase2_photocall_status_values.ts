import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Hand-written: the Photocalls status options changed from draft/published to
 * draft/open/judging/closed after the initial migration, and drizzle's
 * migrate:create does not diff enum values. Adds the missing values to both
 * the live and versions enums. Postgres keeps enum values forever; the down
 * migration is a no-op because removing enum values requires a rebuild and
 * no data depends on the old shape.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_photocalls_status" ADD VALUE IF NOT EXISTS 'open';
   ALTER TYPE "public"."enum_photocalls_status" ADD VALUE IF NOT EXISTS 'judging';
   ALTER TYPE "public"."enum_photocalls_status" ADD VALUE IF NOT EXISTS 'closed';
   ALTER TYPE "public"."enum__photocalls_v_version_status" ADD VALUE IF NOT EXISTS 'open';
   ALTER TYPE "public"."enum__photocalls_v_version_status" ADD VALUE IF NOT EXISTS 'judging';
   ALTER TYPE "public"."enum__photocalls_v_version_status" ADD VALUE IF NOT EXISTS 'closed';
  `)
}

export async function down(_args: MigrateDownArgs): Promise<void> {
  // no-op: see header comment
}
