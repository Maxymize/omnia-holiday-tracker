CREATE TYPE "public"."audit_log_action" AS ENUM('user_created', 'user_updated', 'user_deleted', 'user_status_changed', 'holiday_created', 'holiday_updated', 'holiday_approved', 'holiday_rejected', 'holiday_deleted', 'department_created', 'department_updated', 'department_deleted', 'setting_updated', 'employee_allowance_updated', 'login_attempt', 'data_export', 'data_deletion');--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"action" "audit_log_action" NOT NULL,
	"user_id" uuid,
	"target_user_id" uuid,
	"target_resource_id" uuid,
	"resource_type" text,
	"details" text,
	"ip_address" text,
	"user_agent" text,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_target_user_id_users_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;