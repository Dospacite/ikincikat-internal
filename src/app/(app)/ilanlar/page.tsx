import { desc, eq, ilike, or } from "drizzle-orm";
import { Plus, Search } from "lucide-react";
import Link from "next/link";

import { MemberAvatar } from "@/components/member-avatar";
import { PageHeading } from "@/components/page-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { db } from "@/db";
import { postings, users } from "@/db/schema";
import { pricingUnit } from "@/lib/labels";
import { formatDateTime } from "@/lib/utils";

export default async function PostingsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; yon?: string }>;
}) {
  const { q = "", yon = "" } = await searchParams;
  const filters = [eq(postings.status, "PUBLISHED")];
  if (q)
    filters.push(
      or(
        ilike(postings.title, `%${q}%`),
        ilike(postings.description, `%${q}%`),
      )!,
    );
  if (yon === "OWNER_PAYS" || yon === "OWNER_RECEIVES")
    filters.push(eq(postings.direction, yon));
  const rows = await db
    .select({
      id: postings.id,
      title: postings.title,
      description: postings.description,
      direction: postings.direction,
      pricingUnit: postings.pricingUnit,
      creditAmount: postings.creditAmount,
      scheduleMode: postings.scheduleMode,
      createdAt: postings.createdAt,
      ownerName: users.name,
      ownerImage: users.image,
      username: users.username,
    })
    .from(postings)
    .innerJoin(users, eq(postings.ownerId, users.id))
    .where(
      filters.length > 1
        ? (await import("drizzle-orm")).and(...filters)
        : filters[0],
    )
    .orderBy(desc(postings.createdAt));
  return (
    <div className="page-stack">
      <PageHeading
        title="İlanlar"
        action={
          <Button asChild>
            <Link href="/ilanlar/yeni">
              <Plus />
              İlan ver
            </Link>
          </Button>
        }
      />
      <form className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-[1fr_14rem_auto]">
        <div className="relative">
          <Search className="absolute left-3 top-3.5 size-4 text-muted-foreground" />
          <Input
            className="pl-9"
            name="q"
            defaultValue={q}
            placeholder="İlanlarda ara"
            aria-label="İlanlarda ara"
          />
        </div>
        <select
          name="yon"
          defaultValue={yon}
          className="h-11 rounded-md border bg-background px-3"
          aria-label="Kredi yönü"
        >
          <option value="">Tüm kredi yönleri</option>
          <option value="OWNER_RECEIVES">Kredi isteniyor</option>
          <option value="OWNER_PAYS">Kredi veriliyor</option>
        </select>
        <Button variant="secondary">Filtrele</Button>
      </form>
      <div className="grid gap-4 md:grid-cols-2">
        {rows.length ? (
          rows.map((posting) => (
            <Card key={posting.id} className="content-card">
              <CardContent className="grid gap-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 gap-3">
                    <MemberAvatar
                      user={{
                        name: posting.ownerName,
                        image: posting.ownerImage,
                      }}
                    />
                    <div>
                      <p className="font-medium">{posting.ownerName}</p>
                      <p className="text-sm text-muted-foreground">
                        @{posting.username}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={
                      posting.direction === "OWNER_PAYS"
                        ? "secondary"
                        : "outline"
                    }
                  >
                    {posting.direction === "OWNER_PAYS"
                      ? "Kredi veriyor"
                      : "Kredi istiyor"}
                  </Badge>
                </div>
                <div>
                  <h2 className="text-xl">
                    <Link
                      href={`/ilanlar/${posting.id}`}
                      className="hover:underline"
                    >
                      {posting.title}
                    </Link>
                  </h2>
                  <p className="mt-2 line-clamp-3 text-muted-foreground">
                    {posting.description}
                  </p>
                </div>
                <div className="flex items-center justify-between gap-4 border-t pt-4">
                  <span className="font-medium">
                    {posting.creditAmount} kredi ·{" "}
                    {pricingUnit[posting.pricingUnit]}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {formatDateTime(posting.createdAt)}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <p className="col-span-full rounded-xl border border-dashed p-10 text-center text-muted-foreground">
            Aramana uygun ilan bulunamadı.
          </p>
        )}
      </div>
    </div>
  );
}
