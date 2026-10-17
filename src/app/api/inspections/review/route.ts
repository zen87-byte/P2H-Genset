import {NextRequest,NextResponse} from "next/server";
import {z} from "zod";
import {prisma} from "@/lib/prisma";
import {requireRole} from "@/lib/auth";
const schema=z.object({id:z.string().min(1),decision:z.enum(["APPROVED","REJECTED"]),notes:z.string().optional()});

function deriveOperationalStatus(items:{hazard:string;result:string}[]) {
  if (items.some(item => item.hazard === "AA" && item.result !== "BAIK")) return "NOT_OPERABLE" as const;
  if (items.some(item => item.result !== "BAIK")) return "RESTRICTED" as const;
  return "OPERABLE" as const;
}

export async function PATCH(req:NextRequest){
 const auth=await requireRole(["SUPERVISOR"]);if(auth.response)return auth.response;
 const p=schema.safeParse(await req.json().catch(()=>null));if(!p.success)return NextResponse.json({error:"Data persetujuan tidak valid."},{status:400});
 const inspection=await prisma.inspection.findUnique({where:{id:p.data.id},include:{items:true,generator:true}});
 if(!inspection)return NextResponse.json({error:"Inspeksi tidak ditemukan."},{status:404});
 const assignments=await prisma.userSite.findMany({where:{userId:auth.user!.id},select:{siteId:true}});if(!assignments.some(a=>a.siteId===inspection.siteId))return NextResponse.json({error:"Inspeksi ini berada di luar site penugasan Anda."},{status:403});
 if(inspection.approvalStatus!=="PENDING")return NextResponse.json({error:"Inspeksi ini sudah diproses."},{status:409});
 const updated = await prisma.$transaction(async tx => {
   const reviewed = await tx.inspection.update({where:{id:inspection.id},data:{approvalStatus:p.data.decision,reviewerId:auth.user!.id,reviewedAt:new Date(),reviewNotes:p.data.notes?.trim()||null}});
   if (p.data.decision === "APPROVED") {
     const latest = await tx.inspection.findFirst({where:{generatorId:inspection.generatorId,approvalStatus:"APPROVED",id:{not:inspection.id}},orderBy:[{inspectionDate:"desc"},{createdAt:"desc"}]});
     const isThisLatest = !latest || inspection.inspectionDate > latest.inspectionDate || (inspection.inspectionDate.getTime() === latest.inspectionDate.getTime() && inspection.createdAt >= latest.createdAt);
     if (isThisLatest) {
       const status = deriveOperationalStatus(inspection.items);
       const nonGood = inspection.items.filter(item=>item.result!=="BAIK");
       const aa = nonGood.some(item=>item.hazard==="AA");
       const note = `Otomatis dari P2H ${inspection.inspectionDate.toISOString().slice(0,10)} Shift ${inspection.shift}; ${nonGood.length} item non-BAIK${aa?", termasuk bahaya AA":""}. Persetujuan: ${auth.user!.name}.` ;
       const current = await tx.generator.findUniqueOrThrow({where:{id:inspection.generatorId}});
       await tx.generator.update({where:{id:inspection.generatorId},data:{operationalStatus:status,operationalStatusNote:note,operationalStatusUpdatedAt:new Date(),operationalStatusUpdatedBy:auth.user!.name}});
       if(current.operationalStatus!==status || (current.operationalStatusNote||"")!==note) await tx.generatorStatusLog.create({data:{generatorId:inspection.generatorId,previousStatus:current.operationalStatus,newStatus:status,note,changedBy:auth.user!.name}});
     }
   }
   return reviewed;
 });
 return NextResponse.json(updated);
}
