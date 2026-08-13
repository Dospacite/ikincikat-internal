import { desc, eq } from "drizzle-orm";
import Link from "next/link";

import { withdrawApplicationAction } from "@/actions/domain";
import { PageHeading } from "@/components/page-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { db } from "@/db";
import { applications, postings, users } from "@/db/schema";
import { requireUser } from "@/lib/auth-guard";
import { applicationStatus, postingStatus } from "@/lib/labels";
import { formatDateTime } from "@/lib/utils";

export default async function MyPostingsPage() {
  const { user } = await requireUser();
  const [owned, applied] = await Promise.all([
    db
      .select()
      .from(postings)
      .where(eq(postings.ownerId, user.id))
      .orderBy(desc(postings.createdAt)),
    db
      .select({ application: applications, posting: postings, owner: users })
      .from(applications)
      .innerJoin(postings, eq(applications.postingId, postings.id))
      .innerJoin(users, eq(postings.ownerId, users.id))
      .where(eq(applications.applicantId, user.id))
      .orderBy(desc(applications.createdAt)),
  ]);
  return (
    <div className="page-stack">
      <PageHeading title="İlanlarım" />
      <section>
        <h2 className="mb-3">Yayımladıklarım</h2>
        <div className="grid gap-3">
          {owned.length ? (
            owned.map((posting) => (
              <Card key={posting.id} className="py-4">
                <CardContent className="flex flex-wrap items-center justify-between gap-3 px-4">
                  <div>
                    <Link
                      href={`/ilanlar/${posting.id}`}
                      className="font-medium hover:underline"
                    >
                      {posting.title}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      {formatDateTime(posting.createdAt)} ·{" "}
                      {posting.creditAmount} kredi
                    </p>
                  </div>
                  <Badge variant="outline">
                    {postingStatus[posting.status]}
                  </Badge>
                </CardContent>
              </Card>
            ))
          ) : (
            <p className="rounded-lg border border-dashed p-6 text-muted-foreground">
              Henüz ilan yayımlamadın.
            </p>
          )}
        </div>
      </section>
      <section>
        <h2 className="mb-3">Başvurularım</h2>
        <div className="grid gap-3">
          {applied.length ? (
            applied.map(({ application, posting, owner }) => (
              <Card key={application.id} className="py-4">
                <CardContent className="flex flex-wrap items-center justify-between gap-3 px-4">
                  <div>
                    <Link
                      href={`/ilanlar/${posting.id}`}
                      className="font-medium hover:underline"
                    >
                      {posting.title}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      {owner.name} · {formatDateTime(application.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {applicationStatus[application.status]}
                    </Badge>
                    {application.status === "PENDING" && (
                      <form action={withdrawApplicationAction}>
                        <input type="hidden" name="id" value={application.id} />
                        <Button type="submit" variant="ghost">
                          Geri çek
                        </Button>
                      </form>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <p className="rounded-lg border border-dashed p-6 text-muted-foreground">
              Henüz başvurun yok.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
