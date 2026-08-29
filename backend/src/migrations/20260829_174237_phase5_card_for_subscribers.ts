import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "membership" ALTER COLUMN "price_note" SET DEFAULT 'The card and your member number come with a monthly or annual membership. Monthly can stop any time.';
  ALTER TABLE "_membership_v" ALTER COLUMN "version_price_note" SET DEFAULT 'The card and your member number come with a monthly or annual membership. Monthly can stop any time.';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "membership" ALTER COLUMN "price_note" SET DEFAULT 'The card and your member number are included. Monthly can stop any time.';
  ALTER TABLE "_membership_v" ALTER COLUMN "version_price_note" SET DEFAULT 'The card and your member number are included. Monthly can stop any time.';`)
}
