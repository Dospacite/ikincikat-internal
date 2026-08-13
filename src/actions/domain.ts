"use server";

import { randomBytes } from "node:crypto";
import { and, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import sharp from "sharp";
import { z } from "zod";

import { db } from "@/db";
import {
  announcements,
  applications,
  creditAccounts,
  creditEntries,
  creditTransactions,
  exchanges,
  notifications,
  permissions,
  postingSlots,
  postings,
  rolePermissions,
  roles,
  sessions,
  userRoles,
  users,
} from "@/db/schema";
import { auth } from "@/lib/auth";
import { assertActionUser } from "@/lib/auth-guard";
import { recordAudit } from "@/lib/audit";
import { settlementTotal } from "@/lib/credits";
import { deleteProfilePhoto, putProfilePhoto } from "@/lib/storage";

const text = (data: FormData, key: string) =>
  String(data.get(key) ?? "").trim();
const required = (data: FormData, key: string, label: string) => {
  const value = text(data, key);
  if (!value) throw new Error(`${label} zorunludur.`);
  return value;
};
const positiveInteger = (data: FormData, key: string, label: string) => {
  const value = Number(text(data, key));
  if (!Number.isSafeInteger(value) || value <= 0)
    throw new Error(`${label} pozitif bir tam sayı olmalı.`);
  return value;
};

async function notify(
  userId: string,
  type: typeof notifications.$inferInsert.type,
  title: string,
  body: string,
  href: string,
) {
  await db.insert(notifications).values({ userId, type, title, body, href });
}

export async function createPostingAction(formData: FormData) {
  const { user } = await assertActionUser();
  const title = required(formData, "title", "İlan adı").slice(0, 120);
  const description = required(formData, "description", "Açıklama").slice(
    0,
    3000,
  );
  const direction = z
    .enum(["OWNER_RECEIVES", "OWNER_PAYS"])
    .parse(text(formData, "direction"));
  const pricingUnit = z
    .enum(["OVERALL", "HOURLY", "DAILY"])
    .parse(text(formData, "pricingUnit"));
  const scheduleMode = z
    .enum(["FLEXIBLE", "ONE_TIME", "MULTIPLE_SLOTS"])
    .parse(text(formData, "scheduleMode"));
  const creditAmount = positiveInteger(formData, "creditAmount", "Kredi");
  const dates = formData.getAll("slotDate").map(String).filter(Boolean);
  const starts = formData.getAll("slotStart").map(String);
  const ends = formData.getAll("slotEnd").map(String);
  if (scheduleMode !== "FLEXIBLE" && dates.length === 0)
    throw new Error("En az bir uygun tarih ekleyin.");
  if (scheduleMode === "ONE_TIME" && dates.length > 1)
    throw new Error("Tek seferlik ilan yalnızca bir zaman aralığı içerebilir.");

  const [posting] = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(postings)
      .values({
        ownerId: user.id,
        title,
        description,
        direction,
        pricingUnit,
        creditAmount,
        scheduleMode,
      })
      .returning();
    if (dates.length) {
      await tx.insert(postingSlots).values(
        dates.map((calendarDate, index) => {
          if (ends[index] && !starts[index])
            throw new Error("Bitiş saati için başlangıç saati de girin.");
          const startsAt = starts[index]
            ? new Date(`${calendarDate}T${starts[index]}:00+03:00`)
            : null;
          const endsAt = ends[index]
            ? new Date(`${calendarDate}T${ends[index]}:00+03:00`)
            : null;
          if (startsAt && endsAt && endsAt <= startsAt)
            throw new Error("Bitiş saati başlangıçtan sonra olmalı.");
          return {
            postingId: created.id,
            precision: startsAt ? ("TIMED" as const) : ("DATE_ONLY" as const),
            calendarDate,
            startsAt,
            endsAt,
            position: index,
          };
        }),
      );
    }
    return [created];
  });
  await recordAudit({
    actorId: user.id,
    action: "POSTING_CREATED",
    targetType: "posting",
    targetId: posting.id,
    after: { title, direction, pricingUnit, creditAmount, scheduleMode },
  });
  redirect(`/ilanlar/${posting.id}?durum=olusturuldu`);
}

