ALTER TABLE "calls" ADD COLUMN "is_demo" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "follow_ups" ADD COLUMN "is_demo" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "meetings" ADD COLUMN "is_demo" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN "is_demo" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "comments" ADD COLUMN "is_demo" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "is_demo" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "is_demo" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE TABLE "demo_lead_states" ("lead_id" uuid PRIMARY KEY REFERENCES "leads"("id") ON DELETE CASCADE NOT NULL, "status" "lead_status" NOT NULL, "last_contact_at" timestamp with time zone, "last_contact_outcome" text, "interest_level" text, "lead_response" text, "salesperson_action" text, "next_action" text, "next_follow_up_at" timestamp with time zone, "updated_at" timestamp with time zone DEFAULT now() NOT NULL);--> statement-breakpoint
CREATE TABLE "stage_history" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL, "lead_id" uuid NOT NULL REFERENCES "leads"("id") ON DELETE CASCADE, "from_status" "lead_status", "to_status" "lead_status" NOT NULL, "changed_by" text NOT NULL REFERENCES "users"("id"), "is_demo" boolean DEFAULT false NOT NULL, "created_at" timestamp with time zone DEFAULT now() NOT NULL);--> statement-breakpoint
CREATE INDEX "stage_history_lead_idx" ON "stage_history" ("lead_id", "created_at");
