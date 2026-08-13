import {
  updateProfileAction,
  uploadProfilePhotoAction,
} from "@/actions/domain";
import { MemberAvatar } from "@/components/member-avatar";
import { PageHeading } from "@/components/page-heading";
import { PendingButton } from "@/components/pending-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { requireUser } from "@/lib/auth-guard";
import Link from "next/link";

export default async function ProfilePage() {
  const { user } = await requireUser();
  return (
    <div className="page-stack">
      <PageHeading title="Profil" />
      <div className="grid gap-6 lg:grid-cols-[1fr_1.5fr]">
        <Card>
          <CardHeader>
            <CardTitle>Profil fotoğrafı</CardTitle>
            <CardDescription>
              JPG, PNG veya WebP; en fazla 5 MB. Görsel kare olarak kırpılır.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5">
            <MemberAvatar user={user} className="size-28" />
            <form action={uploadProfilePhotoAction} className="grid gap-3">
              <Input
                name="photo"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                required
              />
              <PendingButton variant="outline">Fotoğrafı yükle</PendingButton>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Profil bilgileri</CardTitle>
            <CardDescription>
              Ad soyad veya e-posta değişikliği için bir yöneticiye başvur.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={updateProfileAction} className="form-stack">
              <div className="field-stack">
                <Label htmlFor="name">Ad soyad</Label>
                <Input id="name" value={user.name} readOnly disabled />
              </div>
              <div className="field-stack">
                <Label htmlFor="email">E-posta</Label>
                <Input id="email" value={user.email} readOnly disabled />
              </div>
              <div className="field-stack">
                <Label htmlFor="username">Kullanıcı adı</Label>
                <Input
                  id="username"
                  name="username"
                  defaultValue={user.username}
                  minLength={3}
                  maxLength={32}
                  required
                />
              </div>
              <div className="field-stack">
                <Label htmlFor="bio">Kendini tanıt</Label>
                <Textarea
                  id="bio"
                  name="bio"
                  defaultValue={user.bio}
                  maxLength={500}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <PendingButton>Değişiklikleri kaydet</PendingButton>
                <Button asChild variant="outline">
                  <Link href="/parola-degistir">Parolamı değiştir</Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
