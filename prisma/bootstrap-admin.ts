import "dotenv/config";
import {PrismaClient,UserRole} from "@prisma/client";
import bcrypt from "bcryptjs";
const prisma=new PrismaClient();
async function main(){const name=process.env.ADMIN_NAME;const username=process.env.ADMIN_USERNAME?.toLowerCase();const password=process.env.ADMIN_PASSWORD;if(!name||!username||!password||password.length<5)throw new Error("Set ADMIN_NAME, ADMIN_USERNAME, ADMIN_PASSWORD (minimum 5 characters) in environment first.");const passwordHash=await bcrypt.hash(password,12);await prisma.user.upsert({where:{username},update:{name,passwordHash,role:UserRole.ADMIN,active:true},create:{name,username,passwordHash,role:UserRole.ADMIN}});console.log(`Admin account provisioned: ${username}`)}main().finally(()=>prisma.$disconnect());