export async function closePostingAction(formData: FormData) {
  const { user } = await assertActionUser();
  const id = required(formData, "id", "İlan");
  const [posting] = await db
    .select()
    .from(postings)
    .where(eq(postings.id, id))
    .limit(1);
  if (!posting || posting.ownerId !== user.id)
    throw new Error("Bu ilanı kapatamazsınız.");
  await db
    .update(postings)
    .set({ status: "CLOSED", closedAt: new Date(), updatedAt: new Date() })
    .where(eq(postings.id, id));
  await recordAudit({
    actorId: user.id,
    action: "POSTING_CLOSED",
    targetType: "posting",
    targetId: id,
    before: { status: posting.status },
    after: { status: "CLOSED" },
  });
  revalidatePath(`/ilanlar/${id}`);
  revalidatePath("/ilanlarim");
}

export async function applyToPostingAction(formData: FormData) {
  const { user } = await assertActionUser();
  const postingId = required(formData, "postingId", "İlan");
  const slotId = text(formData, "slotId") || null;
  const note = text(formData, "note").slice(0, 1000);
  const [posting] = await db
    .select()
    .from(postings)
    .where(and(eq(postings.id, postingId), eq(postings.status, "PUBLISHED")))
    .limit(1);
  if (!posting || posting.ownerId === user.id)
    throw new Error("Bu ilana başvuramazsınız.");
  if (posting.scheduleMode !== "FLEXIBLE") {
    if (!slotId) throw new Error("Bir zaman seçeneği belirleyin.");
    const [slot] = await db
      .select()
      .from(postingSlots)
      .where(
        and(eq(postingSlots.id, slotId), eq(postingSlots.postingId, postingId)),
      )
      .limit(1);
    if (!slot) throw new Error("Seçilen zaman bu ilana ait değil.");
  }
  const [application] = await db
    .insert(applications)
    .values({ postingId, applicantId: user.id, slotId, note })
    .returning();
  await notify(
    posting.ownerId,
    "APPLICATION_RECEIVED",
    "İlanına yeni başvuru",
    `${user.name}, “${posting.title}” ilanına başvurdu.`,
    `/ilanlar/${postingId}`,
  );
  await recordAudit({
    actorId: user.id,
    action: "APPLICATION_CREATED",
    targetType: "application",
    targetId: application.id,
    after: { postingId, slotId },
  });
  redirect(`/ilanlar/${postingId}?durum=basvuru-alindi`);
}

export async function withdrawApplicationAction(formData: FormData) {
  const { user } = await assertActionUser();
  const id = required(formData, "id", "Başvuru");
  const [application] = await db
    .select()
    .from(applications)
    .where(
      and(
        eq(applications.id, id),
        eq(applications.applicantId, user.id),
        eq(applications.status, "PENDING"),
      ),
    )
    .limit(1);
  if (!application) throw new Error("Başvuru geri çekilemiyor.");
  await db
    .update(applications)
    .set({ status: "WITHDRAWN", updatedAt: new Date() })
    .where(eq(applications.id, id));
  await recordAudit({
    actorId: user.id,
    action: "APPLICATION_WITHDRAWN",
    targetType: "application",
    targetId: id,
  });
  revalidatePath("/ilanlarim");
}

