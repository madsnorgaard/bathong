import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_users_roles" AS ENUM('admin', 'editor', 'member');
  CREATE TYPE "public"."enum_users_membership_tier" AS ENUM('none', 'individual', 'student');
  CREATE TYPE "public"."enum_users_membership_status" AS ENUM('none', 'active', 'lapsed');
  CREATE TYPE "public"."enum_media_visibility" AS ENUM('public', 'restricted');
  CREATE TYPE "public"."enum_essays_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__essays_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_walks_booking_status" AS ENUM('open', 'full', 'closed');
  CREATE TYPE "public"."enum_walks_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__walks_v_version_booking_status" AS ENUM('open', 'full', 'closed');
  CREATE TYPE "public"."enum__walks_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_exhibitions_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__exhibitions_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_photocalls_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__photocalls_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_submissions_status" AS ENUM('submitted', 'shortlisted', 'published', 'rejected');
  CREATE TYPE "public"."enum_orders_type" AS ENUM('membership', 'walk');
  CREATE TYPE "public"."enum_orders_status" AS ENUM('pending', 'paid', 'failed', 'cancelled', 'refunded');
  CREATE TYPE "public"."enum_orders_provider" AS ENUM('payfast', 'manual');
  CREATE TYPE "public"."enum_manifesto_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__manifesto_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_membership_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__membership_v_version_status" AS ENUM('draft', 'published');
  CREATE TABLE "users_roles" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_users_roles",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"profile_id" integer,
  	"membership_tier" "enum_users_membership_tier" DEFAULT 'none',
  	"membership_status" "enum_users_membership_status" DEFAULT 'none',
  	"membership_expires" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "people" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" varchar,
  	"portrait_id" integer,
  	"bio" jsonb,
  	"role_title" varchar,
  	"founding_circle" boolean DEFAULT false,
  	"instagram" varchar,
  	"website" varchar,
  	"order" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"alt" varchar,
  	"credit" varchar,
  	"visibility" "enum_media_visibility" DEFAULT 'public',
  	"uploaded_by_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric,
  	"sizes_thumbnail_url" varchar,
  	"sizes_thumbnail_width" numeric,
  	"sizes_thumbnail_height" numeric,
  	"sizes_thumbnail_mime_type" varchar,
  	"sizes_thumbnail_filesize" numeric,
  	"sizes_thumbnail_filename" varchar,
  	"sizes_card_url" varchar,
  	"sizes_card_width" numeric,
  	"sizes_card_height" numeric,
  	"sizes_card_mime_type" varchar,
  	"sizes_card_filesize" numeric,
  	"sizes_card_filename" varchar,
  	"sizes_feature_url" varchar,
  	"sizes_feature_width" numeric,
  	"sizes_feature_height" numeric,
  	"sizes_feature_mime_type" varchar,
  	"sizes_feature_filesize" numeric,
  	"sizes_feature_filename" varchar,
  	"sizes_hero_url" varchar,
  	"sizes_hero_width" numeric,
  	"sizes_hero_height" numeric,
  	"sizes_hero_mime_type" varchar,
  	"sizes_hero_filesize" numeric,
  	"sizes_hero_filename" varchar,
  	"sizes_og_url" varchar,
  	"sizes_og_width" numeric,
  	"sizes_og_height" numeric,
  	"sizes_og_mime_type" varchar,
  	"sizes_og_filesize" numeric,
  	"sizes_og_filename" varchar
  );
  
  CREATE TABLE "frames" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"image_id" integer NOT NULL,
  	"photographer_id" integer,
  	"credit_override" varchar,
  	"caption" varchar,
  	"location" varchar,
  	"year" numeric,
  	"source_submission_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "frames_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "essays_sequence" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"frame_id" integer,
  	"caption_override" varchar
  );
  
  CREATE TABLE "essays" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"slug" varchar,
  	"deck" varchar,
  	"body" jsonb,
  	"lead_frame_id" integer,
  	"related_walk_id" integer,
  	"related_photocall_id" integer,
  	"published_date" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_essays_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "essays_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "essays_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"people_id" integer
  );
  
  CREATE TABLE "_essays_v_version_sequence" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"frame_id" integer,
  	"caption_override" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_essays_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_slug" varchar,
  	"version_deck" varchar,
  	"version_body" jsonb,
  	"version_lead_frame_id" integer,
  	"version_related_walk_id" integer,
  	"version_related_photocall_id" integer,
  	"version_published_date" timestamp(3) with time zone,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__essays_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "_essays_v_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "_essays_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"people_id" integer
  );
  
  CREATE TABLE "walks" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"slug" varchar,
  	"date" timestamp(3) with time zone,
  	"end_time" timestamp(3) with time zone,
  	"meeting_point" varchar,
  	"route" jsonb,
  	"route_map_id" integer,
  	"capacity" numeric,
  	"price_member" numeric,
  	"price_non_member" numeric,
  	"booking_url" varchar,
  	"booking_status" "enum_walks_booking_status" DEFAULT 'open',
  	"leader_id" integer,
  	"hero_image_id" integer,
  	"result_essay_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_walks_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "_walks_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_slug" varchar,
  	"version_date" timestamp(3) with time zone,
  	"version_end_time" timestamp(3) with time zone,
  	"version_meeting_point" varchar,
  	"version_route" jsonb,
  	"version_route_map_id" integer,
  	"version_capacity" numeric,
  	"version_price_member" numeric,
  	"version_price_non_member" numeric,
  	"version_booking_url" varchar,
  	"version_booking_status" "enum__walks_v_version_booking_status" DEFAULT 'open',
  	"version_leader_id" integer,
  	"version_hero_image_id" integer,
  	"version_result_essay_id" integer,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__walks_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "exhibitions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"slug" varchar,
  	"venue" varchar,
  	"start_date" timestamp(3) with time zone,
  	"end_date" timestamp(3) with time zone,
  	"description" jsonb,
  	"hero_image_id" integer,
  	"partners" varchar,
  	"status" "enum_exhibitions_status",
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_exhibitions_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "exhibitions_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"frames_id" integer,
  	"essays_id" integer
  );
  
  CREATE TABLE "_exhibitions_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_slug" varchar,
  	"version_venue" varchar,
  	"version_start_date" timestamp(3) with time zone,
  	"version_end_date" timestamp(3) with time zone,
  	"version_description" jsonb,
  	"version_hero_image_id" integer,
  	"version_partners" varchar,
  	"version_status" "enum__exhibitions_v_version_status",
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__exhibitions_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "_exhibitions_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"frames_id" integer,
  	"essays_id" integer
  );
  
  CREATE TABLE "photocalls" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"slug" varchar,
  	"theme" jsonb,
  	"hero_image_id" integer,
  	"opens_at" timestamp(3) with time zone,
  	"closes_at" timestamp(3) with time zone,
  	"max_images_per_submission" numeric DEFAULT 5,
  	"members_only" boolean DEFAULT false,
  	"terms" jsonb,
  	"status" "enum_photocalls_status" DEFAULT 'draft',
  	"result_essay_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_photocalls_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "_photocalls_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_slug" varchar,
  	"version_theme" jsonb,
  	"version_hero_image_id" integer,
  	"version_opens_at" timestamp(3) with time zone,
  	"version_closes_at" timestamp(3) with time zone,
  	"version_max_images_per_submission" numeric DEFAULT 5,
  	"version_members_only" boolean DEFAULT false,
  	"version_terms" jsonb,
  	"version_status" "enum__photocalls_v_version_status" DEFAULT 'draft',
  	"version_result_essay_id" integer,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__photocalls_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "submissions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"photocall_id" integer NOT NULL,
  	"submitter_id" integer NOT NULL,
  	"title" varchar,
  	"statement" varchar,
  	"agreed_to_terms" boolean DEFAULT false NOT NULL,
  	"status" "enum_submissions_status" DEFAULT 'submitted',
  	"review_notes" jsonb,
  	"internal_notes" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "submissions_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" integer
  );
  
  CREATE TABLE "orders" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"user_id" integer,
  	"type" "enum_orders_type",
  	"item_id" integer,
  	"amount" numeric,
  	"currency" varchar DEFAULT 'ZAR',
  	"status" "enum_orders_status",
  	"provider" "enum_orders_provider",
  	"provider_ref" varchar,
  	"raw" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer,
  	"people_id" integer,
  	"media_id" integer,
  	"frames_id" integer,
  	"essays_id" integer,
  	"walks_id" integer,
  	"exhibitions_id" integer,
  	"photocalls_id" integer,
  	"submissions_id" integer,
  	"orders_id" integer
  );
  
  CREATE TABLE "payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "site_settings_ticker" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "site_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"site_title" varchar,
  	"contact_email" varchar,
  	"instagram" varchar,
  	"facebook" varchar,
  	"newsletter_url" varchar,
  	"announcement" varchar,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "manifesto_senses" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "manifesto" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"headword" varchar DEFAULT 'ba·thong',
  	"body" jsonb,
  	"lineage" varchar,
  	"_status" "enum_manifesto_status" DEFAULT 'draft',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "_manifesto_v_version_senses" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"text" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_manifesto_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version_headword" varchar DEFAULT 'ba·thong',
  	"version_body" jsonb,
  	"version_lineage" varchar,
  	"version__status" "enum__manifesto_v_version_status" DEFAULT 'draft',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "membership_benefits" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"description" varchar
  );
  
  CREATE TABLE "membership" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"price_individual" numeric,
  	"price_student" numeric,
  	"price_note" varchar DEFAULT 'Launch pricing announced soon',
  	"card_image_id" integer,
  	"join_url" varchar,
  	"_status" "enum_membership_status" DEFAULT 'draft',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "_membership_v_version_benefits" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"description" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_membership_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version_price_individual" numeric,
  	"version_price_student" numeric,
  	"version_price_note" varchar DEFAULT 'Launch pricing announced soon',
  	"version_card_image_id" integer,
  	"version_join_url" varchar,
  	"version__status" "enum__membership_v_version_status" DEFAULT 'draft',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  ALTER TABLE "users_roles" ADD CONSTRAINT "users_roles_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "users" ADD CONSTRAINT "users_profile_id_people_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."people"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "people" ADD CONSTRAINT "people_portrait_id_media_id_fk" FOREIGN KEY ("portrait_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "media" ADD CONSTRAINT "media_uploaded_by_id_users_id_fk" FOREIGN KEY ("uploaded_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "frames" ADD CONSTRAINT "frames_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "frames" ADD CONSTRAINT "frames_photographer_id_people_id_fk" FOREIGN KEY ("photographer_id") REFERENCES "public"."people"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "frames" ADD CONSTRAINT "frames_source_submission_id_submissions_id_fk" FOREIGN KEY ("source_submission_id") REFERENCES "public"."submissions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "frames_texts" ADD CONSTRAINT "frames_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."frames"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "essays_sequence" ADD CONSTRAINT "essays_sequence_frame_id_frames_id_fk" FOREIGN KEY ("frame_id") REFERENCES "public"."frames"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "essays_sequence" ADD CONSTRAINT "essays_sequence_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."essays"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "essays" ADD CONSTRAINT "essays_lead_frame_id_frames_id_fk" FOREIGN KEY ("lead_frame_id") REFERENCES "public"."frames"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "essays" ADD CONSTRAINT "essays_related_walk_id_walks_id_fk" FOREIGN KEY ("related_walk_id") REFERENCES "public"."walks"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "essays" ADD CONSTRAINT "essays_related_photocall_id_photocalls_id_fk" FOREIGN KEY ("related_photocall_id") REFERENCES "public"."photocalls"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "essays_texts" ADD CONSTRAINT "essays_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."essays"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "essays_rels" ADD CONSTRAINT "essays_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."essays"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "essays_rels" ADD CONSTRAINT "essays_rels_people_fk" FOREIGN KEY ("people_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_essays_v_version_sequence" ADD CONSTRAINT "_essays_v_version_sequence_frame_id_frames_id_fk" FOREIGN KEY ("frame_id") REFERENCES "public"."frames"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_essays_v_version_sequence" ADD CONSTRAINT "_essays_v_version_sequence_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_essays_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_essays_v" ADD CONSTRAINT "_essays_v_parent_id_essays_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."essays"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_essays_v" ADD CONSTRAINT "_essays_v_version_lead_frame_id_frames_id_fk" FOREIGN KEY ("version_lead_frame_id") REFERENCES "public"."frames"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_essays_v" ADD CONSTRAINT "_essays_v_version_related_walk_id_walks_id_fk" FOREIGN KEY ("version_related_walk_id") REFERENCES "public"."walks"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_essays_v" ADD CONSTRAINT "_essays_v_version_related_photocall_id_photocalls_id_fk" FOREIGN KEY ("version_related_photocall_id") REFERENCES "public"."photocalls"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_essays_v_texts" ADD CONSTRAINT "_essays_v_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_essays_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_essays_v_rels" ADD CONSTRAINT "_essays_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_essays_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_essays_v_rels" ADD CONSTRAINT "_essays_v_rels_people_fk" FOREIGN KEY ("people_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "walks" ADD CONSTRAINT "walks_route_map_id_media_id_fk" FOREIGN KEY ("route_map_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "walks" ADD CONSTRAINT "walks_leader_id_people_id_fk" FOREIGN KEY ("leader_id") REFERENCES "public"."people"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "walks" ADD CONSTRAINT "walks_hero_image_id_media_id_fk" FOREIGN KEY ("hero_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "walks" ADD CONSTRAINT "walks_result_essay_id_essays_id_fk" FOREIGN KEY ("result_essay_id") REFERENCES "public"."essays"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_walks_v" ADD CONSTRAINT "_walks_v_parent_id_walks_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."walks"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_walks_v" ADD CONSTRAINT "_walks_v_version_route_map_id_media_id_fk" FOREIGN KEY ("version_route_map_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_walks_v" ADD CONSTRAINT "_walks_v_version_leader_id_people_id_fk" FOREIGN KEY ("version_leader_id") REFERENCES "public"."people"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_walks_v" ADD CONSTRAINT "_walks_v_version_hero_image_id_media_id_fk" FOREIGN KEY ("version_hero_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_walks_v" ADD CONSTRAINT "_walks_v_version_result_essay_id_essays_id_fk" FOREIGN KEY ("version_result_essay_id") REFERENCES "public"."essays"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "exhibitions" ADD CONSTRAINT "exhibitions_hero_image_id_media_id_fk" FOREIGN KEY ("hero_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "exhibitions_rels" ADD CONSTRAINT "exhibitions_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."exhibitions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "exhibitions_rels" ADD CONSTRAINT "exhibitions_rels_frames_fk" FOREIGN KEY ("frames_id") REFERENCES "public"."frames"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "exhibitions_rels" ADD CONSTRAINT "exhibitions_rels_essays_fk" FOREIGN KEY ("essays_id") REFERENCES "public"."essays"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_exhibitions_v" ADD CONSTRAINT "_exhibitions_v_parent_id_exhibitions_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."exhibitions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_exhibitions_v" ADD CONSTRAINT "_exhibitions_v_version_hero_image_id_media_id_fk" FOREIGN KEY ("version_hero_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_exhibitions_v_rels" ADD CONSTRAINT "_exhibitions_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_exhibitions_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_exhibitions_v_rels" ADD CONSTRAINT "_exhibitions_v_rels_frames_fk" FOREIGN KEY ("frames_id") REFERENCES "public"."frames"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_exhibitions_v_rels" ADD CONSTRAINT "_exhibitions_v_rels_essays_fk" FOREIGN KEY ("essays_id") REFERENCES "public"."essays"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "photocalls" ADD CONSTRAINT "photocalls_hero_image_id_media_id_fk" FOREIGN KEY ("hero_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "photocalls" ADD CONSTRAINT "photocalls_result_essay_id_essays_id_fk" FOREIGN KEY ("result_essay_id") REFERENCES "public"."essays"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_photocalls_v" ADD CONSTRAINT "_photocalls_v_parent_id_photocalls_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."photocalls"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_photocalls_v" ADD CONSTRAINT "_photocalls_v_version_hero_image_id_media_id_fk" FOREIGN KEY ("version_hero_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_photocalls_v" ADD CONSTRAINT "_photocalls_v_version_result_essay_id_essays_id_fk" FOREIGN KEY ("version_result_essay_id") REFERENCES "public"."essays"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "submissions" ADD CONSTRAINT "submissions_photocall_id_photocalls_id_fk" FOREIGN KEY ("photocall_id") REFERENCES "public"."photocalls"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "submissions" ADD CONSTRAINT "submissions_submitter_id_users_id_fk" FOREIGN KEY ("submitter_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "submissions_rels" ADD CONSTRAINT "submissions_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."submissions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "submissions_rels" ADD CONSTRAINT "submissions_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "orders" ADD CONSTRAINT "orders_item_id_walks_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."walks"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_people_fk" FOREIGN KEY ("people_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_frames_fk" FOREIGN KEY ("frames_id") REFERENCES "public"."frames"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_essays_fk" FOREIGN KEY ("essays_id") REFERENCES "public"."essays"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_walks_fk" FOREIGN KEY ("walks_id") REFERENCES "public"."walks"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_exhibitions_fk" FOREIGN KEY ("exhibitions_id") REFERENCES "public"."exhibitions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_photocalls_fk" FOREIGN KEY ("photocalls_id") REFERENCES "public"."photocalls"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_submissions_fk" FOREIGN KEY ("submissions_id") REFERENCES "public"."submissions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_orders_fk" FOREIGN KEY ("orders_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings_ticker" ADD CONSTRAINT "site_settings_ticker_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "manifesto_senses" ADD CONSTRAINT "manifesto_senses_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."manifesto"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_manifesto_v_version_senses" ADD CONSTRAINT "_manifesto_v_version_senses_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_manifesto_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "membership_benefits" ADD CONSTRAINT "membership_benefits_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."membership"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "membership" ADD CONSTRAINT "membership_card_image_id_media_id_fk" FOREIGN KEY ("card_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_membership_v_version_benefits" ADD CONSTRAINT "_membership_v_version_benefits_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_membership_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_membership_v" ADD CONSTRAINT "_membership_v_version_card_image_id_media_id_fk" FOREIGN KEY ("version_card_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "users_roles_order_idx" ON "users_roles" USING btree ("order");
  CREATE INDEX "users_roles_parent_idx" ON "users_roles" USING btree ("parent_id");
  CREATE INDEX "users_sessions_order_idx" ON "users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "users_sessions" USING btree ("_parent_id");
  CREATE INDEX "users_profile_idx" ON "users" USING btree ("profile_id");
  CREATE INDEX "users_updated_at_idx" ON "users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");
  CREATE UNIQUE INDEX "people_slug_idx" ON "people" USING btree ("slug");
  CREATE INDEX "people_portrait_idx" ON "people" USING btree ("portrait_id");
  CREATE INDEX "people_updated_at_idx" ON "people" USING btree ("updated_at");
  CREATE INDEX "people_created_at_idx" ON "people" USING btree ("created_at");
  CREATE INDEX "media_uploaded_by_idx" ON "media" USING btree ("uploaded_by_id");
  CREATE INDEX "media_updated_at_idx" ON "media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "media" USING btree ("filename");
  CREATE INDEX "media_sizes_thumbnail_sizes_thumbnail_filename_idx" ON "media" USING btree ("sizes_thumbnail_filename");
  CREATE INDEX "media_sizes_card_sizes_card_filename_idx" ON "media" USING btree ("sizes_card_filename");
  CREATE INDEX "media_sizes_feature_sizes_feature_filename_idx" ON "media" USING btree ("sizes_feature_filename");
  CREATE INDEX "media_sizes_hero_sizes_hero_filename_idx" ON "media" USING btree ("sizes_hero_filename");
  CREATE INDEX "media_sizes_og_sizes_og_filename_idx" ON "media" USING btree ("sizes_og_filename");
  CREATE INDEX "frames_image_idx" ON "frames" USING btree ("image_id");
  CREATE INDEX "frames_photographer_idx" ON "frames" USING btree ("photographer_id");
  CREATE INDEX "frames_source_submission_idx" ON "frames" USING btree ("source_submission_id");
  CREATE INDEX "frames_updated_at_idx" ON "frames" USING btree ("updated_at");
  CREATE INDEX "frames_created_at_idx" ON "frames" USING btree ("created_at");
  CREATE INDEX "frames_texts_order_parent" ON "frames_texts" USING btree ("order","parent_id");
  CREATE INDEX "essays_sequence_order_idx" ON "essays_sequence" USING btree ("_order");
  CREATE INDEX "essays_sequence_parent_id_idx" ON "essays_sequence" USING btree ("_parent_id");
  CREATE INDEX "essays_sequence_frame_idx" ON "essays_sequence" USING btree ("frame_id");
  CREATE UNIQUE INDEX "essays_slug_idx" ON "essays" USING btree ("slug");
  CREATE INDEX "essays_lead_frame_idx" ON "essays" USING btree ("lead_frame_id");
  CREATE INDEX "essays_related_walk_idx" ON "essays" USING btree ("related_walk_id");
  CREATE INDEX "essays_related_photocall_idx" ON "essays" USING btree ("related_photocall_id");
  CREATE INDEX "essays_updated_at_idx" ON "essays" USING btree ("updated_at");
  CREATE INDEX "essays_created_at_idx" ON "essays" USING btree ("created_at");
  CREATE INDEX "essays__status_idx" ON "essays" USING btree ("_status");
  CREATE INDEX "essays_texts_order_parent" ON "essays_texts" USING btree ("order","parent_id");
  CREATE INDEX "essays_rels_order_idx" ON "essays_rels" USING btree ("order");
  CREATE INDEX "essays_rels_parent_idx" ON "essays_rels" USING btree ("parent_id");
  CREATE INDEX "essays_rels_path_idx" ON "essays_rels" USING btree ("path");
  CREATE INDEX "essays_rels_people_id_idx" ON "essays_rels" USING btree ("people_id");
  CREATE INDEX "_essays_v_version_sequence_order_idx" ON "_essays_v_version_sequence" USING btree ("_order");
  CREATE INDEX "_essays_v_version_sequence_parent_id_idx" ON "_essays_v_version_sequence" USING btree ("_parent_id");
  CREATE INDEX "_essays_v_version_sequence_frame_idx" ON "_essays_v_version_sequence" USING btree ("frame_id");
  CREATE INDEX "_essays_v_parent_idx" ON "_essays_v" USING btree ("parent_id");
  CREATE INDEX "_essays_v_version_version_slug_idx" ON "_essays_v" USING btree ("version_slug");
  CREATE INDEX "_essays_v_version_version_lead_frame_idx" ON "_essays_v" USING btree ("version_lead_frame_id");
  CREATE INDEX "_essays_v_version_version_related_walk_idx" ON "_essays_v" USING btree ("version_related_walk_id");
  CREATE INDEX "_essays_v_version_version_related_photocall_idx" ON "_essays_v" USING btree ("version_related_photocall_id");
  CREATE INDEX "_essays_v_version_version_updated_at_idx" ON "_essays_v" USING btree ("version_updated_at");
  CREATE INDEX "_essays_v_version_version_created_at_idx" ON "_essays_v" USING btree ("version_created_at");
  CREATE INDEX "_essays_v_version_version__status_idx" ON "_essays_v" USING btree ("version__status");
  CREATE INDEX "_essays_v_created_at_idx" ON "_essays_v" USING btree ("created_at");
  CREATE INDEX "_essays_v_updated_at_idx" ON "_essays_v" USING btree ("updated_at");
  CREATE INDEX "_essays_v_latest_idx" ON "_essays_v" USING btree ("latest");
  CREATE INDEX "_essays_v_texts_order_parent" ON "_essays_v_texts" USING btree ("order","parent_id");
  CREATE INDEX "_essays_v_rels_order_idx" ON "_essays_v_rels" USING btree ("order");
  CREATE INDEX "_essays_v_rels_parent_idx" ON "_essays_v_rels" USING btree ("parent_id");
  CREATE INDEX "_essays_v_rels_path_idx" ON "_essays_v_rels" USING btree ("path");
  CREATE INDEX "_essays_v_rels_people_id_idx" ON "_essays_v_rels" USING btree ("people_id");
  CREATE UNIQUE INDEX "walks_slug_idx" ON "walks" USING btree ("slug");
  CREATE INDEX "walks_route_map_idx" ON "walks" USING btree ("route_map_id");
  CREATE INDEX "walks_leader_idx" ON "walks" USING btree ("leader_id");
  CREATE INDEX "walks_hero_image_idx" ON "walks" USING btree ("hero_image_id");
  CREATE INDEX "walks_result_essay_idx" ON "walks" USING btree ("result_essay_id");
  CREATE INDEX "walks_updated_at_idx" ON "walks" USING btree ("updated_at");
  CREATE INDEX "walks_created_at_idx" ON "walks" USING btree ("created_at");
  CREATE INDEX "walks__status_idx" ON "walks" USING btree ("_status");
  CREATE INDEX "_walks_v_parent_idx" ON "_walks_v" USING btree ("parent_id");
  CREATE INDEX "_walks_v_version_version_slug_idx" ON "_walks_v" USING btree ("version_slug");
  CREATE INDEX "_walks_v_version_version_route_map_idx" ON "_walks_v" USING btree ("version_route_map_id");
  CREATE INDEX "_walks_v_version_version_leader_idx" ON "_walks_v" USING btree ("version_leader_id");
  CREATE INDEX "_walks_v_version_version_hero_image_idx" ON "_walks_v" USING btree ("version_hero_image_id");
  CREATE INDEX "_walks_v_version_version_result_essay_idx" ON "_walks_v" USING btree ("version_result_essay_id");
  CREATE INDEX "_walks_v_version_version_updated_at_idx" ON "_walks_v" USING btree ("version_updated_at");
  CREATE INDEX "_walks_v_version_version_created_at_idx" ON "_walks_v" USING btree ("version_created_at");
  CREATE INDEX "_walks_v_version_version__status_idx" ON "_walks_v" USING btree ("version__status");
  CREATE INDEX "_walks_v_created_at_idx" ON "_walks_v" USING btree ("created_at");
  CREATE INDEX "_walks_v_updated_at_idx" ON "_walks_v" USING btree ("updated_at");
  CREATE INDEX "_walks_v_latest_idx" ON "_walks_v" USING btree ("latest");
  CREATE UNIQUE INDEX "exhibitions_slug_idx" ON "exhibitions" USING btree ("slug");
  CREATE INDEX "exhibitions_hero_image_idx" ON "exhibitions" USING btree ("hero_image_id");
  CREATE INDEX "exhibitions_updated_at_idx" ON "exhibitions" USING btree ("updated_at");
  CREATE INDEX "exhibitions_created_at_idx" ON "exhibitions" USING btree ("created_at");
  CREATE INDEX "exhibitions__status_idx" ON "exhibitions" USING btree ("_status");
  CREATE INDEX "exhibitions_rels_order_idx" ON "exhibitions_rels" USING btree ("order");
  CREATE INDEX "exhibitions_rels_parent_idx" ON "exhibitions_rels" USING btree ("parent_id");
  CREATE INDEX "exhibitions_rels_path_idx" ON "exhibitions_rels" USING btree ("path");
  CREATE INDEX "exhibitions_rels_frames_id_idx" ON "exhibitions_rels" USING btree ("frames_id");
  CREATE INDEX "exhibitions_rels_essays_id_idx" ON "exhibitions_rels" USING btree ("essays_id");
  CREATE INDEX "_exhibitions_v_parent_idx" ON "_exhibitions_v" USING btree ("parent_id");
  CREATE INDEX "_exhibitions_v_version_version_slug_idx" ON "_exhibitions_v" USING btree ("version_slug");
  CREATE INDEX "_exhibitions_v_version_version_hero_image_idx" ON "_exhibitions_v" USING btree ("version_hero_image_id");
  CREATE INDEX "_exhibitions_v_version_version_updated_at_idx" ON "_exhibitions_v" USING btree ("version_updated_at");
  CREATE INDEX "_exhibitions_v_version_version_created_at_idx" ON "_exhibitions_v" USING btree ("version_created_at");
  CREATE INDEX "_exhibitions_v_version_version__status_idx" ON "_exhibitions_v" USING btree ("version__status");
  CREATE INDEX "_exhibitions_v_created_at_idx" ON "_exhibitions_v" USING btree ("created_at");
  CREATE INDEX "_exhibitions_v_updated_at_idx" ON "_exhibitions_v" USING btree ("updated_at");
  CREATE INDEX "_exhibitions_v_latest_idx" ON "_exhibitions_v" USING btree ("latest");
  CREATE INDEX "_exhibitions_v_rels_order_idx" ON "_exhibitions_v_rels" USING btree ("order");
  CREATE INDEX "_exhibitions_v_rels_parent_idx" ON "_exhibitions_v_rels" USING btree ("parent_id");
  CREATE INDEX "_exhibitions_v_rels_path_idx" ON "_exhibitions_v_rels" USING btree ("path");
  CREATE INDEX "_exhibitions_v_rels_frames_id_idx" ON "_exhibitions_v_rels" USING btree ("frames_id");
  CREATE INDEX "_exhibitions_v_rels_essays_id_idx" ON "_exhibitions_v_rels" USING btree ("essays_id");
  CREATE UNIQUE INDEX "photocalls_slug_idx" ON "photocalls" USING btree ("slug");
  CREATE INDEX "photocalls_hero_image_idx" ON "photocalls" USING btree ("hero_image_id");
  CREATE INDEX "photocalls_result_essay_idx" ON "photocalls" USING btree ("result_essay_id");
  CREATE INDEX "photocalls_updated_at_idx" ON "photocalls" USING btree ("updated_at");
  CREATE INDEX "photocalls_created_at_idx" ON "photocalls" USING btree ("created_at");
  CREATE INDEX "photocalls__status_idx" ON "photocalls" USING btree ("_status");
  CREATE INDEX "_photocalls_v_parent_idx" ON "_photocalls_v" USING btree ("parent_id");
  CREATE INDEX "_photocalls_v_version_version_slug_idx" ON "_photocalls_v" USING btree ("version_slug");
  CREATE INDEX "_photocalls_v_version_version_hero_image_idx" ON "_photocalls_v" USING btree ("version_hero_image_id");
  CREATE INDEX "_photocalls_v_version_version_result_essay_idx" ON "_photocalls_v" USING btree ("version_result_essay_id");
  CREATE INDEX "_photocalls_v_version_version_updated_at_idx" ON "_photocalls_v" USING btree ("version_updated_at");
  CREATE INDEX "_photocalls_v_version_version_created_at_idx" ON "_photocalls_v" USING btree ("version_created_at");
  CREATE INDEX "_photocalls_v_version_version__status_idx" ON "_photocalls_v" USING btree ("version__status");
  CREATE INDEX "_photocalls_v_created_at_idx" ON "_photocalls_v" USING btree ("created_at");
  CREATE INDEX "_photocalls_v_updated_at_idx" ON "_photocalls_v" USING btree ("updated_at");
  CREATE INDEX "_photocalls_v_latest_idx" ON "_photocalls_v" USING btree ("latest");
  CREATE INDEX "submissions_photocall_idx" ON "submissions" USING btree ("photocall_id");
  CREATE INDEX "submissions_submitter_idx" ON "submissions" USING btree ("submitter_id");
  CREATE INDEX "submissions_updated_at_idx" ON "submissions" USING btree ("updated_at");
  CREATE INDEX "submissions_created_at_idx" ON "submissions" USING btree ("created_at");
  CREATE INDEX "submissions_rels_order_idx" ON "submissions_rels" USING btree ("order");
  CREATE INDEX "submissions_rels_parent_idx" ON "submissions_rels" USING btree ("parent_id");
  CREATE INDEX "submissions_rels_path_idx" ON "submissions_rels" USING btree ("path");
  CREATE INDEX "submissions_rels_media_id_idx" ON "submissions_rels" USING btree ("media_id");
  CREATE INDEX "orders_user_idx" ON "orders" USING btree ("user_id");
  CREATE INDEX "orders_item_idx" ON "orders" USING btree ("item_id");
  CREATE INDEX "orders_updated_at_idx" ON "orders" USING btree ("updated_at");
  CREATE INDEX "orders_created_at_idx" ON "orders" USING btree ("created_at");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_locked_documents_rels_people_id_idx" ON "payload_locked_documents_rels" USING btree ("people_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_locked_documents_rels_frames_id_idx" ON "payload_locked_documents_rels" USING btree ("frames_id");
  CREATE INDEX "payload_locked_documents_rels_essays_id_idx" ON "payload_locked_documents_rels" USING btree ("essays_id");
  CREATE INDEX "payload_locked_documents_rels_walks_id_idx" ON "payload_locked_documents_rels" USING btree ("walks_id");
  CREATE INDEX "payload_locked_documents_rels_exhibitions_id_idx" ON "payload_locked_documents_rels" USING btree ("exhibitions_id");
  CREATE INDEX "payload_locked_documents_rels_photocalls_id_idx" ON "payload_locked_documents_rels" USING btree ("photocalls_id");
  CREATE INDEX "payload_locked_documents_rels_submissions_id_idx" ON "payload_locked_documents_rels" USING btree ("submissions_id");
  CREATE INDEX "payload_locked_documents_rels_orders_id_idx" ON "payload_locked_documents_rels" USING btree ("orders_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");
  CREATE INDEX "site_settings_ticker_order_idx" ON "site_settings_ticker" USING btree ("_order");
  CREATE INDEX "site_settings_ticker_parent_id_idx" ON "site_settings_ticker" USING btree ("_parent_id");
  CREATE INDEX "manifesto_senses_order_idx" ON "manifesto_senses" USING btree ("_order");
  CREATE INDEX "manifesto_senses_parent_id_idx" ON "manifesto_senses" USING btree ("_parent_id");
  CREATE INDEX "manifesto__status_idx" ON "manifesto" USING btree ("_status");
  CREATE INDEX "_manifesto_v_version_senses_order_idx" ON "_manifesto_v_version_senses" USING btree ("_order");
  CREATE INDEX "_manifesto_v_version_senses_parent_id_idx" ON "_manifesto_v_version_senses" USING btree ("_parent_id");
  CREATE INDEX "_manifesto_v_version_version__status_idx" ON "_manifesto_v" USING btree ("version__status");
  CREATE INDEX "_manifesto_v_created_at_idx" ON "_manifesto_v" USING btree ("created_at");
  CREATE INDEX "_manifesto_v_updated_at_idx" ON "_manifesto_v" USING btree ("updated_at");
  CREATE INDEX "_manifesto_v_latest_idx" ON "_manifesto_v" USING btree ("latest");
  CREATE INDEX "membership_benefits_order_idx" ON "membership_benefits" USING btree ("_order");
  CREATE INDEX "membership_benefits_parent_id_idx" ON "membership_benefits" USING btree ("_parent_id");
  CREATE INDEX "membership_card_image_idx" ON "membership" USING btree ("card_image_id");
  CREATE INDEX "membership__status_idx" ON "membership" USING btree ("_status");
  CREATE INDEX "_membership_v_version_benefits_order_idx" ON "_membership_v_version_benefits" USING btree ("_order");
  CREATE INDEX "_membership_v_version_benefits_parent_id_idx" ON "_membership_v_version_benefits" USING btree ("_parent_id");
  CREATE INDEX "_membership_v_version_version_card_image_idx" ON "_membership_v" USING btree ("version_card_image_id");
  CREATE INDEX "_membership_v_version_version__status_idx" ON "_membership_v" USING btree ("version__status");
  CREATE INDEX "_membership_v_created_at_idx" ON "_membership_v" USING btree ("created_at");
  CREATE INDEX "_membership_v_updated_at_idx" ON "_membership_v" USING btree ("updated_at");
  CREATE INDEX "_membership_v_latest_idx" ON "_membership_v" USING btree ("latest");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "users_roles" CASCADE;
  DROP TABLE "users_sessions" CASCADE;
  DROP TABLE "users" CASCADE;
  DROP TABLE "people" CASCADE;
  DROP TABLE "media" CASCADE;
  DROP TABLE "frames" CASCADE;
  DROP TABLE "frames_texts" CASCADE;
  DROP TABLE "essays_sequence" CASCADE;
  DROP TABLE "essays" CASCADE;
  DROP TABLE "essays_texts" CASCADE;
  DROP TABLE "essays_rels" CASCADE;
  DROP TABLE "_essays_v_version_sequence" CASCADE;
  DROP TABLE "_essays_v" CASCADE;
  DROP TABLE "_essays_v_texts" CASCADE;
  DROP TABLE "_essays_v_rels" CASCADE;
  DROP TABLE "walks" CASCADE;
  DROP TABLE "_walks_v" CASCADE;
  DROP TABLE "exhibitions" CASCADE;
  DROP TABLE "exhibitions_rels" CASCADE;
  DROP TABLE "_exhibitions_v" CASCADE;
  DROP TABLE "_exhibitions_v_rels" CASCADE;
  DROP TABLE "photocalls" CASCADE;
  DROP TABLE "_photocalls_v" CASCADE;
  DROP TABLE "submissions" CASCADE;
  DROP TABLE "submissions_rels" CASCADE;
  DROP TABLE "orders" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TABLE "site_settings_ticker" CASCADE;
  DROP TABLE "site_settings" CASCADE;
  DROP TABLE "manifesto_senses" CASCADE;
  DROP TABLE "manifesto" CASCADE;
  DROP TABLE "_manifesto_v_version_senses" CASCADE;
  DROP TABLE "_manifesto_v" CASCADE;
  DROP TABLE "membership_benefits" CASCADE;
  DROP TABLE "membership" CASCADE;
  DROP TABLE "_membership_v_version_benefits" CASCADE;
  DROP TABLE "_membership_v" CASCADE;
  DROP TYPE "public"."enum_users_roles";
  DROP TYPE "public"."enum_users_membership_tier";
  DROP TYPE "public"."enum_users_membership_status";
  DROP TYPE "public"."enum_media_visibility";
  DROP TYPE "public"."enum_essays_status";
  DROP TYPE "public"."enum__essays_v_version_status";
  DROP TYPE "public"."enum_walks_booking_status";
  DROP TYPE "public"."enum_walks_status";
  DROP TYPE "public"."enum__walks_v_version_booking_status";
  DROP TYPE "public"."enum__walks_v_version_status";
  DROP TYPE "public"."enum_exhibitions_status";
  DROP TYPE "public"."enum__exhibitions_v_version_status";
  DROP TYPE "public"."enum_photocalls_status";
  DROP TYPE "public"."enum__photocalls_v_version_status";
  DROP TYPE "public"."enum_submissions_status";
  DROP TYPE "public"."enum_orders_type";
  DROP TYPE "public"."enum_orders_status";
  DROP TYPE "public"."enum_orders_provider";
  DROP TYPE "public"."enum_manifesto_status";
  DROP TYPE "public"."enum__manifesto_v_version_status";
  DROP TYPE "public"."enum_membership_status";
  DROP TYPE "public"."enum__membership_v_version_status";`)
}
