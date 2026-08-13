import { asc, desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { adjustCreditAction } from "@/actions/domain";
import { PageHeading } from "@/components/page-heading";
import { PendingButton } from "@/components/pending-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

export default async function AdminCreditsPage() {
  const context = await requireUser();
  const canAdjust =
    context.isAdmin || context.permissionCodes.has("credit.adjust");
  const canViewAll =
    context.isAdmin || context.permissionCodes.has("credit.view_all");
  if (!canAdjust && !canViewAll) redirect("/?durum=yetkisiz");
  const [members, ledger] = await Promise.all([
    canAdjust
      ? db
          .select({
            id: users.id,
            name: users.name,
            username: users.username,
            balance: creditAccounts.balance,
          })
          .from(users)
          .leftJoin(creditAccounts, eq(users.id, creditAccounts.userId))
          .where(eq(users.active, true))
          .orderBy(asc(users.name))
      : [],
    canViewAll
      ? db
          .select({
            entry: creditEntries,
            transaction: creditTransactions,
            memberName: users.name,
            username: users.username,
          })
          .from(creditEntries)
          .innerJoin(
            creditTransactions,
            eq(creditEntries.transactionId, creditTransactions.id),
          )
          .innerJoin(users, eq(creditEntries.userId, users.id))
          .orderBy(desc(creditTransactions.createdAt))
          .limit(250)
      : [],
  ]);
  return (
    <div className="page-stack">
      <PageHeading title="Kredi yönetimi" />
      {canAdjust && (
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Bakiyeyi düzenle</CardTitle>
            <CardDescription>
              Pozitif değer ekler, negatif değer düşer.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={adjustCreditAction} className="form-stack">
              <div className="field-stack">
                <Label htmlFor="userId">Üye</Label>
                <select
                  id="userId"
                  name="userId"
                  required
                  className="h-11 rounded-md border bg-background px-3"
                >
                  <option value="">Seçin</option>
                  {members.map((member) => (
                    <option value={member.id} key={member.id}>
                      {member.name} (@{member.username}) ·{" "}
                      {formatCredits(member.balance ?? 0)} kredi
                    </option>
                  ))}
                </select>
              </div>
              <div className="field-stack">
                <Label htmlFor="amount">Kredi miktarı</Label>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  step="1"
                  required
                  placeholder="Örn. 10 veya -5"
                />
              </div>
              <div className="field-stack">
                <Label htmlFor="reason">Gerekçe</Label>
                <Input id="reason" name="reason" required maxLength={500} />
              </div>
              <PendingButton>İşlemi kaydet</PendingButton>
            </form>
          </CardContent>
        </Card>
      )}
      {canViewAll && (
        <section>
          <h2 className="mb-3">Tüm hareketler</h2>
          <Card className="overflow-hidden py-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tarih</TableHead>
                  <TableHead>İşlem</TableHead>
                  <TableHead>Üye</TableHead>
                  <TableHead>Gerekçe</TableHead>
                  <TableHead className="text-right">Kredi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ledger.map(({ entry, transaction, memberName, username }) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      {formatDateTime(transaction.createdAt)}
                    </TableCell>
                    <TableCell>
                      {transaction.type === "EXCHANGE"
                        ? "Takas"
                        : transaction.type === "ADMIN_ADJUSTMENT"
                          ? "Yönetici işlemi"
                          : "Geri alma"}
                    </TableCell>
                    <TableCell>
                      {memberName}{" "}
                      <span className="text-muted-foreground">@{username}</span>
                    </TableCell>
                    <TableCell>{transaction.reason}</TableCell>
                    <TableCell className="text-right font-medium">
                      {entry.delta > 0 ? "+" : ""}
                      {formatCredits(entry.delta)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </section>
      )}
    </div>
  );
}