export async function decideApplicationAction(formData: FormData) {
  const { user } = await assertActionUser();
  const id = required(formData, "id", "Başvuru");
  const decision = z
    .enum(["ACCEPTED", "DECLINED"])
    .parse(text(formData, "decision"));
  const result = await db.transaction(async (tx) => {
    const [application] = await tx
      .select()
      .from(applications)
      .where(and(eq(applications.id, id), eq(applications.status, "PENDING")))
      .limit(1);
    if (!application) throw new Error("Başvuru artık beklemede değil.");
    const [posting] = await tx
      .select()
      .from(postings)
      .where(eq(postings.id, application.postingId))
      .limit(1);
    if (!posting || posting.ownerId !== user.id)
      throw new Error("Bu başvuruyu karara bağlayamazsınız.");
    await tx
      .update(applications)
      .set({ status: decision, decidedAt: new Date(), updatedAt: new Date() })
      .where(eq(applications.id, id));
    let exchangeId: string | undefined;
    if (decision === "ACCEPTED") {
      const [slot] = application.slotId
        ? await tx
            .select()
            .from(postingSlots)
            .where(eq(postingSlots.id, application.slotId))
            .limit(1)
        : [];
      const ownerPays = posting.direction === "OWNER_PAYS";
      const [exchange] = await tx
        .insert(exchanges)
        .values({
          postingId: posting.id,
          applicationId: application.id,
          ownerId: posting.ownerId,
          participantId: application.applicantId,
          payerId: ownerPays ? posting.ownerId : application.applicantId,
          recipientId: ownerPays ? application.applicantId : posting.ownerId,
          titleSnapshot: posting.title,
          direction: posting.direction,
          pricingUnit: posting.pricingUnit,
          rate: posting.creditAmount,
          slotSnapshot: slot
            ? {
                precision: slot.precision,
                calendarDate: slot.calendarDate ?? undefined,
                startsAt: slot.startsAt?.toISOString(),
                endsAt: slot.endsAt?.toISOString(),
              }
            : null,
        })
        .returning();
      exchangeId = exchange.id;
    }
    return { application, posting, exchangeId };
  });
  await notify(
    result.application.applicantId,
    "APPLICATION_STATUS",
    decision === "ACCEPTED" ? "Başvurun kabul edildi" : "Başvurun reddedildi",
    `“${result.posting.title}” ilanındaki başvurun güncellendi.`,
    result.exchangeId ? `/takaslar` : `/ilanlar/${result.posting.id}`,
  );
  await recordAudit({
    actorId: user.id,
    action:
      decision === "ACCEPTED" ? "APPLICATION_ACCEPTED" : "APPLICATION_DECLINED",
    targetType: "application",
    targetId: id,
    after: { exchangeId: result.exchangeId },
  });
  revalidatePath(`/ilanlar/${result.posting.id}`);
  revalidatePath("/takaslar");
}

