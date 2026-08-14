import { relations, sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  date,
  index,
  inet,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
};

export const postingDirectionEnum = pgEnum("posting_direction", [
  "OWNER_RECEIVES",
  "OWNER_PAYS",
]);
export const pricingUnitEnum = pgEnum("pricing_unit", [
  "OVERALL",
  "HOURLY",
  "DAILY",
]);
export const scheduleModeEnum = pgEnum("schedule_mode", [
  "FLEXIBLE",
  "ONE_TIME",
  "MULTIPLE_SLOTS",
]);
export const slotPrecisionEnum = pgEnum("slot_precision", [
  "DATE_ONLY",
  "TIMED",
]);
export const postingStatusEnum = pgEnum("posting_status", [
  "PUBLISHED",
  "CLOSED",
  "HIDDEN",
]);
export const applicationStatusEnum = pgEnum("application_status", [
  "PENDING",
  "ACCEPTED",
  "DECLINED",
  "WITHDRAWN",
]);
export const exchangeStatusEnum = pgEnum("exchange_status", [
  "ACTIVE",
  "SETTLED",
  "CANCELLED",
  "REVERSED",
]);
export const creditTransactionTypeEnum = pgEnum("credit_transaction_type", [
  "EXCHANGE",
  "ADMIN_ADJUSTMENT",
  "REVERSAL",
]);
export const announcementStatusEnum = pgEnum("announcement_status", [
  "DRAFT",
  "PUBLISHED",
  "ARCHIVED",
]);
export const notificationTypeEnum = pgEnum("notification_type", [
  "ANNOUNCEMENT",
  "APPLICATION_RECEIVED",
  "APPLICATION_STATUS",
  "EXCHANGE_CANCELLED",
  "EXCHANGE_SETTLED",
  "POSTING_MODERATED",
  "CREDIT_ADJUSTED",
]);
export const auditOutcomeEnum = pgEnum("audit_outcome", ["SUCCESS", "FAILURE"]);

// Better Auth core tables. IDs are strings because Better Auth owns generation.
export const users = pgTable(
  "user",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    emailVerified: boolean("email_verified").default(false).notNull(),
    image: text("image"),
    username: text("username").notNull(),
    bio: text("bio").default("").notNull(),
    photoKey: text("photo_key"),
    active: boolean("active").default(true).notNull(),
    mustChangePassword: boolean("must_change_password").default(true).notNull(),
    deactivatedAt: timestamp("deactivated_at", { withTimezone: true }),
    deactivationReason: text("deactivation_reason"),
    role: text("role").default("user").notNull(),
    banned: boolean("banned").default(false).notNull(),
    banReason: text("ban_reason"),
    banExpires: timestamp("ban_expires", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("user_email_unique").on(sql`lower(${table.email})`),
    uniqueIndex("user_username_unique").on(sql`lower(${table.username})`),
  ],
);

export const sessions = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    impersonatedBy: text("impersonated_by"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("session_token_unique").on(table.token),
    index("session_user_idx").on(table.userId),
  ],
);

export const accounts = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", {
      withTimezone: true,
    }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
      withTimezone: true,
    }),
    scope: text("scope"),
    password: text("password"),
    ...timestamps,
  },
  (table) => [
    index("account_user_idx").on(table.userId),
    uniqueIndex("account_provider_unique").on(
      table.providerId,
      table.accountId,
    ),
  ],
);

export const verifications = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ...timestamps,
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const rateLimits = pgTable(
  "rate_limit",
  {
    id: text("id").primaryKey(),
    key: text("key").notNull(),
    count: integer("count").notNull(),
    lastRequest: bigint("last_request", { mode: "number" }).notNull(),
  },
  (table) => [uniqueIndex("rate_limit_key_unique").on(table.key)],
);

export const roles = pgTable(
  "roles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description").default("").notNull(),
    systemKey: text("system_key"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("roles_slug_unique").on(table.slug),
    uniqueIndex("roles_system_key_unique").on(table.systemKey),
  ],
);

export const permissions = pgTable("permissions", {
  code: text("code").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
});

export const rolePermissions = pgTable(
  "role_permissions",
  {
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    permissionCode: text("permission_code")
      .notNull()
      .references(() => permissions.code, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.roleId, table.permissionCode] })],
);

export const userRoles = pgTable(
  "user_roles",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    assignedAt: timestamp("assigned_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    assignedBy: text("assigned_by").references(() => users.id, {
      onDelete: "set null",
    }),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.roleId] }),
    index("user_roles_role_idx").on(table.roleId),
  ],
);

