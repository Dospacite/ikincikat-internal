import { desc, eq } from "drizzle-orm";
import Link from "next/link";

import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/actions/domain";
import { PageHeading } from "@/components/page-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { requireUser } from "@/lib/auth-guard";
import { formatDateTime } from "@/lib/utils";

export default async function NotificationsPage() {
  const { user } = await requireUser();
  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, user.id))
    .orderBy(desc(notifications.createdAt))
    .limit(100);
  return (
    <div className="page-stack">
      <PageHeading
        title="Bildirimler"
        action={
          rows.some((row) => !row.readAt) && (
            <form action={markAllNotificationsReadAction}>
              <Button type="submit" variant="outline">
                Tümünü okundu işaretle
              </Button>
            </form>
          )
        }
      />
      <div className="grid gap-3">
        {rows.length ? (
          rows.map((notification) => (
            <Card
              key={notification.id}
              className={`py-4 ${!notification.readAt ? "border-primary/50" : ""}`}
            >
              <CardContent className="flex flex-wrap items-start justify-between gap-4 px-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={notification.href}
                      className="font-medium hover:underline"
                    >
                      {notification.title}
                    </Link>
                    {!notification.readAt && <Badge>Yeni</Badge>}
                  </div>
                  {notification.body && (
                    <p className="mt-1 text-muted-foreground">
                      {notification.body}
                    </p>
                  )}
                  <p className="mt-2 text-sm text-muted-foreground">
                    {formatDateTime(notification.createdAt)}
                  </p>
                </div>
                {!notification.readAt && (
                  <form action={markNotificationReadAction}>
                    <input type="hidden" name="id" value={notification.id} />
                    <Button type="submit" variant="ghost">
                      Okundu
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          ))
        ) : (
          <p className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
            Henüz bildirimin yok.
          </p>
        )}
      </div>
    </div>
  );
}
