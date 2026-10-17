import { OperationalStatus, Prisma } from "@prisma/client";

export type FindingForStatus = { id?: string; title: string; severity: string; status: string };

export function deriveStatusFromFindings(findings: FindingForStatus[]): { status: OperationalStatus; note: string } {
  // Only unresolved findings affect operational readiness. CLOSED findings are retained
  // for history but no longer block operation. AA takes precedence over A.
  const open = findings.filter((f) => f.status !== "CLOSED");
  if (open.some((f) => f.severity === "AA")) {
    return { status: "NOT_OPERABLE", note: `${open.filter((f) => f.severity === "AA").length} temuan AA belum ditutup.` };
  }
  if (open.length > 0) {
    return { status: "RESTRICTED", note: `${open.length} temuan belum ditutup.` };
  }
  if (findings.length === 0) {
    return { status: "UNASSESSED", note: "Belum ada temuan yang tercatat untuk unit ini." };
  }
  return { status: "OPERABLE", note: "Seluruh temuan yang tercatat sudah ditutup." };
}

export async function refreshGeneratorOperationalStatus(
  tx: Prisma.TransactionClient,
  generatorId: string,
  changedBy: string,
) {
  const [generator, findings] = await Promise.all([
    tx.generator.findUnique({ where: { id: generatorId } }),
    tx.finding.findMany({ where: { generatorId }, select: { id: true, title: true, severity: true, status: true } }),
  ]);
  if (!generator) throw new Error("Generator tidak ditemukan saat memperbarui status operasional.");
  const derived = deriveStatusFromFindings(findings);
  const note = `${derived.note} Dasar: status temuan terkini.`;
  if (generator.operationalStatus !== derived.status || (generator.operationalStatusNote ?? "") !== note) {
    await tx.generator.update({
      where: { id: generatorId },
      data: {
        operationalStatus: derived.status,
        operationalStatusNote: note,
        operationalStatusUpdatedAt: new Date(),
        operationalStatusUpdatedBy: changedBy,
      },
    });
    await tx.generatorStatusLog.create({
      data: {
        generatorId,
        previousStatus: generator.operationalStatus,
        newStatus: derived.status,
        note,
        changedBy,
      },
    });
  }
  return derived;
}
