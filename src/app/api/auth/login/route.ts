import {NextRequest,NextResponse} from "next/server";
import bcrypt from "bcryptjs";
import {prisma} from "@/lib/prisma";
import {createSession} from "@/lib/auth";
import {z} from "zod";
const schema=z.object({username:z.string().trim().min(1),password:z.string().min(1)});
export async function POST(req:NextRequest){
  const p=schema.safeParse(await req.json().catch(()=>null));
  if(!p.success)return NextResponse.json({error:"Username dan password wajib diisi."},{status:400});
  const username=p.data.username.toLowerCase();
  const user=await prisma.user.findUnique({where:{username},include:{siteAssignments:{select:{siteId:true}}}});
  if(!user||!user.active||!(await bcrypt.compare(p.data.password,user.passwordHash)))return NextResponse.json({error:"Username atau password salah."},{status:401});
  await createSession({id:user.id,name:user.name,username:user.username,role:user.role});
  return NextResponse.json({user:{id:user.id,name:user.name,username:user.username,role:user.role,siteIds:user.siteAssignments.map(a=>a.siteId)}});
}
