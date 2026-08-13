import { randomUUID } from "node:crypto";

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { admin } from "better-auth/plugins";

import { db } from "@/db";
import {
  accounts,
  rateLimits,
  sessions,
  users,
  verifications,
} from "@/db/schema";
import { env } from "@/lib/env";

export const auth = betterAuth({
  appName: "ikinciKat Internal",
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: users,
      session: sessions,
      account: accounts,
      verification: verifications,
      rateLimit: rateLimits,
    },
  }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: 12,
    maxPasswordLength: 128,
    revokeSessionsOnPasswordReset: true,
  },
  user: {
    modelName: "user",
    additionalFields: {
      username: { type: "string", required: true, input: true },
      bio: { type: "string", required: false, defaultValue: "", input: true },
      photoKey: { type: "string", required: false, input: false },
      active: {
        type: "boolean",
        required: false,
        defaultValue: true,
        input: false,
      },
      mustChangePassword: {
        type: "boolean",
        required: false,
        defaultValue: true,
        input: false,
      },
      deactivatedAt: { type: "date", required: false, input: false },
      deactivationReason: { type: "string", required: false, input: false },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  rateLimit: {
    enabled: true,
    storage: "database",
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 60 * 15, max: 5 },
    },
  },
  advanced: {
    database: { generateId: () => randomUUID() },
    ipAddress: { ipAddressHeaders: ["x-real-ip"] },
    useSecureCookies: env.BETTER_AUTH_URL.startsWith("https://"),
  },
  plugins: [
    admin({ defaultRole: "user", adminRoles: ["admin"] }),
    nextCookies(),
  ],
  telemetry: { enabled: false },
});

export type Session = typeof auth.$Infer.Session;
