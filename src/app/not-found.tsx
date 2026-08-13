import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFoundPage() {
  return (
    <main className="grid min-h-svh place-items-center p-4 text-center">
      <div>
        <div className="eyebrow">404</div>
        <h1>Sayfa bulunamadı</h1>
        <Button asChild className="mt-4">
          <Link href="/">Ana sayfaya dön</Link>
        </Button>
      </div>
    </main>
  );
}
