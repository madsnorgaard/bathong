import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "essays_sequence" CASCADE;
  DROP TABLE "_essays_v_version_sequence" CASCADE;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "essays_sequence" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"frame_id" integer,
  	"caption_override" varchar
  );
  
  CREATE TABLE "_essays_v_version_sequence" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"frame_id" integer,
  	"caption_override" varchar,
  	"_uuid" varchar
  );
  
  ALTER TABLE "essays_sequence" ADD CONSTRAINT "essays_sequence_frame_id_frames_id_fk" FOREIGN KEY ("frame_id") REFERENCES "public"."frames"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "essays_sequence" ADD CONSTRAINT "essays_sequence_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."essays"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_essays_v_version_sequence" ADD CONSTRAINT "_essays_v_version_sequence_frame_id_frames_id_fk" FOREIGN KEY ("frame_id") REFERENCES "public"."frames"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_essays_v_version_sequence" ADD CONSTRAINT "_essays_v_version_sequence_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_essays_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "essays_sequence_order_idx" ON "essays_sequence" USING btree ("_order");
  CREATE INDEX "essays_sequence_parent_id_idx" ON "essays_sequence" USING btree ("_parent_id");
  CREATE INDEX "essays_sequence_frame_idx" ON "essays_sequence" USING btree ("frame_id");
  CREATE INDEX "_essays_v_version_sequence_order_idx" ON "_essays_v_version_sequence" USING btree ("_order");
  CREATE INDEX "_essays_v_version_sequence_parent_id_idx" ON "_essays_v_version_sequence" USING btree ("_parent_id");
  CREATE INDEX "_essays_v_version_sequence_frame_idx" ON "_essays_v_version_sequence" USING btree ("frame_id");`)
}
