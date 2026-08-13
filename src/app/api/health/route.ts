import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { storageReady } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.execute(sql`select 1`);
    await storageReady();
    return NextResponse.json({ status: "ok" });
  } catch {
    console.error(
      JSON.stringify({ level: "error", event: "readiness_check_failed" }),
    );
    return NextResponse.json({ status: "error" }, { status: 503 });
  }
}