export async function settleExchangeAction(formData: FormData) {
  const { user } = await assertActionUser();
  const id = required(formData, "id", "Takas");
  const [exchange] = await db
    .select()
    .from(exchanges)
    .where(and(eq(exchanges.id, id), eq(exchanges.status, "ACTIVE")))
    .limit(1);
  if (!exchange || exchange.ownerId !== user.id)
    throw new Error("Bu takası tamamlayamazsınız.");
  const calculation = settlementTotal(
    exchange.rate,
    exchange.pricingUnit,
    exchange.pricingUnit === "OVERALL"
      ? undefined
      : positiveInteger(formData, "unitCount", "Birim sayısı"),
    text(formData, "creditsTotal")
      ? positiveInteger(formData, "creditsTotal", "Toplam kredi")
      : undefined,
  );
  const { unitCount, creditsTotal } = calculation;
  const [transaction] = await db.transaction(async (tx) => {
    const [fresh] = await tx
      .select()
      .from(exchanges)
      .where(and(eq(exchanges.id, id), eq(exchanges.status, "ACTIVE")))
      .for("update")
      .limit(1);
    if (!fresh) throw new Error("Takas zaten tamamlanmış veya iptal edilmiş.");
    const [created] = await tx
      .insert(creditTransactions)
      .values({
        type: "EXCHANGE",
        createdBy: user.id,
        exchangeId: id,
        reason: fresh.titleSnapshot,
      })
      .returning();
    await tx.insert(creditEntries).values([
      {
        transactionId: created.id,
        userId: fresh.payerId,
        delta: -creditsTotal,
      },
      {
        transactionId: created.id,
        userId: fresh.recipientId,
        delta: creditsTotal,
      },
    ]);
    await tx
      .insert(creditAccounts)
      .values([{ userId: fresh.payerId }, { userId: fresh.recipientId }])
      .onConflictDoNothing();
    await tx
      .update(creditAccounts)
      .set({
        balance: sql`${creditAccounts.balance} - ${creditsTotal}`,
        updatedAt: new Date(),
      })
      .where(eq(creditAccounts.userId, fresh.payerId));
    await tx
      .update(creditAccounts)
      .set({
        balance: sql`${creditAccounts.balance} + ${creditsTotal}`,
        updatedAt: new Date(),
      })
      .where(eq(creditAccounts.userId, fresh.recipientId));
    await tx
      .update(exchanges)
      .set({
        status: "SETTLED",
        unitCount,
        creditsTotal,
        settledAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(exchanges.id, id));
    return [created];
  });
  await notify(
    exchange.participantId,
    "EXCHANGE_SETTLED",
    "Takas tamamlandı",
    `“${exchange.titleSnapshot}” için ${creditsTotal} kredi aktarıldı.`,
    "/krediler",
  );
  await recordAudit({
    actorId: user.id,
    action: "EXCHANGE_SETTLED",
    targetType: "exchange",
    targetId: id,
    after: { creditsTotal, unitCount, transactionId: transaction.id },
  });
  revalidatePath("/takaslar");
  revalidatePath("/krediler");
}

export async function cancelExchangeAction(formData: FormData) {
  const { user } = await assertActionUser();
  const id = required(formData, "id", "Takas");
  const reason = required(formData, "reason", "İptal gerekçesi").slice(0, 500);
  const [exchange] = await db
    .select()
    .from(exchanges)
    .where(and(eq(exchanges.id, id), eq(exchanges.status, "ACTIVE")))
    .limit(1);
  if (
    !exchange ||
    (exchange.ownerId !== user.id && exchange.participantId !== user.id)
  )
    throw new Error("Bu takası iptal edemezsiniz.");
  await db
    .update(exchanges)
    .set({
      status: "CANCELLED",
      cancelledBy: user.id,
      cancellationReason: reason,
      cancelledAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(exchanges.id, id));
  const otherId =
    exchange.ownerId === user.id ? exchange.participantId : exchange.ownerId;
  await notify(
    otherId,
    "EXCHANGE_CANCELLED",
    "Takas iptal edildi",
    `“${exchange.titleSnapshot}” takası iptal edildi.`,
    "/takaslar",
  );
  await recordAudit({
    actorId: user.id,
    action: "EXCHANGE_CANCELLED",
    targetType: "exchange",
    targetId: id,
    reason,
  });
  revalidatePath("/takaslar");
}

export async function adjustCreditAction(formData: FormData) {
  const { user } = await assertActionUser({ permission: "credit.adjust" });
  const targetUserId = required(formData, "userId", "Üye");
  const amount = Number(text(formData, "amount"));
  const reason = required(formData, "reason", "Gerekçe").slice(0, 500);
  if (!Number.isSafeInteger(amount) || amount === 0)
    throw new Error("Miktar sıfırdan farklı bir tam sayı olmalı.");
  const [transaction] = await db.transaction(async (tx) => {
    const [target] = await tx
      .select()
      .from(users)
      .where(eq(users.id, targetUserId))
      .limit(1);
    if (!target) throw new Error("Üye bulunamadı.");
    const [created] = await tx
      .insert(creditTransactions)
      .values({ type: "ADMIN_ADJUSTMENT", createdBy: user.id, reason })
      .returning();
    await tx.insert(creditEntries).values({
      transactionId: created.id,
      userId: targetUserId,
      delta: amount,
    });
    await tx
      .insert(creditAccounts)
      .values({ userId: targetUserId })
      .onConflictDoNothing();
    await tx
      .update(creditAccounts)
      .set({
        balance: sql`${creditAccounts.balance} + ${amount}`,
        updatedAt: new Date(),
      })
      .where(eq(creditAccounts.userId, targetUserId));
    return [created];
  });
  await notify(
    targetUserId,
    "CREDIT_ADJUSTED",
    "Kredi bakiyen güncellendi",
    `${amount > 0 ? "+" : ""}${amount} kredi: ${reason}`,
    "/krediler",
  );
  await recordAudit({
    actorId: user.id,
    action: "CREDIT_ADJUSTED",
    targetType: "credit_transaction",
    targetId: transaction.id,
    reason,
    after: { targetUserId, amount },
  });
  revalidatePath("/krediler");
  revalidatePath("/yonetim/krediler");
}

export async function saveAnnouncementAction(formData: FormData) {
  const { user } = await assertActionUser({
    permission: "announcement.manage",
  });
  const id = text(formData, "id");
  const title = required(formData, "title", "Başlık").slice(0, 160);
  const markdown = required(formData, "markdown", "İçerik");
  const status = z
    .enum(["DRAFT", "PUBLISHED", "ARCHIVED"])
    .parse(text(formData, "status"));
  const publishedAt = status === "PUBLISHED" ? new Date() : null;
  let announcementId = id;
  let shouldNotify = status === "PUBLISHED";
  if (id) {
    const [before] = await db
      .select()
      .from(announcements)
      .where(eq(announcements.id, id))
      .limit(1);
    if (!before) throw new Error("Duyuru bulunamadı.");
    shouldNotify = status === "PUBLISHED" && before.status !== "PUBLISHED";
    await db
      .update(announcements)
      .set({
        title,
        markdown,
        status,
        publishedAt:
          status === "PUBLISHED"
            ? (before.publishedAt ?? publishedAt)
            : before.publishedAt,
        updatedAt: new Date(),
      })
      .where(eq(announcements.id, id));
    await recordAudit({
      actorId: user.id,
      action: "ANNOUNCEMENT_UPDATED",
      targetType: "announcement",
      targetId: id,
      before: { title: before.title, status: before.status },
      after: { title, status },
    });
  } else {
    const [created] = await db
      .insert(announcements)
      .values({ title, markdown, status, publishedAt, authorId: user.id })
      .returning();
    announcementId = created.id;
    await recordAudit({
      actorId: user.id,
      action: "ANNOUNCEMENT_CREATED",
      targetType: "announcement",
      targetId: created.id,
      after: { title, status },
    });
  }
  if (shouldNotify) {
    const memberRows = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.active, true));
    if (memberRows.length)
      await db.insert(notifications).values(
        memberRows.map((member) => ({
          userId: member.id,
          type: "ANNOUNCEMENT" as const,
          title,
          body: "",
          href: `/duyurular/${announcementId}`,
        })),
      );
  }
  revalidatePath("/duyurular");
  redirect(`/duyurular/${announcementId}`);
}

