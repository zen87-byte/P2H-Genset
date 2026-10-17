import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
const COOKIE = "genset_care_session";
const secret = new TextEncoder().encode(process.env.AUTH_SECRET || "CHANGE_ME_TO_A_LONG_RANDOM_SECRET_BEFORE_DEPLOYMENT_32_CHARS_MIN");
export type SessionUser = { id:string; name:string; username:string; role:"TECHNICIAN"|"SUPERVISOR"|"ADMIN"; siteIds?:string[] };
export async function createSession(user: SessionUser) {
  const token = await new SignJWT(user).setProtectedHeader({alg:"HS256"}).setIssuedAt().setExpirationTime("12h").sign(secret);
  const store = await cookies();
  store.set(COOKIE, token, {httpOnly:true, secure:process.env.NODE_ENV==="production", sameSite:"lax", path:"/", maxAge:60*60*12});
}
export async function getSession(): Promise<SessionUser|null> {
  const store = await cookies(); const token = store.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const {payload} = await jwtVerify(token, secret);
    if (!payload.id || !payload.role || !payload.username || !payload.name) return null;
    const user = await prisma.user.findUnique({where:{id:String(payload.id)},select:{id:true,name:true,username:true,role:true,active:true,siteAssignments:{select:{siteId:true}}}});
    if (!user || !user.active) return null;
    return {id:user.id,name:user.name,username:user.username,role:user.role,siteIds:user.siteAssignments.map(a=>a.siteId)};
  } catch { return null; }
}
export async function requireRole(roles: SessionUser["role"][]) {
  const user = await getSession();
  if (!user) return {user:null,response:Response.json({error:"Login diperlukan."},{status:401})};
  if (!roles.includes(user.role)) return {user:null,response:Response.json({error:"Akses ditolak untuk role ini."},{status:403})};
  return {user,response:null};
}
