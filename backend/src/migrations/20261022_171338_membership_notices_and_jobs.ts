import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Generated with `payload migrate:create` against a scratch Postgres on
 * 22 Oct 2026 (#83): the membership-notices collection with its unique
 * (user, kind, expires) index, and Payload's own payload_jobs tables, which
 * arrive with the first jobs config. It also drops users.reset_password_
 * requested_at: Payload 3.90 added that column (migration 20261002_193121)
 * and 3.91 no longer references it anywhere, so the generator removes the
 * drift here rather than in every migration after this one.
 */

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_membership_notices_kind" AS ENUM('reminder-30', 'reminder-7', 'lapsed');
  CREATE TYPE "public"."enum_membership_notices_outcome" AS ENUM('sent', 'overtaken');
  CREATE TYPE "public"."enum_payload_jobs_log_task_slug" AS ENUM('inline', 'membershipNotices');
  CREATE TYPE "public"."enum_payload_jobs_log_state" AS ENUM('failed', 'succeeded');
  CREATE TYPE "public"."enum_payload_jobs_task_slug" AS ENUM('inline', 'membershipNotices');
  CREATE TABLE "membership_notices" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"user_id" integer NOT NULL,
  	"kind" "enum_membership_notices_kind" NOT NULL,
  	"expires" timestamp(3) with time zone NOT NULL,
  	"outcome" "enum_membership_notices_outcome" NOT NULL,
  	"sent_at" timestamp(3) with time zone NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_jobs_log" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"executed_at" timestamp(3) with time zone NOT NULL,
  	"completed_at" timestamp(3) with time zone NOT NULL,
  	"task_slug" "enum_payload_jobs_log_task_slug" NOT NULL,
  	"task_i_d" varchar NOT NULL,
  	"input" jsonb,
  	"output" jsonb,
  	"state" "enum_payload_jobs_log_state" NOT NULL,
  	"error" jsonb
  );
  
  CREATE TABLE "payload_jobs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"input" jsonb,
  	"completed_at" timestamp(3) with time zone,
  	"total_tried" numeric DEFAULT 0,
  	"has_error" boolean DEFAULT false,
  	"error" jsonb,
  	"task_slug" "enum_payload_jobs_task_slug",
  	"queue" varchar DEFAULT 'default',
  	"wait_until" timestamp(3) with time zone,
  	"processing" boolean DEFAULT false,
  	"meta" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_jobs_stats" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"stats" jsonb,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "membership_notices_id" integer;
  ALTER TABLE "membership_notices" ADD CONSTRAINT "membership_notices_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_jobs_log" ADD CONSTRAINT "payload_jobs_log_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."payload_jobs"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "membership_notices_user_idx" ON "membership_notices" USING btree ("user_id");
  CREATE INDEX "membership_notices_updated_at_idx" ON "membership_notices" USING btree ("updated_at");
  CREATE INDEX "membership_notices_created_at_idx" ON "membership_notices" USING btree ("created_at");
  CREATE UNIQUE INDEX "user_kind_expires_idx" ON "membership_notices" USING btree ("user_id","kind","expires");
  CREATE INDEX "payload_jobs_log_order_idx" ON "payload_jobs_log" USING btree ("_order");
  CREATE INDEX "payload_jobs_log_parent_id_idx" ON "payload_jobs_log" USING btree ("_parent_id");
  CREATE INDEX "payload_jobs_completed_at_idx" ON "payload_jobs" USING btree ("completed_at");
  CREATE INDEX "payload_jobs_total_tried_idx" ON "payload_jobs" USING btree ("total_tried");
  CREATE INDEX "payload_jobs_has_error_idx" ON "payload_jobs" USING btree ("has_error");
  CREATE INDEX "payload_jobs_task_slug_idx" ON "payload_jobs" USING btree ("task_slug");
  CREATE INDEX "payload_jobs_queue_idx" ON "payload_jobs" USING btree ("queue");
  CREATE INDEX "payload_jobs_wait_until_idx" ON "payload_jobs" USING btree ("wait_until");
  CREATE INDEX "payload_jobs_processing_idx" ON "payload_jobs" USING btree ("processing");
  CREATE INDEX "payload_jobs_updated_at_idx" ON "payload_jobs" USING btree ("updated_at");
  CREATE INDEX "payload_jobs_created_at_idx" ON "payload_jobs" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_membership_notices_fk" FOREIGN KEY ("membership_notices_id") REFERENCES "public"."membership_notices"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_membership_notices_id_idx" ON "payload_locked_documents_rels" USING btree ("membership_notices_id");
  ALTER TABLE "users" DROP COLUMN "reset_password_requested_at";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "membership_notices" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload_jobs_log" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload_jobs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload_jobs_stats" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "membership_notices" CASCADE;
  DROP TABLE "payload_jobs_log" CASCADE;
  DROP TABLE "payload_jobs" CASCADE;
  DROP TABLE "payload_jobs_stats" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_membership_notices_fk";
  
  DROP INDEX "payload_locked_documents_rels_membership_notices_id_idx";
  ALTER TABLE "users" ADD COLUMN "reset_password_requested_at" timestamp(3) with time zone;
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "membership_notices_id";
  DROP TYPE "public"."enum_membership_notices_kind";
  DROP TYPE "public"."enum_membership_notices_outcome";
  DROP TYPE "public"."enum_payload_jobs_log_task_slug";
  DROP TYPE "public"."enum_payload_jobs_log_state";
  DROP TYPE "public"."enum_payload_jobs_task_slug";`)
}
