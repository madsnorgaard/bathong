import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Phase 6: accounts. Email verification switches on with this migration, so
 * every account that exists today is marked verified in the same step:
 * nobody who can sign in now gets locked out. memberSince is backfilled for
 * the accounts that are already active (the joining fee is charged only
 * while it is empty).
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "users" ADD COLUMN "member_since" timestamp(3) with time zone;
  ALTER TABLE "users" ADD COLUMN "newsletter" boolean DEFAULT false;
  ALTER TABLE "users" ADD COLUMN "pending_email" varchar;
  ALTER TABLE "users" ADD COLUMN "pending_email_token" varchar;
  ALTER TABLE "users" ADD COLUMN "pending_email_expires" timestamp(3) with time zone;
  ALTER TABLE "users" ADD COLUMN "_verified" boolean;
  ALTER TABLE "users" ADD COLUMN "_verificationtoken" varchar;
  UPDATE "users" SET "_verified" = true;
  UPDATE "users" SET "member_since" = "created_at" WHERE "membership_status" = 'active' AND "member_since" IS NULL;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "users" DROP COLUMN "member_since";
  ALTER TABLE "users" DROP COLUMN "newsletter";
  ALTER TABLE "users" DROP COLUMN "pending_email";
  ALTER TABLE "users" DROP COLUMN "pending_email_token";
  ALTER TABLE "users" DROP COLUMN "pending_email_expires";
  ALTER TABLE "users" DROP COLUMN "_verified";
  ALTER TABLE "users" DROP COLUMN "_verificationtoken";`)
}
