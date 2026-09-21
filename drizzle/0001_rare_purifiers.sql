ALTER TYPE "public"."role" ADD VALUE 'SALES_HEAD' BEFORE 'SALESPERSON';--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "lead_response" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "salesperson_action" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password_hash" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "must_change_password" boolean DEFAULT false NOT NULL;