export async function updateProfileAction(formData: FormData) {
  const { user } = await assertActionUser();
  const username = z
    .string()
    .min(3, "Kullanıcı adı en az 3 karakter olmalı.")
    .max(32)
    .regex(
      /^[a-zA-Z0-9._-]+$/,
      "Kullanıcı adı yalnızca harf, sayı, nokta, tire ve alt çizgi içerebilir.",
    )
    .parse(text(formData, "username"));
  const bio = text(formData, "bio").slice(0, 500);
  const before = { username: user.username, bio: user.bio };
  await db
    .update(users)
    .set({ username, bio, updatedAt: new Date() })
    .where(eq(users.id, user.id));
  await recordAudit({
    actorId: user.id,
    action: "PROFILE_UPDATED",
    targetType: "user",
    targetId: user.id,
    before,
    after: { username, bio },
  });
  revalidatePath("/profil");
  revalidatePath("/uyeler");
}

export async function uploadProfilePhotoAction(formData: FormData) {
  const { user } = await assertActionUser();
  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0)
    throw new Error("Bir görsel seçin.");
  if (file.size > 5 * 1024 * 1024)
    throw new Error("Profil fotoğrafı en fazla 5 MB olabilir.");
  if (!file.type.startsWith("image/"))
    throw new Error("Yalnızca görsel dosyası yükleyebilirsiniz.");
  const buffer = await sharp(Buffer.from(await file.arrayBuffer()))
    .rotate()
    .resize(512, 512, { fit: "cover" })
    .webp({ quality: 84 })
    .toBuffer();
  const key = `profiles/${user.id}/${randomBytes(12).toString("hex")}.webp`;
  await putProfilePhoto(key, buffer);
  const oldKey = user.photoKey;
  await db
    .update(users)
    .set({
      photoKey: key,
      image: `/api/profil-fotografi/${user.id}`,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));
  if (oldKey) await deleteProfilePhoto(oldKey).catch(() => undefined);
  await recordAudit({
    actorId: user.id,
    action: "PROFILE_PHOTO_UPDATED",
    targetType: "user",
    targetId: user.id,
  });
  revalidatePath("/profil");
  revalidatePath("/uyeler");
}

