import { asc } from "drizzle-orm";

import {
  createUserAction,
  resetUserPasswordAction,
  toggleUserActiveAction,
  updateUserIdentityAction,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireUser } from "@/lib/auth-guard";
import { formatDateTime } from "@/lib/utils";

export default async function AdminUsersPage() {
  await requireUser({ admin: true });
  const rows = await db.select().from(users).orderBy(asc(users.name));
  return (
    <div className="page-stack">
      <PageHeading title="Kullanıcılar" />
      <Card>
        <CardHeader>
          <CardTitle>Yeni üye oluştur</CardTitle>
          <CardDescription>
            Üye ilk girişte geçici parolayı değiştirir.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createUserAction} className="grid gap-4 md:grid-cols-2">
            <div className="field-stack">
              <Label htmlFor="new-name">Ad soyad</Label>
              <Input id="new-name" name="name" required />
            </div>
            <div className="field-stack">
              <Label htmlFor="new-username">Kullanıcı adı</Label>
              <Input id="new-username" name="username" required minLength={3} />
            </div>
            <div className="field-stack">
              <Label htmlFor="new-email">E-posta</Label>
              <Input id="new-email" name="email" type="email" required />
            </div>
            <div className="field-stack">
              <Label htmlFor="new-password">Geçici parola</Label>
              <Input
                id="new-password"
                name="password"
                type="password"
                required
                minLength={12}
                autoComplete="new-password"
              />
            </div>
            <PendingButton className="md:col-span-2 md:w-fit">
              Üyeyi oluştur
            </PendingButton>
          </form>
        </CardContent>
      </Card>
      <div className="grid gap-4">
        {rows.map((member) => (
          <Card key={member.id}>
            <CardHeader>
              <div className="flex flex-wrap justify-between gap-3">
                <div>
                  <CardTitle>{member.name}</CardTitle>
                  <CardDescription>
                    @{member.username} · {member.email} ·{" "}
                    {formatDateTime(member.createdAt)}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Badge variant={member.active ? "secondary" : "destructive"}>
                    {member.active ? "Etkin" : "Devre dışı"}
                  </Badge>
                  {member.role.includes("admin") && <Badge>Yönetici</Badge>}
                  {member.mustChangePassword && (
                    <Badge variant="outline">Geçici parola</Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="identity">
                <TabsList className="mb-4 flex-wrap">
                  <TabsTrigger value="identity">Üye bilgileri</TabsTrigger>
                  <TabsTrigger value="password">Parola</TabsTrigger>
                  <TabsTrigger value="status">Hesap durumu</TabsTrigger>
                </TabsList>
                <TabsContent value="identity">
                  <form
                    action={updateUserIdentityAction}
                    className="grid gap-3 md:grid-cols-2"
                  >
                    <input type="hidden" name="userId" value={member.id} />
                    <div className="field-stack">
                      <Label>Ad soyad</Label>
                      <Input name="name" defaultValue={member.name} required />
                    </div>
                    <div className="field-stack">
                      <Label>E-posta</Label>
                      <Input
                        name="email"
                        type="email"
                        defaultValue={member.email}
                        required
                      />
                    </div>
                    <div className="field-stack md:col-span-2">
                      <Label>Değişiklik gerekçesi</Label>
                      <Input name="reason" required maxLength={500} />
                    </div>
                    <PendingButton className="md:w-fit">
                      Bilgileri kaydet
                    </PendingButton>
                  </form>
                </TabsContent>
                <TabsContent value="password">
                  <form
                    action={resetUserPasswordAction}
                    className="grid max-w-lg gap-3"
                  >
                    <input type="hidden" name="userId" value={member.id} />
                    <Label>Yeni geçici parola</Label>
                    <Input
                      name="password"
                      type="password"
                      minLength={12}
                      required
                      autoComplete="new-password"
                    />
                    <PendingButton>
                      Parolayı sıfırla ve oturumları kapat
                    </PendingButton>
                  </form>
                </TabsContent>
                <TabsContent value="status">
                  <form
                    action={toggleUserActiveAction}
                    className="grid max-w-lg gap-3"
                  >
                    <input type="hidden" name="userId" value={member.id} />
                    <Label>Gerekçe</Label>
                    <Input name="reason" required maxLength={500} />
                    <PendingButton
                      variant={member.active ? "destructive" : "default"}
                    >
                      {member.active
                        ? "Hesabı devre dışı bırak"
                        : "Hesabı yeniden etkinleştir"}
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
