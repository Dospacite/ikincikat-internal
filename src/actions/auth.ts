"use server";

import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { db } from "@/db";
import { users } from "@/db/schema";
import { auth } from "@/lib/auth";
import { assertActionUser } from "@/lib/auth-guard";
import { recordAudit, safeError } from "@/lib/audit";

export type FormState = { error?: string; success?: string };

const signInSchema = z.object({
  email: z.email("Geçerli bir e-posta adresi girin."),
  password: z.string().min(1, "Parolanızı girin."),
});

export async function signInAction(
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = signInSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const attemptedEmailHash = createHash("sha256")
    .update(parsed.data.email.toLowerCase())
    .digest("hex");
  let destination = "/";
  try {
    const requestHeaders = await headers();
    const result = await auth.api.signInEmail({
      body: parsed.data,
      headers: requestHeaders,
    });
    const [member] = await db
      .select()
      .from(users)
      .where(eq(users.id, result.user.id))
      .limit(1);
    if (!member?.active) {
      await auth.api.signOut({ headers: requestHeaders });
      throw new Error("Bu hesap devre dışı bırakılmış.");
    }
    await recordAudit({
      actorId: result.user.id,
      action: "AUTH_SIGN_IN",
      targetType: "user",
      targetId: result.user.id,
    });
    destination = member.mustChangePassword ? "/parola-degistir" : "/";
  } catch (error) {
    await recordAudit({
      action: "AUTH_SIGN_IN",
      outcome: "FAILURE",
      metadata: { attemptedEmailHash, error: safeError(error) },
    });
    return { error: "E-posta veya parola hatalı. Tekrar deneyin." };
  }
  redirect(destination);
}

export async function signOutAction() {
  const context = await assertActionUser({ allowPasswordChange: true });
  await recordAudit({
    actorId: context.user.id,
    action: "AUTH_SIGN_OUT",
    targetType: "user",
    targetId: context.user.id,
  });
  await auth.api.signOut({ headers: await headers() });
  redirect("/giris");
}

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Geçici parolanızı girin."),
    newPassword: z
      .string()
      .min(12, "Yeni parola en az 12 karakter olmalı.")
      .max(128),
    confirmation: z.string(),
  })
  .refine((value) => value.newPassword === value.confirmation, {
    message: "Yeni parola ve tekrarı aynı olmalı.",
    path: ["confirmation"],
  });

export async function changePasswordAction(
  _: FormState,
  formData: FormData,
): Promise<FormState> {
  const context = await assertActionUser({ allowPasswordChange: true });
  const parsed = passwordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  try {
    await auth.api.changePassword({
      body: {
        currentPassword: parsed.data.currentPassword,
        newPassword: parsed.data.newPassword,
        revokeOtherSessions: true,
      },
      headers: await headers(),
    });
    await db
      .update(users)
      .set({ mustChangePassword: false, updatedAt: new Date() })
      .where(eq(users.id, context.user.id));
    await recordAudit({
      actorId: context.user.id,
      action: "AUTH_PASSWORD_CHANGED",
      targetType: "user",
      targetId: context.user.id,
    });
  } catch (error) {
    await recordAudit({
      actorId: context.user.id,
      action: "AUTH_PASSWORD_CHANGED",
      outcome: "FAILURE",
      targetType: "user",
      targetId: context.user.id,
      metadata: { error: safeError(error) },
    });
    return { error: "Parola değiştirilemedi. Geçici parolanızı kontrol edin." };
  }
  redirect("/");
}
