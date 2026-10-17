import { z } from "zod";

const numberOrNull = z.union([z.number().finite(), z.null()]).optional();
const parameterSchema = z.object({
  radiatorEmpty: numberOrNull, radiatorLoaded: numberOrNull,
  oilEmpty: numberOrNull, oilLoaded: numberOrNull,
  rpmEmpty: numberOrNull, rpmLoaded: numberOrNull,
  loadEmpty: numberOrNull, loadLoaded: numberOrNull,
  voltageEmpty: numberOrNull, voltageLoaded: numberOrNull,
  batteryEmpty: numberOrNull, batteryLoaded: numberOrNull
});

export const inspectionSchema = z.object({
  inspector: z.string().trim().min(1),
  inspectionDate: z.string().date(),
  shift: z.enum(["I", "II"]),
  siteId: z.string().min(1),
  generatorId: z.string().min(1),
  model: z.enum(["Komatsu", "Weichai", "Cummins", "Caterpillar"]),
  hmStart: z.number().finite().nonnegative().nullable().optional(),
  hmEnd: z.number().finite().nonnegative().nullable().optional(),
  notes: z.string().optional().nullable(),
  signatureName: z.string().optional().nullable(),
  parameters: parameterSchema,
  items: z.array(z.object({
    itemCode: z.string().min(1),
    result: z.enum(["BAIK", "RUSAK", "PERBAIKI"]),
    notes: z.string().optional().nullable()
  })).length(30)
}).superRefine((data, ctx) => {
  if (data.hmStart != null && data.hmEnd != null && data.hmEnd < data.hmStart) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["hmEnd"], message: "HM/KM akhir tidak boleh lebih kecil dari awal." });
  }
  const codes = data.items.map(i => i.itemCode);
  if (new Set(codes).size !== codes.length) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["items"], message: "Item checklist duplikat." });
});

export const findingUpdateSchema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "WAITING_PART", "CLOSED"]).optional(),
  assignedTo: z.string().optional().nullable(),
  deadline: z.string().datetime().optional().nullable(),
  correctiveAction: z.string().optional().nullable(),
  closureNotes: z.string().optional().nullable(),
  title: z.string().trim().min(1).optional(),
  description: z.string().trim().min(1).optional(),
  severity: z.enum(["A", "AA"]).optional()
}).superRefine((data, ctx) => {
  if (data.status === "CLOSED" && !data.closureNotes?.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["closureNotes"], message: "Catatan penutupan wajib diisi untuk menutup temuan." });
  }
});
