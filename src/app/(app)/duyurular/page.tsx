import { desc, eq } from "drizzle-orm";
import { Plus } from "lucide-react";
import Link from "next/link";

import { PageHeading } from "@/components/page-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { db } from "@/db";
import { announcements, users } from "@/db/schema";
import { requireUser } from "@/lib/auth-guard";
import { formatDateTime } from "@/lib/utils";

export default async function AnnouncementsPage() {
  const { isAdmin } = await requireUser();
  const rows = await db
    .select({ announcement: announcements, authorName: users.name })
    .from(announcements)
    .innerJoin(users, eq(announcements.authorId, users.id))
    .where(eq(announcements.status, "PUBLISHED"))
    .orderBy(desc(announcements.publishedAt));
  return (
    <div className="page-stack">
      <PageHeading
        title="Duyurular"
        action={
          isAdmin && (
            <Button asChild>
              <Link href="/yonetim/duyurular">
                <Plus />
                Duyuru hazırla
              </Link>
            </Button>
          )
        }
      />
      <div className="grid gap-4">
        {rows.length ? (
          rows.map(({ announcement, authorName }, index) => (
            <Card key={announcement.id} className="content-card">
              <CardContent className="grid gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  {index === 0 && <Badge>En yeni</Badge>}
                  <span className="text-sm text-muted-foreground">
                    {formatDateTime(
                      announcement.publishedAt ?? announcement.createdAt,
                    )}
                  </span>
                </div>
                <h2>
                  <Link
                    href={`/duyurular/${announcement.id}`}
                    className="hover:underline"
                  >
                    {announcement.title}
                  </Link>
                </h2>
                <p className="line-clamp-3 text-muted-foreground">
                  {announcement.markdown.replace(/[#*_>`\[\]]/g, " ")}
                </p>
                <p className="text-sm text-muted-foreground">{authorName}</p>
              </CardContent>
            </Card>
          ))
        ) : (
          <p className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
            Henüz yayımlanmış duyuru yok.
          </p>
        )}
      </div>
    </div>
  );
}
