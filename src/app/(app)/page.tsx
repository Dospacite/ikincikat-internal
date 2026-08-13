import { and, count, desc, eq, isNull, or } from "drizzle-orm";
import { ArrowRight, Bell, Handshake, Plus, WalletCards } from "lucide-react";
import Link from "next/link";

import { MemberAvatar } from "@/components/member-avatar";
import { PageHeading } from "@/components/page-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { db } from "@/db";
import {
  announcements,
  creditAccounts,
  exchanges,
  notifications,
  postings,
  users,
} from "@/db/schema";
import { requireUser } from "@/lib/auth-guard";
import { formatCredits, formatDateTime } from "@/lib/utils";

export default async function DashboardPage() {
  const { user } = await requireUser();
  const [
    [account],
    [activeExchanges],
    [unread],
    recentPostings,
    recentAnnouncements,
  ] = await Promise.all([
    db
      .select()
      .from(creditAccounts)
      .where(eq(creditAccounts.userId, user.id))
      .limit(1),
    db
      .select({ value: count() })
      .from(exchanges)
      .where(
        and(
          or(
            eq(exchanges.ownerId, user.id),
            eq(exchanges.participantId, user.id),
          ),
          eq(exchanges.status, "ACTIVE"),
        ),
      ),
    db
      .select({ value: count() })
      .from(notifications)
      .where(
        and(eq(notifications.userId, user.id), isNull(notifications.readAt)),
      ),
    db
      .select({
        id: postings.id,
        title: postings.title,
        direction: postings.direction,
        creditAmount: postings.creditAmount,
        pricingUnit: postings.pricingUnit,
        ownerName: users.name,
        ownerImage: users.image,
        createdAt: postings.createdAt,
      })
      .from(postings)
      .innerJoin(users, eq(postings.ownerId, users.id))
      .where(eq(postings.status, "PUBLISHED"))
      .orderBy(desc(postings.createdAt))
      .limit(4),
    db
      .select()
      .from(announcements)
      .where(eq(announcements.status, "PUBLISHED"))
      .orderBy(desc(announcements.publishedAt))
      .limit(3),
  ]);
  return (
    <div className="page-stack">
      <PageHeading
        title="Ana sayfa"
        action={
          <Button asChild>
            <Link href="/ilanlar/yeni">
              <Plus />
              İlan ver
            </Link>
          </Button>
        }
      />
      <section className="grid gap-4 sm:grid-cols-3" aria-label="Hesap özeti">
        <Card>
          <CardHeader>
            <CardDescription>Kredi bakiyesi</CardDescription>
            <CardTitle className="text-3xl font-normal">
              {formatCredits(account?.balance ?? 0)}
            </CardTitle>
            <CardAction>
              <WalletCards className="text-muted-foreground" />
            </CardAction>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Süren takaslar</CardDescription>
            <CardTitle className="text-3xl font-normal">
              {activeExchanges?.value ?? 0}
            </CardTitle>
            <CardAction>
              <Handshake className="text-muted-foreground" />
            </CardAction>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Okunmamış bildirim</CardDescription>
            <CardTitle className="text-3xl font-normal">
              {unread?.value ?? 0}
            </CardTitle>
            <CardAction>
              <Bell className="text-muted-foreground" />
            </CardAction>
          </CardHeader>
        </Card>
      </section>
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2>Yeni ilanlar</h2>
            <Button asChild variant="ghost">
              <Link href="/ilanlar">
                Tümünü gör
                <ArrowRight />
              </Link>
            </Button>
          </div>
          <div className="grid gap-3">
            {recentPostings.length ? (
              recentPostings.map((posting) => (
                <Card key={posting.id} className="content-card py-4">
                  <CardContent className="flex items-start gap-4 px-4">
                    <MemberAvatar
                      user={{
                        name: posting.ownerName,
                        image: posting.ownerImage,
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/ilanlar/${posting.id}`}
                        className="font-sans text-lg hover:underline"
                      >
                        {posting.title}
                      </Link>
                      <p className="text-sm text-muted-foreground">
                        {posting.ownerName} ·{" "}
                        {formatDateTime(posting.createdAt)}
                      </p>
                    </div>
                    <Badge
                      variant={
                        posting.direction === "OWNER_PAYS"
                          ? "secondary"
                          : "outline"
                      }
                    >
                      {posting.creditAmount} kredi
                    </Badge>
                  </CardContent>
                </Card>
              ))
            ) : (
              <p className="rounded-lg border border-dashed p-6 text-muted-foreground">
                Henüz yayında ilan yok.
              </p>
            )}
          </div>
        </section>
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2>Duyurular</h2>
            <Button asChild variant="ghost">
              <Link href="/duyurular">
                Tümü
                <ArrowRight />
              </Link>
            </Button>
          </div>
          <Card>
            <CardContent className="grid divide-y">
              {recentAnnouncements.length ? (
                recentAnnouncements.map((announcement) => (
                  <Link
                    className="py-4 first:pt-0 last:pb-0"
                    href={`/duyurular/${announcement.id}`}
                    key={announcement.id}
                  >
                    <span className="font-medium">{announcement.title}</span>
                    <span className="mt-1 block text-sm text-muted-foreground">
                      {formatDateTime(
                        announcement.publishedAt ?? announcement.createdAt,
                      )}
                    </span>
                  </Link>
                ))
              ) : (
                <p className="text-muted-foreground">Yeni duyuru yok.</p>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
