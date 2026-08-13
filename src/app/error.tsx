"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main className="grid min-h-[60svh] place-items-center p-4">
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>İşlem tamamlanamadı</CardTitle>
          <CardDescription>
            Bilgileri kontrol edip yeniden deneyin. Sorun sürerse bir yöneticiye
            başvurun.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={reset}>Yeniden dene</Button>
        </CardContent>
      </Card>
    </main>
  );
}
