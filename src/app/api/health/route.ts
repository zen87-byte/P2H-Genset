import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

export async function GET() {
  const auth = await requireRole(["TECHNICIAN", "SUPERVISOR", "ADMIN"]);
  if (auth.response) return auth.response;
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, database: "connected" });
  } catch (error) {
    console.error("Health check database error:", error);
    return NextResponse.json({ ok: false, database: "unavailable" }, { status: 503 });
  }
}
