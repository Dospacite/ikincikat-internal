import { asc, eq } from "drizzle-orm";

import {
  assignRoleAction,
  createRoleAction,
  updateRoleAction,
} from "@/actions/domain";
import { PageHeading } from "@/components/page-heading";
import { PendingButton } from "@/components/pending-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { db } from "@/db";
import {
  permissions,
  rolePermissions,
  roles,
  userRoles,
  users,
} from "@/db/schema";
import { requireUser } from "@/lib/auth-guard";

export default async function RolesPage() {
  await requireUser({ admin: true });
  const [roleRows, permissionRows, assignmentRows, members] = await Promise.all(
    [
      db.select().from(roles).orderBy(asc(roles.name)),
      db.select().from(permissions).orderBy(asc(permissions.name)),
      db.select().from(userRoles),
      db
        .select({ id: users.id, name: users.name, username: users.username })
        .from(users)
        .where(eq(users.active, true))
        .orderBy(asc(users.name)),
    ],
  );
  const rpRows = await db.select().from(rolePermissions);
  const permissionMap = new Map<string, Set<string>>();
  for (const row of rpRows) {
    const set = permissionMap.get(row.roleId) ?? new Set<string>();
    set.add(row.permissionCode);
    permissionMap.set(row.roleId, set);
  }
  const assignments = new Set(
    assignmentRows.map((row) => `${row.userId}:${row.roleId}`),
  );
  return (
    <div className="page-stack">
      <PageHeading title="Roller ve yetkiler" />
      <Card>
        <CardHeader>
          <CardTitle>Yeni rol</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createRoleAction} className="form-stack">
            <div className="field-stack">
              <Label>Rol adı</Label>
              <Input name="name" required />
            </div>
            <div className="field-stack">
              <Label>Açıklama</Label>
              <Input name="description" maxLength={300} />
            </div>
            <fieldset>
              <legend className="mb-2 font-medium">Yetkiler</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {permissionRows.map((permission) => (
                  <Label
                    key={permission.code}
                    className="flex cursor-pointer items-start gap-3 rounded-lg border p-3"
                  >
                    <Checkbox name="permissions" value={permission.code} />
                    <span>
                      <span className="block">{permission.name}</span>
                      <span className="block text-sm font-normal text-muted-foreground">
                        {permission.description}
                      </span>
                    </span>
                  </Label>
                ))}
              </div>
            </fieldset>
            <PendingButton>Rolü oluştur</PendingButton>
          </form>
        </CardContent>
      </Card>
      <section>
        <h2 className="mb-3">Tanımlı roller</h2>
        <div className="grid gap-4">
          {roleRows.map((role) => {
            const selected = permissionMap.get(role.id) ?? new Set();
            return (
              <Card key={role.id}>
                <CardHeader>
                  <div className="flex flex-wrap justify-between gap-3">
                    <div>
                      <CardTitle>{role.name}</CardTitle>
                      {role.description && (
                        <CardDescription>{role.description}</CardDescription>
                      )}
                    </div>
                    {role.systemKey && (
                      <Badge variant="outline">Düzenlenemez</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="grid gap-6">
                  {!role.systemKey && (
                    <form action={updateRoleAction} className="form-stack">
                      <input type="hidden" name="roleId" value={role.id} />
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="field-stack">
                          <Label>Rol adı</Label>
                          <Input
                            name="name"
                            defaultValue={role.name}
                            required
                          />
                        </div>
                        <div className="field-stack">
                          <Label>Açıklama</Label>
                          <Input
                            name="description"
                            defaultValue={role.description}
                          />
                        </div>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {permissionRows.map((permission) => (
                          <Label
                            key={permission.code}
                            className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border px-3"
                          >
                            <Checkbox
                              name="permissions"
                              value={permission.code}
                              defaultChecked={selected.has(permission.code)}
                            />
                            {permission.name}
                          </Label>
                        ))}
                      </div>
                      <PendingButton variant="outline">
                        Rolü kaydet
                      </PendingButton>
                    </form>
                  )}
                  <div>
                    <h3 className="mb-2">Rol atamaları</h3>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {members.map((member) => {
                        const assigned = assignments.has(
                          `${member.id}:${role.id}`,
                        );
                        return (
                          <form
                            action={assignRoleAction}
                            key={member.id}
                            className="flex min-h-14 items-center justify-between gap-2 rounded-lg border p-2 pl-3"
                          >
                            <input
                              type="hidden"
                              name="userId"
                              value={member.id}
                            />
                            <input
                              type="hidden"
                              name="roleId"
                              value={role.id}
                            />
                            <input
                              type="hidden"
                              name="enabled"
                              value={assigned ? "false" : "true"}
                            />
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-medium">
                                {member.name}
                              </span>
                              <span className="block truncate text-xs text-muted-foreground">
                                @{member.username}
                              </span>
                            </span>
                            <Button
                              type="submit"
                              size="sm"
                              variant={assigned ? "secondary" : "outline"}
                              disabled={role.systemKey === "user" && assigned}
                            >
                              {assigned ? "Atandı" : "Ata"}
                            </Button>
                          </form>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
