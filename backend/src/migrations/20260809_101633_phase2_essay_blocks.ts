import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "essays_blocks_frame" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"frame_id" integer,
  	"caption_override" varchar,
  	"full_bleed" boolean DEFAULT false,
  	"block_name" varchar
  );
  
  CREATE TABLE "essays_blocks_pair" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"left_id" integer,
  	"right_id" integer,
  	"caption_override" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "essays_blocks_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"body" jsonb,
  	"block_name" varchar
  );
  
  CREATE TABLE "_essays_v_blocks_frame" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"frame_id" integer,
  	"caption_override" varchar,
  	"full_bleed" boolean DEFAULT false,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_essays_v_blocks_pair" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"left_id" integer,
  	"right_id" integer,
  	"caption_override" varchar,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "_essays_v_blocks_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"body" jsonb,
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  ALTER TABLE "essays_blocks_frame" ADD CONSTRAINT "essays_blocks_frame_frame_id_frames_id_fk" FOREIGN KEY ("frame_id") REFERENCES "public"."frames"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "essays_blocks_frame" ADD CONSTRAINT "essays_blocks_frame_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."essays"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "essays_blocks_pair" ADD CONSTRAINT "essays_blocks_pair_left_id_frames_id_fk" FOREIGN KEY ("left_id") REFERENCES "public"."frames"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "essays_blocks_pair" ADD CONSTRAINT "essays_blocks_pair_right_id_frames_id_fk" FOREIGN KEY ("right_id") REFERENCES "public"."frames"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "essays_blocks_pair" ADD CONSTRAINT "essays_blocks_pair_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."essays"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "essays_blocks_text" ADD CONSTRAINT "essays_blocks_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."essays"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_essays_v_blocks_frame" ADD CONSTRAINT "_essays_v_blocks_frame_frame_id_frames_id_fk" FOREIGN KEY ("frame_id") REFERENCES "public"."frames"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_essays_v_blocks_frame" ADD CONSTRAINT "_essays_v_blocks_frame_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_essays_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_essays_v_blocks_pair" ADD CONSTRAINT "_essays_v_blocks_pair_left_id_frames_id_fk" FOREIGN KEY ("left_id") REFERENCES "public"."frames"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_essays_v_blocks_pair" ADD CONSTRAINT "_essays_v_blocks_pair_right_id_frames_id_fk" FOREIGN KEY ("right_id") REFERENCES "public"."frames"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_essays_v_blocks_pair" ADD CONSTRAINT "_essays_v_blocks_pair_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_essays_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_essays_v_blocks_text" ADD CONSTRAINT "_essays_v_blocks_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_essays_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "essays_blocks_frame_order_idx" ON "essays_blocks_frame" USING btree ("_order");
  CREATE INDEX "essays_blocks_frame_parent_id_idx" ON "essays_blocks_frame" USING btree ("_parent_id");
  CREATE INDEX "essays_blocks_frame_path_idx" ON "essays_blocks_frame" USING btree ("_path");
  CREATE INDEX "essays_blocks_frame_frame_idx" ON "essays_blocks_frame" USING btree ("frame_id");
  CREATE INDEX "essays_blocks_pair_order_idx" ON "essays_blocks_pair" USING btree ("_order");
  CREATE INDEX "essays_blocks_pair_parent_id_idx" ON "essays_blocks_pair" USING btree ("_parent_id");
  CREATE INDEX "essays_blocks_pair_path_idx" ON "essays_blocks_pair" USING btree ("_path");
  CREATE INDEX "essays_blocks_pair_left_idx" ON "essays_blocks_pair" USING btree ("left_id");
  CREATE INDEX "essays_blocks_pair_right_idx" ON "essays_blocks_pair" USING btree ("right_id");
  CREATE INDEX "essays_blocks_text_order_idx" ON "essays_blocks_text" USING btree ("_order");
  CREATE INDEX "essays_blocks_text_parent_id_idx" ON "essays_blocks_text" USING btree ("_parent_id");
  CREATE INDEX "essays_blocks_text_path_idx" ON "essays_blocks_text" USING btree ("_path");
  CREATE INDEX "_essays_v_blocks_frame_order_idx" ON "_essays_v_blocks_frame" USING btree ("_order");
  CREATE INDEX "_essays_v_blocks_frame_parent_id_idx" ON "_essays_v_blocks_frame" USING btree ("_parent_id");
  CREATE INDEX "_essays_v_blocks_frame_path_idx" ON "_essays_v_blocks_frame" USING btree ("_path");
  CREATE INDEX "_essays_v_blocks_frame_frame_idx" ON "_essays_v_blocks_frame" USING btree ("frame_id");
  CREATE INDEX "_essays_v_blocks_pair_order_idx" ON "_essays_v_blocks_pair" USING btree ("_order");
  CREATE INDEX "_essays_v_blocks_pair_parent_id_idx" ON "_essays_v_blocks_pair" USING btree ("_parent_id");
  CREATE INDEX "_essays_v_blocks_pair_path_idx" ON "_essays_v_blocks_pair" USING btree ("_path");
  CREATE INDEX "_essays_v_blocks_pair_left_idx" ON "_essays_v_blocks_pair" USING btree ("left_id");
  CREATE INDEX "_essays_v_blocks_pair_right_idx" ON "_essays_v_blocks_pair" USING btree ("right_id");
  CREATE INDEX "_essays_v_blocks_text_order_idx" ON "_essays_v_blocks_text" USING btree ("_order");
  CREATE INDEX "_essays_v_blocks_text_parent_id_idx" ON "_essays_v_blocks_text" USING btree ("_parent_id");
  CREATE INDEX "_essays_v_blocks_text_path_idx" ON "_essays_v_blocks_text" USING btree ("_path");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "essays_blocks_frame" CASCADE;
  DROP TABLE "essays_blocks_pair" CASCADE;
  DROP TABLE "essays_blocks_text" CASCADE;
  DROP TABLE "_essays_v_blocks_frame" CASCADE;
  DROP TABLE "_essays_v_blocks_pair" CASCADE;
  DROP TABLE "_essays_v_blocks_text" CASCADE;`)
}
