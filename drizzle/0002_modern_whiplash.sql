CREATE TABLE "posting_unavailability" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"posting_id" uuid NOT NULL,
	"calendar_date" date NOT NULL,
	"all_day" boolean DEFAULT false NOT NULL,
	"unavailable_hours" integer[] DEFAULT '{}'::integer[] NOT NULL,
	CONSTRAINT "posting_unavailability_kind_valid" CHECK (("posting_unavailability"."all_day" AND cardinality("posting_unavailability"."unavailable_hours") = 0) OR (NOT "posting_unavailability"."all_day" AND cardinality("posting_unavailability"."unavailable_hours") > 0)),
	CONSTRAINT "posting_unavailability_hours_valid" CHECK ("posting_unavailability"."unavailable_hours" <@ ARRAY[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23]::integer[])
);
--> statement-breakpoint
ALTER TABLE "postings" ADD COLUMN "flexible_start_date" date;--> statement-breakpoint
ALTER TABLE "postings" ADD COLUMN "flexible_end_date" date;--> statement-breakpoint
ALTER TABLE "posting_unavailability" ADD CONSTRAINT "posting_unavailability_posting_id_postings_id_fk" FOREIGN KEY ("posting_id") REFERENCES "public"."postings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "posting_unavailability_posting_date_unique" ON "posting_unavailability" USING btree ("posting_id","calendar_date");--> statement-breakpoint
ALTER TABLE "postings" ADD CONSTRAINT "postings_flexible_range_valid" CHECK (("postings"."schedule_mode" = 'FLEXIBLE' AND (("postings"."flexible_start_date" IS NULL AND "postings"."flexible_end_date" IS NULL) OR ("postings"."flexible_start_date" IS NOT NULL AND "postings"."flexible_end_date" IS NOT NULL AND "postings"."flexible_end_date" >= "postings"."flexible_start_date"))) OR ("postings"."schedule_mode" <> 'FLEXIBLE' AND "postings"."flexible_start_date" IS NULL AND "postings"."flexible_end_date" IS NULL));
