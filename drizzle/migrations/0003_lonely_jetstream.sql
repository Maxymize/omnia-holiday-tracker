CREATE TABLE "medical_certificates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"file_id" text NOT NULL,
	"holiday_request_id" uuid NOT NULL,
	"original_file_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"file_size" integer NOT NULL,
	"encrypted_data" text NOT NULL,
	"encryption_method" text DEFAULT 'XOR' NOT NULL,
	"uploaded_by" uuid NOT NULL,
	"uploaded_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp,
	"download_count" integer DEFAULT 0 NOT NULL,
	"last_download_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "medical_certificates_file_id_unique" UNIQUE("file_id")
);
--> statement-breakpoint
ALTER TABLE "holidays" ADD COLUMN "medical_certificate_file_id" text;--> statement-breakpoint
ALTER TABLE "medical_certificates" ADD CONSTRAINT "medical_certificates_holiday_request_id_holidays_id_fk" FOREIGN KEY ("holiday_request_id") REFERENCES "public"."holidays"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medical_certificates" ADD CONSTRAINT "medical_certificates_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;