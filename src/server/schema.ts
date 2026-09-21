import { boolean, index, integer, jsonb, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const role = pgEnum("role", ["FOUNDER", "SALES_HEAD", "SALESPERSON"]);
export const leadStatus = pgEnum("lead_status", ["NEW", "ASSIGNED", "CONTACTED", "CONNECTED", "INTERESTED", "QUALIFIED", "MEETING_SCHEDULED", "PROPOSAL_SENT", "NEGOTIATION", "WON", "LOST"]);
export const priority = pgEnum("priority", ["LOW", "MEDIUM", "HIGH", "URGENT"]);
export const followUpStatus = pgEnum("follow_up_status", ["UPCOMING", "COMPLETED", "CANCELLED"]);

const id = () => uuid("id").defaultRandom().primaryKey();
const dates = { createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(), updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull() };
export const users = pgTable("users", { id: text("id").primaryKey(), name: text("name").notNull(), email: text("email").notNull().unique(), role: role("role").default("SALESPERSON").notNull(), active: boolean("active").default(true).notNull(), avatar: text("avatar"), passwordHash: text("password_hash"), mustChangePassword: boolean("must_change_password").default(false).notNull(), ...dates });
export const leads = pgTable("leads", { id: id(), companyName: text("company_name").notNull(), contactName: text("contact_name").notNull(), phone: text("phone"), whatsapp: text("whatsapp"), email: text("email"), website: text("website"), location: text("location"), industry: text("industry"), companySize: text("company_size"), source: text("source"), serviceInterest: text("service_interest"), score: integer("score").default(0).notNull(), priority: priority("priority").default("MEDIUM").notNull(), status: leadStatus("status").default("NEW").notNull(), assigneeId: text("assignee_id").references(() => users.id), createdBy: text("created_by").notNull().references(() => users.id), lastContactAt: timestamp("last_contact_at", { withTimezone: true }), leadResponse: text("lead_response"), salespersonAction: text("salesperson_action"), nextAction: text("next_action"), nextFollowUpAt: timestamp("next_follow_up_at", { withTimezone: true }), stageChangedAt: timestamp("stage_changed_at", { withTimezone: true }).defaultNow().notNull(), notes: text("notes"), ...dates }, t => [index("lead_assignee_idx").on(t.assigneeId), index("lead_status_idx").on(t.status), index("lead_followup_idx").on(t.nextFollowUpAt)]);
export const calls = pgTable("calls", { id: id(), leadId: uuid("lead_id").notNull().references(() => leads.id, { onDelete: "cascade" }), createdBy: text("created_by").notNull().references(() => users.id), occurredAt: timestamp("occurred_at", { withTimezone: true }).defaultNow().notNull(), duration: integer("duration"), callType: text("call_type").notNull(), outcome: text("outcome").notNull(), interestLevel: text("interest_level"), leadResponse: text("lead_response"), salespersonAction: text("salesperson_action"), nextAction: text("next_action"), nextFollowUpAt: timestamp("next_follow_up_at", { withTimezone: true }), notes: text("notes"), isDemo: boolean("is_demo").default(false).notNull(), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull() });
export const followUps = pgTable("follow_ups", { id: id(), leadId: uuid("lead_id").notNull().references(() => leads.id, { onDelete: "cascade" }), assigneeId: text("assignee_id").notNull().references(() => users.id), dueAt: timestamp("due_at", { withTimezone: true }).notNull(), reason: text("reason").notNull(), status: followUpStatus("status").default("UPCOMING").notNull(), notes: text("notes"), completedAt: timestamp("completed_at", { withTimezone: true }), isDemo: boolean("is_demo").default(false).notNull(), ...dates }, t => [index("followup_due_idx").on(t.dueAt)]);
export const meetings = pgTable("meetings", { id: id(), leadId: uuid("lead_id").notNull().references(() => leads.id, { onDelete: "cascade" }), ownerId: text("owner_id").notNull().references(() => users.id), startsAt: timestamp("starts_at", { withTimezone: true }).notNull(), type: text("type").notNull(), location: text("location"), status: text("status").notNull(), notes: text("notes"), leadResponse: text("lead_response"), actionTaken: text("action_taken"), nextAction: text("next_action"), isDemo: boolean("is_demo").default(false).notNull(), ...dates });
export const proposals = pgTable("proposals", { id: id(), leadId: uuid("lead_id").notNull().references(() => leads.id, { onDelete: "cascade" }), sentBy: text("sent_by").notNull().references(() => users.id), sentAt: timestamp("sent_at", { withTimezone: true }), status: text("status").notNull(), proposalLink: text("proposal_link"), leadResponse: text("lead_response"), notes: text("notes"), nextFollowUpAt: timestamp("next_follow_up_at", { withTimezone: true }), isDemo: boolean("is_demo").default(false).notNull(), ...dates });
export const comments = pgTable("comments", { id: id(), leadId: uuid("lead_id").notNull().references(() => leads.id, { onDelete: "cascade" }), authorId: text("author_id").notNull().references(() => users.id), body: text("body").notNull(), isDemo: boolean("is_demo").default(false).notNull(), ...dates });
export const activities = pgTable("activities", { id: id(), leadId: uuid("lead_id").notNull().references(() => leads.id, { onDelete: "cascade" }), actorId: text("actor_id").notNull().references(() => users.id), type: text("type").notNull(), description: text("description").notNull(), metadata: jsonb("metadata").$type<Record<string, unknown>>(), isDemo: boolean("is_demo").default(false).notNull(), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull() }, t => [index("activity_lead_idx").on(t.leadId, t.createdAt)]);
export const notifications = pgTable("notifications", { id: id(), userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }), type: text("type").notNull(), title: text("title").notNull(), message: text("message").notNull(), read: boolean("read").default(false).notNull(), isDemo: boolean("is_demo").default(false).notNull(), createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull() });
export const demoLeadStates = pgTable("demo_lead_states", {
  leadId: uuid("lead_id").primaryKey().references(() => leads.id, { onDelete: "cascade" }),
  status: leadStatus("status").notNull(),
  lastContactAt: timestamp("last_contact_at", { withTimezone: true }),
  lastContactOutcome: text("last_contact_outcome"),
  interestLevel: text("interest_level"),
  leadResponse: text("lead_response"),
  salespersonAction: text("salesperson_action"),
  nextAction: text("next_action"),
  nextFollowUpAt: timestamp("next_follow_up_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
export const stageHistory = pgTable("stage_history", {
  id: id(),
  leadId: uuid("lead_id").notNull().references(() => leads.id, { onDelete: "cascade" }),
  fromStatus: leadStatus("from_status"),
  toStatus: leadStatus("to_status").notNull(),
  changedBy: text("changed_by").notNull().references(() => users.id),
  isDemo: boolean("is_demo").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, t => [index("stage_history_lead_idx").on(t.leadId, t.createdAt)]);
