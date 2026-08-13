import { desc, eq } from "drizzle-orm";
import Link from "next/link";

import {
  adminEditPostingAction,
  moderatePostingAction,
} from "@/actions/domain";
import { PageHeading } from "@/components/page-heading";
import { PendingButton } from "@/components/pending-button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { db } from "@/db";
import { postings, users } from "@/db/schema";
import { requireUser } from "@/lib/auth-guard";
import { postingStatus } from "@/lib/labels";
import { formatDateTime } from "@/lib/utils";

export default async function ModerationPage() {
  await requireUser({ permission: "posting.moderate" });
  const rows = await db
    .select({ posting: postings, ownerName: users.name })
    .from(postings)
    .innerJoin(users, eq(postings.ownerId, users.id))
    .orderBy(desc(postings.createdAt))
    .limit(100);
  return (
    <div className="page-stack">
      <PageHeading title="İlan moderasyonu" />
      <div className="grid gap-4">
        {rows.map(({ posting, ownerName }) => (
          <Card key={posting.id}>
            <CardHeader>
              <div className="flex flex-wrap justify-between gap-3">
                <div>
                  <CardTitle>
                    <Link
                      href={`/ilanlar/${posting.id}`}
                      className="hover:underline"
                    >
                      {posting.title}
                    </Link>
                  </CardTitle>
                  <CardDescription>
                    {ownerName} · {formatDateTime(posting.createdAt)}
                  </CardDescription>
                </div>
                <Badge variant="outline">{postingStatus[posting.status]}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="status">
                <TabsList className="mb-4">
                  <TabsTrigger value="status">Durum</TabsTrigger>
                  <TabsTrigger value="edit">İçeriği düzenle</TabsTrigger>
                </TabsList>
                <TabsContent value="status">
                  <form
                    action={moderatePostingAction}
                    className="grid gap-3 md:grid-cols-[12rem_1fr_auto] md:items-end"
                  >
                    <input type="hidden" name="id" value={posting.id} />
                    <div className="field-stack">
                      <Label>Yeni durum</Label>
                      <select
                        name="status"
                        defaultValue={posting.status}
                        className="h-11 rounded-md border bg-background px-3"
                      >
                        <option value="PUBLISHED">Yayımla / geri aç</option>
                        <option value="HIDDEN">Gizle</option>
                        <option value="CLOSED">Kapat</option>
                      </select>
                    </div>
                    <div className="field-stack">
                      <Label>Gerekçe</Label>
                      <Input
                        name="reason"
                        required
                        maxLength={500}
                        defaultValue={posting.moderatedReason ?? ""}
                      />
                    </div>
                    <PendingButton>Uygula</PendingButton>
                  </form>
                </TabsContent>
                <TabsContent value="edit">
                  <form action={adminEditPostingAction} className="form-stack">
                    <input type="hidden" name="id" value={posting.id} />
                    <div className="field-stack">
                      <Label>İlan adı</Label>
                      <Input
                        name="title"
                        defaultValue={posting.title}
                        required
                      />
                    </div>
                    <div className="field-stack">
                      <Label>Açıklama</Label>
                      <Textarea
                        name="description"
                        defaultValue={posting.description}
                        required
                      />
                    </div>
                    <div className="field-stack">
                      <Label>Kredi</Label>
                      <Input
                        name="creditAmount"
                        type="number"
                        min="1"
                        step="1"
                        defaultValue={posting.creditAmount}
                        required
                      />
                    </div>
                    <div className="field-stack">
                      <Label>Düzenleme gerekçesi</Label>
                      <Input name="reason" required maxLength={500} />
                    </div>
                    <PendingButton variant="outline">
                      İçeriği kaydet
                    </PendingButton>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