export async function markNotificationReadAction(formData: FormData) {
  const { user } = await assertActionUser();
  const id = required(formData, "id", "Bildirim");
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.id, id), eq(notifications.userId, user.id)));
  await recordAudit({
    actorId: user.id,
    action: "NOTIFICATION_READ",
    targetType: "notification",
    targetId: id,
  });
  revalidatePath("/bildirimler");
}

export async function markAllNotificationsReadAction() {
  const { user } = await assertActionUser();
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notifications.userId, user.id),
        sql`${notifications.readAt} is null`,
      ),
    );
  await recordAudit({
    actorId: user.id,
    action: "NOTIFICATIONS_ALL_READ",
    targetType: "user",
    targetId: user.id,
  });
  revalidatePath("/bildirimler");
}

export async function createUserAction(formData: FormData) {
  const { user } = await assertActionUser({ admin: true });
  const name = required(formData, "name", "Ad soyad").slice(0, 120);
  const email = z
    .email("Geçerli bir e-posta girin.")
    .parse(text(formData, "email").toLowerCase());
  const username = z
    .string()
    .min(3)
    .max(32)
    .regex(/^[a-zA-Z0-9._-]+$/)
    .parse(text(formData, "username"));
  const password = z
    .string()
    .min(12, "Geçici parola en az 12 karakter olmalı.")
    .max(128)
    .parse(text(formData, "password"));
  const created = await auth.api.createUser({
    body: {
      email,
      password,
      name,
      role: "user",
      data: {
        username,
        bio: "",
        active: true,
        mustChangePassword: true,
        emailVerified: true,
      },
    },
    headers: await headers(),
  });
  const systemRoles = await db
    .select()
    .from(roles)
    .where(eq(roles.systemKey, "user"));
  if (systemRoles[0])
    await db
      .insert(userRoles)
      .values({
        userId: created.user.id,
        roleId: systemRoles[0].id,
        assignedBy: user.id,
      })
      .onConflictDoNothing();
  await db
    .insert(creditAccounts)
    .values({ userId: created.user.id })
    .onConflictDoNothing();
  await recordAudit({
    actorId: user.id,
    action: "USER_CREATED",
    targetType: "user",
    targetId: created.user.id,
    after: { name, email, username },
  });
  revalidatePath("/yonetim/kullanicilar");
}

export async function resetUserPasswordAction(formData: FormData) {
  const { user } = await assertActionUser({ admin: true });
  const userId = required(formData, "userId", "Üye");
  const newPassword = z
    .string()
    .min(12, "Geçici parola en az 12 karakter olmalı.")
    .max(128)
    .parse(text(formData, "password"));
  await auth.api.setUserPassword({
    body: { userId, newPassword },
    headers: await headers(),
  });
  await db
    .update(users)
    .set({ mustChangePassword: true, updatedAt: new Date() })
    .where(eq(users.id, userId));
  await db.delete(sessions).where(eq(sessions.userId, userId));
  await recordAudit({
    actorId: user.id,
    action: "USER_PASSWORD_RESET",
    targetType: "user",
    targetId: userId,
  });
  revalidatePath("/yonetim/kullanicilar");
}

