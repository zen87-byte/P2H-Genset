import {NextRequest,NextResponse} from "next/server";
import bcrypt from "bcryptjs";
import {z} from "zod";
import {prisma} from "@/lib/prisma";
import {requireRole} from "@/lib/auth";
const createSchema=z.object({name:z.string().trim().min(2),username:z.string().trim().min(3).regex(/^[a-zA-Z0-9._-]+$/),password:z.string().min(5),role:z.enum(["TECHNICIAN","SUPERVISOR","ADMIN"]),siteIds:z.array(z.string()).default([])}).refine(d=>d.role==="ADMIN"||d.siteIds.length>0,{message:"Teknisi dan pengawas wajib memiliki minimal satu penugasan site."});
export async function GET(){const auth=await requireRole(["ADMIN"]);if(auth.response)return auth.response;const users=await prisma.user.findMany({include:{siteAssignments:{include:{site:true}}},orderBy:{createdAt:"asc"}});return NextResponse.json(users.map(({passwordHash,...u})=>u));}
export async function POST(req:NextRequest){
 const auth=await requireRole(["ADMIN"]);if(auth.response)return auth.response;
 const parsed=createSchema.safeParse(await req.json().catch(()=>null));
 if(!parsed.success)return NextResponse.json({error:"Data akun tidak valid.",details:parsed.error.flatten()},{status:400});
 const d=parsed.data; const username=d.username.toLowerCase();
 try {const user=await prisma.user.create({data:{name:d.name,username,passwordHash:await bcrypt.hash(d.password,12),role:d.role,siteAssignments:{create:[...new Set(d.siteIds)].map(siteId=>({siteId}))}},include:{siteAssignments:{include:{site:true}}}});const {passwordHash,...safeUser}=user;return NextResponse.json(safeUser,{status:201});}
 catch{return NextResponse.json({error:"Username sudah digunakan atau akun gagal dibuat."},{status:409});}
}

export async function PATCH(req:NextRequest){
 const auth=await requireRole(["ADMIN"]);if(auth.response)return auth.response;
 const schema=z.object({id:z.string().min(1),siteIds:z.array(z.string())});
 const parsed=schema.safeParse(await req.json().catch(()=>null));if(!parsed.success)return NextResponse.json({error:"Data penugasan site tidak valid."},{status:400});
 const {id,siteIds}=parsed.data;
 try {const existing=await prisma.user.findUnique({where:{id},select:{role:true}});if(!existing)return NextResponse.json({error:"Akun tidak ditemukan."},{status:404});if(existing.role!=="ADMIN"&&siteIds.length===0)return NextResponse.json({error:"Teknisi dan pengawas wajib memiliki minimal satu penugasan site."},{status:400});const user=await prisma.user.update({where:{id},data:{siteAssignments:{deleteMany:{},create:[...new Set(siteIds)].map(siteId=>({siteId}))}},include:{siteAssignments:{include:{site:true}}}});return NextResponse.json({id:user.id,siteAssignments:user.siteAssignments});}
 catch{return NextResponse.json({error:"Gagal memperbarui penugasan site."},{status:400});}
}
