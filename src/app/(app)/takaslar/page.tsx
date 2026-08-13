import { desc, eq, or } from "drizzle-orm";

import { cancelExchangeAction, settleExchangeAction } from "@/actions/domain";
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
import { db } from "@/db";
import { exchanges, users } from "@/db/schema";
import { requireUser } from "@/lib/auth-guard";
import { exchangeStatus, pricingUnit } from "@/lib/labels";
import { formatDateTime } from "@/lib/utils";

export default async function ExchangesPage() {
  const { user } = await requireUser();
  const rows = await db
    .select()
    .from(exchanges)
    .where(
      or(eq(exchanges.ownerId, user.id), eq(exchanges.participantId, user.id)),
    )
    .orderBy(desc(exchanges.createdAt));
  const memberIds = [
    ...new Set(rows.flatMap((row) => [row.ownerId, row.participantId])),
  ];
  const members = memberIds.length
    ? await db
        .select()
        .from(users)
        .where((await import("drizzle-orm")).inArray(users.id, memberIds))
    : [];
  const memberMap = new Map(members.map((member) => [member.id, member]));
  return (
    <div className="page-stack">
      <PageHeading
        title="Takaslar"
        description="İlan sahibi tamamlanan işi kesinleştirir."
      />
      <div className="grid gap-4">
        {rows.length ? (
          rows.map((exchange) => {
            const other = memberMap.get(
              exchange.ownerId === user.id
                ? exchange.participantId
                : exchange.ownerId,
            );
            const isOwner = exchange.ownerId === user.id;
            return (
              <Card key={exchange.id}>
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <CardTitle>{exchange.titleSnapshot}</CardTitle>
                      <CardDescription>
                        {other?.name ?? "Üye"} ile ·{" "}
                        {formatDateTime(exchange.createdAt)}
                      </CardDescription>
                    </div>
                    <Badge
                      variant={
                        exchange.status === "ACTIVE" ? "default" : "outline"
                      }
                    >
                      {exchangeStatus[exchange.status]}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <p>
                    <strong>{exchange.rate} kredi</strong> ·{" "}
                    {pricingUnit[exchange.pricingUnit]} ·{" "}
                    {exchange.payerId === user.id
                      ? "Krediyi sen verirsin"
                      : "Krediyi sen alırsın"}
                  </p>
                  {exchange.status === "SETTLED" && (
                    <p className="rounded-lg bg-muted p-3">
                      {exchange.creditsTotal} kredi aktarıldı.
                    </p>
                  )}
                  {exchange.status === "CANCELLED" && (
                    <p className="rounded-lg bg-muted p-3">
                      İptal gerekçesi: {exchange.cancellationReason}
                    </p>
                  )}
                  {exchange.status === "ACTIVE" && (
                    <div className="grid gap-3 border-t pt-4 lg:grid-cols-2">
                      {isOwner && (
                        <form
                          action={settleExchangeAction}
                          className="grid gap-3 rounded-lg border p-4"
                        >
                          <input type="hidden" name="id" value={exchange.id} />
                          <h3>İşi tamamla</h3>
                          {exchange.pricingUnit !== "OVERALL" && (
                            <div className="field-stack">
                              <Label htmlFor={`units-${exchange.id}`}>
                                {exchange.pricingUnit === "HOURLY"
                                  ? "Saat"
                                  : "Gün"}{" "}
                                sayısı
                              </Label>
                              <Input
                                id={`units-${exchange.id}`}
                                name="unitCount"
                                type="number"
                                min="1"
                                step="1"
                                defaultValue="1"
                                required
                              />
                            </div>
                          )}
                          <div className="field-stack">
                            <Label htmlFor={`total-${exchange.id}`}>
                              Toplam kredi{" "}
                              <span className="font-normal text-muted-foreground">
                                (isteğe bağlı düzeltme)
                              </span>
                            </Label>
                            <Input
                              id={`total-${exchange.id}`}
                              name="creditsTotal"
                              type="number"
                              min="1"
                              step="1"
                              placeholder={String(exchange.rate)}
                            />
                          </div>
                          <PendingButton>Kesinleştir</PendingButton>
                        </form>
                      )}
                      <form
                        action={cancelExchangeAction}
                        className="grid content-start gap-3 rounded-lg border p-4"
                      >
                        <input type="hidden" name="id" value={exchange.id} />
                        <h3>Takası iptal et</h3>
                        <div className="field-stack">
                          <Label htmlFor={`reason-${exchange.id}`}>
                            Gerekçe
                          </Label>
                          <Input
                            id={`reason-${exchange.id}`}
                            name="reason"
                            required
                            maxLength={500}
                          />
                        </div>
                        <PendingButton variant="outline">
                          İptal et
                        </PendingButton>
                      </form>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        ) : (
          <p className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
            Henüz bir takasın yok.
          </p>
        )}
      </div>
    </div>
  );
}