export const postings = pgTable(
  "postings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id),
    title: text("title").notNull(),
    description: text("description").notNull(),
    direction: postingDirectionEnum("direction").notNull(),
    pricingUnit: pricingUnitEnum("pricing_unit").notNull(),
    creditAmount: integer("credit_amount").notNull(),
    scheduleMode: scheduleModeEnum("schedule_mode").notNull(),
    flexibleStartDate: date("flexible_start_date", { mode: "string" }),
    flexibleEndDate: date("flexible_end_date", { mode: "string" }),
    status: postingStatusEnum("status").default("PUBLISHED").notNull(),
    moderatedReason: text("moderated_reason"),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    check("postings_credit_positive", sql`${table.creditAmount} > 0`),
    check(
      "postings_flexible_range_valid",
      sql`(${table.scheduleMode} = 'FLEXIBLE' AND ((${table.flexibleStartDate} IS NULL AND ${table.flexibleEndDate} IS NULL) OR (${table.flexibleStartDate} IS NOT NULL AND ${table.flexibleEndDate} IS NOT NULL AND ${table.flexibleEndDate} >= ${table.flexibleStartDate}))) OR (${table.scheduleMode} <> 'FLEXIBLE' AND ${table.flexibleStartDate} IS NULL AND ${table.flexibleEndDate} IS NULL)`,
    ),
    index("postings_owner_idx").on(table.ownerId),
    index("postings_status_created_idx").on(table.status, table.createdAt),
  ],
);

export const postingSlots = pgTable(
  "posting_slots",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    postingId: uuid("posting_id")
      .notNull()
      .references(() => postings.id, { onDelete: "cascade" }),
    precision: slotPrecisionEnum("precision").notNull(),
    calendarDate: date("calendar_date", { mode: "string" }),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    position: integer("position").default(0).notNull(),
  },
  (table) => [
    index("posting_slots_posting_idx").on(table.postingId, table.position),
  ],
);

export const postingUnavailability = pgTable(
  "posting_unavailability",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    postingId: uuid("posting_id")
      .notNull()
      .references(() => postings.id, { onDelete: "cascade" }),
    calendarDate: date("calendar_date", { mode: "string" }).notNull(),
    allDay: boolean("all_day").default(false).notNull(),
    unavailableHours: integer("unavailable_hours")
      .array()
      .default(sql`'{}'::integer[]`)
      .notNull(),
  },
  (table) => [
    uniqueIndex("posting_unavailability_posting_date_unique").on(
      table.postingId,
      table.calendarDate,
    ),
    check(
      "posting_unavailability_kind_valid",
      sql`(${table.allDay} AND cardinality(${table.unavailableHours}) = 0) OR (NOT ${table.allDay} AND cardinality(${table.unavailableHours}) > 0)`,
    ),
    check(
      "posting_unavailability_hours_valid",
      sql`${table.unavailableHours} <@ ARRAY[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23]::integer[]`,
    ),
  ],
);

export const applications = pgTable(
  "applications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    postingId: uuid("posting_id")
      .notNull()
      .references(() => postings.id),
    applicantId: text("applicant_id")
      .notNull()
      .references(() => users.id),
    slotId: uuid("slot_id").references(() => postingSlots.id, {
      onDelete: "set null",
    }),
    note: text("note").default("").notNull(),
    status: applicationStatusEnum("status").default("PENDING").notNull(),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("application_posting_member_unique").on(
      table.postingId,
      table.applicantId,
    ),
    index("applications_applicant_idx").on(table.applicantId, table.status),
    index("applications_posting_idx").on(table.postingId, table.status),
  ],
);

export type SlotSnapshot = {
  precision: "DATE_ONLY" | "TIMED";
  calendarDate?: string;
  startsAt?: string;
  endsAt?: string;
};

export const exchanges = pgTable(
  "exchanges",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    postingId: uuid("posting_id")
      .notNull()
      .references(() => postings.id),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => applications.id),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id),
    participantId: text("participant_id")
      .notNull()
      .references(() => users.id),
    payerId: text("payer_id")
      .notNull()
      .references(() => users.id),
    recipientId: text("recipient_id")
      .notNull()
      .references(() => users.id),
    titleSnapshot: text("title_snapshot").notNull(),
    direction: postingDirectionEnum("direction").notNull(),
    pricingUnit: pricingUnitEnum("pricing_unit").notNull(),
    rate: integer("rate").notNull(),
    slotSnapshot: jsonb("slot_snapshot").$type<SlotSnapshot>(),
    status: exchangeStatusEnum("status").default("ACTIVE").notNull(),
    unitCount: integer("unit_count"),
    creditsTotal: integer("credits_total"),
    cancelledBy: text("cancelled_by").references(() => users.id),
    cancellationReason: text("cancellation_reason"),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    settledAt: timestamp("settled_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("exchange_application_unique").on(table.applicationId),
    index("exchange_owner_idx").on(table.ownerId, table.status),
    index("exchange_participant_idx").on(table.participantId, table.status),
    check("exchange_rate_positive", sql`${table.rate} > 0`),
  ],
);

