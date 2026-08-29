import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * One membership, one price (decided 29 Aug 2026). users.membershipTier
 * (none/individual/student) becomes membershipPlan (none/monthly/annual):
 * a tier says nothing about how a member pays, so every account starts at
 * 'none' and admins set the plan by hand. The membership global trades
 * priceIndividual/priceStudent for joiningFee/priceMonthly/priceAnnual
 * (both old columns were null everywhere). People gain an optional basedIn.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_users_membership_plan" AS ENUM('none', 'monthly', 'annual');
  ALTER TABLE "membership" ALTER COLUMN "price_note" SET DEFAULT 'The card and your member number are included. Monthly can stop any time.';
  ALTER TABLE "_membership_v" ALTER COLUMN "version_price_note" SET DEFAULT 'The card and your member number are included. Monthly can stop any time.';
  ALTER TABLE "users" ADD COLUMN "membership_plan" "enum_users_membership_plan" DEFAULT 'none';
  ALTER TABLE "people" ADD COLUMN "based_in" varchar;
  ALTER TABLE "membership" ADD COLUMN "joining_fee" numeric;
  ALTER TABLE "membership" ADD COLUMN "price_monthly" numeric;
  ALTER TABLE "membership" ADD COLUMN "price_annual" numeric;
  ALTER TABLE "membership" ADD COLUMN "open_door_note" varchar DEFAULT 'If the fee is what stands between you and the collective, write to us anyway.';
  ALTER TABLE "_membership_v" ADD COLUMN "version_joining_fee" numeric;
  ALTER TABLE "_membership_v" ADD COLUMN "version_price_monthly" numeric;
  ALTER TABLE "_membership_v" ADD COLUMN "version_price_annual" numeric;
  ALTER TABLE "_membership_v" ADD COLUMN "version_open_door_note" varchar DEFAULT 'If the fee is what stands between you and the collective, write to us anyway.';
  ALTER TABLE "users" DROP COLUMN "membership_tier";
  ALTER TABLE "membership" DROP COLUMN "price_individual";
  ALTER TABLE "membership" DROP COLUMN "price_student";
  ALTER TABLE "_membership_v" DROP COLUMN "version_price_individual";
  ALTER TABLE "_membership_v" DROP COLUMN "version_price_student";
  DROP TYPE "public"."enum_users_membership_tier";`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_users_membership_tier" AS ENUM('none', 'individual', 'student');
  ALTER TABLE "membership" ALTER COLUMN "price_note" SET DEFAULT 'Launch pricing announced soon';
  ALTER TABLE "_membership_v" ALTER COLUMN "version_price_note" SET DEFAULT 'Launch pricing announced soon';
  ALTER TABLE "users" ADD COLUMN "membership_tier" "enum_users_membership_tier" DEFAULT 'none';
  ALTER TABLE "membership" ADD COLUMN "price_individual" numeric;
  ALTER TABLE "membership" ADD COLUMN "price_student" numeric;
  ALTER TABLE "_membership_v" ADD COLUMN "version_price_individual" numeric;
  ALTER TABLE "_membership_v" ADD COLUMN "version_price_student" numeric;
  ALTER TABLE "users" DROP COLUMN "membership_plan";
  ALTER TABLE "people" DROP COLUMN "based_in";
  ALTER TABLE "membership" DROP COLUMN "joining_fee";
  ALTER TABLE "membership" DROP COLUMN "price_monthly";
  ALTER TABLE "membership" DROP COLUMN "price_annual";
  ALTER TABLE "membership" DROP COLUMN "open_door_note";
  ALTER TABLE "_membership_v" DROP COLUMN "version_joining_fee";
  ALTER TABLE "_membership_v" DROP COLUMN "version_price_monthly";
  ALTER TABLE "_membership_v" DROP COLUMN "version_price_annual";
  ALTER TABLE "_membership_v" DROP COLUMN "version_open_door_note";
  DROP TYPE "public"."enum_users_membership_plan";`)
}
