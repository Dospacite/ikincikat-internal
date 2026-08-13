import { desc, eq } from "drizzle-orm";

import { saveAnnouncementAction } from "@/actions/domain";
import { AnnouncementEditor } from "@/components/announcement-editor";
import { PageHeading } from "@/components/page-heading";
import { PendingButton } from "@/components/pending-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { db } from "@/db";
import { announcements } from "@/db/schema";
import { requireUser } from "@/lib/auth-guard";
import { announcementStatus } from "@/lib/labels";

export default async function AdminAnnouncementsPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  await requireUser({ permission: "announcement.manage" });
  const { id } = await searchParams;
  const [selected] = id
    ? await db
        .select()
        .from(announcements)
        .where(eq(announcements.id, id))
        .limit(1)
    : [];
  const rows = await db
    .select()
    .from(announcements)
    .orderBy(desc(announcements.updatedAt))
    .limit(30);
  return (
    <div className="page-stack">
      <PageHeading title={selected ? "Duyuruyu düzenle" : "Duyuru hazırla"} />
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardContent>
            <form action={saveAnnouncementAction} className="form-stack">
              {selected && (
                <input type="hidden" name="id" value={selected.id} />
              )}
              <div className="field-stack">
                <Label htmlFor="title">Başlık</Label>
                <Input
                  id="title"
                  name="title"
                  required
                  maxLength={160}
                  defaultValue={selected?.title}
                />
              </div>
              <div className="field-stack">
                <Label>Metin</Label>
                <AnnouncementEditor initial={selected?.markdown} />
              </div>
              <div className="field-stack">
                <Label htmlFor="status">Durum</Label>
                <select
                  id="status"
                  name="status"
                  defaultValue={selected?.status ?? "DRAFT"}
                  className="h-11 rounded-md border bg-background px-3"
                >
                  <option value="DRAFT">Taslak</option>
                  <option value="PUBLISHED">Yayımla</option>
                  <option value="ARCHIVED">Arşivle</option>
                </select>
                <p className="text-sm text-muted-foreground">
                  Yayımladığında tüm üyelere bildirim gider.
                </p>
              </div>
              <PendingButton>Kaydet</PendingButton>
            </form>
          </CardContent>
        </Card>
        <aside>
          <h2 className="mb-3">Kayıtlı duyurular</h2>
          <div className="grid gap-2">
            {rows.map((row) => (
              <a
                key={row.id}
                href={`/yonetim/duyurular?id=${row.id}`}
                className="flex items-center justify-between gap-3 rounded-lg border bg-card p-3 hover:bg-muted"
              >
                <span>{row.title}</span>
                <Badge variant="outline">
                  {announcementStatus[row.status]}
                </Badge>
              </a>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
