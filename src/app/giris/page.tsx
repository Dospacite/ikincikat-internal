import { redirect } from "next/navigation";
import { Building2 } from "lucide-react";

import { SignInForm } from "@/components/auth/sign-in-form";
import { ThemeToggle } from "@/components/theme-toggle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentSession } from "@/lib/auth-guard";

export const metadata = { title: "Giriş" };

export default async function SignInPage() {
  const session = await getCurrentSession();
  if (session) redirect("/");
  return (
    <main
      id="main-content"
      className="grid min-h-svh place-items-center p-4 sm:p-8"
    >
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-md border-border bg-card shadow-[var(--elev-raised)]">
        <CardHeader className="gap-4">
          <div className="flex size-12 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Building2 aria-hidden="true" />
          </div>
          <CardTitle className="text-2xl">ikinciKat Internal</CardTitle>
        </CardHeader>
        <CardContent>
          <SignInForm />
        </CardContent>
      </Card>
    </main>
  );
}
