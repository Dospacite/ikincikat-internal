import { ChangePasswordForm } from "@/components/auth/change-password-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireUser } from "@/lib/auth-guard";

export const metadata = { title: "Parolanı değiştir" };

export default async function ChangePasswordPage() {
  const { user } = await requireUser({ allowPasswordChange: true });
  return (
    <main
      id="main-content"
      className="grid min-h-svh place-items-center p-4 sm:p-8"
    >
      <Card className="w-full max-w-md bg-card">
        <CardHeader>
          <CardTitle className="text-2xl">Yeni parolanı belirle</CardTitle>
          {user.mustChangePassword && (
            <CardDescription className="mt-2 text-base">
              Devam etmek için geçici parolanı değiştir.
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <ChangePasswordForm forced={user.mustChangePassword} />
        </CardContent>
      </Card>
    </main>
  );
}
