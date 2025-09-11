CREATE TYPE "public"."email_status" AS ENUM('pending', 'sent', 'failed');--> statement-breakpoint
CREATE TYPE "public"."language" AS ENUM('it', 'en', 'es');--> statement-breakpoint
ALTER TYPE "public"."audit_log_action" ADD VALUE 'email_sent';--> statement-breakpoint
ALTER TYPE "public"."audit_log_action" ADD VALUE 'email_failed';--> statement-breakpoint
CREATE TABLE "email_queue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipient_email" text NOT NULL,
	"subject" text NOT NULL,
	"content" text NOT NULL,
	"template_name" text,
	"status" "email_status" DEFAULT 'pending' NOT NULL,
	"scheduled_for" timestamp DEFAULT now(),
	"sent_at" timestamp,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"setting_name" text NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"setting_value" text,
	"updated_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "email_settings_setting_name_unique" UNIQUE("setting_name")
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "avatar_url" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "job_title" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "preferred_language" "language" DEFAULT 'it' NOT NULL;--> statement-breakpoint
ALTER TABLE "email_settings" ADD CONSTRAINT "email_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;