export async function toggleUserActiveAction(formData: FormData) {
  const { user } = await assertActionUser({ admin: true });
  const userId = required(formData, "userId", "Üye");
  if (userId === user.id)
    throw new Error("Kendi yönetici hesabınızı devre dışı bırakamazsınız.");
  const reason = required(formData, "reason", "Gerekçe").slice(0, 500);
  const [target] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!target) throw new Error("Üye bulunamadı.");
  const active = !target.active;
  await db
    .update(users)
    .set({
      active,
      banned: !active,
      deactivatedAt: active ? null : new Date(),
      deactivationReason: active ? null : reason,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
  if (!active) await db.delete(sessions).where(eq(sessions.userId, userId));
  await recordAudit({
    actorId: user.id,
    action: active ? "USER_REACTIVATED" : "USER_DEACTIVATED",
    targetType: "user",
    targetId: userId,
    reason,
    before: { active: target.active },
    after: { active },
  });
  revalidatePath("/yonetim/kullanicilar");
}

export async function updateUserIdentityAction(formData: FormData) {
  const { user } = await assertActionUser({ admin: true });
  const userId = required(formData, "userId", "Üye");
  const name = required(formData, "name", "Ad soyad").slice(0, 120);
  const email = z
    .email("Geçerli bir e-posta girin.")
    .parse(text(formData, "email").toLowerCase());
  const reason = required(formData, "reason", "Değişiklik gerekçesi").slice(
    0,
    500,
  );
  const [before] = await db
    .select({ name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!before) throw new Error("Üye bulunamadı.");
  await db
    .update(users)
    .set({ name, email, updatedAt: new Date() })
    .where(eq(users.id, userId));
  await recordAudit({
    actorId: user.id,
    action: "USER_IDENTITY_UPDATED",
    targetType: "user",
    targetId: userId,
    reason,
    before,
    after: { name, email },
  });
  revalidatePath("/yonetim/kullanicilar");
}

export async function createRoleAction(formData: FormData) {
  const { user } = await assertActionUser({ admin: true });
  const name = required(formData, "name", "Rol adı").slice(0, 80);
  const baseSlug =
    name
      .toLocaleLowerCase("tr-TR")
      .replaceAll("ı", "i")
      .replaceAll("ş", "s")
      .replaceAll("ğ", "g")
      .replaceAll("ü", "u")
      .replaceAll("ö", "o")
      .replaceAll("ç", "c")
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "rol";
  const slug = `${baseSlug.slice(0, 41)}-${randomBytes(3).toString("hex")}`;
  const description = text(formData, "description").slice(0, 300);
  const selected = formData.getAll("permissions").map(String);
  const validRows = selected.length
    ? await db
        .select()
        .from(permissions)
        .where(inArray(permissions.code, selected))
    : [];
  const [role] = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(roles)
      .values({ name, slug, description })
      .returning();
    if (validRows.length)
      await tx.insert(rolePermissions).values(
        validRows.map((permission) => ({
          roleId: created.id,
          permissionCode: permission.code,
        })),
      );
    return [created];
  });
  await recordAudit({
    actorId: user.id,
    action: "ROLE_CREATED",
    targetType: "role",
    targetId: role.id,
    after: { name, slug, permissions: selected },
  });
  revalidatePath("/yonetim/roller");
}

export async function updateRoleAction(formData: FormData) {
  const { user } = await assertActionUser({ admin: true });
  const roleId = required(formData, "roleId", "Rol");
  const [role] = await db
    .select()
    .from(roles)
    .where(eq(roles.id, roleId))
    .limit(1);
  if (!role) throw new Error("Rol bulunamadı.");
  if (role.systemKey) throw new Error("Bu rol değiştirilemez.");
  const name = required(formData, "name", "Rol adı").slice(0, 80);
  const description = text(formData, "description").slice(0, 300);
  const selected = formData.getAll("permissions").map(String);
  const validRows = selected.length
    ? await db
        .select()
        .from(permissions)
        .where(inArray(permissions.code, selected))
    : [];
  const beforePermissions = await db
    .select()
    .from(rolePermissions)
    .where(eq(rolePermissions.roleId, roleId));
  await db.transaction(async (tx) => {
    await tx
      .update(roles)
      .set({ name, description, updatedAt: new Date() })
      .where(eq(roles.id, roleId));
    await tx.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));
    if (validRows.length)
      await tx.insert(rolePermissions).values(
        validRows.map((permission) => ({
          roleId,
          permissionCode: permission.code,
        })),
      );
  });
  await recordAudit({
    actorId: user.id,
    action: "ROLE_UPDATED",
    targetType: "role",
    targetId: roleId,
    before: {
      name: role.name,
      permissions: beforePermissions.map((row) => row.permissionCode),
    },
    after: { name, permissions: selected },
  });
  revalidatePath("/yonetim/roller");
}

