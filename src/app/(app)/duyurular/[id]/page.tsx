import { eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";

import { MarkdownContent } from "@/components/markdown-content";
import { PageHeading } from "@/components/page-heading";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { db } from "@/db";
import { announcements, users } from "@/db/schema";
import { requireUser } from "@/lib/auth-guard";
import { formatDateTime } from "@/lib/utils";

export default async function AnnouncementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { isAdmin } = await requireUser();
  const [row] = await db
    .select({ announcement: announcements, authorName: users.name })
    .from(announcements)
    .innerJoin(users, eq(announcements.authorId, users.id))
    .where(eq(announcements.id, id))
    .limit(1);
  if (!row || (row.announcement.status !== "PUBLISHED" && !isAdmin)) notFound();
  return (
    <div className="page-stack">
      <PageHeading
        title={row.announcement.title}
        description={`${row.authorName} · ${formatDateTime(row.announcement.publishedAt ?? row.announcement.createdAt)}`}
        action={
          isAdmin && (
            <Button asChild variant="outline">
              <Link href={`/yonetim/duyurular?id=${id}`}>Düzenle</Link>
            </Button>
          )
        }
      />
      <Card>
        <CardContent>
          <MarkdownContent>{row.announcement.markdown}</MarkdownContent>
        </CardContent>
      </Card>
    </div>
  );
}
