import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const auth = await requireRole(["TECHNICIAN", "SUPERVISOR", "ADMIN"]);
  if (auth.response) return auth.response;
  try {
    const sp = req.nextUrl.searchParams;
    const requestedSiteId = sp.get("siteId");
    const assignments = auth.user!.role === "ADMIN" ? null : await prisma.userSite.findMany({where:{userId:auth.user!.id},select:{siteId:true}});
    const allowedSiteIds = assignments?.map(a=>a.siteId) ?? null;
    if (requestedSiteId && allowedSiteIds && !allowedSiteIds.includes(requestedSiteId)) return NextResponse.json({error:"Site di luar penugasan akun."},{status:403});
    const siteId = requestedSiteId || (allowedSiteIds ? undefined : undefined);
    const from = sp.get("from");
    const to = sp.get("to");
    const inspections = await prisma.inspection.findMany({
      where: {
        ...(siteId ? { siteId } : allowedSiteIds ? { siteId: { in: allowedSiteIds } } : {}),
        ...(from || to ? { inspectionDate: { ...(from ? { gte: new Date(`${from}T00:00:00.000Z`) } : {}), ...(to ? { lte: new Date(`${to}T00:00:00.000Z`) } : {}) } } : {})
      },
      include: { generator: { include: { site: true } }, items: true },
      orderBy: [{ inspectionDate: "desc" }, { createdAt: "desc" }], take: 500
    });
    const findings = await prisma.finding.findMany({
      where: { ...(siteId ? { generator: { siteId } } : allowedSiteIds ? { generator: { siteId: { in: allowedSiteIds } } } : {}), ...(from || to ? { createdAt: { ...(from ? { gte: new Date(`${from}T00:00:00.000Z`) } : {}), ...(to ? { lte: new Date(`${to}T23:59:59.999Z`) } : {}) } } : {}) },
      include: { generator: { include: { site: true } } },
      orderBy: { createdAt: "desc" }, take: 500
    });
    return NextResponse.json({ inspections, findings });
  } catch (error) {
    console.error("History API error:", error);
    return NextResponse.json({ error: "Gagal memuat histori." }, { status: 503 });
  }
}
