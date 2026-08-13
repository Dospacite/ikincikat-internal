import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { db } from "@/db";
import {
  permissions,
  rolePermissions,
  roles,
  userRoles,
  users,
} from "@/db/schema";
import { auth } from "@/lib/auth";
import type { PermissionCode } from "@/lib/permissions";

export async function getCurrentSession() {
  return auth.api.getSession({ headers: await headers() });
}

export function hasAdminRole(role: string | null | undefined) {
  return role?.split(",").includes("admin") ?? false;
}

export async function getPermissionCodes(userId: string) {
  const rows = await db
    .select({ code: permissions.code })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .innerJoin(rolePermissions, eq(roles.id, rolePermissions.roleId))
    .innerJoin(
      permissions,
      eq(rolePermissions.permissionCode, permissions.code),
    )
    .where(eq(userRoles.userId, userId));
  return new Set(rows.map((row) => row.code));
}

type RequireUserOptions = {
  allowPasswordChange?: boolean;
  admin?: boolean;
  permission?: PermissionCode;
};

export async function requireUser(options: RequireUserOptions = {}) {
  const session = await getCurrentSession();
  if (!session) redirect("/giris");

  const [member] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, session.user.id), eq(users.active, true)))
    .limit(1);
  if (!member) redirect("/giris?durum=devre-disi");
  if (member.mustChangePassword && !options.allowPasswordChange)
    redirect("/parola-degistir");

  const isAdmin = hasAdminRole(member.role);
  if (options.admin && !isAdmin) redirect("/?durum=yetkisiz");

  const permissionCodes = isAdmin
    ? new Set<string>(["*"])
    : await getPermissionCodes(member.id);
  if (
    options.permission &&
    !isAdmin &&
    !permissionCodes.has(options.permission)
  ) {
    redirect("/?durum=yetkisiz");
  }

  return { session, user: member, isAdmin, permissionCodes };
}

export async function assertActionUser(options: RequireUserOptions = {}) {
  const session = await getCurrentSession();
  if (!session) throw new Error("Oturum açmanız gerekiyor.");
  const [member] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, session.user.id), eq(users.active, true)))
    .limit(1);
  if (!member) throw new Error("Hesabınız etkin değil.");
  if (member.mustChangePassword && !options.allowPasswordChange)
    throw new Error("Önce geçici parolanızı değiştirin.");
  const isAdmin = hasAdminRole(member.role);
  if (options.admin && !isAdmin)
    throw new Error("Bu işlem için yönetici yetkisi gerekiyor.");
  const permissionCodes = isAdmin
    ? new Set<string>(["*"])
    : await getPermissionCodes(member.id);
  if (
    options.permission &&
    !isAdmin &&
    !permissionCodes.has(options.permission)
  )
    throw new Error("Bu işlem için yetkiniz yok.");
  return { session, user: member, isAdmin, permissionCodes };
}
