import "dotenv/config";
import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import {
  creditAccounts,
  permissions,
  rolePermissions,
  roles,
  userRoles,
  users,
} from "@/db/schema";
import { auth } from "@/lib/auth";
import { env } from "@/lib/env";
import { PERMISSION_CATALOG } from "@/lib/permissions";

const builtinPermissions = Object.entries(PERMISSION_CATALOG).map(
  ([code, permission]) => ({
    code,
    ...permission,
  }),
);

await db.insert(permissions).values(builtinPermissions).onConflictDoNothing();

await db
  .insert(roles)
  .values([
    {
      slug: "user",
      name: "Kullanıcı",
      description: "Her ikinciKat üyesine verilen temel rol.",
      systemKey: "user",
    },
    {
      slug: "admin",
      name: "Yönetici",
      description: "Kullanıcı, rol, kredi ve moderasyon yetkilerinin tamamı.",
      systemKey: "admin",
    },
  ])
  .onConflictDoNothing();

const roleRows = await db.select().from(roles);
const userRole = roleRows.find((role) => role.systemKey === "user");
const adminRole = roleRows.find((role) => role.systemKey === "admin");
if (!userRole || !adminRole) throw new Error("Sistem rolleri oluşturulamadı.");

for (const permission of builtinPermissions) {
  await db
    .insert(rolePermissions)
    .values({ roleId: adminRole.id, permissionCode: permission.code })
    .onConflictDoNothing();
}

const [existingAdmin] = await db
  .select()
  .from(users)
  .where(eq(users.email, env.ADMIN_EMAIL.toLowerCase()))
  .limit(1);
let adminId = existingAdmin?.id;
let generatedPassword: string | null = null;
const passwordWasConfigured = Boolean(env.ADMIN_SEED_PASSWORD);

if (!existingAdmin) {
  generatedPassword =
    env.ADMIN_SEED_PASSWORD || randomBytes(18).toString("base64url");
  const created = await auth.api.createUser({
    body: {
      email: env.ADMIN_EMAIL,
      password: generatedPassword,
      name: "Sistem Yöneticisi",
      role: "admin",
      data: {
        username: "admin",
        bio: "",
        active: true,
        mustChangePassword: true,
        emailVerified: true,
      },
    },
  });
  adminId = created.user.id;
}

if (!adminId) throw new Error("Yönetici hesabı oluşturulamadı.");

await db
  .update(users)
  .set({
    role: "admin",
    active: true,
    emailVerified: true,
    updatedAt: new Date(),
  })
  .where(eq(users.id, adminId));

await db
  .insert(userRoles)
  .values([
    { userId: adminId, roleId: userRole.id, assignedBy: adminId },
    { userId: adminId, roleId: adminRole.id, assignedBy: adminId },
  ])
  .onConflictDoNothing();

await db
  .insert(creditAccounts)
  .values({ userId: adminId, balance: 0 })
  .onConflictDoNothing();

if (generatedPassword) {
  if (passwordWasConfigured)
    console.info(
      JSON.stringify({
        level: "info",
        event: "admin_seeded",
        email: env.ADMIN_EMAIL,
        passwordSource: "ADMIN_SEED_PASSWORD",
      }),
    );
  else console.info(`IKINCIKAT_ADMIN_PASSWORD=${generatedPassword}`);
} else {
  console.info(
    JSON.stringify({
      level: "info",
      event: "admin_already_exists",
      email: env.ADMIN_EMAIL,
    }),
  );
}
