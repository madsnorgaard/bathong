import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Phase 6: joining and orders. Orders carry a plan, an EFT reference and
 * the covered period; the membership global gets the bank details; people
 * gain an owner (the account that edits the profile) and the roster switch;
 * RSVPs remember the signed-in member. Member numbers come from a Postgres
 * sequence started past the founders (1 to 4) and past anything typed by
 * hand. One open membership order per account is a partial unique index.
 * Data: profiles already numbered or founding go on the roster, and each
 * account's `profile` becomes that profile's `owner`.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_orders_plan" AS ENUM('monthly', 'annual');
  ALTER TABLE "orders" ALTER COLUMN "status" SET DEFAULT 'pending';
  ALTER TABLE "people" ADD COLUMN "owner_id" integer;
  ALTER TABLE "people" ADD COLUMN "on_roster" boolean DEFAULT false;
  ALTER TABLE "orders" ADD COLUMN "plan" "enum_orders_plan";
  ALTER TABLE "orders" ADD COLUMN "joining_fee" numeric DEFAULT 0;
  ALTER TABLE "orders" ADD COLUMN "reference" varchar;
  ALTER TABLE "orders" ADD COLUMN "paid_at" timestamp(3) with time zone;
  ALTER TABLE "orders" ADD COLUMN "covered_from" timestamp(3) with time zone;
  ALTER TABLE "orders" ADD COLUMN "covered_until" timestamp(3) with time zone;
  ALTER TABLE "orders" ADD COLUMN "note" varchar;
  ALTER TABLE "rsvps" ADD COLUMN "user_id" integer;
  ALTER TABLE "membership" ADD COLUMN "reference_prefix" varchar DEFAULT 'BTG';
  ALTER TABLE "membership" ADD COLUMN "bank_account_name" varchar;
  ALTER TABLE "membership" ADD COLUMN "bank_bank_name" varchar;
  ALTER TABLE "membership" ADD COLUMN "bank_account_number" varchar;
  ALTER TABLE "membership" ADD COLUMN "bank_branch_code" varchar;
  ALTER TABLE "membership" ADD COLUMN "bank_account_type" varchar;
  ALTER TABLE "membership" ADD COLUMN "bank_payment_note" varchar DEFAULT 'Use the reference exactly as shown. We confirm EFTs by hand, usually within two working days.';
  ALTER TABLE "_membership_v" ADD COLUMN "version_reference_prefix" varchar DEFAULT 'BTG';
  ALTER TABLE "_membership_v" ADD COLUMN "version_bank_account_name" varchar;
  ALTER TABLE "_membership_v" ADD COLUMN "version_bank_bank_name" varchar;
  ALTER TABLE "_membership_v" ADD COLUMN "version_bank_account_number" varchar;
  ALTER TABLE "_membership_v" ADD COLUMN "version_bank_branch_code" varchar;
  ALTER TABLE "_membership_v" ADD COLUMN "version_bank_account_type" varchar;
  ALTER TABLE "_membership_v" ADD COLUMN "version_bank_payment_note" varchar DEFAULT 'Use the reference exactly as shown. We confirm EFTs by hand, usually within two working days.';
  ALTER TABLE "people" ADD CONSTRAINT "people_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "rsvps" ADD CONSTRAINT "rsvps_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  CREATE UNIQUE INDEX "people_owner_idx" ON "people" USING btree ("owner_id");
  CREATE UNIQUE INDEX "orders_reference_idx" ON "orders" USING btree ("reference");
  CREATE INDEX "rsvps_user_idx" ON "rsvps" USING btree ("user_id");
  CREATE UNIQUE INDEX "orders_one_pending_idx" ON "orders" USING btree ("user_id") WHERE "type" = 'membership' AND "status" = 'pending';
  CREATE SEQUENCE IF NOT EXISTS "people_member_number_seq";
  SELECT setval('people_member_number_seq', GREATEST(COALESCE((SELECT max("member_number") FROM "people"), 0), 4)::bigint);
  UPDATE "people" SET "on_roster" = true WHERE "founding_circle" = true OR "member_number" IS NOT NULL;
  UPDATE "people" p SET "owner_id" = u."id" FROM "users" u WHERE u."profile_id" = p."id" AND p."owner_id" IS NULL;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP SEQUENCE IF EXISTS "people_member_number_seq";
  ALTER TABLE "people" DROP CONSTRAINT "people_owner_id_users_id_fk";
  
  ALTER TABLE "rsvps" DROP CONSTRAINT "rsvps_user_id_users_id_fk";
  
  DROP INDEX "people_owner_idx";
  DROP INDEX "orders_reference_idx";
  DROP INDEX "rsvps_user_idx";
  DROP INDEX "orders_one_pending_idx";
  ALTER TABLE "orders" ALTER COLUMN "status" DROP DEFAULT;
  ALTER TABLE "people" DROP COLUMN "owner_id";
  ALTER TABLE "people" DROP COLUMN "on_roster";
  ALTER TABLE "orders" DROP COLUMN "plan";
  ALTER TABLE "orders" DROP COLUMN "joining_fee";
  ALTER TABLE "orders" DROP COLUMN "reference";
  ALTER TABLE "orders" DROP COLUMN "paid_at";
  ALTER TABLE "orders" DROP COLUMN "covered_from";
  ALTER TABLE "orders" DROP COLUMN "covered_until";
  ALTER TABLE "orders" DROP COLUMN "note";
  ALTER TABLE "rsvps" DROP COLUMN "user_id";
  ALTER TABLE "membership" DROP COLUMN "reference_prefix";
  ALTER TABLE "membership" DROP COLUMN "bank_account_name";
  ALTER TABLE "membership" DROP COLUMN "bank_bank_name";
  ALTER TABLE "membership" DROP COLUMN "bank_account_number";
  ALTER TABLE "membership" DROP COLUMN "bank_branch_code";
  ALTER TABLE "membership" DROP COLUMN "bank_account_type";
  ALTER TABLE "membership" DROP COLUMN "bank_payment_note";
  ALTER TABLE "_membership_v" DROP COLUMN "version_reference_prefix";
  ALTER TABLE "_membership_v" DROP COLUMN "version_bank_account_name";
  ALTER TABLE "_membership_v" DROP COLUMN "version_bank_bank_name";
  ALTER TABLE "_membership_v" DROP COLUMN "version_bank_account_number";
  ALTER TABLE "_membership_v" DROP COLUMN "version_bank_branch_code";
  ALTER TABLE "_membership_v" DROP COLUMN "version_bank_account_type";
  ALTER TABLE "_membership_v" DROP COLUMN "version_bank_payment_note";
  DROP TYPE "public"."enum_orders_plan";`)
}
