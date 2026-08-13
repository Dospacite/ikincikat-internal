import { and, desc, eq, ilike, or, sql } from "drizzle-orm";

import { PageHeading } from "@/components/page-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { db } from "@/db";
import { auditLogs, users } from "@/db/schema";
import { requireUser } from "@/lib/auth-guard";
import { auditAction } from "@/lib/labels";
import { formatDateTime } from "@/lib/utils";

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; outcome?: string }>;
}) {
  await requireUser({ admin: true });
  const { q = "", outcome = "" } = await searchParams;
  const filters = [];
  if (q)
    filters.push(
      or(
        ilike(users.name, `%${q}%`),
        ilike(users.email, `%${q}%`),
        sql`${auditLogs.ipAddress}::text ILIKE ${`%${q}%`}`,
      )!,
    );
  if (outcome === "SUCCESS" || outcome === "FAILURE")
    filters.push(eq(auditLogs.outcome, outcome));
  const rows = await db
    .select({ log: auditLogs, actorName: users.name, actorEmail: users.email })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.actorId, users.id))
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(auditLogs.createdAt))
    .limit(250);
  return (
    <div className="page-stack">
      <PageHeading title="Moderasyon günlüğü" />
      <form className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-[1fr_12rem_auto]">
        <Input
          name="q"
          defaultValue={q}
          placeholder="Kullanıcı veya IP ara"
          aria-label="Günlükte ara"
        />
        <select
          name="outcome"
          defaultValue={outcome}
          className="h-11 rounded-md border bg-background px-3"
          aria-label="Sonuç"
        >
          <option value="">Tüm sonuçlar</option>
          <option value="SUCCESS">Başarılı</option>
          <option value="FAILURE">Başarısız</option>
        </select>
        <Button variant="secondary">Filtrele</Button>
      </form>
      <Card className="overflow-hidden py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tarih</TableHead>
              <TableHead>İşlem</TableHead>
              <TableHead>Kullanıcı</TableHead>
              <TableHead>IP</TableHead>
              <TableHead>Sonuç</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length ? (
              rows.map(({ log, actorName, actorEmail }) => (
                <TableRow key={log.id}>
                  <TableCell className="whitespace-nowrap">
                    {formatDateTime(log.createdAt)}
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">
                      {auditAction[log.action] ?? "Diğer işlem"}
                    </span>
                    {log.reason && (
                      <span className="block text-xs text-muted-foreground">
                        {log.reason}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {actorName ?? "Bilinmiyor"}
                    <span className="block text-xs text-muted-foreground">
                      {actorEmail}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {log.ipAddress ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        log.outcome === "SUCCESS" ? "secondary" : "destructive"
                      }
                    >
                      {log.outcome === "SUCCESS" ? "Başarılı" : "Başarısız"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-8 text-center text-muted-foreground"
                >
                  Kayıt bulunamadı.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
