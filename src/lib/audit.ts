import { isIP } from "node:net";
import { headers } from "next/headers";

import { db } from "@/db";
import { auditLogs, type AuditJson } from "@/db/schema";

const secretKeys = new Set([
  "password",
  "newPassword",
  "currentPassword",
  "token",
  "secret",
  "accessToken",
  "refreshToken",
]);

function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, nested]) => [
      key,
      secretKeys.has(key) ? "[REDACTED]" : redact(nested),
    ]),
  );
}

export async function getRequestMetadata() {
  const requestHeaders = await headers();
  const candidate =
    requestHeaders.get("x-real-ip") ??
    (process.env.NODE_ENV !== "production" ? "127.0.0.1" : null);

  return {
    ipAddress: candidate && isIP(candidate) ? candidate : null,
    userAgent: requestHeaders.get("user-agent"),
  };
}

export type AuditInput = {
  actorId?: string | null;
  action: string;
  outcome?: "SUCCESS" | "FAILURE";
  targetType?: string;
  targetId?: string;
  reason?: string;
  before?: unknown;
  after?: unknown;
  metadata?: unknown;
};

export async function recordAudit(input: AuditInput) {
  const request = await getRequestMetadata();
  await db.insert(auditLogs).values({
    actorId: input.actorId ?? null,
    action: input.action,
    outcome: input.outcome ?? "SUCCESS",
    targetType: input.targetType,
    targetId: input.targetId,
    reason: input.reason,
    before: redact(input.before) as AuditJson | undefined,
    after: redact(input.after) as AuditJson | undefined,
    metadata: redact(input.metadata) as AuditJson | undefined,
    ...request,
  });
}

export function safeError(error: unknown) {
  return error instanceof Error
    ? error.message.slice(0, 500)
    : "Bilinmeyen hata";
}