export async function assignRoleAction(formData: FormData) {
  const { user } = await assertActionUser({ admin: true });
  const userId = required(formData, "userId", "Üye");
  const roleId = required(formData, "roleId", "Rol");
  const enabled = text(formData, "enabled") === "true";
  const [role] = await db
    .select()
    .from(roles)
    .where(eq(roles.id, roleId))
    .limit(1);
  if (!role) throw new Error("Rol bulunamadı.");
  if (role.systemKey === "user" && !enabled)
    throw new Error("Kullanıcı rolü kaldırılamaz.");
  if (userId === user.id && role.systemKey === "admin" && !enabled)
    throw new Error("Kendi yönetici rolünüzü kaldıramazsınız.");
  if (enabled)
    await db
      .insert(userRoles)
      .values({ userId, roleId, assignedBy: user.id })
      .onConflictDoNothing();
  else
    await db
      .delete(userRoles)
      .where(and(eq(userRoles.userId, userId), eq(userRoles.roleId, roleId)));
  if (role.systemKey === "admin")
    await db
      .update(users)
      .set({ role: enabled ? "admin" : "user", updatedAt: new Date() })
      .where(eq(users.id, userId));
  await recordAudit({
    actorId: user.id,
    action: enabled ? "ROLE_ASSIGNED" : "ROLE_REMOVED",
    targetType: "user",
    targetId: userId,
    after: { roleId, role: role.slug },
  });
  revalidatePath("/yonetim/roller");
  revalidatePath("/yonetim/kullanicilar");
}

export async function moderatePostingAction(formData: FormData) {
  const { user } = await assertActionUser({ permission: "posting.moderate" });
  const id = required(formData, "id", "İlan");
  const status = z
    .enum(["PUBLISHED", "HIDDEN", "CLOSED"])
    .parse(text(formData, "status"));
  const reason = required(formData, "reason", "Moderasyon gerekçesi").slice(
    0,
    500,
  );
  const [before] = await db
    .select()
    .from(postings)
    .where(eq(postings.id, id))
    .limit(1);
  if (!before) throw new Error("İlan bulunamadı.");
  await db
    .update(postings)
    .set({
      status,
      moderatedReason: reason,
      closedAt: status === "CLOSED" ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(postings.id, id));
  await notify(
    before.ownerId,
    "POSTING_MODERATED",
    "İlanın moderasyonla güncellendi",
    `“${before.title}” ilanı: ${reason}`,
    `/ilanlar/${id}`,
  );
  await recordAudit({
    actorId: user.id,
    action: "POSTING_MODERATED",
    targetType: "posting",
    targetId: id,
    reason,
    before: { status: before.status },
    after: { status },
  });
  revalidatePath("/yonetim/moderasyon");
  revalidatePath(`/ilanlar/${id}`);
}

export async function adminEditPostingAction(formData: FormData) {
  const { user } = await assertActionUser({ permission: "posting.moderate" });
  const id = required(formData, "id", "İlan");
  const reason = required(formData, "reason", "Düzenleme gerekçesi").slice(
    0,
    500,
  );
  const title = required(formData, "title", "İlan adı").slice(0, 120);
  const description = required(formData, "description", "Açıklama").slice(
    0,
    3000,
  );
  const creditAmount = positiveInteger(formData, "creditAmount", "Kredi");
  const [before] = await db
    .select()
    .from(postings)
    .where(eq(postings.id, id))
    .limit(1);
  if (!before) throw new Error("İlan bulunamadı.");
  await db
    .update(postings)
    .set({
      title,
      description,
      creditAmount,
      moderatedReason: reason,
      updatedAt: new Date(),
    })
    .where(eq(postings.id, id));
  await notify(
    before.ownerId,
    "POSTING_MODERATED",
    "İlanın yönetici tarafından düzenlendi",
    `“${before.title}” ilanı: ${reason}`,
    `/ilanlar/${id}`,
  );
  await recordAudit({
    actorId: user.id,
    action: "POSTING_EDITED_BY_ADMIN",
    targetType: "posting",
    targetId: id,
    reason,
    before: {
      title: before.title,
      description: before.description,
      creditAmount: before.creditAmount,
    },
    after: { title, description, creditAmount },
  });
  revalidatePath("/yonetim/moderasyon");
  revalidatePath(`/ilanlar/${id}`);
}
