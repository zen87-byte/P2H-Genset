import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { findingUpdateSchema } from "@/lib/validation";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { refreshGeneratorOperationalStatus } from "@/lib/operational-status";

const createSchema = z.object({
  generatorId: z.string().min(1), title: z.string().trim().min(1),
  description: z.string().trim().min(1), severity: z.enum(["A", "AA"]),
  reporter: z.string().trim().min(1), assignedTo: z.string().optional().nullable(),
  deadline: z.string().datetime().optional().nullable()
});

export async function GET(req: NextRequest) {
  const auth = await requireRole(["TECHNICIAN", "SUPERVISOR", "ADMIN"]);
  if (auth.response) return auth.response;
  try {
    const status = req.nextUrl.searchParams.get("status");
    const siteId = req.nextUrl.searchParams.get("siteId");
    const assignments = auth.user!.role === "ADMIN" ? null : await prisma.userSite.findMany({where:{userId:auth.user!.id},select:{siteId:true}});
    const allowedSiteIds = assignments?.map(a=>a.siteId) ?? null;
    if(siteId && allowedSiteIds && !allowedSiteIds.includes(siteId))return NextResponse.json({error:"Site di luar penugasan akun."},{status:403});
    const rows = await prisma.finding.findMany({
      where: { ...(status && status !== "ALL" ? { status: status as never } : {}), ...(siteId ? { generator: { siteId } } : allowedSiteIds ? { generator: { siteId: { in: allowedSiteIds } } } : {}) },
      include: { generator: { include: { site: true } } },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 500
    });
    return NextResponse.json(rows);
  } catch (error) {
    console.error("Findings GET error:", error);
    return NextResponse.json({ error: "Gagal memuat temuan." }, { status: 503 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(["SUPERVISOR"]);
  if (auth.response) return auth.response;
  try {
    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "Data temuan tidak valid.", details: parsed.error.flatten() }, { status: 400 });
    const data = parsed.data;
    const generator=await prisma.generator.findUnique({where:{id:data.generatorId}}); if(!generator)return NextResponse.json({error:"Unit tidak ditemukan."},{status:404});
    const assignments=await prisma.userSite.findMany({where:{userId:auth.user!.id},select:{siteId:true}}); if(!assignments.some(a=>a.siteId===generator.siteId))return NextResponse.json({error:"Unit berada di luar site penugasan Anda."},{status:403});
    const row = await prisma.$transaction(async (tx) => {
      const created = await tx.finding.create({
        data: { ...data, deadline: data.deadline ? new Date(data.deadline) : null },
        include: { generator: { include: { site: true } } }
      });
      await refreshGeneratorOperationalStatus(tx, data.generatorId, auth.user!.name);
      return created;
    });
    return NextResponse.json(row, { status: 201 });
  } catch (error) {
    console.error("Findings POST error:", error);
    return NextResponse.json({ error: "Gagal membuat temuan." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireRole(["SUPERVISOR"]);
  if (auth.response) return auth.response;
  try {
    const body = await req.json();
    const id = body.id as string;
    if (!id) return NextResponse.json({ error: "ID temuan wajib ada." }, { status: 400 });
    const parsed = findingUpdateSchema.safeParse(body.changes);
    if (!parsed.success) return NextResponse.json({ error: "Perubahan tidak valid.", details: parsed.error.flatten() }, { status: 400 });
    const existing = await prisma.finding.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Temuan tidak ditemukan." }, { status: 404 });
    const changes = parsed.data;
    const generator=await prisma.generator.findUnique({where:{id:existing.generatorId}}); const assignments=await prisma.userSite.findMany({where:{userId:auth.user!.id},select:{siteId:true}}); if(!generator||!assignments.some(a=>a.siteId===generator.siteId))return NextResponse.json({error:"Temuan berada di luar site penugasan Anda."},{status:403});
    if (existing.status === "CLOSED" && changes.status && changes.status !== "CLOSED") {
      return NextResponse.json({ error: "Temuan CLOSED tidak dapat dibuka kembali melalui form ini. Ikuti prosedur koreksi data." }, { status: 409 });
    }
    if (changes.status === "CLOSED" && !changes.closureNotes?.trim() && !existing.closureNotes?.trim()) {
      return NextResponse.json({ error: "Catatan penutupan wajib diisi." }, { status: 400 });
    }
    const row = await prisma.$transaction(async (tx) => {
      const updated = await tx.finding.update({
        where: { id },
        data: {
          ...changes,
          deadline: changes.deadline === undefined ? undefined : changes.deadline ? new Date(changes.deadline) : null,
          closedAt: changes.status === "CLOSED" ? (existing.closedAt ?? new Date()) : undefined
        },
        include: { generator: { include: { site: true } } }
      });
      await refreshGeneratorOperationalStatus(tx, existing.generatorId, auth.user!.name);
      return updated;
    });
    return NextResponse.json(row);
  } catch (error) {
    console.error("Findings PATCH error:", error);
    return NextResponse.json({ error: "Gagal memperbarui temuan." }, { status: 500 });
  }
}
