import { and, desc, eq } from "drizzle-orm";
import { CalendarDays, Clock, Coins, UserRound } from "lucide-react";
import { notFound } from "next/navigation";

import {
  applyToPostingAction,
  closePostingAction,
  decideApplicationAction,
} from "@/actions/domain";
import { MemberAvatar } from "@/components/member-avatar";
import { PageHeading } from "@/components/page-heading";
import { PendingButton } from "@/components/pending-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { db } from "@/db";
import { applications, postingSlots, postings, users } from "@/db/schema";
import { requireUser } from "@/lib/auth-guard";
import {
  applicationStatus,
  postingDirection,
  postingStatus,
  pricingUnit,
} from "@/lib/labels";
import { formatDate, formatDateTime } from "@/lib/utils";

export default async function PostingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user, isAdmin } = await requireUser();
  const [postingRow] = await db
    .select({ posting: postings, owner: users })
    .from(postings)
    .innerJoin(users, eq(postings.ownerId, users.id))
    .where(eq(postings.id, id))
    .limit(1);
  if (
    !postingRow ||
    (postingRow.posting.status === "HIDDEN" &&
      postingRow.posting.ownerId !== user.id &&
      !isAdmin)
  )
    notFound();
  const [slots, myApplications] = await Promise.all([
    db
      .select()
      .from(postingSlots)
      .where(eq(postingSlots.postingId, id))
      .orderBy(postingSlots.position),
    db
      .select()
      .from(applications)
      .where(
        and(
          eq(applications.postingId, id),
          eq(applications.applicantId, user.id),
        ),
      )
      .limit(1),
  ]);
  const ownerApplications =
    postingRow.posting.ownerId === user.id
      ? await db
          .select({ application: applications, applicant: users })
          .from(applications)
          .innerJoin(users, eq(applications.applicantId, users.id))
          .where(eq(applications.postingId, id))
          .orderBy(desc(applications.createdAt))
      : [];
  const posting = postingRow.posting;
  const isOwner = posting.ownerId === user.id;
  return (
    <div className="page-stack">
      <PageHeading
        title={posting.title}
        description={`${postingRow.owner.name} · ${formatDateTime(posting.createdAt)}`}
        action={
          <Badge
            variant={posting.status === "PUBLISHED" ? "default" : "secondary"}
          >
            {postingStatus[posting.status]}
          </Badge>
        }
      />
      {posting.status === "HIDDEN" && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4">
          <strong>Bu ilan moderasyonla gizlendi.</strong>
          <p className="mt-1 text-sm">{posting.moderatedReason}</p>
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="grid content-start gap-6">
          <Card>
            <CardContent className="grid gap-6">
              <p className="whitespace-pre-wrap text-lg leading-8">
                {posting.description}
              </p>
              <dl className="grid gap-4 border-t pt-5 sm:grid-cols-3">
                <div>
                  <dt className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Coins className="size-4" />
                    Kredi
                  </dt>
                  <dd className="mt-1 font-medium">
                    {posting.creditAmount} · {pricingUnit[posting.pricingUnit]}
                  </dd>
                </div>
                <div>
                  <dt className="flex items-center gap-2 text-sm text-muted-foreground">
                    <UserRound className="size-4" />
                    Yön
                  </dt>
                  <dd className="mt-1 font-medium">
                    {postingDirection[posting.direction]}
                  </dd>
                </div>
                <div>
                  <dt className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CalendarDays className="size-4" />
                    Uygunluk
                  </dt>
                  <dd className="mt-1 font-medium">
                    {posting.scheduleMode === "FLEXIBLE"
                      ? "Esnek"
                      : posting.scheduleMode === "ONE_TIME"
                        ? "Tek seferlik"
                        : "Birden fazla seçenek"}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
          {slots.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Uygun zamanlar</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="grid gap-3">
                  {slots.map((slot) => (
                    <li
                      key={slot.id}
                      className="flex items-center gap-3 rounded-lg border p-3"
                    >
                      <Clock className="size-5 text-muted-foreground" />
                      <span>
                        {slot.calendarDate
                          ? formatDate(`${slot.calendarDate}T12:00:00`)
                          : ""}
                        {slot.startsAt
                          ? ` · ${formatDateTime(slot.startsAt).split(" ").slice(-1)}${slot.endsAt ? `–${formatDateTime(slot.endsAt).split(" ").slice(-1)}` : ""}`
                          : " · Saat esnek"}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
          {isOwner && (
            <Card>
              <CardHeader>
                <CardTitle>Başvurular</CardTitle>
                <CardDescription>
                  Birden fazla başvuruyu kabul edebilirsin.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                {ownerApplications.length ? (
                  ownerApplications.map(({ application, applicant }) => (
                    <div
                      key={application.id}
                      className="grid gap-3 rounded-lg border p-4"
                    >
                      <div className="flex items-center gap-3">
                        <MemberAvatar user={applicant} />
                        <div>
                          <p className="font-medium">
                            {applicant.name}{" "}
                            <span className="font-normal text-muted-foreground">
                              @{applicant.username}
                            </span>
                          </p>
                          <Badge variant="outline">
                            {applicationStatus[application.status]}
                          </Badge>
                        </div>
                      </div>
                      {application.note && <p>{application.note}</p>}
                      {application.status === "PENDING" && (
                        <div className="flex flex-wrap gap-2">
                          <form action={decideApplicationAction}>
                            <input
                              type="hidden"
                              name="id"
                              value={application.id}
                            />
                            <input
                              type="hidden"
                              name="decision"
                              value="ACCEPTED"
                            />
                            <PendingButton>Kabul et</PendingButton>
                          </form>
                          <form action={decideApplicationAction}>
                            <input
                              type="hidden"
                              name="id"
                              value={application.id}
                            />
                            <input
                              type="hidden"
                              name="decision"
                              value="DECLINED"
                            />
                            <PendingButton variant="outline">
                              Reddet
                            </PendingButton>
                          </form>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground">Henüz başvuru yok.</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
        <aside className="grid content-start gap-4">
          <Card>
            <CardHeader>
              <CardTitle>İlan sahibi</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-3">
              <MemberAvatar user={postingRow.owner} className="size-12" />
              <div>
                <p className="font-medium">{postingRow.owner.name}</p>
                <p className="text-muted-foreground">
                  @{postingRow.owner.username}
                </p>
              </div>
            </CardContent>
          </Card>
          {!isOwner && posting.status === "PUBLISHED" && !myApplications[0] && (
            <Card>
              <CardHeader>
                <CardTitle>Başvur</CardTitle>
              </CardHeader>
              <CardContent>
                <form action={applyToPostingAction} className="form-stack">
                  <input type="hidden" name="postingId" value={id} />
                  {slots.length > 0 && (
                    <div className="field-stack">
                      <Label htmlFor="slotId">Tercih edilen zaman</Label>
                      <select
                        id="slotId"
                        name="slotId"
                        required
                        className="h-11 rounded-md border bg-background px-3"
                      >
                        <option value="">Seçin</option>
                        {slots.map((slot) => (
                          <option key={slot.id} value={slot.id}>
                            {slot.calendarDate ?? "Zaman"}
                            {slot.startsAt
                              ? ` · ${new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" }).format(slot.startsAt)}`
                              : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="field-stack">
                    <Label htmlFor="note">Not</Label>
                    <Textarea
                      id="note"
                      name="note"
                      maxLength={1000}
                      placeholder="Uygunluğun veya katkın…"
                    />
                  </div>
                  <PendingButton className="w-full">
                    Başvuru gönder
                  </PendingButton>
                </form>
              </CardContent>
            </Card>
          )}
          {!isOwner && myApplications[0] && (
            <Card>
              <CardHeader>
                <CardTitle>Başvurun</CardTitle>
                <CardDescription>
                  Durum: {applicationStatus[myApplications[0].status]}
                </CardDescription>
              </CardHeader>
            </Card>
          )}
          {isOwner && posting.status === "PUBLISHED" && (
            <form action={closePostingAction}>
              <input type="hidden" name="id" value={id} />
              <Button type="submit" variant="outline" className="w-full">
                İlanı kapat
              </Button>
            </form>
          )}
        </aside>
      </div>
    </div>
  );
}
