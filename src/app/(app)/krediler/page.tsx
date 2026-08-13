import { desc, eq, inArray } from "drizzle-orm";

import { PageHeading } from "@/components/page-heading";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { db } from "@/db";
import {
  creditAccounts,
  creditEntries,
  creditTransactions,
  users,
} from "@/db/schema";
import { requireUser } from "@/lib/auth-guard";
import { formatCredits, formatDateTime } from "@/lib/utils";

export default async function CreditsPage() {
  const { user } = await requireUser();
  const [[account], ownRows, mintRows] = await Promise.all([
    db
      .select()
      .from(creditAccounts)
      .where(eq(creditAccounts.userId, user.id))
      .limit(1),
    db
      .select({ entry: creditEntries, transaction: creditTransactions })
      .from(creditEntries)
      .innerJoin(
        creditTransactions,
        eq(creditEntries.transactionId, creditTransactions.id),
      )
      .where(eq(creditEntries.userId, user.id))
      .orderBy(desc(creditEntries.createdAt))
      .limit(100),
    db
      .select({
        entry: creditEntries,
        transaction: creditTransactions,
        targetName: users.name,
        targetUsername: users.username,
      })
      .from(creditEntries)
      .innerJoin(
        creditTransactions,
        eq(creditEntries.transactionId, creditTransactions.id),
      )
      .innerJoin(users, eq(creditEntries.userId, users.id))
      .where(eq(creditTransactions.type, "ADMIN_ADJUSTMENT"))
      .orderBy(desc(creditTransactions.createdAt))
      .limit(100),
  ]);
  const transactionIds = ownRows.map((row) => row.transaction.id);
  const relatedEntries = transactionIds.length
    ? await db
        .select({
          transactionId: creditEntries.transactionId,
          userId: creditEntries.userId,
          name: users.name,
        })
        .from(creditEntries)
        .innerJoin(users, eq(creditEntries.userId, users.id))
        .where(inArray(creditEntries.transactionId, transactionIds))
    : [];
  const partyMap = new Map<string, string>();
  for (const row of relatedEntries)
    if (row.userId !== user.id) partyMap.set(row.transactionId, row.name);
  const actorIds = [
    ...new Set(
      mintRows.map((row) => row.transaction.createdBy).filter(Boolean),
    ),
  ] as string[];
  const actors = actorIds.length
    ? await db
        .select()
        .from(users)
        .where((await import("drizzle-orm")).inArray(users.id, actorIds))
    : [];
  const actorMap = new Map(actors.map((actor) => [actor.id, actor.name]));
  return (
    <div className="page-stack">
      <PageHeading title="Krediler" />
      <Card className="overflow-hidden">
        <CardHeader>
          <CardDescription>Güncel bakiyen</CardDescription>
          <CardTitle className="text-4xl font-normal">
            {formatCredits(account?.balance ?? 0)} kredi
          </CardTitle>
        </CardHeader>
      </Card>
      <section>
        <h2 className="mb-3">Hareketlerim</h2>
        <Card className="overflow-hidden py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tarih</TableHead>
                <TableHead>İşlem</TableHead>
                <TableHead>Taraf</TableHead>
                <TableHead>Gerekçe</TableHead>
                <TableHead className="text-right">Kredi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ownRows.length ? (
                ownRows.map(({ entry, transaction }) => (
                  <TableRow key={entry.id}>
                    <TableCell>{formatDateTime(entry.createdAt)}</TableCell>
                    <TableCell>
                      {transaction.type === "EXCHANGE"
                        ? "Takas"
                        : transaction.type === "ADMIN_ADJUSTMENT"
                          ? "Yönetici işlemi"
                          : "Geri alma"}
                    </TableCell>
                    <TableCell>
                      {transaction.type === "EXCHANGE"
                        ? (partyMap.get(transaction.id) ?? "Üye")
                        : transaction.createdBy
                          ? "Yönetim"
                          : "—"}
                    </TableCell>
                    <TableCell>{transaction.reason}</TableCell>
                    <TableCell
                      className={`text-right font-medium ${entry.delta > 0 ? "text-success" : "text-destructive"}`}
                    >
                      {entry.delta > 0 ? "+" : ""}
                      {formatCredits(entry.delta)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-8 text-center text-muted-foreground"
                  >
                    Henüz kredi hareketin yok.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </section>
      <section>
        <div className="mb-3">
          <h2>Yönetici kredi işlemleri</h2>
        </div>
        <Card className="overflow-hidden py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tarih</TableHead>
                <TableHead>Üye</TableHead>
                <TableHead>Yönetici</TableHead>
                <TableHead>Gerekçe</TableHead>
                <TableHead className="text-right">Miktar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mintRows.length ? (
                mintRows.map(
                  ({ entry, transaction, targetName, targetUsername }) => (
                    <TableRow key={entry.id}>
                      <TableCell>
                        {formatDateTime(transaction.createdAt)}
                      </TableCell>
                      <TableCell>
                        {targetName}{" "}
                        <span className="text-muted-foreground">
                          @{targetUsername}
                        </span>
                      </TableCell>
                      <TableCell>
                        {transaction.createdBy
                          ? actorMap.get(transaction.createdBy)
                          : "—"}
                      </TableCell>
                      <TableCell>{transaction.reason}</TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant={
                            entry.delta > 0 ? "secondary" : "destructive"
                          }
                        >
                          {entry.delta > 0 ? "+" : ""}
                          {formatCredits(entry.delta)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ),
                )
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-8 text-center text-muted-foreground"
                  >
                    Henüz yönetici kredi işlemi yok.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </section>
    </div>
  );
}
