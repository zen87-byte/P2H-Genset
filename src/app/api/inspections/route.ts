import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { inspectionSchema } from "@/lib/validation";
import { CHECKLIST_ITEMS } from "@/lib/checklist";
import { requireRole } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const auth = await requireRole(["TECHNICIAN", "SUPERVISOR", "ADMIN"]);
  if (auth.response) return auth.response;
  try {
    const sp = req.nextUrl.searchParams;
    const siteId = sp.get("siteId");
    const date = sp.get("date");
    const rows = await prisma.inspection.findMany({
      where: { ...(siteId ? { siteId } : {}), ...(date ? { inspectionDate: new Date(`${date}T00:00:00.000Z`) } : {}) },
      include: { generator: { include: { site: true } }, items: true },
      orderBy: [{ inspectionDate: "desc" }, { createdAt: "desc" }],
      take: 200
    });
    return NextResponse.json(rows);
  } catch (error) {
    console.error("Inspections GET error:", error);
    return NextResponse.json({ error: "Gagal memuat histori inspeksi." }, { status: 503 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(["TECHNICIAN"]);
  if (auth.response) return auth.response;
  try {
    const parsed = inspectionSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({
      error: "Data inspeksi tidak valid. Periksa detail validasi di bawah.",
      details: parsed.error.flatten(),
      issues: parsed.error.issues.map(issue => ({ path: issue.path, message: issue.message }))
    }, { status: 400 });
    const data = parsed.data;
    const assignments = await prisma.userSite.findMany({where:{userId:auth.user!.id},select:{siteId:true}});
    if (!assignments.some(a=>a.siteId===data.siteId)) return NextResponse.json({error:"Site ini belum ditugaskan ke akun teknisi Anda."},{status:403});
    const generator = await prisma.generator.findUnique({ where: { id: data.generatorId }, include: { site: true } });
    if (!generator || generator.siteId !== data.siteId) return NextResponse.json({ error: "Unit genset tidak sesuai dengan site yang dipilih." }, { status: 400 });
    const expectedCodes = CHECKLIST_ITEMS.map(i => i.code).sort();
    const submittedCodes = data.items.map(i => i.itemCode).sort();
    if (JSON.stringify(expectedCodes) !== JSON.stringify(submittedCodes)) return NextResponse.json({ error: "Checklist harus berisi seluruh 30 item resmi tanpa duplikasi." }, { status: 400 });
    const inspectionDate = new Date(`${data.inspectionDate}T00:00:00.000Z`);
    const p = data.parameters;
    await prisma.generator.update({ where: { id: generator.id }, data: { model: data.model } });
    const result = await prisma.$transaction(async tx => {
      const inspection = await tx.inspection.create({
        data: {
          inspector: auth.user!.name, inspectorId: auth.user!.id, inspectionDate, shift: data.shift, siteId: data.siteId,
          generatorId: data.generatorId, hmStart: data.hmStart ?? null, hmEnd: data.hmEnd ?? null,
          notes: data.notes || null, signatureName: data.signatureName || null,
          radiatorEmpty: p.radiatorEmpty ?? null, radiatorLoaded: p.radiatorLoaded ?? null,
          oilEmpty: p.oilEmpty ?? null, oilLoaded: p.oilLoaded ?? null,
          rpmEmpty: p.rpmEmpty ?? null, rpmLoaded: p.rpmLoaded ?? null,
          loadEmpty: p.loadEmpty ?? null, loadLoaded: p.loadLoaded ?? null,
          voltageEmpty: p.voltageEmpty ?? null, voltageLoaded: p.voltageLoaded ?? null,
          batteryEmpty: p.batteryEmpty ?? null, batteryLoaded: p.batteryLoaded ?? null,
          items: { create: data.items.map(item => {
            const master = CHECKLIST_ITEMS.find(i => i.code === item.itemCode)!;
            return { itemCode: master.code, category: master.category, description: master.description, hazard: master.hazard, result: item.result, notes: item.notes || null };
          }) }
        },
        include: { items: true }
      });
      const bad = data.items.filter(i => i.result !== "BAIK");
      for (const item of bad) {
        const master = CHECKLIST_ITEMS.find(i => i.code === item.itemCode)!;
        // Prevent duplicate findings for the same inspection/item if a request is retried.
        const title = `${master.code} - ${master.description}`;
        await tx.finding.create({
          data: {
            inspectionId: inspection.id, generatorId: generator.id, title,
            description: item.notes?.trim() || `Hasil checklist: ${item.result}. Perlu pemeriksaan dan tindak lanjut.`,
            severity: master.hazard, reporter: data.inspector
          }
        });
      }
      return inspection;
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Inspections POST error:", error);
    return NextResponse.json({ error: "Gagal menyimpan inspeksi. Periksa log server/database." }, { status: 500 });
  }
}
