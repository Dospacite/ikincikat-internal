import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { users } from "@/db/schema";
import { getCurrentSession } from "@/lib/auth-guard";
import { getProfilePhoto } from "@/lib/storage";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await getCurrentSession()))
    return new NextResponse(null, { status: 401 });
  const { id } = await params;
  const [user] = await db
    .select({ photoKey: users.photoKey })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  if (!user?.photoKey) return new NextResponse(null, { status: 404 });
  try {
    const object = await getProfilePhoto(user.photoKey);
    if (!object.Body) return new NextResponse(null, { status: 404 });
    return new NextResponse(
      Buffer.from(await object.Body.transformToByteArray()),
      {
        headers: {
          "Content-Type": "image/webp",
          "Cache-Control": "private, max-age=86400",
          "X-Content-Type-Options": "nosniff",
        },
      },
    );
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
