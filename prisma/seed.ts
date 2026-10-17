import {PrismaClient} from "@prisma/client";
const prisma=new PrismaClient();
const sites=[{code:"LMO",name:"Lati"},{code:"BMO",name:"Binungan"},{code:"SRN",name:"Suaran"},{code:"SMO",name:"Sambarata"},{code:"GMO",name:"Gurimbang"}];
const assets=[
 ["LMO","BC-GE-P-08",""],["LMO","BC-GE-P-09",""],["LMO","BC-GE-P-18",""],["LMO","BC-GE-P-21",""],["LMO","BIB-GE-P-02",""],
 ["BMO","BC-GE-P-23",""],["BMO","BC-GE-P-33",""],["BMO","BC-GE-P-32",""],["BMO","BC-GE-P-34",""],["BMO","BC-GE-P-36",""],
 ["SRN","BC-GE-P-43",""],["SRN","BC-GE-P-41",""],["SRN","BC-GE-P-28",""],["SRN","BC-GE-P-38",""],["SRN","BC-GE-P-42",""],["SRN","BC-GE-P-31",""],
 ["SMO","BC-GE-P-05",""],["SMO","BC-GE-P-45",""],["SMO","BC-GE-P-35",""],
 ["GMO","BC-GE-P-39",""],["GMO","BC-GE-P-40",""],["GMO","BC-GE-P-44",""]
] as const;
async function main(){
 for(const s of sites) await prisma.site.upsert({where:{code:s.code},update:{name:s.name},create:s});
 for(const [siteCode,assetCode,unitName] of assets){
  const site=await prisma.site.findUniqueOrThrow({where:{code:siteCode}});
  await prisma.generator.upsert({where:{assetCode},update:{siteId:site.id,unitName:unitName||null},create:{assetCode,siteId:site.id,unitName:unitName||null,model:null}});
 }
 // Do not create default credentials/passwords in seed. First admin must be provisioned securely via documented bootstrap process.
 console.log("Seed complete. Duplicate BC-GE-P-23 for Sambarata intentionally omitted pending asset-code verification.");
}
main().finally(()=>prisma.$disconnect());
