import { asc, eq, ilike, or } from "drizzle-orm";
import { Search } from "lucide-react";

import { MemberAvatar } from "@/components/member-avatar";
import { PageHeading } from "@/components/page-heading";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { db } from "@/db";
import { users } from "@/db/schema";

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const condition = q
    ? (await import("drizzle-orm")).and(
        eq(users.active, true),
        or(ilike(users.name, `%${q}%`), ilike(users.username, `%${q}%`)),
      )
    : eq(users.active, true);
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      username: users.username,
      bio: users.bio,
      image: users.image,
    })
    .from(users)
    .where(condition)
    .orderBy(asc(users.name));
  return (
    <div className="page-stack">
      <PageHeading title="Üyeler" />
      <form className="relative max-w-lg">
        <Search className="absolute left-3 top-3.5 size-4 text-muted-foreground" />
        <Input
          className="pl-9"
          name="q"
          defaultValue={q}
          placeholder="Ad veya kullanıcı adı ara"
          aria-label="Üyelerde ara"
        />
      </form>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map((member) => (
          <Card key={member.id} className="content-card">
            <CardContent className="flex items-start gap-4">
              <MemberAvatar user={member} className="size-14" />
              <div className="min-w-0">
                <h2 className="text-xl">{member.name}</h2>
                <p className="text-sm text-muted-foreground">
                  @{member.username}
                </p>
                {member.bio && (
                  <p className="mt-3 whitespace-pre-wrap">{member.bio}</p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
