import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { deriveStatusFromFindings } from "@/lib/operational-status";

export async function GET() {
  const auth = await requireRole(["TECHNICIAN", "SUPERVISOR", "ADMIN"]);
  if (auth.response) return auth.response;
  try {
    const now = new Date();
    const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    const tomorrow = new Date(today); tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    const [rawSites, generators, inspections, openFindings, critical, attention] = await Promise.all([
      prisma.site.findMany({ include: { generators: { include: { statusLogs: { orderBy: { changedAt: "desc" }, take: 20 }, findings: { select: { id: true, title: true, severity: true, status: true } } }, orderBy: { assetCode: "asc" } } }, orderBy: { name: "asc" } }),
      prisma.generator.count(),
      prisma.inspection.count({ where: { inspectionDate: { gte: today, lt: tomorrow } } }),
      prisma.finding.count({ where: { status: { not: "CLOSED" } } }),
      prisma.finding.count({ where: { status: { not: "CLOSED" }, severity: "AA" } }),
      prisma.finding.findMany({
        where: { status: { not: "CLOSED" } },
        include: { generator: { include: { site: true } } },
        orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
        take: 8
      })
    ]);
    // Operational readiness is derived from current findings, not directly from checklist results.
    // CLOSED findings remain in history but no longer block the unit's status.
    const sites = rawSites.map(site => ({
      ...site,
      generators: site.generators.map(generator => {
        const derived = deriveStatusFromFindings(generator.findings);
        const note = `${derived.note} Dasar: status temuan terkini.`;
        return { ...generator, operationalStatus: derived.status, operationalStatusNote: note, findings: undefined };
      })
    }));
    const eligible = sites.reduce((sum, s) => sum + s.generators.filter(g => g.isEligible).length, 0);
    const target = eligible * 2;
    const bySite = await Promise.all(sites.map(async site => {
      const count = await prisma.inspection.count({ where: { siteId: site.id, inspectionDate: { gte: today, lt: tomorrow } } });
      const eligibleCount = site.generators.filter(g => g.isEligible).length;
      return { id: site.id, name: site.name, count, target: eligibleCount * 2 };
    }));
    return NextResponse.json({ date: today.toISOString().slice(0,10), sites, generators, inspections, target, openFindings, critical, attention, bySite });
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json({ error: "Gagal mengambil data dashboard. Periksa koneksi database dan konfigurasi .env." }, { status: 503 });
  }
}