export const creditAccounts = pgTable("credit_accounts", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id),
  balance: bigint("balance", { mode: "number" }).default(0).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const creditTransactions = pgTable(
  "credit_transactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    type: creditTransactionTypeEnum("type").notNull(),
    createdBy: text("created_by").references(() => users.id),
    exchangeId: uuid("exchange_id").references(() => exchanges.id),
    reason: text("reason"),
    reversesTransactionId: uuid("reverses_transaction_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("credit_transaction_exchange_unique").on(table.exchangeId),
    index("credit_transaction_created_idx").on(table.createdAt),
  ],
);

export const creditEntries = pgTable(
  "credit_entries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    transactionId: uuid("transaction_id")
      .notNull()
      .references(() => creditTransactions.id),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    delta: bigint("delta", { mode: "number" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("credit_entry_transaction_user_unique").on(
      table.transactionId,
      table.userId,
    ),
    index("credit_entry_user_created_idx").on(table.userId, table.createdAt),
    check("credit_entry_nonzero", sql`${table.delta} <> 0`),
  ],
);

export const announcements = pgTable(
  "announcements",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    markdown: text("markdown").notNull(),
    status: announcementStatusEnum("status").default("DRAFT").notNull(),
    authorId: text("author_id")
      .notNull()
      .references(() => users.id),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index("announcement_status_published_idx").on(
      table.status,
      table.publishedAt,
    ),
  ],
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: notificationTypeEnum("type").notNull(),
    title: text("title").notNull(),
    body: text("body").default("").notNull(),
    href: text("href").notNull(),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("notification_user_read_idx").on(
      table.userId,
      table.readAt,
      table.createdAt,
    ),
  ],
);

export type AuditJson = Record<string, unknown>;

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actorId: text("actor_id").references(() => users.id),
    action: text("action").notNull(),
    outcome: auditOutcomeEnum("outcome").notNull(),
    ipAddress: inet("ip_address"),
    userAgent: text("user_agent"),
    requestId: uuid("request_id").defaultRandom().notNull(),
    targetType: text("target_type"),
    targetId: text("target_id"),
    reason: text("reason"),
    before: jsonb("before").$type<AuditJson>(),
    after: jsonb("after").$type<AuditJson>(),
    metadata: jsonb("metadata").$type<AuditJson>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("audit_created_idx").on(table.createdAt),
    index("audit_actor_idx").on(table.actorId, table.createdAt),
    index("audit_action_idx").on(table.action, table.createdAt),
  ],
);

export const usersRelations = relations(users, ({ many, one }) => ({
  roles: many(userRoles),
  postings: many(postings),
  applications: many(applications),
  creditAccount: one(creditAccounts, {
    fields: [users.id],
    references: [creditAccounts.userId],
  }),
}));

export const rolesRelations = relations(roles, ({ many }) => ({
  permissions: many(rolePermissions),
  users: many(userRoles),
}));

export const postingsRelations = relations(postings, ({ one, many }) => ({
  owner: one(users, { fields: [postings.ownerId], references: [users.id] }),
  slots: many(postingSlots),
  unavailability: many(postingUnavailability),
  applications: many(applications),
}));

export const applicationsRelations = relations(applications, ({ one }) => ({
  posting: one(postings, {
    fields: [applications.postingId],
    references: [postings.id],
  }),
  applicant: one(users, {
    fields: [applications.applicantId],
    references: [users.id],
  }),
  slot: one(postingSlots, {
    fields: [applications.slotId],
    references: [postingSlots.id],
  }),
}));

export const schema = {
  users,
  sessions,
  accounts,
  verifications,
  rateLimits,
  roles,
  permissions,
  rolePermissions,
  userRoles,
  postings,
  postingSlots,
  postingUnavailability,
  applications,
  exchanges,
  creditAccounts,
  creditTransactions,
  creditEntries,
  announcements,
  notifications,
  auditLogs,
};
