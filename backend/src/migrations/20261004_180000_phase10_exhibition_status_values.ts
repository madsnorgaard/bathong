import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Hand-written, the same repair as 20260809_140000 for photocalls. The
 * exhibitions `status` select (upcoming/current/past) and the drafts
 * `_status` column share one enum name, and the initial migration created it
 * with draft/published only, so no exhibition could ever be saved with a
 * status. Adds the missing values to both the live and versions enums.
 * Postgres keeps enum values forever; the down migration is a no-op because
 * removing enum values requires a rebuild and no data depends on the old
 * shape.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_exhibitions_status" ADD VALUE IF NOT EXISTS 'upcoming';
   ALTER TYPE "public"."enum_exhibitions_status" ADD VALUE IF NOT EXISTS 'current';
   ALTER TYPE "public"."enum_exhibitions_status" ADD VALUE IF NOT EXISTS 'past';
   ALTER TYPE "public"."enum__exhibitions_v_version_status" ADD VALUE IF NOT EXISTS 'upcoming';
   ALTER TYPE "public"."enum__exhibitions_v_version_status" ADD VALUE IF NOT EXISTS 'current';
   ALTER TYPE "public"."enum__exhibitions_v_version_status" ADD VALUE IF NOT EXISTS 'past';
  `)
}

export async function down(_args: MigrateDownArgs): Promise<void> {
  // no-op: see header comment
}
